// ============================================
// FILE: client/src/pages/Dashboard-DEBUG.jsx
// ✅ ENHANCED: With visual debugging markers
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Package,
  Receipt,
  CreditCard,
  BarChart3,
  PieChart,
  MoreVertical,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [billsStats, setBillsStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('overview');
  const [dateRange, setDateRange] = useState({ start: '05 Feb', end: '06 March' });

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      const [statsResponse, billsResponse] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/bills-summary')
      ]);
      
      setStats(statsResponse.data);
      setBillsStats(billsResponse.data);
      
      // 🔍 DEBUG: Log chart data
      console.log('📊 Chart Data Received:');
      console.log('Monthly Trend:', statsResponse.data.monthlyTrend);
      console.log('Non-zero months:', statsResponse.data.monthlyTrend.filter(m => m.revenue > 0).length);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const organizationName = user?.organizationName || 'Muskdeer';

  const quickLinks = [
    { 
      icon: FileText, 
      label: 'New Invoice', 
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/sales/tax-invoice/add') 
    },
    { 
      icon: Users, 
      label: 'New Clients', 
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      onClick: () => navigate('/clients/add') 
    },
    { 
      icon: Receipt, 
      label: 'Payments', 
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      onClick: () => navigate('/payments') 
    },
    { 
      icon: PieChart, 
      label: 'Analyses', 
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      onClick: () => navigate('/analytics') 
    },
    { 
      icon: BarChart3, 
      label: 'GST Reports', 
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/gst-reports') 
    },
    { 
      icon: CreditCard, 
      label: 'Payments', 
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      onClick: () => navigate('/payments') 
    },
  ];

  const monthlyRevenue = stats?.monthlyRevenue || 0;
  const totalClients = stats?.totalClients || 0;
  const totalExpenses = stats?.totalExpenses || 0;

  const billsRaised = billsStats?.billsRaised || 0;
  const billsReceived = billsStats?.billsReceived || 0;
  const billsPending = billsStats?.billsPending || 0;

  const billsRaisedTrend = billsStats?.raisedTrend || 5.2;
  const billsReceivedTrend = billsStats?.receivedTrend || 3.8;
  const billsPendingTrend = billsStats?.pendingTrend || 2.5;

  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  // ✅ Enhanced chart generation with debugging
  const generateChartPoints = () => {
    const monthlyTrend = stats?.monthlyTrend || [];
    const width = 780; // ✅ Reduced to prevent clipping at edges
    const height = 200;
    
    console.log('🎨 Generating chart with', monthlyTrend.length, 'data points');
    
    if (monthlyTrend.length === 0) {
      const months = 12;
      const bluePoints = Array.from({ length: months }, (_, idx) => {
        const x = (idx / (months - 1)) * width;
        const baseValue = 500 + Math.sin(idx * 0.8) * 150;
        const y = height - ((baseValue / 1000) * height * 0.8);
        return `${x},${y}`;
      }).join(' ');
      
      const grayPoints = Array.from({ length: months }, (_, idx) => {
        const x = (idx / (months - 1)) * width;
        const baseValue = 350 + Math.sin(idx * 0.5) * 100;
        const y = height - ((baseValue / 1000) * height * 0.8);
        return `${x},${y}`;
      }).join(' ');
      
      return { 
        bluePoints, 
        grayPoints, 
        maxValue: 1000, 
        yAxisLabels: [1000, 800, 600, 400, 200, 0],
        dataPoints: [] 
      };
    }

    const maxValue = Math.max(...monthlyTrend.map(m => m.revenue || 0), 1000);
    
    console.log('📈 Max Value:', maxValue.toLocaleString('en-IN'));
    
    const dataPoints = [];
    
    const bluePoints = monthlyTrend.map((month, idx) => {
      const x = (idx / (monthlyTrend.length - 1)) * width;
      const y = height - ((month.revenue / maxValue) * height * 0.9);
      
      // 🔍 Store point data for debugging
      dataPoints.push({ x, y, revenue: month.revenue, month: month.month });
      
      console.log(`Point ${idx}: x=${x.toFixed(0)}, y=${y.toFixed(0)}, revenue=${month.revenue}`);
      
      return `${x},${y}`;
    }).join(' ');

    const grayPoints = monthlyTrend.map((month, idx) => {
      const x = (idx / (monthlyTrend.length - 1)) * width;
      const baseValue = month.revenue * 0.6;
      const y = height - ((baseValue / maxValue) * height * 0.9);
      return `${x},${y}`;
    }).join(' ');

    const yAxisLabels = [];
    const step = maxValue / 5;
    for (let i = 5; i >= 0; i--) {
      const value = Math.round((step * i) / 1000);
      yAxisLabels.push(value);
    }

    console.log('✅ Chart generated successfully');
    console.log('Blue points:', bluePoints);

    return { bluePoints, grayPoints, maxValue, yAxisLabels, dataPoints };
  };

  const { bluePoints, grayPoints, maxValue, yAxisLabels, dataPoints } = generateChartPoints();

  const clientTrend = stats?.clientGrowth || 11.01;
  const expensesTrend = stats?.expensesChange || 9.05;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            Hi {organizationName} Deer!
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Links */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Links</h2>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {quickLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={link.onClick}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
                  >
                    <div className={`p-2.5 ${link.iconBg} rounded-lg flex-shrink-0`}>
                      <link.icon className={`w-5 h-5 ${link.iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-left">
                      {link.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <Users className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Clients</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {totalClients < 10 ? `0${totalClients}` : totalClients}
                  </p>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{clientTrend.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalExpenses)}
                  </p>
                  <div className={`flex items-center gap-1 ${expensesTrend < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {expensesTrend < 0 ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{Math.abs(expensesTrend).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ ENHANCED Statistics Chart with visible markers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Statistics</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Target you've set for each month</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setTimeRange('overview')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === 'overview'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setTimeRange('6months')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === '6months'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    6 Months
                  </button>
                  <button
                    onClick={() => setTimeRange('12months')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === '12months'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    12 Months
                  </button>
                  <button 
                    onClick={() => {
                      alert('Date picker coming soon!');
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border border-gray-200 dark:border-gray-600"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{dateRange.start} - {dateRange.end}</span>
                  </button>
                </div>
              </div>

              {/* ✅ ENHANCED Chart with debug markers */}
              <div className="h-72 relative">
                <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <line
                      key={i}
                      x1="10"
                      y1={40 * i}
                      x2="790"
                      y2={40 * i}
                      stroke="currentColor"
                      className="text-gray-200 dark:text-gray-700"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Blue area fill FIRST (below line) */}
                  <polygon
                    points={`10,200 ${bluePoints} 790,200`}
                    fill="url(#blueGradient)"
                    opacity="0.2"
                  />
                  
                  {/* Gray area fill */}
                  <polygon
                    points={`10,200 ${grayPoints} 790,200`}
                    fill="url(#grayGradient)"
                    opacity="0.1"
                  />
                  
                  {/* Gray line */}
                  <polyline
                    points={grayPoints}
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  
                  {/* Blue line (MAIN) */}
                  <polyline
                    points={bluePoints}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  
                  {/* ✅ ADD: Data point markers for non-zero values */}
                  {dataPoints.map((point, idx) => {
                    if (point.revenue > 0) {
                      return (
                        <g key={`marker-${idx}`}>
                          {/* Outer glow */}
                          <circle
                            cx={point.x + 10}
                            cy={point.y}
                            r="8"
                            fill="#3B82F6"
                            opacity="0.3"
                          />
                          {/* Main dot */}
                          <circle
                            cx={point.x + 10}
                            cy={point.y}
                            r="5"
                            fill="#3B82F6"
                            stroke="white"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    }
                    return null;
                  })}
                  
                  <defs>
                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#9CA3AF" />
                      <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500 dark:text-gray-400">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
                
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
                  {yAxisLabels.map((label, idx) => (
                    <span key={idx}>{label}K</span>
                  ))}
                </div>
              </div>
              
              {/* ✅ DEBUG INFO */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400">
                <p><strong>Debug Info:</strong></p>
                <p>Data points: {stats?.monthlyTrend?.length || 0} | Non-zero: {dataPoints.filter(p => p.revenue > 0).length} | Max: ₹{maxValue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Monthly Revenue Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Monthly Revenue</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Revenue breakdown for each month of the fiscal year
              </p>

              <div className="relative flex items-center justify-center mb-6" style={{ height: '280px' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-full blur-2xl opacity-60"></div>
                </div>
                
                <svg className="w-64 h-64 transform -rotate-90 relative z-10">
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="currentColor"
                    className="text-gray-100 dark:text-gray-700"
                    strokeWidth="12"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="url(#revenueGradient)"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 100 * 0.75} ${2 * Math.PI * 100}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <div className="absolute w-full h-full">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                      const angle = (idx * 30 - 90) * (Math.PI / 180);
                      const radius = 118;
                      const x = 128 + radius * Math.cos(angle);
                      const y = 128 + radius * Math.sin(angle);
                      
                      const dotRadius = 106;
                      const dotX = 128 + dotRadius * Math.cos(angle);
                      const dotY = 128 + dotRadius * Math.sin(angle);
                      
                      return (
                        <div key={month}>
                          <div
                            className="absolute text-xs font-medium text-gray-400 dark:text-gray-500"
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {month}
                          </div>
                          <div
                            className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full"
                            style={{
                              left: `${dotX}px`,
                              top: `${dotY}px`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center z-10">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      ₹{monthlyRevenue.toLocaleString('en-IN')}
                    </p>
                    <button 
                      onClick={() => navigate('/reports')}
                      className="mt-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 font-medium"
                    >
                      View More
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                This month's revenue, its higher than last month.<br />
                Keep up your good work!
              </p>
            </div>

            {/* Bills Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bills Raised</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {formatCurrency(billsRaised)}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{billsRaisedTrend.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bills Received</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {formatCurrency(billsReceived)}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{billsReceivedTrend.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bills Pending</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {formatCurrency(billsPending)}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{billsPendingTrend.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}