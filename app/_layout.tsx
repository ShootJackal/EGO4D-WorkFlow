import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet, Animated, Platform, Dimensions, TouchableOpacity } from "react-native";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { CollectionProvider } from "@/providers/CollectionProvider";

SplashScreen.preventAutoHideAsync();

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
  const [booted, setBooted] = useState(false);
  const handleBootComplete = useCallback(() => setBooted(true), []);

  return (
    <>
      <RootLayoutNav />
      {!booted && <BootSequence onComplete={handleBootComplete} />}
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
        <AppWithBoot />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
