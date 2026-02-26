import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, CheckCircle, Target, Inbox, Calendar, Trophy, Medal, Crown, Upload, ChevronDown, RefreshCw, AlertCircle } from "lucide-react-native";
import { Image } from "expo-image";
import { useCollection } from "@/providers/CollectionProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { fetchCollectorStats, fetchLeaderboard, buildLeaderboardFromCollectors } from "@/services/googleSheets";
import { useLanguage } from "@/providers/LanguageProvider";
import { CollectorStats, LeaderboardEntry } from "@/types";

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });
const LOGO_URI = require("@/assets/images/taskflow-logo.png");

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}

type LeaderboardTab = "combined" | "sf" | "mx";

function getWeekLabel(weeksAgo: number): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  if (weeksAgo === 0) return `This Week (${fmt(monday)} - ${fmt(sunday)})`;
  if (weeksAgo === 1) return `Last Week (${fmt(monday)} - ${fmt(sunday)})`;
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

function AnimatedBar({ value, maxValue, color, delay }: { value: number; maxValue: number; color: string; delay: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pct = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
    Animated.timing(widthAnim, { toValue: pct * 100, duration: 800, delay, useNativeDriver: false }).start();
  }, [value, maxValue, delay, widthAnim]);

  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 5, borderRadius: 3, backgroundColor: "rgba(128,128,128,0.08)", overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
});

function HeroStat({ label, value, icon, color, index }: { label: string; value: string; icon: React.ReactNode; color: string; index: number }) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, speed: 22, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[styles.heroCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.heroIconWrap, { backgroundColor: color + "12" }]}>{icon}</View>
      <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.heroLabel, { color: colors.textMuted }]}>{label}</Text>
    </Animated.View>
  );
}

function LeaderboardRow({ entry, index, isCurrentUser, colors }: { entry: LeaderboardEntry; index: number; isCurrentUser: boolean; colors: any }) {
  const rankColor = entry.rank === 1 ? colors.gold : entry.rank === 2 ? colors.silver : entry.rank === 3 ? colors.bronze : colors.textMuted;
  const rankBg = entry.rank === 1 ? colors.goldBg : entry.rank === 2 ? colors.silverBg : entry.rank === 3 ? colors.bronzeBg : colors.bgInput;
  const regionColor = entry.region === "MX" ? colors.mxOrange : entry.region === "SF" ? colors.sfBlue : colors.accent;

  return (
    <View style={[lbStyles.row, {
      backgroundColor: isCurrentUser ? colors.accentSoft : "transparent",
      borderColor: isCurrentUser ? colors.accentDim : "transparent",
      borderWidth: isCurrentUser ? 1 : 0,
      borderRadius: 12,
    }]}>
      <View style={[lbStyles.rankBadge, { backgroundColor: rankBg }]}>
        {entry.rank <= 3 ? (
          <Crown size={12} color={rankColor} />
        ) : (
          <Text style={[lbStyles.rankText, { color: rankColor }]}>{entry.rank}</Text>
        )}
      </View>
      <View style={lbStyles.info}>
        <View style={lbStyles.nameRow}>
          <Text style={[lbStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.collectorName}
          </Text>
          {entry.region ? (
            <View style={[lbStyles.regionTag, { backgroundColor: regionColor + '14' }]}>
              <Text style={[lbStyles.regionText, { color: regionColor }]}>{entry.region}</Text>
            </View>
          ) : null}
        </View>
        <View style={lbStyles.statsRow}>
          <Text style={[lbStyles.statVal, { color: colors.accent }]}>{entry.hoursLogged.toFixed(1)}h</Text>
          <Text style={[lbStyles.statSep, { color: colors.border }]}>|</Text>
          <Text style={[lbStyles.statVal, { color: colors.complete }]}>{entry.tasksCompleted} done</Text>
          <Text style={[lbStyles.statSep, { color: colors.border }]}>|</Text>
          <Text style={[lbStyles.statVal, { color: colors.textMuted }]}>{entry.completionRate.toFixed(0)}%</Text>
        </View>
      </View>
      <AnimatedBar value={entry.hoursLogged} maxValue={40} color={rankColor} delay={index * 50 + 200} />
    </View>
  );
}

const lbStyles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", position: "absolute", left: 12, top: 10 },
  rankText: { fontSize: 12, fontWeight: "700" as const },
  info: { marginLeft: 40, flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  name: { fontSize: 14, fontWeight: "600" as const, flex: 1 },
  regionTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  regionText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statVal: { fontSize: 11, fontWeight: "500" as const },
  statSep: { fontSize: 10 },
});

