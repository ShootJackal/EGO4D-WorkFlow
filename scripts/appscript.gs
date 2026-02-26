/**
 * TaskFlow Google Apps Script — v2
 *
 * Reads CA_TAGGED for leaderboard data (collector, site, hours).
 * Uses Collectors sheet (A = Name, B = Rig-ID) to map rigs → names
 * when CA_TAGGED is missing collector names.
 * Region comes from the Site column (C) in CA_TAGGED.
 * Stats pull from both Collector Task Assignments Log AND CA_TAGGED,
 * using the higher hours value.
 * Writes leaderboard results to _AppCache for faster subsequent reads.
 */

/* ------------------------------------------------------------------ */
/*  Globals                                                            */
/* ------------------------------------------------------------------ */

var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

/* ------------------------------------------------------------------ */
/*  Web-app entry points                                               */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var action = (e.parameter.action || '').trim();
  var result;
  try {
    switch (action) {
      case 'getCollectors':       result = handleGetCollectors(); break;
      case 'getTasks':            result = handleGetTasks(); break;
      case 'getTodayLog':         result = handleGetTodayLog(e.parameter.collector || ''); break;
      case 'getCollectorStats':   result = handleGetCollectorStats(e.parameter.collector || ''); break;
      case 'getLeaderboard':      result = handleGetLeaderboard(); break;
      case 'getRecollections':    result = handleGetRecollections(); break;
      case 'getFullLog':          result = handleGetFullLog(e.parameter.collector || ''); break;
      case 'getTaskActualsSheet': result = handleGetTaskActuals(); break;
      case 'getAdminDashboardData': result = handleGetAdminDashboard(); break;
      case 'getAdminCollectors':  result = handleGetAdminCollectors(); break;
      case 'getTaskRequirements': result = handleGetTaskRequirements(); break;
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var result = handleSubmit(body);
    return jsonResponse({ success: true, data: result, message: result.message || 'OK' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/*  Collectors (A = Name, B = Rig-ID)                                  */
/* ------------------------------------------------------------------ */

function handleGetCollectors() {
  var sheet = getSheet('Collectors');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || '').trim();
    var rig  = String(data[i][1] || '').trim();
    if (!name) continue;
    if (!map[name]) map[name] = [];
    if (rig) map[name].push(rig);
  }
  return Object.keys(map).map(function(n) {
    return { name: n, rigs: map[n] };
  });
}

/* ------------------------------------------------------------------ */
/*  Admin: full collector detail list                                   */
/* ------------------------------------------------------------------ */

function handleGetAdminCollectors() {
  var collectorsSheet = getSheet('Collectors');
  if (!collectorsSheet) return [];
  var cData = collectorsSheet.getDataRange().getValues();

  var collectors = {};
  for (var i = 1; i < cData.length; i++) {
    var name  = String(cData[i][0] || '').trim();
    var rig   = String(cData[i][1] || '').trim();
    var email = String(cData[i][2] || '').trim();
    if (!name) continue;
    if (!collectors[name]) {
      collectors[name] = { name: name, rigs: [], email: email, totalHours: 0, rating: '' };
    }
    if (rig) collectors[name].rigs.push(rig);
  }

  var caSheet = getSheet('CA_TAGGED');
  if (caSheet) {
    var caData = caSheet.getDataRange().getValues();
    for (var j = 1; j < caData.length; j++) {
      var cName = String(caData[j][0] || '').trim();
      var hours = parseFloat(caData[j][3]) || 0;
      if (cName && collectors[cName]) {
        collectors[cName].totalHours += hours;
      }
    }
  }

  return Object.keys(collectors).map(function(n) { return collectors[n]; });
}

/* ------------------------------------------------------------------ */
/*  Task Requirements from RS_Task_Req                                 */
/* ------------------------------------------------------------------ */

function handleGetTaskRequirements() {
  var sheet = getSheet('RS_Task_Req');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    rows.push({
      taskName:      String(data[i][0] || ''),
      requiredHours: parseFloat(data[i][1]) || 0,
      collectedHours: parseFloat(data[i][2]) || 0,
      remainingHours: parseFloat(data[i][3]) || 0,
      status:        String(data[i][4] || ''),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Leaderboard — reads CA_TAGGED (the correct sheet)                  */
/* ------------------------------------------------------------------ */

function handleGetLeaderboard() {
  var cached = readCache('leaderboard');
  if (cached) return cached;

  var caSheet = getSheet('CA_TAGGED');
  if (!caSheet) return [];

  var rigToName = buildRigToNameMap();
  var caData = caSheet.getDataRange().getValues();

  var collectors = {};

  for (var i = 1; i < caData.length; i++) {
    var rigOrName = String(caData[i][1] || '').trim();   // B = rig number
    var site      = String(caData[i][2] || '').trim();   // C = site (MX / SF)
    var hours     = parseFloat(caData[i][3]) || 0;       // D = hours
    var nameCell  = String(caData[i][0] || '').trim();   // A = collector name (may be blank)

    var collectorName = nameCell || rigToName[rigOrName] || rigOrName;
    if (!collectorName) continue;

    var region = site.toUpperCase().indexOf('SF') >= 0 ? 'SF' : 'MX';

    if (!collectors[collectorName]) {
      collectors[collectorName] = { name: collectorName, region: region, hours: 0, tasks: 0, assigned: 0 };
    }
    collectors[collectorName].hours += hours;
    collectors[collectorName].tasks += 1;
    collectors[collectorName].assigned += 1;
    if (!collectors[collectorName].region || collectors[collectorName].region === 'MX') {
      collectors[collectorName].region = region;
    }
  }

  var logSheet = getSheet('Collector Task Assignments Log');
  if (logSheet) {
    var logData = logSheet.getDataRange().getValues();
    for (var j = 1; j < logData.length; j++) {
      var logName  = String(logData[j][0] || '').trim();
      var logHours = parseFloat(logData[j][4]) || 0;
      if (logName && collectors[logName]) {
        if (logHours > 0) {
          collectors[logName].hours = Math.max(collectors[logName].hours, collectors[logName].hours);
        }
      } else if (logName) {
        collectors[logName] = { name: logName, region: 'MX', hours: logHours, tasks: 1, assigned: 1 };
      }
    }
  }

  var entries = Object.keys(collectors).map(function(n) { return collectors[n]; });
  entries.sort(function(a, b) { return b.hours - a.hours; });

  var result = entries.map(function(e, idx) {
    var rate = e.assigned > 0 ? Math.round((e.tasks / e.assigned) * 100) : 0;
    return {
      rank:            idx + 1,
      collectorName:   e.name,
      hoursLogged:     e.hours,
      tasksCompleted:  e.tasks,
      tasksAssigned:   e.assigned,
      completionRate:  rate,
      region:          e.region,
    };
  });

  writeCache('leaderboard', result);
  return result;
}

/* ------------------------------------------------------------------ */
/*  Rig-ID → Collector-Name lookup from Collectors sheet               */
/* ------------------------------------------------------------------ */

function buildRigToNameMap() {
  var sheet = getSheet('Collectors');
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || '').trim();
    var rig  = String(data[i][1] || '').trim();
    if (name && rig) map[rig] = name;
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Simple _AppCache read / write                                      */
/* ------------------------------------------------------------------ */

function readCache(key) {
  try {
    var sheet = getSheet('_AppCache');
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        var ts = parseInt(data[i][2], 10) || 0;
        if (Date.now() - ts > 15 * 60 * 1000) return null;
        return JSON.parse(data[i][1]);
      }
    }
  } catch (e) { /* ignore cache read errors */ }
  return null;
}

function writeCache(key, value) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('_AppCache');
    if (!sheet) {
      sheet = ss.insertSheet('_AppCache');
      sheet.appendRow(['key', 'value', 'timestamp']);
    }
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        sheet.getRange(i + 1, 2).setValue(JSON.stringify(value));
        sheet.getRange(i + 1, 3).setValue(Date.now());
        return;
      }
    }
    sheet.appendRow([key, JSON.stringify(value), Date.now()]);
  } catch (e) { /* ignore cache write errors */ }
}

