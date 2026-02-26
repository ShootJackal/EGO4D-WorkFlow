import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Globe, Sun, Moon, ChevronRight, Check, User, Cpu } from "lucide-react-native";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { LanguageProvider, useLanguage } from "@/providers/LanguageProvider";
import { CollectionProvider } from "@/providers/CollectionProvider";
import { fetchCollectors } from "@/services/googleSheets";
import { Collector } from "@/types";

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = "tf_onboarding_complete";
const COLLECTOR_STORAGE_KEY = "ci_selected_collector";
const RIG_STORAGE_KEY = "ci_selected_rig";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "online",
    },
    mutations: {
      retry: 1,
      networkMode: "online",
    },
  },
});

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

const BOOT_MESSAGES_POOL = [
  "Making sure both hands are in frame...",
  "Raising daily collection hours to 7hrs...",
  "Making EGO RIGs heavier...",
  "Calibrating the vibes...",
  "Convincing rigs to cooperate...",
  "Asking Redash nicely for data...",
  "Untangling USB cables mentally...",
  "Syncing with the mothership...",
  "Running rig diagnostics... beep boop...",
  "Warming up the data pipeline...",
  "Teaching rigs to smile for the camera...",
  "Optimizing snack break algorithms...",
  "Bribing the Wi-Fi gods...",
  "Checking if the coffee machine is connected...",
  "Polishing the lens caps...",
  "Negotiating with the cloud...",
  "Counting frames... slowly...",
  "Reminding rigs to hydrate...",
  "Loading the good vibes...",
  "Double-checking the checklist...",
  "Making sure nobody unplugged anything...",
  "Aligning the collection stars...",
  "Charging the vibe batteries...",
  "Petting the server hamsters...",
];

