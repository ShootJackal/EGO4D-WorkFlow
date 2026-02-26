export type Language = "en" | "es";

export interface Translations {
  onboarding: {
    welcome: string;
    welcomeSub: string;
    selectLanguage: string;
    selectTheme: string;
    lightMode: string;
    darkMode: string;
    selectName: string;
    selectNameSub: string;
    selectRig: string;
    selectRigSub: string;
    noRigs: string;
    next: string;
    back: string;
    getStarted: string;
    letsGo: string;
    step: string;
    of: string;
    skipRig: string;
  };
  tabs: {
    collect: string;
    live: string;
    stats: string;
    tools: string;
  };
  common: {
    assign: string;
    done: string;
    cancel: string;
    save: string;
    retry: string;
    loading: string;
    error: string;
    hours: string;
    notes: string;
    task: string;
    collector: string;
    open: string;
  };
  headers: {
    collect: string;
    taskflow: string;
    stats: string;
    tools: string;
    leaderboard: string;
  };
  tools: {
    myProfile: string;
    whoAreYou: string;
    yourRig: string;
    selectName: string;
    selectRig: string;
    noRigsAssigned: string;
    collectionTimer: string;
    switchToLight: string;
    switchToDark: string;
    lightDesc: string;
    darkDesc: string;
    quickActions: string;
    language: string;
    clearCaches: string;
    clearCachesDesc: string;
    settingsUtilities: string;
    adminDashboard: string;
    dataViewer: string;
  };
  stats: {
    today: string;
    thisWeek: string;
    allTime: string;
    assigned: string;
    completed: string;
    uploaded: string;
    active: string;
    noCollector: string;
    noCollectorDesc: string;
    loadingStats: string;
    loadingLeaderboard: string;
    failedStats: string;
    failedLeaderboard: string;
    noLeaderboard: string;
    recentCompletions: string;
    recentTasks: string;
    combined: string;
    rankings: string;
    mxVsSf: string;
  };
  collect: {
    taskManagement: string;
    workspace: string;
    chooseTask: string;
    enterHours: string;
    hoursRequired: string;
    hoursHint: string;
    addNotes: string;
    optional: string;
    saveNoteOnly: string;
    todayActivity: string;
    searchTasks: string;
    tasksFound: string;
    plannedChunk: string;
  };
  live: {
    rigsActive: string;
    quickStart: string;
    syncing: string;
    liveLabel: string;
    offLabel: string;
    resync: string;
    myStats: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    onboarding: {
      welcome: "Welcome to TaskFlow",
      welcomeSub: "Let's set up your workspace",
      selectLanguage: "CHOOSE LANGUAGE",
      selectTheme: "CHOOSE THEME",
      lightMode: "Light",
      darkMode: "Dark",
      selectName: "WHO ARE YOU?",
      selectNameSub: "Select your collector name",
      selectRig: "YOUR RIG",
      selectRigSub: "Select the rig you'll be using",
      noRigs: "No rigs assigned — you can set this later in Tools",
      next: "NEXT",
      back: "BACK",
      getStarted: "GET STARTED",
      letsGo: "LET'S GO",
      step: "Step",
      of: "of",
      skipRig: "SKIP FOR NOW",
    },
    tabs: {
      collect: "Collect",
      live: "LIVE",
      stats: "Stats",
      tools: "Tools",
    },
    common: {
      assign: "Assign",
      done: "Done",
      cancel: "Cancel",
      save: "Save",
      retry: "RETRY",
      loading: "Loading...",
      error: "Error",
      hours: "Hours",
      notes: "Notes",
      task: "Task",
      collector: "Collector",
      open: "open",
    },
    headers: {
      collect: "COLLECT",
      taskflow: "TASKFLOW",
      stats: "STATS",
      tools: "TOOLS",
      leaderboard: "LEADERBOARD",
    },
    tools: {
      myProfile: "My Profile",
      whoAreYou: "Who are you?",
      yourRig: "Your Rig",
      selectName: "Select your name...",
      selectRig: "Select your rig...",
      noRigsAssigned: "No rigs assigned",
      collectionTimer: "Collection Timer",
      switchToLight: "Switch to Light Mode",
      switchToDark: "Switch to Dark Mode",
      lightDesc: "Easier on the eyes outdoors",
      darkDesc: "Better for low-light collection",
      quickActions: "Quick Actions",
      language: "Language",
      clearCaches: "Clear All Caches",
      clearCachesDesc: "Force refresh all data from server",
      settingsUtilities: "Settings & Utilities",
      adminDashboard: "Admin Dashboard",
      dataViewer: "Data Viewer",
    },
    stats: {
      today: "TODAY",
      thisWeek: "THIS WEEK (MON-SUN)",
      allTime: "ALL TIME",
      assigned: "Assigned",
      completed: "Completed",
      uploaded: "Uploaded",
      active: "Active",
      noCollector: "No Collector Selected",
      noCollectorDesc: "Set your profile in the Tools tab to view stats",
      loadingStats: "Loading stats...",
      loadingLeaderboard: "Loading leaderboard...",
      failedStats: "Failed to load stats",
      failedLeaderboard: "Failed to load leaderboard",
      noLeaderboard: "No leaderboard data available",
      recentCompletions: "RECENT COMPLETIONS",
      recentTasks: "Recent Tasks",
      combined: "Combined",
      rankings: "Rankings",
      mxVsSf: "MX vs SF THIS WEEK",
    },
    collect: {
      taskManagement: "Task Management",
      workspace: "'s Workspace",
      chooseTask: "Choose a task...",
      enterHours: "Enter hours (e.g. 1.5)",
      hoursRequired: "required",
      hoursHint: "You must enter your actual hours before submitting",
      addNotes: "Add notes...",
      optional: "optional",
      saveNoteOnly: "Save Note Only",
      todayActivity: "Today's Activity",
      searchTasks: "Search tasks...",
      tasksFound: "tasks found...",
      plannedChunk: "Planned chunk:",
    },
    live: {
      rigsActive: "rigs active",
      quickStart: "QUICK START",
      syncing: "SYNCING",
      liveLabel: "LIVE",
      offLabel: "OFF",
      resync: "RESYNC",
      myStats: "MY STATS",
    },
  },
  es: {
    onboarding: {
      welcome: "Bienvenido a TaskFlow",
      welcomeSub: "Configuremos tu espacio de trabajo",
      selectLanguage: "ELIGE IDIOMA",
      selectTheme: "ELIGE TEMA",
      lightMode: "Claro",
      darkMode: "Oscuro",
      selectName: "¿QUIÉN ERES?",
      selectNameSub: "Selecciona tu nombre de recolector",
      selectRig: "TU RIG",
      selectRigSub: "Selecciona el rig que vas a usar",
      noRigs: "Sin rigs asignados — puedes configurarlo después en Herramientas",
      next: "SIGUIENTE",
      back: "ATRÁS",
      getStarted: "COMENZAR",
      letsGo: "¡VAMOS!",
      step: "Paso",
      of: "de",
      skipRig: "OMITIR POR AHORA",
    },
    tabs: {
      collect: "Recolectar",
      live: "EN VIVO",
      stats: "Estadísticas",
      tools: "Herramientas",
    },
    common: {
      assign: "Asignar",
      done: "Hecho",
      cancel: "Cancelar",
      save: "Guardar",
      retry: "REINTENTAR",
      loading: "Cargando...",
      error: "Error",
      hours: "Horas",
      notes: "Notas",
      task: "Tarea",
      collector: "Recolector",
      open: "abiertas",
    },
    headers: {
      collect: "RECOLECTAR",
      taskflow: "TASKFLOW",
      stats: "ESTADÍSTICAS",
      tools: "HERRAMIENTAS",
      leaderboard: "CLASIFICACIÓN",
    },
    tools: {
      myProfile: "Mi Perfil",
      whoAreYou: "¿Quién eres?",
      yourRig: "Tu Rig",
      selectName: "Selecciona tu nombre...",
      selectRig: "Selecciona tu rig...",
      noRigsAssigned: "Sin rigs asignados",
      collectionTimer: "Temporizador",
      switchToLight: "Cambiar a Modo Claro",
      switchToDark: "Cambiar a Modo Oscuro",
      lightDesc: "Mejor para exteriores",
      darkDesc: "Mejor para poca luz",
      quickActions: "Acciones Rápidas",
      language: "Idioma",
      clearCaches: "Limpiar Caché",
      clearCachesDesc: "Actualizar datos del servidor",
      settingsUtilities: "Ajustes y Utilidades",
      adminDashboard: "Panel de Admin",
      dataViewer: "Visor de Datos",
    },
    stats: {
      today: "HOY",
      thisWeek: "ESTA SEMANA (LUN-DOM)",
      allTime: "TOTAL",
      assigned: "Asignadas",
      completed: "Completadas",
      uploaded: "Subidas",
      active: "Activas",
      noCollector: "Sin Recolector",
      noCollectorDesc: "Configura tu perfil en Herramientas para ver estadísticas",
      loadingStats: "Cargando estadísticas...",
      loadingLeaderboard: "Cargando clasificación...",
      failedStats: "Error al cargar estadísticas",
      failedLeaderboard: "Error al cargar clasificación",
      noLeaderboard: "Sin datos de clasificación",
      recentCompletions: "COMPLETADAS RECIENTES",
      recentTasks: "Tareas Recientes",
      combined: "Todos",
      rankings: "Clasificación",
      mxVsSf: "MX vs SF ESTA SEMANA",
    },
    collect: {
      taskManagement: "Gestión de Tareas",
      workspace: " — Espacio de Trabajo",
      chooseTask: "Elige una tarea...",
      enterHours: "Ingresa horas (ej. 1.5)",
      hoursRequired: "obligatorio",
      hoursHint: "Debes ingresar tus horas antes de enviar",
      addNotes: "Agregar notas...",
      optional: "opcional",
      saveNoteOnly: "Guardar Solo Nota",
      todayActivity: "Actividad de Hoy",
      searchTasks: "Buscar tareas...",
      tasksFound: "tareas encontradas...",
      plannedChunk: "Bloque planeado:",
    },
    live: {
      rigsActive: "rigs activos",
      quickStart: "INICIO RÁPIDO",
      syncing: "SINCRONIZANDO",
      liveLabel: "EN VIVO",
      offLabel: "FUERA",
      resync: "RESINCRONIZAR",
      myStats: "MIS DATOS",
    },
  },
};
