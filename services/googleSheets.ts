import { Collector, Task, LogEntry, SubmitPayload, SubmitResponse, CollectorStats, TaskActualRow, FullLogEntry, AdminDashboardData, LeaderboardEntry } from "@/types";

function getScriptUrl(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_SCRIPT_URL ?? "";
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const scriptUrl = getScriptUrl();
  console.log("[API] Script URL:", scriptUrl ? scriptUrl.slice(0, 60) + "..." : "EMPTY");
  if (!scriptUrl) {
    console.log("[API] No EXPO_PUBLIC_GOOGLE_SCRIPT_URL set");
    throw new Error("Google Script URL not configured. Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL.");
  }

  const url = new URL(scriptUrl);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  console.log("[API] GET", action, params);

  const response = await fetch(url.toString(), { redirect: "follow" });

  if (!response.ok) {
    const text = await response.text();
    console.log("[API] HTTP error:", response.status, text);
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const json = (await response.json()) as ApiResponse<T>;
  console.log("[API] Response:", JSON.stringify(json).slice(0, 500));

  if (!json.success) {
    throw new Error(json.error ?? "Unknown API error");
  }

  return json.data as T;
}

async function apiPost(payload: SubmitPayload): Promise<SubmitResponse> {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    console.log("[API] No EXPO_PUBLIC_GOOGLE_SCRIPT_URL set");
    throw new Error("Google Script URL not configured. Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL.");
  }

  console.log("[API] POST submit:", JSON.stringify(payload));

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("[API] POST HTTP error:", response.status, text);
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const json = (await response.json()) as SubmitResponse;
  console.log("[API] POST response:", JSON.stringify(json));

  if (!json.success) {
    throw new Error(json.error ?? "Submit failed");
  }

  return json;
}

interface RawCollector {
  name: string;
  rigs: string[];
}

interface RawTask {
  name: string;
}

export async function fetchCollectors(): Promise<Collector[]> {
  const raw = await apiGet<RawCollector[]>("getCollectors");
  return raw.map((c, i) => ({
    id: `c_${i}_${c.name.replace(/\s/g, "_")}`,
    name: c.name,
    rigs: c.rigs ?? [],
  }));
}

export async function fetchTasks(): Promise<Task[]> {
  const raw = await apiGet<RawTask[]>("getTasks");
  return raw.map((t, i) => ({
    id: `t_${i}_${t.name.replace(/\s/g, "_")}`,
    name: t.name,
    label: t.name,
  }));
}

export async function fetchTodayLog(collectorName: string): Promise<LogEntry[]> {
  return apiGet<LogEntry[]>("getTodayLog", { collector: collectorName });
}

export async function fetchCollectorStats(collectorName: string): Promise<CollectorStats> {
  return apiGet<CollectorStats>("getCollectorStats", { collector: collectorName });
}

export async function submitAction(payload: SubmitPayload): Promise<SubmitResponse> {
  return apiPost(payload);
}

export async function fetchRecollections(): Promise<string[]> {
  return apiGet<string[]>("getRecollections");
}

export async function fetchFullLog(collectorName?: string): Promise<FullLogEntry[]> {
  const params: Record<string, string> = {};
  if (collectorName) params.collector = collectorName;
  console.log("[API] fetchFullLog", collectorName);
  return apiGet<FullLogEntry[]>("getFullLog", params);
}

export async function fetchTaskActualsData(): Promise<TaskActualRow[]> {
  console.log("[API] fetchTaskActualsData");
  return apiGet<TaskActualRow[]>("getTaskActualsSheet");
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  console.log("[API] fetchAdminDashboardData");
  return apiGet<AdminDashboardData>("getAdminDashboardData");
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  console.log("[API] fetchLeaderboard");
  try {
    const data = await apiGet<LeaderboardEntry[]>("getLeaderboard");
    if (data && data.length > 0) return data;
    throw new Error("Empty leaderboard");
  } catch {
    console.log("[API] Leaderboard endpoint not available, building from collectors");
    return [];
  }
}

export async function buildLeaderboardFromCollectors(collectors: { name: string; rigs: string[] }[]): Promise<LeaderboardEntry[]> {
  console.log("[API] buildLeaderboardFromCollectors for", collectors.length, "collectors");
  const SF_NAMES = new Set(["tony a", "veronika t", "travis b"]);
  const results: LeaderboardEntry[] = [];

  const statsPromises = collectors.map(async (c) => {
    try {
      const stats = await fetchCollectorStats(c.name);
      return { collector: c, stats };
    } catch {
      console.log("[API] Failed to fetch stats for", c.name);
      return null;
    }
  });

  const settled = await Promise.all(statsPromises);

  for (const result of settled) {
    if (!result || !result.stats) continue;
    const { collector, stats } = result;
    const hasSFRig = collector.rigs.some(r => r.toUpperCase().includes("SF"));
    const isSFByName = SF_NAMES.has(collector.name.toLowerCase().replace(/\.$/, "").trim());
    const region = (hasSFRig || isSFByName) ? "SF" : "MX";

    results.push({
      rank: 0,
      collectorName: collector.name,
      hoursLogged: stats.weeklyLoggedHours > 0 ? stats.weeklyLoggedHours : stats.totalLoggedHours,
      tasksCompleted: stats.weeklyCompleted > 0 ? stats.weeklyCompleted : stats.totalCompleted,
      tasksAssigned: stats.totalAssigned,
      completionRate: stats.completionRate,
      region,
    });
  }

  results.sort((a, b) => b.hoursLogged - a.hoursLogged);
  results.forEach((e, i) => { e.rank = i + 1; });

  console.log("[API] Built leaderboard with", results.length, "entries");
  return results;
}

export function isApiConfigured(): boolean {
  const url = getScriptUrl();
  console.log("[API] isApiConfigured check:", !!url, url ? url.slice(0, 40) : "EMPTY");
  return !!url;
}
