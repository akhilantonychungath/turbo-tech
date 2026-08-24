import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import MultiSelectDropdown from './MultiSelectDropdown';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  generateCallLogs, 
  filterCallLogs, 
  calculateKPIs, 
  calculateUserPerformance,
  formatSecondsToMMSS
} from '../../utils/callDataGenerator';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CallDashboard = () => {
  // State for filters
  const [dateRange, setDateRange] = useState('last7'); // today, yesterday, last7, last30, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  
  // State for table search and sort
  const [tableSearch, setTableSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('totalCalls');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch users from Firestore
  const { items: rawUsers, loading: usersLoading } = useFirestoreCollection('users', {
    autoFetch: true
  });

  // Generate call logs deterministically from fetched users
  const { callLogs, users } = useMemo(() => {
    return generateCallLogs(rawUsers);
  }, [rawUsers]);

  // Derive unique departments from generated users
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(users.map(u => u.department))].filter(Boolean);
    return depts.map(dept => ({ value: dept, label: dept }));
  }, [users]);

  // Derive user options for filter
  const userOptions = useMemo(() => {
    return users.map(u => ({ value: u.id, label: u.name }));
  }, [users]);

  // Apply filters to get subset of call logs
  const filteredLogs = useMemo(() => {
    return filterCallLogs(callLogs, {
      dateRange,
      startDate,
      endDate,
      selectedUsers,
      selectedDepartments
    });
  }, [callLogs, dateRange, startDate, endDate, selectedUsers, selectedDepartments]);

  // Calculate KPIs
  const kpiStats = useMemo(() => {
    return calculateKPIs(filteredLogs);
  }, [filteredLogs]);

  // Calculate individual User metrics
  const userPerformance = useMemo(() => {
    // Filter users based on selected filters to only calculate for relevant users
    let filteredUsers = users;
    if (selectedUsers.length > 0) {
      filteredUsers = filteredUsers.filter(u => selectedUsers.includes(u.id));
    }
    if (selectedDepartments.length > 0) {
      filteredUsers = filteredUsers.filter(u => selectedDepartments.includes(u.department));
    }
    const performance = calculateUserPerformance(filteredLogs, filteredUsers);
    // Only display users with active calling activity in the table
    return performance.filter(u => u.totalCalls > 0);
  }, [filteredLogs, users, selectedUsers, selectedDepartments]);

  // Sort and Search User Performance
  const sortedPerformance = useMemo(() => {
    let result = [...userPerformance];
    
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      result = result.filter(u => u.name.toLowerCase().includes(q));
    }

    if (sortColumn) {
      result.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [userPerformance, tableSearch, sortColumn, sortDirection]);

  const selectedUserCalls = useMemo(() => {
    if (!selectedUserDetail) return [];
    return filteredLogs.filter(log => log.userId === selectedUserDetail.userId);
  }, [filteredLogs, selectedUserDetail]);

  // Reset custom dates if dateRange changes from custom
  useEffect(() => {
    if (dateRange !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  }, [dateRange]);

  // Grouped charts data
  const trendData = useMemo(() => {
    const groupFormat = {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today' || dateRange === 'yesterday') {
      // Group by Hour (9 AM to 6 PM)
      for (let h = 9; h <= 18; h++) {
        const label = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
        groupFormat[h] = { label, incoming: 0, outgoing: 0, total: 0 };
      }

      filteredLogs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        if (groupFormat[hour]) {
          if (log.type === 'incoming') groupFormat[hour].incoming++;
          else groupFormat[hour].outgoing++;
          groupFormat[hour].total++;
        }
      });
    } else {
      // Group by Day
      let numDays = 7;
      if (dateRange === 'last30') numDays = 30;
      else if (dateRange === 'custom') {
        const s = startDate ? new Date(startDate) : new Date();
        const e = endDate ? new Date(endDate) : new Date();
        numDays = Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1);
        numDays = Math.min(numDays, 90); // Cap at 90 days
      }

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now);
        if (dateRange === 'custom' && endDate) {
          d.setDate(new Date(endDate).getDate() - i);
        } else {
          d.setDate(now.getDate() - i);
        }
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const key = d.toDateString();
        groupFormat[key] = { label, incoming: 0, outgoing: 0, total: 0 };
      }

      filteredLogs.forEach(log => {
        const key = new Date(log.timestamp).toDateString();
        if (groupFormat[key]) {
          if (log.type === 'incoming') groupFormat[key].incoming++;
          else groupFormat[key].outgoing++;
          groupFormat[key].total++;
        }
      });
    }

    return Object.values(groupFormat);
  }, [filteredLogs, dateRange, startDate, endDate]);

  const outcomeData = useMemo(() => {
    let connected = 0;
    let missed = 0;
    let busy = 0;
    let failed = 0;

    filteredLogs.forEach(log => {
      if (log.status === 'connected') connected++;
      else if (log.status === 'missed') missed++;
      else if (log.status === 'busy') busy++;
      else if (log.status === 'failed') failed++;
    });

    return [
      { name: 'Connected', value: connected, color: '#3B82F6' },
      { name: 'Missed', value: missed, color: '#EF4444' },
      { name: 'Busy', value: busy, color: '#F59E0B' },
      { name: 'Failed', value: failed, color: '#9CA3AF' }
    ].filter(item => item.value > 0);
  }, [filteredLogs]);

  // Helper to format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);

    return parts.join(' ');
  };

  const handleSort = (colName) => {
    if (sortColumn === colName) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colName);
      setSortDirection('desc'); // Default sorting is descending
    }
  };

  const handleRowClick = (userStats) => {
    setSelectedUserDetail(userStats);
    setShowDetailModal(true);
  };

  // CSV Export Action
  const exportToCSV = () => {
    const headers = [
      'User',
      'Department',
      'Total Calls',
      'Answered Calls (Connected > 10s)',
      'Unique Numbers Reached',
      'Total Call Duration',
      'Missed Calls (Incoming Unanswered)'
    ];

    const rows = sortedPerformance.map(u => [
      u.name,
      u.department,
      u.totalCalls,
      u.answeredCalls,
      u.uniqueNumbers,
      formatDuration(u.totalDuration),
      u.missedCalls
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // File name
    const timestampStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Sales_Team_Call_Report_${dateRange}_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for KPI percentages/subtexts
  const connectionRate = kpiStats.totalCalls > 0 
    ? Math.round((kpiStats.answeredCalls / kpiStats.totalCalls) * 100) 
    : 0;

  const totalIncoming = filteredLogs.filter(l => l.type === 'incoming').length;
  const totalOutgoing = filteredLogs.filter(l => l.type === 'outgoing').length;

  const missedIncomingRate = totalIncoming > 0
    ? Math.round((kpiStats.missedCalls / totalIncoming) * 100)
    : 0;

  const avgCallDuration = kpiStats.answeredCalls > 0 
    ? Math.round(kpiStats.totalDuration / kpiStats.answeredCalls) 
    : 0;

  const avgCallsPerNumber = kpiStats.uniqueNumbers > 0 
    ? (kpiStats.totalCalls / kpiStats.uniqueNumbers).toFixed(1) 
    : '0';

  if (usersLoading) {
    return (
      <Layout title="Sales Call Dashboard">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner message="Loading sales executives..." />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sales Call Dashboard">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Header section */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[32px]">call</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sales Team Call Dashboard</h2>
              <p className="text-blue-100 text-xs md:text-sm mt-1">
                Real-time connection performance across all sales executives.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-white/15 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm font-medium">
              Last Synced: Just now
            </span>
            <button
              onClick={exportToCSV}
              disabled={sortedPerformance.length === 0}
              className="bg-[#000E24] hover:bg-[#001a3d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-2.5 shadow-md flex items-center gap-2 text-sm transition-all duration-200"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            
            {/* Date Range quick filter */}
            <div className="w-full lg:w-[220px] flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">📅 Date Range</label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm appearance-none outline-none hover:border-gray-400 cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
                </div>
              </div>
            </div>

            {/* User Multi-select Filter */}
            <div className="w-full lg:flex-1">
              <MultiSelectDropdown
                label="👤 User Filter"
                options={userOptions}
                selectedValues={selectedUsers}
                onChange={setSelectedUsers}
                placeholder="All Sales Executives"
              />
            </div>

            {/* Department Multi-select Filter */}
            <div className="w-full lg:flex-1">
              <MultiSelectDropdown
                label="🏢 Department Filter"
                options={departmentOptions}
                selectedValues={selectedDepartments}
                onChange={setSelectedDepartments}
                placeholder="All Departments"
              />
            </div>

            {/* Clear All Filters Button */}
            {(selectedUsers.length > 0 || selectedDepartments.length > 0 || dateRange !== 'last7') && (
              <button
                onClick={() => {
                  setDateRange('last7');
                  setSelectedUsers([]);
                  setSelectedDepartments([]);
                }}
                className="w-full lg:w-auto px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors duration-150 flex items-center justify-center gap-1.5 h-[42px]"
              >
                <span className="material-symbols-outlined text-lg">filter_alt_off</span>
                Reset
              </button>
            )}
          </div>

          {/* Custom Date Range slide-out */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100/70 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Total Calls */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-blue-500"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Calls</span>
              <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-2 rounded-xl text-lg">call</span>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{kpiStats.totalCalls}</h3>
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                <span className="font-semibold text-blue-600">{totalIncoming}</span> Inbound
                <span className="text-gray-300">|</span>
                <span className="font-semibold text-indigo-600">{totalOutgoing}</span> Outbound
              </p>
            </div>
          </div>

          {/* Card 2: Answered Calls */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-500"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Answered Calls</span>
              <span className="material-symbols-outlined text-emerald-500 bg-emerald-50 p-2 rounded-xl text-lg">phone_callback</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{kpiStats.answeredCalls}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {connectionRate}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Connected for <span className="font-semibold text-gray-700">&gt; 10 seconds</span>
              </p>
            </div>
          </div>

          {/* Card 3: Unique Numbers Reached */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-purple-500"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Unique Reached</span>
              <span className="material-symbols-outlined text-purple-500 bg-purple-50 p-2 rounded-xl text-lg">contacts</span>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{kpiStats.uniqueNumbers}</h3>
              <p className="text-xs text-gray-500 mt-1.5">
                Avg <span className="font-semibold text-purple-600">{avgCallsPerNumber}</span> calls per contact
              </p>
            </div>
          </div>

          {/* Card 4: Total Call Duration */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-amber-500"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Call Duration</span>
              <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl text-lg">schedule</span>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight truncate leading-9">{formatDuration(kpiStats.totalDuration)}</h3>
              <p className="text-xs text-gray-500 mt-1.5">
                Avg duration: <span className="font-semibold text-amber-600">{formatDuration(avgCallDuration)}</span>
              </p>
            </div>
          </div>

          {/* Card 5: Missed Calls */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-red-500"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Missed Calls</span>
              <span className="material-symbols-outlined text-red-500 bg-red-50 p-2 rounded-xl text-lg">phone_missed</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{kpiStats.missedCalls}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800">
                  {missedIncomingRate}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Of total inbound phone calls
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trend Chart (Span 2) */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Call Volume Trend</h3>
                <p className="text-xs text-gray-500 mt-0.5">Distribution of calls over the selected duration.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  <span>Outgoing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full"></div>
                  <span>Incoming</span>
                </div>
              </div>
            </div>

            <div className="h-[260px] w-full">
              {filteredLogs.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                  No data to plot for selected filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818CF8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="label" stroke="#9CA3AF" style={{ fontSize: '11px' }} tickLine={false} />
                    <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="outgoing"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOutgoing)"
                      name="Outgoing"
                    />
                    <Area
                      type="monotone"
                      dataKey="incoming"
                      stroke="#818CF8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIncoming)"
                      name="Incoming"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Outcome Pie Chart (Span 1) */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Call Outcomes</h3>
              <p className="text-xs text-gray-500 mt-0.5">Summary of connection success rate.</p>
            </div>
            
            <div className="h-[180px] w-full relative flex items-center justify-center my-4">
              {filteredLogs.length === 0 ? (
                <div className="text-sm text-gray-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {outcomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} calls`, 'Count']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {filteredLogs.length > 0 && (
                <div className="absolute text-center">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Answered</p>
                  <p className="text-2xl font-black text-blue-600">{connectionRate}%</p>
                </div>
              )}
            </div>

            {/* Custom Pie Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {outcomeData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600 font-medium truncate">{item.name}</span>
                  <span className="ml-auto font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User-Wise Performance Table Section */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">User Performance Metrics</h3>
              <p className="text-xs text-gray-500 mt-0.5">Calling scorecard for individual sales executives.</p>
            </div>
            
            {/* Table Search */}
            <div className="relative w-full sm:w-[260px]">
              <span className="material-symbols-outlined text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                search
              </span>
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search executive..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm outline-none hover:border-gray-400"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            {sortedPerformance.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No performance data matches the search or filters.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                    <th 
                      onClick={() => handleSort('name')} 
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>User</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'name' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('department')} 
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Department</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'department' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('totalCalls')} 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Total Calls</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'totalCalls' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('answeredCalls')} 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Answered Calls</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'answeredCalls' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('uniqueNumbers')} 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Unique Numbers</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'uniqueNumbers' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('totalDuration')} 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Call Duration</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'totalDuration' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('missedCalls')} 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 hover:text-gray-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Missed Calls</span>
                        <span className="material-symbols-outlined text-xs">
                          {sortColumn === 'missedCalls' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {sortedPerformance.map((userStats, index) => {
                    const ansRate = userStats.totalCalls > 0 
                      ? Math.round((userStats.answeredCalls / userStats.totalCalls) * 100)
                      : 0;

                    return (
                      <tr 
                        key={userStats.userId} 
                        onClick={() => handleRowClick(userStats)}
                        className={`hover:bg-blue-50/20 cursor-pointer transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        title="Click to view detailed call logs"
                      >
                        <td className="px-6 py-4.5 font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            {userStats.profilePicUrl ? (
                              <img
                                src={userStats.profilePicUrl}
                                alt={userStats.name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold border-2 border-gray-100 flex-shrink-0">
                                {userStats.name ? userStats.name.charAt(0) : 'U'}
                              </div>
                            )}
                            <div className="truncate">
                              <p className="font-semibold text-gray-900 truncate">{userStats.name || 'Anonymous User'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            {userStats.department}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-center font-bold text-gray-800">
                          {userStats.totalCalls}
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-emerald-600">{userStats.answeredCalls}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{ansRate}% Rate</span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-center font-semibold text-purple-700">
                          {userStats.uniqueNumbers}
                        </td>
                        <td className="px-6 py-4.5 text-center font-medium text-gray-800">
                          {formatDuration(userStats.totalDuration)}
                        </td>
                        <td className="px-6 py-4.5 text-center font-bold text-red-500">
                          {userStats.missedCalls}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Detail Modal Overlay */}
      {showDetailModal && selectedUserDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col transition-all duration-300 transform scale-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                {selectedUserDetail.profilePicUrl ? (
                  <img
                    src={selectedUserDetail.profilePicUrl}
                    alt={selectedUserDetail.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm">
                    {selectedUserDetail.name ? selectedUserDetail.name.charAt(0) : 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedUserDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-semibold">
                    <span className="bg-gray-200 px-2 py-0.5 rounded text-gray-600 uppercase tracking-wider">{selectedUserDetail.department}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">phone_iphone</span>
                      {users.find(u => u.id === selectedUserDetail.userId)?.phoneNumber || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedUserDetail(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 bg-gray-50 border-b border-gray-100 p-4">
              <div className="text-center py-2 sm:py-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Calls</p>
                <p className="text-lg font-black text-gray-800 mt-0.5">{selectedUserDetail.totalCalls}</p>
              </div>
              <div className="text-center py-2 sm:py-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Answered</p>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{selectedUserDetail.answeredCalls}</p>
              </div>
              <div className="text-center py-2 sm:py-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Unique Reached</p>
                <p className="text-lg font-black text-purple-600 mt-0.5">{selectedUserDetail.uniqueNumbers}</p>
              </div>
              <div className="text-center py-2 sm:py-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Duration</p>
                <p className="text-base font-black text-amber-600 mt-1 truncate">{formatDuration(selectedUserDetail.totalDuration)}</p>
              </div>
              <div className="text-center py-2 sm:py-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Missed Calls</p>
                <p className="text-lg font-black text-red-500 mt-0.5">{selectedUserDetail.missedCalls}</p>
              </div>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
              {selectedUserCalls.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No call records found for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold uppercase text-gray-400 tracking-wider">
                        <th className="pb-3 text-left">Customer</th>
                        <th className="pb-3 text-left">Phone Number</th>
                        <th className="pb-3 text-center">Type</th>
                        <th className="pb-3 text-center">Duration</th>
                        <th className="pb-3 text-left">Date &amp; Time</th>
                        <th className="pb-3 text-center">Recording</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {selectedUserCalls.map((call, idx) => {
                        const isCallAnswered = call.status === 'connected' && call.duration > 10;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-3 font-semibold text-gray-900">{call.userName || call.name || 'Unknown'}</td>
                            <td className="py-3 font-mono text-xs">{call.phoneNumber}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                                call.type === 'incoming' 
                                  ? (call.status === 'missed' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100')
                                  : 'bg-green-50 text-green-700 border border-green-100'
                              }`}>
                                {call.type === 'incoming' 
                                  ? (call.status === 'missed' ? 'Missed' : 'Incoming')
                                  : 'Outgoing'
                                }
                              </span>
                            </td>
                            <td className="py-3 text-center font-medium">
                              {call.status === 'missed' ? (
                                <span className="text-red-500 font-bold">00:00</span>
                              ) : (
                                <span className={isCallAnswered ? 'text-emerald-600 font-bold' : 'text-gray-500'}>
                                  {formatSecondsToMMSS(call.duration)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-xs text-gray-500">
                              {call.timestamp.toLocaleDateString()} at {call.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-3 text-center">
                              {call.callRecordFile && call.callRecordFile !== 'no_recording' ? (
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold border border-blue-100 transition-colors cursor-pointer select-none" title={call.callRecordFile}>
                                  <span className="material-symbols-outlined text-[14px]">play_circle</span>
                                  <span className="max-w-[80px] truncate">{call.callRecordFile.split('_').pop()}</span>
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedUserDetail(null);
                }}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CallDashboard;
