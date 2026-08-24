/**
 * Utility for processing static call log API payload.
 * Treats each call log data entry as an individual sales executive's record.
 */

const DEPARTMENTS = ['Domestic Sales', 'International Sales', 'Inside Sales', 'Enterprise Sales'];

// Seeded random number generator (kept for helper/fallback)
export const createSeededRandom = (seed) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
};

// Deterministic index picker
export const getDeterministicIndex = (str, length) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % length;
};

// Helper to normalize phone numbers for matching (removes spaces, dashes, etc.)
export const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[\s\-()]/g, '');
};

// Parse MM:SS or HH:MM:SS to seconds
export const parseDurationToSeconds = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  } else if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  return 0;
};

// Format seconds into MM:SS or HH:MM:SS
export const formatSecondsToMMSS = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Parse date_call and time_call into Date object
export const parseCallDateTime = (dateCall, timeCall) => {
  const dateTimeStr = `${dateCall} ${timeCall}`;
  const dateObj = new Date(dateTimeStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj;
  }
  
  // Manual parser fallback
  const [year, month, day] = dateCall.split('-').map(Number);
  const match = timeCall.match(/^(\d+):(\d+):(\d+)\s*(AM|PM)$/i);
  if (match) {
    let [_, hours, minutes, seconds, ampm] = match;
    hours = Number(hours);
    minutes = Number(minutes);
    seconds = Number(seconds);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
  return new Date(dateCall);
};

// Predefined mock executives fallback
export const MOCK_EXECUTIVES = [
  { id: 'mock-user-1', name: 'John Doe', phoneNumber: '+919876543210', roleName: 'Sales Executive', status: 'approved' },
  { id: 'mock-user-2', name: 'Unknown', phoneNumber: '+919123456789', roleName: 'Sales Executive', status: 'approved' }
];

/**
 * Returns static API response payloads matching the exact JSON format requested.
 */
export const generateStaticApiResponses = () => {
  const apiPayloads = [
    {
      "device_id": "9774d56d682e549c",
      "phone": "+919876543210",
      "up_date": "2026-08-08",
      "call_log_datas": [
        {
          "phone_number": "+919876543210",
          "name": "John Doe",
          "type": "Incoming",
          "duration": "00:45",
          "date_call": "2026-08-08",
          "time_call": "10:30:15 AM",
          "call_record_file": "Call_9876543210_20260808_103015.m4a"
        },
        {
          "phone_number": "+919123456789",
          "name": "Unknown",
          "type": "Outgoing",
          "duration": "01:20",
          "date_call": "2026-08-08",
          "time_call": "11:15:00 AM",
          "call_record_file": "no_recording"
        }
      ]
    }
  ];

  return {
    apiPayloads
  };
};

/**
 * Process raw static API payloads into consolidated call logs.
 * Maps each record in call_log_datas to an executive profile based on call details.
 */
export const processStaticApiPayloads = (apiPayloads) => {
  const consolidatedLogs = [];

  apiPayloads.forEach(payload => {
    payload.call_log_datas.forEach(call => {
      const durationSec = parseDurationToSeconds(call.duration);
      const timestamp = parseCallDateTime(call.date_call, call.time_call);
      
      // Determine call status
      let status = 'connected';
      if (durationSec === 0) {
        if (call.type.toLowerCase() === 'incoming') {
          status = 'missed';
        } else {
          status = 'failed';
        }
      }

      // We treat the name in the call as the executive name
      // Create user id based on phone number to keep it unique
      const userId = `usr-${normalizePhone(call.phone_number)}`;
      const userName = call.name || 'Unknown';

      consolidatedLogs.push({
        id: `${userId}-${call.date_call}-${call.time_call}-${call.phone_number}`,
        userId: userId,
        userName: userName,
        department: DEPARTMENTS[getDeterministicIndex(userId, DEPARTMENTS.length)],
        phoneNumber: call.phone_number,
        type: call.type.toLowerCase(), // 'incoming' or 'outgoing'
        status: status,
        duration: durationSec,
        timestamp: timestamp,
        callRecordFile: call.call_record_file
      });
    });
  });

  return consolidatedLogs;
};

/**
 * Process call logs and return mapped users.
 */
export const generateCallLogs = (usersList) => {
  const { apiPayloads } = generateStaticApiResponses();
  const callLogs = processStaticApiPayloads(apiPayloads);

  // Derive unique users directly from processed logs
  const userMap = {};
  callLogs.forEach(log => {
    if (!userMap[log.userId]) {
      userMap[log.userId] = {
        id: log.userId,
        name: log.userName,
        phoneNumber: log.phoneNumber,
        department: log.department,
        roleName: 'Sales Executive',
        status: 'approved'
      };
    }
  });

  const users = Object.values(userMap);
  
  return {
    callLogs,
    users
  };
};

/**
 * Filter call logs based on date range, selected users, and selected departments.
 */
export const filterCallLogs = (logs, { dateRange, startDate, endDate, selectedUsers, selectedDepartments }) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return logs.filter(log => {
    // 1. Date range filter
    const logTime = new Date(log.timestamp);
    let dateMatch = true;

    if (dateRange === 'today') {
      dateMatch = logTime >= todayStart;
    } else if (dateRange === 'yesterday') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(todayStart.getDate() - 1);
      dateMatch = logTime >= yesterdayStart && logTime < todayStart;
    } else if (dateRange === 'last7') {
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(todayStart.getDate() - 6);
      dateMatch = logTime >= sevenDaysAgo;
    } else if (dateRange === 'last30') {
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(todayStart.getDate() - 29);
      dateMatch = logTime >= thirtyDaysAgo;
    } else if (dateRange === 'custom') {
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        dateMatch = dateMatch && logTime >= sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && logTime <= eDate;
      }
    }

    if (!dateMatch) return false;

    // 2. User filter (multi-select)
    if (selectedUsers && selectedUsers.length > 0) {
      if (!selectedUsers.includes(log.userId)) return false;
    }

    // 3. Department filter (multi-select)
    if (selectedDepartments && selectedDepartments.length > 0) {
      if (!selectedDepartments.includes(log.department)) return false;
    }

    return true;
  });
};

