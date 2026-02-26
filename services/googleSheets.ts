import AsyncStorage from "@react-native-async-storage/async-storage";
import { Collector, Task, LogEntry, SubmitPayload, SubmitResponse, CollectorStats, TaskActualRow, FullLogEntry, AdminDashboardData, LeaderboardEntry, AdminCollectorDetail, TaskRequirement } from "@/types";

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvhVIEe-P-aqiy1UwOWXPSXan0nwLMD5tkDJhrLX7gXsRn3-nCkB4f3Ov7K12dpH_Z6g/exec";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRY_ATTEMPTS = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_PATTERNS = [/network/i, /timeout/i, /abort/i, /failed to fetch/i];
const RETRY_DELAY_MS = [400, 1200];

/* ------------------------------------------------------------------ */
/*  3-tier cache: Memory → AsyncStorage → API                         */
/* ------------------------------------------------------------------ */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

const MEMORY_TTL: Record<string, number> = {
  collectors: 5 * 60 * 1000,
  tasks: 5 * 60 * 1000,
  leaderboard: 2 * 60 * 1000,
  adminDashboard: 60 * 1000,
  adminCollectors: 2 * 60 * 1000,
  taskRequirements: 2 * 60 * 1000,
  default: 30 * 1000,
};

const STORAGE_TTL: Record<string, number> = {
  collectors: 30 * 60 * 1000,
  tasks: 30 * 60 * 1000,
  leaderboard: 10 * 60 * 1000,
  adminDashboard: 5 * 60 * 1000,
  adminCollectors: 10 * 60 * 1000,
  taskRequirements: 10 * 60 * 1000,
  default: 2 * 60 * 1000,
};

function getMemoryTTL(key: string): number {
  const base = key.split(":")[0];
  return MEMORY_TTL[base] ?? MEMORY_TTL.default;
}

function getStorageTTL(key: string): number {
  const base = key.split(":")[0];
  return STORAGE_TTL[base] ?? STORAGE_TTL.default;
}

function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > getMemoryTTL(key)) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInMemory<T>(key: string, data: T): void {
  memoryCache.set(key, { data, ts: Date.now() });
}

async function getFromStorage<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`tf_cache_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > getStorageTTL(key)) {
      AsyncStorage.removeItem(`tf_cache_${key}`).catch(() => {});
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function setInStorage<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`tf_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage full or unavailable
  }
}

async function cachedApiGet<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  const mem = getFromMemory<T>(cacheKey);
  if (mem !== null) return mem;

  const stored = await getFromStorage<T>(cacheKey);
  if (stored !== null) {
    setInMemory(cacheKey, stored);
    fetcher().then(fresh => {
      setInMemory(cacheKey, fresh);
      setInStorage(cacheKey, fresh);
    }).catch(() => {});
    return stored;
  }

  const fresh = await fetcher();
  setInMemory(cacheKey, fresh);
  setInStorage(cacheKey, fresh);
  return fresh;
}

export async function clearAllCaches(): Promise<void> {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith("tf_cache_"));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // ignore
  }
  console.log("[Cache] All caches cleared");
}

/* ------------------------------------------------------------------ */
/*  URL & HTTP helpers                                                 */
/* ------------------------------------------------------------------ */

function normalizeScriptUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/exec")) return trimmed;
  if (/\/macros\/s\//.test(trimmed) && !trimmed.endsWith("/exec")) {
    return `${trimmed.replace(/\/$/, "")}/exec`;
  }
  return trimmed;
}

function getScriptUrl(): string {
  const fromEnv = normalizeScriptUrl(process.env.EXPO_PUBLIC_GOOGLE_SCRIPT_URL ?? "");
  const fallback = normalizeScriptUrl(DEFAULT_SCRIPT_URL);
  const resolved = fromEnv || fallback;
  console.log("[API] getScriptUrl resolved:", resolved ? `${resolved.slice(0, 80)}...` : "EMPTY");
  return resolved;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function createTimeoutController(ms: number): { controller: AbortController; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(timer) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function tryParseResponseText<T>(text: string): ApiResponse<T> {
  const cleanText = text.trim().replace(/^\)\]\}'\n?/, "");
  try {
    return JSON.parse(cleanText) as ApiResponse<T>;
  } catch {
    throw new Error(cleanText || "Invalid API response format");
  }
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiResponse<T>;
  }
  const text = await response.text();
  return tryParseResponseText<T>(text);
}