function pickRandomMessages(count: number): string[] {
  const shuffled = [...BOOT_MESSAGES_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ------------------------------------------------------------------ */
/*  Onboarding Wizard (first launch: language, theme, collector, rig)  */
/* ------------------------------------------------------------------ */

function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { colors, isDark, setThemeMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [step, setStep] = useState(0);
  const [selectedName, setSelectedName] = useState("");
  const [selectedRig, setSelectedRig] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const collectorsQuery = useQuery<Collector[]>({
    queryKey: ["collectors"],
    queryFn: async () => {
      const raw = await fetchCollectors();
      const map = new Map<string, Collector>();
      for (const c of raw) {
        const key = c.name.replace(/\s*\(.*?\)\s*$/g, "").trim();
        if (map.has(key)) {
          const existing = map.get(key)!;
          map.set(key, { ...existing, rigs: [...new Set([...existing.rigs, ...c.rigs])] });
        } else {
          map.set(key, { ...c, name: key });
        }
      }
      return Array.from(map.values());
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const collectors = collectorsQuery.data ?? [];
  const selectedCollector = collectors.find((c) => c.name === selectedName);
  const rigs = selectedCollector?.rigs ?? [];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const animateStep = useCallback(
    (next: number) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: next > step ? -30 : 30, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setStep(next);
        slideAnim.setValue(next > step ? 30 : -30);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim, step]
  );

  const handleFinish = useCallback(async () => {
    if (selectedName) await AsyncStorage.setItem(COLLECTOR_STORAGE_KEY, selectedName);
    if (selectedRig) await AsyncStorage.setItem(RIG_STORAGE_KEY, selectedRig);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  }, [selectedName, selectedRig, onComplete]);

  const TOTAL_STEPS = 3;
  const bgColor = isDark ? "#0C0C0E" : "#FAF8F3";
  const cardBg = isDark ? "#1E1E22" : "#FFFFFF";
  const borderColor = isDark ? "#2E2E34" : "#E5E1D8";
  const inputBg = isDark ? "#222226" : "#F5F2EB";

  return (
    <View style={[obStyles.container, { backgroundColor: bgColor }]}>
      <View style={obStyles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              obStyles.progressDot,
              {
                backgroundColor: i <= step ? colors.accent : borderColor,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[obStyles.stepIndicator, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
        {t.onboarding.step} {step + 1} {t.onboarding.of} {TOTAL_STEPS}
      </Text>
      <Animated.View style={[obStyles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {step === 0 && (
          <View style={obStyles.stepInner}>
            <Text style={[obStyles.title, { color: colors.accent, fontFamily: FONT_MONO }]}>{t.onboarding.welcome}</Text>
            <Text style={[obStyles.subtitle, { color: colors.textSecondary }]}>{t.onboarding.welcomeSub}</Text>
            <Text style={[obStyles.sectionLabel, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
              {t.onboarding.selectLanguage}
            </Text>
            <View style={obStyles.optionRow}>
              <TouchableOpacity
                style={[
                  obStyles.optionCard,
                  {
                    backgroundColor: language === "en" ? colors.accentSoft : cardBg,
                    borderColor: language === "en" ? colors.accent : borderColor,
                  },
                ]}
                onPress={() => setLanguage("en")}
                activeOpacity={0.7}
              >
                <Globe size={22} color={language === "en" ? colors.accent : colors.textMuted} />
                <Text style={[obStyles.optionLabel, { color: language === "en" ? colors.accent : colors.textPrimary }]}>
                  English
                </Text>
                {language === "en" && <Check size={16} color={colors.accent} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  obStyles.optionCard,
                  {
                    backgroundColor: language === "es" ? colors.accentSoft : cardBg,
                    borderColor: language === "es" ? colors.accent : borderColor,
                  },
                ]}
                onPress={() => setLanguage("es")}
                activeOpacity={0.7}
              >
                <Globe size={22} color={language === "es" ? colors.accent : colors.textMuted} />
                <Text style={[obStyles.optionLabel, { color: language === "es" ? colors.accent : colors.textPrimary }]}>
                  Español
                </Text>
                {language === "es" && <Check size={16} color={colors.accent} />}
              </TouchableOpacity>
            </View>
            <Text style={[obStyles.sectionLabel, { color: colors.textMuted, fontFamily: FONT_MONO, marginTop: 24 }]}>
              {t.onboarding.selectTheme}
            </Text>
            <View style={obStyles.optionRow}>
              <TouchableOpacity
                style={[
                  obStyles.optionCard,
                  {
                    backgroundColor: !isDark ? colors.accentSoft : cardBg,
                    borderColor: !isDark ? colors.accent : borderColor,
                  },
                ]}
                onPress={() => setThemeMode("light")}
                activeOpacity={0.7}
              >
                <Sun size={22} color={!isDark ? colors.accent : colors.textMuted} />
                <Text style={[obStyles.optionLabel, { color: !isDark ? colors.accent : colors.textPrimary }]}>
                  {t.onboarding.lightMode}
                </Text>
                {!isDark && <Check size={16} color={colors.accent} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  obStyles.optionCard,
                  {
                    backgroundColor: isDark ? colors.accentSoft : cardBg,
                    borderColor: isDark ? colors.accent : borderColor,
                  },
                ]}
                onPress={() => setThemeMode("dark")}
                activeOpacity={0.7}
              >
                <Moon size={22} color={isDark ? colors.accent : colors.textMuted} />
                <Text style={[obStyles.optionLabel, { color: isDark ? colors.accent : colors.textPrimary }]}>
                  {t.onboarding.darkMode}
                </Text>
                {isDark && <Check size={16} color={colors.accent} />}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {step === 1 && (
          <View style={obStyles.stepInner}>
            <View style={[obStyles.stepIconWrap, { backgroundColor: colors.accentSoft }]}>
              <User size={28} color={colors.accent} />
            </View>
            <Text style={[obStyles.title, { color: colors.accent, fontFamily: FONT_MONO }]}>{t.onboarding.selectName}</Text>
            <Text style={[obStyles.subtitle, { color: colors.textSecondary }]}>{t.onboarding.selectNameSub}</Text>
            {collectorsQuery.isLoading ? (
              <View style={obStyles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[obStyles.loadingText, { color: colors.textMuted }]}>{t.common.loading}</Text>
              </View>
            ) : (
              <View style={[obStyles.listCard, { backgroundColor: cardBg, borderColor }]}>
                <FlatList
                  data={collectors}
                  keyExtractor={(item) => item.name}
                  style={obStyles.list}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item.name === selectedName;
                    return (
                      <TouchableOpacity
                        style={[obStyles.listItem, { backgroundColor: isSelected ? colors.accentSoft : "transparent" }]}
                        onPress={() => {
                          setSelectedName(item.name);
                          setSelectedRig("");
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={obStyles.listItemLeft}>
                          <Text
                            style={[
                              obStyles.listItemName,
                              {
                                color: isSelected ? colors.accent : colors.textPrimary,
                                fontWeight: isSelected ? "700" : "400",
                              },
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.rigs.length > 0 && (
                            <Text style={[obStyles.listItemSub, { color: colors.textMuted }]}>{item.rigs.join(", ")}</Text>
                          )}
                        </View>
                        {isSelected && <Check size={18} color={colors.accent} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
          </View>
        )}
        {step === 2 && (
          <View style={obStyles.stepInner}>
            <View style={[obStyles.stepIconWrap, { backgroundColor: colors.completeBg }]}>
              <Cpu size={28} color={colors.complete} />
            </View>
            <Text style={[obStyles.title, { color: colors.accent, fontFamily: FONT_MONO }]}>{t.onboarding.selectRig}</Text>
            <Text style={[obStyles.subtitle, { color: colors.textSecondary }]}>{t.onboarding.selectRigSub}</Text>
            {rigs.length > 0 ? (
              <View style={[obStyles.listCard, { backgroundColor: cardBg, borderColor }]}>
                <FlatList
                  data={rigs}
                  keyExtractor={(item) => item}
                  style={obStyles.rigList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedRig;
                    return (
                      <TouchableOpacity
                        style={[
                          obStyles.rigItem,
                          {
                            backgroundColor: isSelected ? colors.accentSoft : inputBg,
                            borderColor: isSelected ? colors.accent : borderColor,
                          },
                        ]}
                        onPress={() => setSelectedRig(item)}
                        activeOpacity={0.7}
                      >
                        <Cpu size={16} color={isSelected ? colors.accent : colors.textMuted} />
                        <Text
                          style={[
                            obStyles.rigItemText,
                            {
                              color: isSelected ? colors.accent : colors.textPrimary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {item}
                        </Text>
                        {isSelected && <Check size={16} color={colors.accent} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : (
              <View style={[obStyles.noRigsCard, { backgroundColor: inputBg, borderColor }]}>
                <Text style={[obStyles.noRigsText, { color: colors.textMuted }]}>{t.onboarding.noRigs}</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
      <View style={obStyles.navRow}>
        {step > 0 ? (
          <TouchableOpacity style={[obStyles.backBtn, { borderColor }]} onPress={() => animateStep(step - 1)} activeOpacity={0.7}>
            <Text style={[obStyles.backText, { color: colors.textSecondary, fontFamily: FONT_MONO }]}>
              {t.onboarding.back}
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[
              obStyles.nextBtn,
              { backgroundColor: colors.accent, opacity: step === 1 && !selectedName ? 0.4 : 1 },
            ]}
            onPress={() => animateStep(step + 1)}
            disabled={step === 1 && !selectedName}
            activeOpacity={0.8}
          >
            <Text style={[obStyles.nextText, { color: colors.white, fontFamily: FONT_MONO }]}>{t.onboarding.next}</Text>
            <ChevronRight size={16} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[obStyles.nextBtn, { backgroundColor: colors.accent }]} onPress={handleFinish} activeOpacity={0.8}>
            <Text style={[obStyles.nextText, { color: colors.white, fontFamily: FONT_MONO }]}>
              {rigs.length === 0 || selectedRig ? t.onboarding.letsGo : t.onboarding.skipRig}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const obStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 },
  progressDot: { height: 8, borderRadius: 4 },
  stepIndicator: { textAlign: "center", fontSize: 10, letterSpacing: 1.5, marginBottom: 20 },
  stepContent: { flex: 1 },
  stepInner: { flex: 1 },
  title: { fontSize: 24, fontWeight: "900" as const, letterSpacing: 3, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.5, marginBottom: 12 },
  optionRow: { flexDirection: "row", gap: 12 },
  optionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  optionLabel: { fontSize: 14, fontWeight: "600" as const },
  stepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 13 },
  listCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  list: { flex: 1 },
  listItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  listItemLeft: { flex: 1 },
  listItemName: { fontSize: 15 },
  listItemSub: { fontSize: 11, marginTop: 2 },
  rigList: { flex: 1 },
  rigItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  rigItemText: { flex: 1, fontSize: 15 },
  noRigsCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center" },
  noRigsText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  backText: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 1.5 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextText: { fontSize: 13, fontWeight: "800" as const, letterSpacing: 2 },
});

/* ------------------------------------------------------------------ */
/*  Boot Sequence (terminal + ENTER SYSTEM)                            */
/* ------------------------------------------------------------------ */

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const { colors, isDark } = useTheme();
  const [lines, setLines] = useState<string[]>([]);
  const [phase, setPhase] = useState<"booting" | "ready">("booting");
  const fadeOut = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const enterScale = useRef(new Animated.Value(0)).current;
  const enterGlow = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;

  const bootLines = useRef([
    "TASKFLOW SYSTEM v3.0.1",
    "Initializing modules...",
    "Loading collection engine...",
    ...pickRandomMessages(5),
    "Systems online. Welcome to TaskFlow.",
  ]).current;

  useEffect(() => {
    Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [logoOpacity, cursorBlink]);

  useEffect(() => {
    if (phase !== "booting") return;

    let idx = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const addLine = () => {
      if (idx >= bootLines.length) {
        setPhase("ready");
        return;
      }
      const line = bootLines[idx];
      const prefix = idx < 3 ? "\u25B8 " : "$ ";
      setLines(prev => [...prev.slice(-6), `${prefix}${line}`]);
      idx++;

      Animated.timing(progressAnim, {
        toValue: (idx / bootLines.length) * 100,
        duration: 200,
        useNativeDriver: false,
      }).start();

      timeoutId = setTimeout(addLine, 500 + Math.random() * 400);
    };

    timeoutId = setTimeout(addLine, 800);
    return () => clearTimeout(timeoutId);
  }, [phase, bootLines, progressAnim]);

  useEffect(() => {
    if (phase !== "ready") return;

    Animated.timing(progressAnim, { toValue: 100, duration: 300, useNativeDriver: false }).start();

    Animated.spring(enterScale, {
      toValue: 1, speed: 10, bounciness: 8, useNativeDriver: true, delay: 200,
    }).start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(enterGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(enterGlow, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [phase, enterScale, enterGlow, progressAnim]);

  const handleEnter = useCallback(() => {
    Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
      onComplete();
    });
  }, [fadeOut, onComplete]);

  const bgColor = colors.bg;
  const accentColor = colors.accent;
  const dimColor = colors.terminalDim;
  const shadowColor = colors.shadow;
  const cardBg = isDark ? colors.bgCard : colors.bgSecondary;

  return (
    <Animated.View style={[bootStyles.container, { backgroundColor: bgColor, opacity: fadeOut }]}>
      <Animated.View
        style={[
          bootStyles.logoWrap,
          bootStyles.logoCard,
          {
            opacity: logoOpacity,
            backgroundColor: cardBg,
            borderColor: colors.border,
            shadowColor,
          },
        ]}
      >
        <Text style={[bootStyles.logoText, { color: accentColor, fontFamily: FONT_MONO }]}>
          TASKFLOW
        </Text>
        <Text style={[bootStyles.logoSub, { color: dimColor, fontFamily: FONT_MONO }]}>
          COLLECTION SYSTEM
        </Text>
      </Animated.View>

      <View style={[bootStyles.terminalArea, bootStyles.terminalCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
        {lines.map((line, idx) => (
          <Text
            key={`boot_${idx}`}
            style={[bootStyles.termLine, {
              color: line.startsWith("\u25B8") ? dimColor : accentColor,
              fontFamily: FONT_MONO,
            }]}
          >
            {line}
          </Text>
        ))}
        {phase === "booting" && (
          <Animated.Text style={[bootStyles.cursor, { color: colors.terminalGreen, opacity: cursorBlink, fontFamily: FONT_MONO }]}>
            $ _
          </Animated.Text>
        )}
      </View>

      <View style={bootStyles.progressWrap}>
        <View style={[bootStyles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[bootStyles.progressFill, {
              backgroundColor: accentColor,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }]}
          />
        </View>
        <Text style={[bootStyles.progressLabel, { color: dimColor, fontFamily: FONT_MONO }]}>
          {phase === "ready" ? "READY" : "LOADING"}
        </Text>
      </View>

      {phase === "ready" && (
        <Animated.View style={[bootStyles.enterWrap, { transform: [{ scale: enterScale }] }]}>
          <Animated.View
            style={[bootStyles.enterGlow, { backgroundColor: accentColor, opacity: enterGlow }]}
          />
          <TouchableOpacity
            style={[
              bootStyles.enterBtn,
              {
                backgroundColor: accentColor,
                shadowColor: colors.shadow,
                borderColor: colors.accentDim,
              },
            ]}
            onPress={handleEnter}
            activeOpacity={0.8}
            testID="enter-system-btn"
          >
            <Text style={[bootStyles.enterText, { color: '#FFFFFF', fontFamily: FONT_MONO }]}>
              ENTER SYSTEM
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const bootStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  logoWrap: { alignItems: "center", marginBottom: 48 },
  logoCard: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  logoText: { fontSize: 36, fontWeight: "900" as const, letterSpacing: 8 },
  logoSub: { fontSize: 9, letterSpacing: 4, marginTop: 8 },
  terminalArea: {
    width: Dimensions.get("window").width * 0.85,
    maxWidth: 380,
    minHeight: 140,
    paddingBottom: 8,
  },
  terminalCard: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  termLine: { fontSize: 11, lineHeight: 20, letterSpacing: 0.3 },
  cursor: { fontSize: 12, lineHeight: 20 },
  progressWrap: {
    width: Dimensions.get("window").width * 0.6,
    maxWidth: 280,
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  progressTrack: { width: "100%", height: 2, borderRadius: 1, overflow: "hidden" },
  progressFill: { height: 2, borderRadius: 1 },
  progressLabel: { fontSize: 9, letterSpacing: 2 },
  enterWrap: { marginTop: 36, alignItems: "center", justifyContent: "center" },
  enterGlow: { position: "absolute", width: 220, height: 56, borderRadius: 28 },
  enterBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  enterText: { fontSize: 13, fontWeight: "800" as const, letterSpacing: 3 },
});

function RootLayoutNav() {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <CollectionProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={{ headerBackTitle: "Back" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </CollectionProvider>
    </GestureHandlerRootView>
  );
}

function AppWithBoot() {
  const queryClient = useQueryClient();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboarded(val === "true");
    });
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["savedCollector"] });
    queryClient.invalidateQueries({ queryKey: ["savedRig"] });
    setOnboarded(true);
  }, [queryClient]);
  const handleBootComplete = useCallback(() => setBooted(true), []);

  if (onboarded === null) return null;

  return (
    <>
      <RootLayoutNav />
      {!onboarded && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      {onboarded && !booted && <BootSequence onComplete={handleBootComplete} />}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AppWithBoot />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