/**
 * Calculate KPI summary stats from filtered call logs.
 */
export const calculateKPIs = (filteredLogs) => {
  const totalCalls = filteredLogs.length;

  // Answered calls: connected & duration > 10 seconds
  const answeredCalls = filteredLogs.filter(
    log => log.status === 'connected' && log.duration > 10
  ).length;

  // Unique numbers reached
  const uniqueNumbers = new Set(filteredLogs.map(log => log.phoneNumber)).size;

  // Total call duration of all connected calls
  const totalDuration = filteredLogs
    .filter(log => log.status === 'connected')
    .reduce((sum, log) => sum + log.duration, 0);

  // Missed calls: incoming calls that were not answered
  const missedCalls = filteredLogs.filter(
    log => log.type === 'incoming' && log.status === 'missed'
  ).length;

  return {
    totalCalls,
    answeredCalls,
    uniqueNumbers,
    totalDuration,
    missedCalls
  };
};

/**
 * Calculate user-wise performance metrics from filtered logs.
 */
export const calculateUserPerformance = (filteredLogs, users) => {
  // Group logs by userId
  const userLogsMap = {};
  users.forEach(user => {
    userLogsMap[user.id] = [];
  });

  filteredLogs.forEach(log => {
    if (userLogsMap[log.userId]) {
      userLogsMap[log.userId].push(log);
    }
  });

  return users.map(user => {
    const logs = userLogsMap[user.id] || [];
    const kpis = calculateKPIs(logs);
    
    return {
      userId: user.id,
      name: user.name,
      department: user.department,
      profilePicUrl: user.profilePicUrl || null,
      ...kpis
    };
  });
};