function RetryButton({ onRetry, colors }: { onRetry: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[retryStyles.btn, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}
      onPress={onRetry}
      activeOpacity={0.7}
    >
      <RefreshCw size={13} color={colors.accent} />
      <Text style={[retryStyles.text, { color: colors.accent, fontFamily: FONT_MONO }]}>RETRY</Text>
    </TouchableOpacity>
  );
}

const retryStyles = StyleSheet.create({
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1, alignSelf: "center", marginTop: 12,
  },
  text: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1 },
});

function ComparisonCard({ mxHours, sfHours, mxCompleted, sfCompleted, colors }: {
  mxHours: number; sfHours: number; mxCompleted: number; sfCompleted: number; colors: any;
}) {
  const totalHours = mxHours + sfHours;
  const mxPct = totalHours > 0 ? (mxHours / totalHours) * 100 : 50;

  return (
    <View style={[compStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <Text style={[compStyles.title, { color: colors.textMuted }]}>MX vs SF THIS WEEK</Text>
      <View style={compStyles.barWrap}>
        <View style={[compStyles.barLeft, { backgroundColor: colors.mxOrange, width: `${Math.max(mxPct, 5)}%` as any }]}>
          <Text style={compStyles.barLabel}>MX</Text>
        </View>
        <View style={[compStyles.barRight, { backgroundColor: colors.sfBlue, width: `${Math.max(100 - mxPct, 5)}%` as any }]}>
          <Text style={compStyles.barLabel}>SF</Text>
        </View>
      </View>
      <View style={compStyles.statsWrap}>
        <View style={compStyles.statCol}>
          <Text style={[compStyles.statValue, { color: colors.mxOrange }]}>{mxHours.toFixed(1)}h</Text>
          <Text style={[compStyles.statSub, { color: colors.textMuted }]}>MX Hours</Text>
        </View>
        <View style={[compStyles.divider, { backgroundColor: colors.border }]} />
        <View style={compStyles.statCol}>
          <Text style={[compStyles.statValue, { color: colors.sfBlue }]}>{sfHours.toFixed(1)}h</Text>
          <Text style={[compStyles.statSub, { color: colors.textMuted }]}>SF Hours</Text>
        </View>
        <View style={[compStyles.divider, { backgroundColor: colors.border }]} />
        <View style={compStyles.statCol}>
          <Text style={[compStyles.statValue, { color: colors.mxOrange }]}>{mxCompleted}</Text>
          <Text style={[compStyles.statSub, { color: colors.textMuted }]}>MX Done</Text>
        </View>
        <View style={[compStyles.divider, { backgroundColor: colors.border }]} />
        <View style={compStyles.statCol}>
          <Text style={[compStyles.statValue, { color: colors.sfBlue }]}>{sfCompleted}</Text>
          <Text style={[compStyles.statSub, { color: colors.textMuted }]}>SF Done</Text>
        </View>
      </View>
    </View>
  );
}

const compStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  title: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.2, marginBottom: 10 },
  barWrap: { flexDirection: "row", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 12 },
  barLeft: { justifyContent: "center", alignItems: "center" },
  barRight: { justifyContent: "center", alignItems: "center" },
  barLabel: { color: "#fff", fontSize: 10, fontWeight: "800" as const, letterSpacing: 1 },
  statsWrap: { flexDirection: "row", alignItems: "center" },
  statCol: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "700" as const },
  statSub: { fontSize: 9, marginTop: 2 },
  divider: { width: 1, height: 24 },
});