/* ------------------------------------------------------------------ */
/*  Remaining handlers (tasks, logs, stats, etc.)                      */
/* ------------------------------------------------------------------ */

function handleGetTasks() {
  var sheet = getSheet('RS_Task_Req');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var tasks = [];
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || '').trim();
    if (name) tasks.push({ name: name });
  }
  return tasks;
}

function handleGetTodayLog(collector) {
  var sheet = getSheet('Collector Task Assignments Log');
  if (!sheet || !collector) return [];
  var data = sheet.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd');
  var entries = [];
  for (var i = 1; i < data.length; i++) {
    var rowCollector = String(data[i][0] || '').trim();
    if (rowCollector !== collector) continue;
    var dateVal = data[i][6];
    var dateStr = dateVal instanceof Date
      ? Utilities.formatDate(dateVal, 'America/Los_Angeles', 'yyyy-MM-dd')
      : String(dateVal || '');
    if (dateStr.indexOf(today) < 0) continue;
    entries.push({
      assignmentId:  String(data[i][8] || 'a_' + i),
      taskId:        String(data[i][1] || ''),
      taskName:      String(data[i][1] || ''),
      status:        String(data[i][3] || 'In Progress'),
      loggedHours:   parseFloat(data[i][4]) || 0,
      plannedHours:  parseFloat(data[i][5]) || 0,
      remainingHours: parseFloat(data[i][7]) || 0,
      notes:         String(data[i][9] || ''),
      assignedDate:  dateStr,
      completedDate: String(data[i][10] || ''),
    });
  }
  return entries;
}

