import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  StickyNote,
  AlertCircle,
  Circle,
  Info,
  Clock,
  Search,
  X,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useCollection } from "@/providers/CollectionProvider";
import { useTheme } from "@/providers/ThemeProvider";
import SelectPicker from "@/components/SelectPicker";
import ActionButton from "@/components/ActionButton";

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });
const LOGO_URI = require("@/assets/images/taskflow-logo.png");

function LogEntryRow({ entry, statusColor, colors, isLast }: {
  entry: { taskName: string; status: string; loggedHours: number; plannedHours: number; remainingHours: number; notes: string };
  statusColor: string;
  colors: any;
  isLast: boolean;
}) {
  const isActive = entry.status === "In Progress" || entry.status === "Partial";
  const pct = entry.plannedHours > 0 ? Math.min(entry.loggedHours / entry.plannedHours, 1) : 0;

  return (
    <View style={[logStyles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <View style={logStyles.rowLeft}>
        <View style={[logStyles.statusStripe, { backgroundColor: statusColor }]} />
        <View style={logStyles.rowContent}>
          <Text style={[logStyles.taskName, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.taskName}
          </Text>
          <View style={logStyles.metaRow}>
            <View style={[logStyles.statusBadge, { backgroundColor: statusColor + '14' }]}>
              <Text style={[logStyles.statusText, { color: statusColor }]}>
                {entry.status}
              </Text>
            </View>
            <Text style={[logStyles.hours, { color: colors.textMuted }]}>
              {entry.loggedHours}h / {entry.plannedHours}h
            </Text>
            {entry.remainingHours > 0 && (
              <Text style={[logStyles.remaining, { color: colors.statusPending }]}>
                {entry.remainingHours}h left
              </Text>
            )}
          </View>
          {isActive && (
            <View style={[logStyles.progressTrack, { backgroundColor: colors.bgInput }]}>
              <View style={[logStyles.progressFill, { backgroundColor: statusColor, width: `${Math.round(pct * 100)}%` as any }]} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const logStyles = StyleSheet.create({
  row: { paddingVertical: 10 },
  rowLeft: { flexDirection: "row", gap: 10 },
  statusStripe: { width: 3, borderRadius: 2, minHeight: 30 },
  rowContent: { flex: 1 },
  taskName: { fontSize: 13, fontWeight: "600" as const, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "600" as const },
  hours: { fontSize: 11 },
  remaining: { fontSize: 11, fontWeight: "500" as const },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 6, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
});

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    configured,
    collectors,
    tasks,
    selectedCollectorName,
    selectedCollector,
    selectedRig,
    selectedTaskName,
    hoursToLog,
    notes,
    openTasks,
    todayLog,
    isLoadingCollectors,
    isLoadingTasks,
    isLoadingLog,
    isSubmitting,
    submitError,
    selectCollector,
    setSelectedTaskName,
    setHoursToLog,
    setNotes,
    assignTask,
    completeTask,
    cancelTask,
    addNote,
    refreshData,
  } = useCollection();

  const [refreshing, setRefreshing] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const collectorOptions = useMemo(
    () => collectors.map((c) => ({ value: c.name, label: c.name })),
    [collectors]
  );

  const taskOptions = useMemo(
    () => {
      const allTasks = tasks.map((t) => ({ value: t.name, label: t.label }));
      if (!taskSearch.trim()) return allTasks;
      const q = taskSearch.toLowerCase();
      return allTasks.filter((t) => t.label.toLowerCase().includes(q));
    },
    [tasks, taskSearch]
  );

  const hasValidHours = !!hoursToLog.trim() && parseFloat(hoursToLog) > 0;
  const canSubmit = !!selectedCollectorName && !!selectedTaskName;
  const canSubmitWithHours = canSubmit && hasValidHours;
  const latestOpenTask = openTasks.length > 0 ? openTasks[0] : null;
  const plannedHoursHint = latestOpenTask ? latestOpenTask.plannedHours : 0;

  const toggleTaskSearch = useCallback(() => {
    const next = !showTaskSearch;
    setShowTaskSearch(next);
    Animated.timing(searchAnim, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: false }).start();
    if (!next) setTaskSearch("");
  }, [showTaskSearch, searchAnim]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const handleAssign = useCallback(async () => {
    try { await assignTask(); } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to assign task");
    }
  }, [assignTask]);

  const handleComplete = useCallback(async () => {
    if (!latestOpenTask) return;
    try { await completeTask(latestOpenTask.taskName); } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to complete task");
    }
  }, [completeTask, latestOpenTask]);

  const handleCancel = useCallback(async () => {
    if (!latestOpenTask) return;
    Alert.alert("Cancel Task", `Cancel "${latestOpenTask.taskName}"?`, [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
        try { await cancelTask(latestOpenTask.taskName); } catch (e: unknown) {
          Alert.alert("Error", e instanceof Error ? e.message : "Failed to cancel");
        }
      }},
    ]);
  }, [cancelTask, latestOpenTask]);

  const handleAddNote = useCallback(async () => {
    if (!latestOpenTask || !notes.trim()) return;
    try { await addNote(latestOpenTask.taskName); } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save note");
    }
  }, [addNote, latestOpenTask, notes]);

  const todayStats = useMemo(() => {
    const completed = todayLog.filter((e) => e.status === "Completed").length;
    const totalLogged = todayLog.reduce((s, e) => s + e.loggedHours, 0);
    const totalPlanned = todayLog.reduce((s, e) => s + e.plannedHours, 0);
    return { completed, totalLogged, totalPlanned, total: todayLog.length };
  }, [todayLog]);

  const getStatusColor = useCallback((status: string) => {
    if (status === "Completed") return colors.statusActive;
    if (status === "Partial") return colors.statusPending;
    if (status === "Canceled") return colors.statusCancelled;
    return colors.accent;
  }, [colors]);

  const cardShadow = {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />
          }
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.brandText, { color: colors.accent, fontFamily: FONT_MONO }]}>
                COLLECT
              </Text>
              <Text style={[styles.brandSub, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
                {selectedCollector ? `${selectedCollector.name.split(" ")[0]}'s Workspace` : "Task Management"}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Image
                source={LOGO_URI}
                style={styles.headerLogo}
                contentFit="contain"
              />
              {selectedRig !== "" && (
                <Text style={[styles.rigLabel, { color: colors.textMuted, fontFamily: FONT_MONO }]}>{selectedRig}</Text>
              )}
              {openTasks.length > 0 && (
                <View style={[styles.openPill, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
                  <Circle size={6} color={colors.accent} fill={colors.accent} />
                  <Text style={[styles.openPillText, { color: colors.accent }]}>{openTasks.length} open</Text>
                </View>
              )}
            </View>
          </View>

          {!configured && (
            <View style={[styles.notice, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
              <AlertCircle size={14} color={colors.statusPending} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL to connect
              </Text>
            </View>
          )}

          {!!submitError && (
            <View style={[styles.notice, { backgroundColor: colors.cancelBg, borderColor: colors.cancel + "25" }]}>
              <AlertCircle size={14} color={colors.cancel} />
              <Text style={[styles.noticeText, { color: colors.cancel }]}>{submitError}</Text>
            </View>
          )}

          <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
            {!selectedCollectorName && (
              <View style={styles.formField}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Collector</Text>
                  {isLoadingCollectors && <ActivityIndicator size="small" color={colors.accent} />}
                </View>
                <SelectPicker
                  label=""
                  options={collectorOptions}
                  selectedValue={selectedCollectorName}
                  onValueChange={selectCollector}
                  placeholder="Who are you? (set in Tools)"
                  testID="collector-picker"
                />
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              </View>
            )}

            <View style={styles.formField}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Task</Text>
                <View style={styles.fieldRowRight}>
                  {isLoadingTasks && <ActivityIndicator size="small" color={colors.accent} />}
                  <TouchableOpacity
                    onPress={toggleTaskSearch}
                    style={[styles.searchToggle, {
                      backgroundColor: showTaskSearch ? colors.accentSoft : 'transparent',
                    }]}
                    activeOpacity={0.7}
                    testID="task-search-toggle"
                  >
                    {showTaskSearch ? <X size={14} color={colors.accent} /> : <Search size={14} color={colors.textMuted} />}
                  </TouchableOpacity>
                </View>
              </View>

              {showTaskSearch && (
                <Animated.View style={[styles.searchWrap, {
                  opacity: searchAnim,
                  maxHeight: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }),
                }]}>
                  <View style={[styles.searchBar, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                    <Search size={13} color={colors.textMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                      value={taskSearch}
                      onChangeText={setTaskSearch}
                      placeholder="Search tasks..."
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                      testID="task-search-input"
                    />
                    {taskSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setTaskSearch("")} activeOpacity={0.7}>
                        <X size={13} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )}

              <SelectPicker
                label=""
                options={taskOptions}
                selectedValue={selectedTaskName}
                onValueChange={setSelectedTaskName}
                placeholder={taskSearch ? `${taskOptions.length} tasks found...` : "Choose a task..."}
                testID="task-picker"
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.formField}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Hours</Text>
                <Text style={[styles.requiredTag, { color: colors.cancel }]}>required</Text>
              </View>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.bgInput,
                  borderColor: !hoursToLog.trim() ? colors.statusPending + '60' : colors.border,
                  color: colors.textPrimary,
                }]}
                value={hoursToLog}
                onChangeText={setHoursToLog}
                placeholder="Enter hours (e.g. 1.5)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                testID="hours-input"
              />
              {!hoursToLog.trim() && (
                <View style={styles.hintRow}>
                  <AlertCircle size={10} color={colors.statusPending} />
                  <Text style={[styles.hintText, { color: colors.statusPending }]}>
                    You must enter your actual hours before submitting
                  </Text>
                </View>
              )}
              {latestOpenTask && plannedHoursHint > 0 && (
                <View style={styles.hintRow}>
                  <Info size={10} color={colors.statusPending} />
                  <Text style={[styles.hintText, { color: colors.statusPending }]}>
                    Planned chunk: {plannedHoursHint}h
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.formField}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes</Text>
                <Text style={[styles.optionalTag, { color: colors.textMuted }]}>optional</Text>
              </View>
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="notes-input"
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <ActionButton
              title="Assign"
              icon={<UserCheck size={15} color={colors.assign} />}
              color={colors.assign}
              bgColor={colors.assignBg}
              onPress={handleAssign}
              disabled={!canSubmitWithHours || isSubmitting}
              loading={isSubmitting}
              testID="assign-btn"
            />
            <ActionButton
              title="Done"
              icon={<CheckCircle size={15} color={colors.complete} />}
              color={colors.complete}
              bgColor={colors.completeBg}
              onPress={handleComplete}
              disabled={!latestOpenTask || !hasValidHours || isSubmitting}
              loading={isSubmitting}
              testID="complete-btn"
            />
            <ActionButton
              title="Cancel"
              icon={<XCircle size={15} color={colors.cancel} />}
              color={colors.cancel}
              bgColor={colors.cancelBg}
              onPress={handleCancel}
              disabled={!latestOpenTask || isSubmitting}
              loading={isSubmitting}
              testID="cancel-btn"
            />
          </View>

          {latestOpenTask !== null && notes.trim().length > 0 && (
            <ActionButton
              title="Save Note Only"
              icon={<StickyNote size={15} color={colors.accent} />}
              color={colors.accent}
              bgColor={colors.accentSoft}
              onPress={handleAddNote}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              testID="note-btn"
            />
          )}

          {selectedCollectorName !== "" && todayLog.length > 0 && (
            <View style={[styles.logCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
              <View style={styles.logHeader}>
                <View style={styles.logHeaderLeft}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={[styles.logTitle, { color: colors.textMuted }]}>{"Today's Activity"}</Text>
                </View>
                <View style={styles.logStats}>
                  <Text style={[styles.logStatText, { color: colors.complete }]}>
                    {todayStats.completed} done
                  </Text>
                  <Text style={[styles.logStatDivider, { color: colors.border }]}>|</Text>
                  <Text style={[styles.logStatText, { color: colors.accent }]}>
                    {todayStats.totalLogged.toFixed(1)}h
                  </Text>
                </View>
              </View>
              {isLoadingLog && <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 6 }} />}
              {todayLog.slice(0, 12).map((entry, idx) => (
                <LogEntryRow
                  key={entry.assignmentId || `log_${idx}`}
                  entry={entry}
                  statusColor={getStatusColor(entry.status)}
                  colors={colors}
                  isLast={idx === Math.min(todayLog.length - 1, 11)}
                />
              ))}
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 140 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {},
  headerRight: { alignItems: "flex-end", gap: 4 },
  headerLogo: {
    width: 28,
    height: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  brandText: { fontSize: 22, fontWeight: "900" as const, letterSpacing: 4 },
  brandSub: { fontSize: 9, letterSpacing: 1, marginTop: 2 },
  rigLabel: { fontSize: 9, letterSpacing: 0.5 },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  openPillText: { fontSize: 11, fontWeight: "600" as const },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  formCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  formField: { paddingVertical: 2 },
  fieldLabel: { fontSize: 11, fontWeight: "700" as const, marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  fieldRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionalTag: { fontSize: 10, fontWeight: "500" as const },
  requiredTag: { fontSize: 10, fontWeight: "700" as const },
  separator: { height: 1, marginVertical: 10 },
  searchToggle: {
    width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  searchWrap: { marginBottom: 6, overflow: "hidden" },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 8 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontWeight: "500" as const, borderWidth: 1 },
  notesInput: { minHeight: 56, fontSize: 13 },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 6 },
  hintText: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: "500" as const },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  logCard: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.08)",
  },
  logHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  logTitle: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1, textTransform: "uppercase" },
  logStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  logStatText: { fontSize: 11, fontWeight: "600" as const },
  logStatDivider: { fontSize: 10 },
  spacer: { height: 20 },
});
