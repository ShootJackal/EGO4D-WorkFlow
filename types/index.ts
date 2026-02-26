export interface Collector {
  id: string;
  name: string;
  rigs: string[];
}

export interface Task {
  id: string;
  name: string;
  label: string;
}

export type ActionType = "ASSIGN" | "COMPLETE" | "CANCEL" | "NOTE_ONLY";

export type AssignmentStatus = "In Progress" | "Completed" | "Partial" | "Canceled";

export interface LogEntry {
  assignmentId: string;
  taskId: string;
  taskName: string;
  status: AssignmentStatus | string;
  loggedHours: number;
  plannedHours: number;
  remainingHours: number;
  notes: string;
  assignedDate: string;
  completedDate: string;
}

export interface TaskMeta {
  taskId: string;
  status: string;
  requiredHours: number;
  collectedHours: number;
  remainingHours: number;
  plannedChunk: number;
  goodHours: number;
}

export interface SubmitPayload {
  collector: string;
  task: string;
  hours: number;
  actionType: ActionType;
  notes: string;
}

export interface SubmitResponse {
  success: boolean;
  error?: string;
  action?: string;
  message?: string;
  assignmentId?: string;
  planned?: number;
  hours?: number;
  remaining?: number;
  status?: string;
  dailyPlanned?: number;
}

export interface ActivityEntry {
  id: string;
  collectorName: string;
  taskName: string;
  action: ActionType;
  hoursLogged: number;
  plannedHours: number;
  status: string;
  timestamp: number;
  notes: string;
}

export interface CollectorStats {
  collectorName: string;
  totalAssigned: number;
  totalCompleted: number;
  totalCanceled: number;
  totalLoggedHours: number;
  totalPlannedHours: number;
  weeklyLoggedHours: number;
  weeklyCompleted: number;
  activeTasks: number;
  completionRate: number;
  avgHoursPerTask: number;
  topTasks: { name: string; hours: number; status: string }[];
}

export interface TaskActualRow {
  taskName: string;
  status: string;
  collectedHours: number;
  goodHours: number;
  remainingHours: number;
  lastRedash: string;
}

export interface FullLogEntry {
  collector: string;
  taskName: string;
  status: string;
  loggedHours: number;
  plannedHours: number;
  remainingHours: number;
  assignedDate: string;
}

export interface AdminDashboardData {
  recollections: string[];
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  recollectTasks: number;
}

export interface LeaderboardEntry {
  rank: number;
  collectorName: string;
  hoursLogged: number;
  tasksCompleted: number;
  tasksAssigned: number;
  completionRate: number;
  region: string;
}

export interface AdminCollectorDetail {
  name: string;
  rigs: string[];
  email: string;
  totalHours: number;
  rating: string;
}

export interface TaskRequirement {
  taskName: string;
  requiredHours: number;
  collectedHours: number;
  remainingHours: number;
  status: string;
}
