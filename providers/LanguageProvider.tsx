import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { translations, Language, Translations } from "@/constants/translations";

const LANGUAGE_KEY = "tf_language";

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [language, setLanguageState] = useState<Language>("en");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "es") {
        setLanguageState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  }, []);

  const t: Translations = useMemo(() => translations[language], [language]);

  return { language, setLanguage, t, loaded };
});
