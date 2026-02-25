import { useState, useEffect, useCallback, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { LightTheme, DarkTheme, ThemeColors } from "@/constants/colors";

type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "ci_theme_mode";

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setMode(stored);
      }
      setLoaded(true);
    });
  }, []);

  const isDark = useMemo(() => {
    if (mode === "system") return systemScheme === "dark";
    return mode === "dark";
  }, [mode, systemScheme]);

  const colors = useMemo<ThemeColors>(() => {
    return isDark ? DarkTheme : LightTheme;
  }, [isDark]);

  const setThemeMode = useCallback(async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem(THEME_KEY, newMode);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = isDark ? "light" : "dark";
    await setThemeMode(next);
  }, [isDark, setThemeMode]);

  return {
    mode,
    isDark,
    colors,
    loaded,
    setThemeMode,
    toggleTheme,
  };
});