export default function StatsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { selectedCollector, selectedCollectorName, selectedRig, todayLog, configured, collectors } = useCollection();
  const [refreshing, setRefreshing] = useState(false);
  const [lbTab, setLbTab] = useState<LeaderboardTab>("combined");
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  const normalizedName = useMemo(() => normalizeCollectorName(selectedCollectorName), [selectedCollectorName]);

  const statsQuery = useQuery<CollectorStats>({
    queryKey: ["collectorStats", selectedCollectorName],
    queryFn: () => fetchCollectorStats(selectedCollectorName),
    enabled: configured && !!selectedCollectorName,
    staleTime: 60000,
    retry: 2,
  });

  const leaderboardQuery = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", collectors.length],
    queryFn: async () => {
      const apiData = await fetchLeaderboard();
      if (apiData && apiData.length > 0) return apiData;
      if (collectors.length > 0) {
        return buildLeaderboardFromCollectors(collectors);
      }
      return [];
    },
    enabled: configured && collectors.length > 0,
    staleTime: 120000,
    retry: 2,
  });

  const localStats = useMemo(() => {
    const completed = todayLog.filter((e) => e.status === "Completed").length;
    const totalLogged = todayLog.reduce((s, e) => s + e.loggedHours, 0);
    const active = todayLog.filter((e) => e.status === "In Progress" || e.status === "Partial").length;
    return { completed, totalLogged, active, total: todayLog.length };
  }, [todayLog]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (leaderboardQuery.data && leaderboardQuery.data.length > 0) {
      return leaderboardQuery.data;
    }
    return [];
  }, [leaderboardQuery.data]);

  const { sfEntries, mxEntries, regionStats } = useMemo(() => {
    const sf: LeaderboardEntry[] = [];
    const mx: LeaderboardEntry[] = [];
    for (const e of leaderboard) {
      if (e.region === "SF") sf.push({ ...e });
      else mx.push({ ...e, region: e.region || "MX" });
    }
    sf.sort((a, b) => b.hoursLogged - a.hoursLogged);
    mx.sort((a, b) => b.hoursLogged - a.hoursLogged);

    const sfRanked = sf.map((e, i) => ({ ...e, rank: i + 1 }));
    const mxRanked = mx.map((e, i) => ({ ...e, rank: i + 1 }));

    const mxHours = mx.reduce((s, e) => s + e.hoursLogged, 0);
    const sfHours = sf.reduce((s, e) => s + e.hoursLogged, 0);
    const mxCompleted = mx.reduce((s, e) => s + e.tasksCompleted, 0);
    const sfCompleted = sf.reduce((s, e) => s + e.tasksCompleted, 0);

    return {
      sfEntries: sfRanked,
      mxEntries: mxRanked,
      regionStats: { mxHours, sfHours, mxCompleted, sfCompleted },
    };
  }, [leaderboard]);

  const recentCompleted = useMemo(() => {
    return leaderboard
      .filter(e => e.tasksCompleted > 0)
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 8)
      .map(e => ({
        name: e.collectorName,
        tasks: e.tasksCompleted,
        region: e.region || "MX",
      }));
  }, [leaderboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    statsQuery.refetch();
    leaderboardQuery.refetch();
    setTimeout(() => setRefreshing(false), 1200);
  }, [statsQuery, leaderboardQuery]);

  const stats = statsQuery.data;

  const cardShadow = { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 };

  const tabItems: { key: LeaderboardTab; label: string; color: string }[] = [
    { key: "combined", label: "All", color: colors.accent },
    { key: "mx", label: "MX", color: colors.mxOrange },
    { key: "sf", label: "SF", color: colors.sfBlue },
  ];

  const currentLbEntries = lbTab === "sf" ? sfEntries : lbTab === "mx" ? mxEntries : leaderboard;

  if (!selectedCollector) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Inbox size={44} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.stats.noCollector}</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.stats.noCollectorDesc}</Text>
      </View>
    );
  }

  const isInitialLoad = statsQuery.isLoading && !statsQuery.data;
  const isStatsError = statsQuery.isError;
  const isLbError = leaderboardQuery.isError;
  const isLbLoading = leaderboardQuery.isLoading && !leaderboardQuery.data;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
    >
      <View
        style={[
          styles.pageHeader,
          styles.pageHeaderElevated,
          {
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.headerBorder,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View>
          <Text style={[styles.brandText, { color: colors.accent, fontFamily: FONT_MONO }]}>{t.headers.stats}</Text>
          <Text style={[styles.brandSub, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
            {normalizeCollectorName(selectedCollector.name)}
          </Text>
        </View>
        <View style={styles.pageHeaderRight}>
          <Image source={LOGO_URI} style={styles.headerLogo} contentFit="contain" />
          {selectedRig !== "" && (
            <Text style={[styles.rigBadge, { color: colors.textMuted, fontFamily: FONT_MONO }]}>{selectedRig}</Text>
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Calendar size={12} color={colors.accent} />
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>{t.stats.today}</Text>
      </View>

      <View style={styles.heroGrid}>
        <HeroStat label={t.stats.assigned} value={String(localStats.total)} icon={<Target size={18} color={colors.accent} />} color={colors.accent} index={0} />
        <HeroStat label={t.stats.completed} value={String(localStats.completed)} icon={<CheckCircle size={18} color={colors.complete} />} color={colors.complete} index={1} />
        <HeroStat label={t.stats.uploaded} value={`${localStats.totalLogged.toFixed(1)}h`} icon={<Upload size={18} color={colors.statusPending} />} color={colors.statusPending} index={2} />
        <HeroStat label={t.stats.active} value={String(localStats.active)} icon={<TrendingUp size={18} color={colors.accentLight} />} color={colors.accentLight} index={3} />
      </View>

      {isInitialLoad && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.stats.loadingStats}</Text>
        </View>
      )}

      {isStatsError && !stats && (
        <View style={[styles.errorCard, { backgroundColor: colors.cancelBg, borderColor: colors.cancel + '25' }]}>
          <AlertCircle size={14} color={colors.cancel} />
          <Text style={[styles.errorText, { color: colors.cancel }]}>{t.stats.failedStats}</Text>
          <RetryButton onRetry={() => statsQuery.refetch()} colors={colors} />
        </View>
      )}

      {stats && stats.weeklyLoggedHours > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Calendar size={12} color={colors.complete} />
            <Text style={[styles.sectionLabel, { color: colors.complete }]}>{t.stats.thisWeek}</Text>
          </View>
          <View style={[styles.weekCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
            <View style={styles.weekRow}>
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.accent }]}>{stats.weeklyLoggedHours.toFixed(1)}h</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Hours</Text>
              </View>
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.complete }]}>{stats.weeklyCompleted}</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Done</Text>
              </View>
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.textPrimary }]}>{stats.avgHoursPerTask.toFixed(1)}h</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Avg/Task</Text>
              </View>
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.complete }]}>{stats.completionRate.toFixed(0)}%</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Rate</Text>
              </View>
            </View>
          </View>
        </>
      )}

      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Trophy size={12} color={colors.gold} />
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>{t.headers.leaderboard}</Text>
      </View>

      <View style={[styles.lbTabRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {tabItems.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.lbTabBtn, lbTab === tab.key && { backgroundColor: tab.color + '18', borderColor: tab.color + '40' }]}
            onPress={() => setLbTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.lbTabText, {
              color: lbTab === tab.key ? tab.color : colors.textMuted,
              fontWeight: lbTab === tab.key ? "700" as const : "500" as const,
            }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.weekDropdown, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
          onPress={() => setShowWeekPicker(!showWeekPicker)}
          activeOpacity={0.7}
        >
          <Text style={[styles.weekDropdownText, { color: colors.textSecondary, fontFamily: FONT_MONO }]}>
            {selectedWeek === 0 ? "This Week" : selectedWeek === 1 ? "Last Week" : `${selectedWeek}w ago`}
          </Text>
          <ChevronDown size={12} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {showWeekPicker && (
        <View style={[styles.weekPickerWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {[0, 1, 2, 3].map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.weekPickerItem, selectedWeek === w && { backgroundColor: colors.accentSoft }]}
              onPress={() => { setSelectedWeek(w); setShowWeekPicker(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekPickerText, {
                color: selectedWeek === w ? colors.accent : colors.textSecondary,
                fontWeight: selectedWeek === w ? "700" as const : "400" as const,
              }]}>
                {getWeekLabel(w)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {lbTab === "combined" && leaderboard.length > 0 && (
        <ComparisonCard
          mxHours={regionStats.mxHours}
          sfHours={regionStats.sfHours}
          mxCompleted={regionStats.mxCompleted}
          sfCompleted={regionStats.sfCompleted}
          colors={colors}
        />
      )}

      {isLbLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.stats.loadingLeaderboard}</Text>
        </View>
      )}

      {isLbError && leaderboard.length === 0 && (
        <View style={[styles.errorCard, { backgroundColor: colors.cancelBg, borderColor: colors.cancel + '25' }]}>
          <AlertCircle size={14} color={colors.cancel} />
          <Text style={[styles.errorText, { color: colors.cancel }]}>{t.stats.failedLeaderboard}</Text>
          <RetryButton onRetry={() => leaderboardQuery.refetch()} colors={colors} />
        </View>
      )}

      {!isLbLoading && currentLbEntries.length > 0 ? (
        <View style={[styles.leaderboardCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
          <View style={styles.lbHeaderRow}>
            <Text style={[styles.lbHeaderText, { color: colors.textMuted }]}>
              {lbTab === "sf" ? "San Francisco" : lbTab === "mx" ? "Los Cabos (MX)" : "Combined"} Rankings
            </Text>
            <Medal size={14} color={colors.gold} />
          </View>
          {currentLbEntries.slice(0, 20).map((entry, idx) => (
            <LeaderboardRow
              key={`lb_${lbTab}_${idx}`}
              entry={entry}
              index={idx}
              isCurrentUser={normalizeCollectorName(entry.collectorName).toLowerCase() === normalizedName.toLowerCase()}
              colors={colors}
            />
          ))}
        </View>
      ) : (!isLbLoading && !isLbError && (
        <View style={[styles.lbEmpty, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.lbEmptyText, { color: colors.textMuted }]}>{t.stats.noLeaderboard}</Text>
          <RetryButton onRetry={() => leaderboardQuery.refetch()} colors={colors} />
        </View>
      ))}

      {lbTab === "combined" && recentCompleted.length > 0 && (
        <View style={[styles.recentCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
          <Text style={[styles.recentTitle, { color: colors.textMuted }]}>{t.stats.recentCompletions}</Text>
          {recentCompleted.map((item, idx) => {
            const regionColor = item.region === "MX" ? colors.mxOrange : colors.sfBlue;
            return (
              <View key={`rc_${idx}`} style={[styles.recentRow, { borderBottomColor: colors.border }, idx === recentCompleted.length - 1 && styles.recentRowLast]}>
                <View style={[styles.recentDot, { backgroundColor: regionColor }]} />
                <Text style={[styles.recentName, { color: colors.textSecondary }]} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.recentRegionTag, { backgroundColor: regionColor + '14' }]}>
                  <Text style={[styles.recentRegionText, { color: regionColor }]}>{item.region}</Text>
                </View>
                <Text style={[styles.recentTasks, { color: colors.complete }]}>{item.tasks} done</Text>
              </View>
            );
          })}
        </View>
      )}

      {stats && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <TrendingUp size={12} color={colors.textMuted} />
            <Text style={[styles.sectionLabelMuted, { color: colors.textMuted }]}>{t.stats.allTime}</Text>
          </View>
          <View style={[styles.allTimeCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
            <View style={styles.allTimeGrid}>
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.textPrimary }]}>{stats.totalAssigned}</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Tasks</Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.complete }]}>{stats.totalCompleted}</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Done</Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.accent }]}>{stats.totalLoggedHours.toFixed(0)}h</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Hours</Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.complete }]}>{stats.completionRate.toFixed(0)}%</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Rate</Text>
              </View>
            </View>
            <View style={[styles.allTimeDivider, { backgroundColor: colors.border }]} />
            <AnimatedBar value={stats.totalCompleted} maxValue={stats.totalAssigned || 1} color={colors.complete} delay={400} />
            <Text style={[styles.allTimeSub, { color: colors.textMuted }]}>
              {stats.totalCompleted} of {stats.totalAssigned} tasks completed
            </Text>
          </View>

          {stats.topTasks && stats.topTasks.length > 0 && (
            <View style={[styles.topTasksCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
              <Text style={[styles.topTasksTitle, { color: colors.textMuted }]}>{t.stats.recentTasks}</Text>
              {stats.topTasks.slice(0, 8).map((task, idx) => {
                const dotColor = task.status === "Completed" ? colors.statusActive : task.status === "Canceled" ? colors.statusCancelled : colors.accent;
                return (
                  <View key={`task_${idx}`} style={[styles.topTaskRow, { borderBottomColor: colors.border }, idx === Math.min(stats.topTasks.length - 1, 7) && styles.topTaskLast]}>
                    <View style={[styles.topTaskDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.topTaskName, { color: colors.textSecondary }]} numberOfLines={1}>{task.name}</Text>
                    <Text style={[styles.topTaskHours, { color: dotColor }]}>{task.hours}h</Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 140 },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 22,
    paddingBottom: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderRadius: 12,
  },
  pageHeaderElevated: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pageHeaderRight: { alignItems: "flex-end", gap: 4 },
  headerLogo: {
    width: 28, height: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  brandText: { fontSize: 22, fontWeight: "900" as const, letterSpacing: 4 },
  brandSub: { fontSize: 9, letterSpacing: 1, marginTop: 2 },
  rigBadge: { fontSize: 9, letterSpacing: 0.5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.4, fontWeight: "700" as const },
  sectionLabelMuted: { fontSize: 10, letterSpacing: 1.2, fontWeight: "600" as const },
  heroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  heroCard: {
    flex: 1, minWidth: "44%" as unknown as number, borderRadius: 16, padding: 14, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  heroIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  heroValue: { fontSize: 24, letterSpacing: -0.5, fontWeight: "700" as const },
  heroLabel: { fontSize: 11, marginTop: 2, fontWeight: "500" as const },
  weekCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  weekRow: { flexDirection: "row", alignItems: "center" },
  weekSep: { width: 1, height: 28 },
  weekItem: { flex: 1, alignItems: "center" },
  weekVal: { fontSize: 16, fontWeight: "600" as const },
  weekLbl: { fontSize: 10, marginTop: 3 },
  lbTabRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, borderWidth: 1, padding: 6, marginBottom: 10,
  },
  lbTabBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "transparent",
  },
  lbTabText: { fontSize: 12, letterSpacing: 0.3 },
  weekDropdown: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  weekDropdownText: { fontSize: 10, letterSpacing: 0.3 },
  weekPickerWrap: {
    borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: "hidden",
  },
  weekPickerItem: { paddingHorizontal: 14, paddingVertical: 10 },
  weekPickerText: { fontSize: 13 },
  leaderboardCard: { borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1 },
  lbHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingBottom: 8, marginBottom: 4 },
  lbHeaderText: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" },
  lbEmpty: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 12, alignItems: "center" },
  lbEmptyText: { fontSize: 13 },
  recentCard: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  recentTitle: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.2, marginBottom: 10 },
  recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  recentRowLast: { borderBottomWidth: 0 },
  recentDot: { width: 6, height: 6, borderRadius: 3 },
  recentName: { flex: 1, fontSize: 13, fontWeight: "500" as const },
  recentRegionTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  recentRegionText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.5 },
  recentTasks: { fontSize: 12, fontWeight: "600" as const },
  loadingWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 13 },
  errorCard: {
    flexDirection: "column", alignItems: "center", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, gap: 6,
  },
  errorText: { fontSize: 13, fontWeight: "500" as const },
  allTimeCard: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  allTimeGrid: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  allTimeItem: { flex: 1, alignItems: "center" },
  allTimeSep: { width: 1, height: 24 },
  allTimeVal: { fontSize: 15, fontWeight: "600" as const },
  allTimeLbl: { fontSize: 10, marginTop: 3 },
  allTimeDivider: { height: 1, marginBottom: 10 },
  allTimeSub: { fontSize: 10, marginTop: 8, textAlign: "center" },
  topTasksCard: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  topTasksTitle: { fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 10, fontWeight: "600" as const },
  topTaskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 10 },
  topTaskLast: { borderBottomWidth: 0 },
  topTaskDot: { width: 5, height: 5, borderRadius: 3 },
  topTaskName: { flex: 1, fontSize: 12 },
  topTaskHours: { fontSize: 12, fontWeight: "600" as const },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" },
  spacer: { height: 20 },
});