async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) throw new Error("Google Script URL not configured. Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL.");

  const url = new URL(scriptUrl);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") url.searchParams.set(k, v);
  });

  console.log("[API] GET", action, params);

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const timeout = createTimeoutController(REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url.toString(), {
        redirect: "follow",
        signal: timeout.controller.signal,
        cache: "no-store",
      });
      timeout.cancel();

      if (!response.ok) {
        const text = await response.text();
        const retryableStatus = RETRYABLE_STATUS_CODES.has(response.status);
        if (retryableStatus && attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS[attempt] ?? 1500);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${text || "Request failed"}`);
      }

      const json = await parseApiResponse<T>(response);
      if (!json.success) throw new Error(json.error ?? json.message ?? "Unknown API error");
      return json.data as T;
    } catch (error) {
      timeout.cancel();
      const message = error instanceof Error ? error.message : "Network error";
      const canRetry = attempt < MAX_RETRY_ATTEMPTS && shouldRetryError(error);
      if (canRetry) {
        await sleep(RETRY_DELAY_MS[attempt] ?? 1500);
        continue;
      }
      throw new Error(`Request failed: ${message}`);
    }
  }
  throw new Error("Request failed after retries");
}

async function apiPost(payload: SubmitPayload): Promise<SubmitResponse> {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) throw new Error("Google Script URL not configured. Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL.");

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const timeout = createTimeoutController(REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        redirect: "follow",
        signal: timeout.controller.signal,
        cache: "no-store",
      });
      timeout.cancel();

      if (!response.ok) {
        const text = await response.text();
        const retryableStatus = RETRYABLE_STATUS_CODES.has(response.status);
        if (retryableStatus && attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS[attempt] ?? 1500);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${text || "Submit failed"}`);
      }

      const json = await parseApiResponse<SubmitResponse>(response);
      if (!json.success) throw new Error(json.error ?? json.message ?? "Submit failed");
      return { success: true, message: json.message ?? "Success", ...json.data } as SubmitResponse;
    } catch (error) {
      timeout.cancel();
      const message = error instanceof Error ? error.message : "Network error";
      const canRetry = attempt < MAX_RETRY_ATTEMPTS && shouldRetryError(error);
      if (canRetry) {
        await sleep(RETRY_DELAY_MS[attempt] ?? 1500);
        continue;
      }
      throw new Error(`Submit failed: ${message}`);
    }
  }
  throw new Error("Submit failed after retries");
}

/* ------------------------------------------------------------------ */
/*  Public API — all calls go through 3-tier cache where applicable    */
/* ------------------------------------------------------------------ */

interface RawCollector { name: string; rigs: string[]; }
interface RawTask { name: string; }

export async function fetchCollectors(): Promise<Collector[]> {
  return cachedApiGet("collectors", async () => {
    const raw = await apiGet<RawCollector[]>("getCollectors");
    return raw.map((c, i) => ({
      id: `c_${i}_${c.name.replace(/\s/g, "_")}`,
      name: c.name,
      rigs: c.rigs ?? [],
    }));
  });
}

export async function fetchTasks(): Promise<Task[]> {
  return cachedApiGet("tasks", async () => {
    const raw = await apiGet<RawTask[]>("getTasks");
    return raw.map((t, i) => ({
      id: `t_${i}_${t.name.replace(/\s/g, "_")}`,
      name: t.name,
      label: t.name,
    }));
  });
}

export async function fetchTodayLog(collectorName: string): Promise<LogEntry[]> {
  return cachedApiGet(`todayLog:${collectorName}`, () =>
    apiGet<LogEntry[]>("getTodayLog", { collector: collectorName })
  );
}

export async function fetchCollectorStats(collectorName: string): Promise<CollectorStats> {
  return cachedApiGet(`collectorStats:${collectorName}`, () =>
    apiGet<CollectorStats>("getCollectorStats", { collector: collectorName })
  );
}

export async function submitAction(payload: SubmitPayload): Promise<SubmitResponse> {
  return apiPost(payload);
}

export async function fetchRecollections(): Promise<string[]> {
  return cachedApiGet("recollections", () =>
    apiGet<string[]>("getRecollections")
  );
}

export async function fetchFullLog(collectorName?: string): Promise<FullLogEntry[]> {
  const params: Record<string, string> = {};
  if (collectorName) params.collector = collectorName;
  return apiGet<FullLogEntry[]>("getFullLog", params);
}

export async function fetchTaskActualsData(): Promise<TaskActualRow[]> {
  return cachedApiGet("taskActuals", () =>
    apiGet<TaskActualRow[]>("getTaskActualsSheet")
  );
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  return cachedApiGet("adminDashboard", () =>
    apiGet<AdminDashboardData>("getAdminDashboardData")
  );
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return cachedApiGet("leaderboard", async () => {
    try {
      const data = await apiGet<LeaderboardEntry[]>("getLeaderboard");
      if (data && data.length > 0) return data;
      throw new Error("Empty leaderboard");
    } catch {
      console.log("[API] Leaderboard endpoint not available, building from collectors");
      return [];
    }
  });
}

export async function buildLeaderboardFromCollectors(collectors: { name: string; rigs: string[] }[]): Promise<LeaderboardEntry[]> {
  console.log("[API] buildLeaderboardFromCollectors for", collectors.length, "collectors");
  const results: LeaderboardEntry[] = [];

  const statsPromises = collectors.map(async (c) => {
    try {
      const stats = await fetchCollectorStats(c.name);
      return { collector: c, stats };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(statsPromises);

  for (const result of settled) {
    if (!result || !result.stats) continue;
    const { collector, stats } = result;

    results.push({
      rank: 0,
      collectorName: collector.name,
      hoursLogged: stats.weeklyLoggedHours > 0 ? stats.weeklyLoggedHours : stats.totalLoggedHours,
      tasksCompleted: stats.weeklyCompleted > 0 ? stats.weeklyCompleted : stats.totalCompleted,
      tasksAssigned: stats.totalAssigned,
      completionRate: stats.completionRate,
      region: "",
    });
  }

  results.sort((a, b) => b.hoursLogged - a.hoursLogged);
  results.forEach((e, i) => { e.rank = i + 1; });
  return results;
}

export async function fetchAdminCollectors(): Promise<AdminCollectorDetail[]> {
  return cachedApiGet("adminCollectors", () =>
    apiGet<AdminCollectorDetail[]>("getAdminCollectors")
  );
}

export async function fetchTaskRequirements(): Promise<TaskRequirement[]> {
  return cachedApiGet("taskRequirements", () =>
    apiGet<TaskRequirement[]>("getTaskRequirements")
  );
}

export function isApiConfigured(): boolean {
  const url = getScriptUrl();
  return !!url;
}