function handleGetCollectorStats(collector) {
  if (!collector) throw new Error('collector param required');
  var logSheet = getSheet('Collector Task Assignments Log');
  var totalAssigned = 0, totalCompleted = 0, totalCanceled = 0;
  var totalLoggedHours = 0, totalPlannedHours = 0;
  var weeklyLoggedHours = 0, weeklyCompleted = 0, activeTasks = 0;
  var topTasks = [];

  var now = new Date();
  var dayOfWeek = now.getDay();
  var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  var weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  if (logSheet) {
    var data = logSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowName = String(data[i][0] || '').trim();
      if (rowName !== collector) continue;
      totalAssigned++;
      var status = String(data[i][3] || '');
      var logged = parseFloat(data[i][4]) || 0;
      var planned = parseFloat(data[i][5]) || 0;
      totalLoggedHours += logged;
      totalPlannedHours += planned;
      if (status === 'Completed') totalCompleted++;
      else if (status === 'Canceled') totalCanceled++;
      else activeTasks++;

      var dateVal = data[i][6];
      if (dateVal instanceof Date && dateVal >= weekStart) {
        weeklyLoggedHours += logged;
        if (status === 'Completed') weeklyCompleted++;
      }
      topTasks.push({ name: String(data[i][1] || ''), hours: logged, status: status });
    }
  }

  var caSheet = getSheet('CA_TAGGED');
  if (caSheet) {
    var caData = caSheet.getDataRange().getValues();
    var caHours = 0;
    for (var j = 1; j < caData.length; j++) {
      var caName = String(caData[j][0] || '').trim();
      if (caName === collector) {
        caHours += parseFloat(caData[j][3]) || 0;
      }
    }
    if (caHours > totalLoggedHours) {
      totalLoggedHours = caHours;
    }
  }

  var completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
  var avgHoursPerTask = totalCompleted > 0 ? totalLoggedHours / totalCompleted : 0;

  topTasks.sort(function(a, b) { return b.hours - a.hours; });

  return {
    collectorName:    collector,
    totalAssigned:    totalAssigned,
    totalCompleted:   totalCompleted,
    totalCanceled:    totalCanceled,
    totalLoggedHours: totalLoggedHours,
    totalPlannedHours: totalPlannedHours,
    weeklyLoggedHours: weeklyLoggedHours,
    weeklyCompleted:  weeklyCompleted,
    activeTasks:      activeTasks,
    completionRate:   completionRate,
    avgHoursPerTask:  avgHoursPerTask,
    topTasks:         topTasks.slice(0, 10),
  };
}

function handleGetRecollections() {
  var sheet = getSheet('Collector Task Assignments Log');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][3] || '');
    var remaining = parseFloat(data[i][7]) || 0;
    if ((status === 'Partial' || remaining > 0) && status !== 'Completed' && status !== 'Canceled') {
      var task = String(data[i][1] || '');
      var collector = String(data[i][0] || '');
      items.push(collector + ': ' + task + ' (' + remaining + 'h left)');
    }
  }
  return items;
}

function handleGetFullLog(collector) {
  var sheet = getSheet('Collector Task Assignments Log');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var entries = [];
  for (var i = 1; i < data.length; i++) {
    var rowName = String(data[i][0] || '').trim();
    if (collector && rowName !== collector) continue;
    entries.push({
      collector:      rowName,
      taskName:       String(data[i][1] || ''),
      status:         String(data[i][3] || ''),
      loggedHours:    parseFloat(data[i][4]) || 0,
      plannedHours:   parseFloat(data[i][5]) || 0,
      remainingHours: parseFloat(data[i][7]) || 0,
      assignedDate:   String(data[i][6] || ''),
    });
  }
  return entries;
}

function handleGetTaskActuals() {
  var sheet = getSheet('RS_Task_Req');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    rows.push({
      taskName:       String(data[i][0] || ''),
      status:         String(data[i][4] || ''),
      collectedHours: parseFloat(data[i][2]) || 0,
      goodHours:      parseFloat(data[i][5]) || 0,
      remainingHours: parseFloat(data[i][3]) || 0,
      lastRedash:     String(data[i][6] || ''),
    });
  }
  return rows;
}

function handleGetAdminDashboard() {
  var sheet = getSheet('Collector Task Assignments Log');
  var totalTasks = 0, completedTasks = 0, inProgressTasks = 0, recollectTasks = 0;
  var recollections = [];
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      totalTasks++;
      var status = String(data[i][3] || '');
      if (status === 'Completed') completedTasks++;
      else if (status === 'In Progress') inProgressTasks++;
      var remaining = parseFloat(data[i][7]) || 0;
      if ((status === 'Partial' || remaining > 0) && status !== 'Completed' && status !== 'Canceled') {
        recollectTasks++;
        recollections.push(String(data[i][0] || '') + ': ' + String(data[i][1] || '') + ' (' + remaining + 'h)');
      }
    }
  }
  return {
    totalTasks:      totalTasks,
    completedTasks:  completedTasks,
    inProgressTasks: inProgressTasks,
    recollectTasks:  recollectTasks,
    recollections:   recollections,
  };
}

function handleSubmit(body) {
  var collector  = String(body.collector || '').trim();
  var task       = String(body.task || '').trim();
  var hours      = parseFloat(body.hours) || 0;
  var actionType = String(body.actionType || '').trim();
  var notes      = String(body.notes || '').trim();

  if (!collector || !task) throw new Error('collector and task are required');
  if (!actionType) throw new Error('actionType is required');

  var sheet = getSheet('Collector Task Assignments Log');
  if (!sheet) throw new Error('Log sheet not found');

  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'America/Los_Angeles', 'yyyy-MM-dd HH:mm:ss');
  var assignmentId = 'a_' + now.getTime();

  if (actionType === 'ASSIGN') {
    sheet.appendRow([collector, task, '', 'In Progress', hours, hours, dateStr, 0, assignmentId, notes, '']);
    return { success: true, message: 'Task assigned', assignmentId: assignmentId, planned: hours, hours: hours, status: 'In Progress' };
  }

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === collector && String(data[i][1]).trim() === task) {
      if (actionType === 'COMPLETE') {
        sheet.getRange(i + 1, 4).setValue('Completed');
        sheet.getRange(i + 1, 5).setValue(hours);
        sheet.getRange(i + 1, 11).setValue(dateStr);
        if (notes) sheet.getRange(i + 1, 10).setValue(notes);
        return { success: true, message: 'Task completed', hours: hours, status: 'Completed' };
      }
      if (actionType === 'CANCEL') {
        sheet.getRange(i + 1, 4).setValue('Canceled');
        sheet.getRange(i + 1, 11).setValue(dateStr);
        return { success: true, message: 'Task canceled', status: 'Canceled' };
      }
      if (actionType === 'NOTE_ONLY') {
        var existing = String(data[i][9] || '');
        sheet.getRange(i + 1, 10).setValue(existing ? existing + '\n' + notes : notes);
        return { success: true, message: 'Note saved' };
      }
    }
  }

  throw new Error('Task not found for ' + collector + ': ' + task);
}
