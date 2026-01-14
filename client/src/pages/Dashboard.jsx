// ============================================
// FILE: client/src/pages/Dashboard.jsx
// ✅ Exact replica of the dashboard design
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package,
  Receipt,
  CreditCard,
  BarChart3,
  PieChart,
  MoreVertical,
  Calendar
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/dashboard/stats');
      setStats(response.data);
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

  // Get user's first name
  const userName = user?.name?.split(' ')[0] || 'User';

  // Quick Links Data - exactly as in image
  const quickLinks = [
    { 
      icon: FileText, 
      label: 'New Invoice', 
      bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
      iconColor: 'text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/sales/tax-invoice/add') 
    },
    { 
      icon: Users, 
      label: 'New Clients', 
      bgColor: 'bg-orange-50 dark:bg-orange-900/20', 
      iconColor: 'text-orange-600 dark:text-orange-400',
      onClick: () => navigate('/clients/add') 
    },
    { 
      icon: Receipt, 
      label: 'Payments', 
      bgColor: 'bg-red-50 dark:bg-red-900/20', 
      iconColor: 'text-red-600 dark:text-red-400',
      onClick: () => navigate('/payments') 
    },
    { 
      icon: PieChart, 
      label: 'Analyses', 
      bgColor: 'bg-green-50 dark:bg-green-900/20', 
      iconColor: 'text-green-600 dark:text-green-400',
      onClick: () => navigate('/analytics') 
    },
    { 
      icon: BarChart3, 
      label: 'GST Reports', 
      bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
      iconColor: 'text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/gst-reports') 
    },
    { 
      icon: CreditCard, 
      label: 'Payments', 
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', 
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      onClick: () => navigate('/payments') 
    },
  ];

  // Calculate stats
  const monthlyRevenue = stats?.monthlyRevenue || 0;
  const totalClients = stats?.totalClients || 0;
  const totalExpenses = 45000; // Mock data as per image

  // Generate chart points based on real data or mock
  const generateChartPoints = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const width = 800;
    const height = 200;
    const maxValue = 1000;
    
    // Blue line (revenue trend)
    const bluePoints = months.map((_, idx) => {
      const x = (idx / (months.length - 1)) * width;
      const baseValue = 500 + Math.sin(idx * 0.5) * 150;
      const variation = Math.random() * 100 - 50;
      const y = height - ((baseValue + variation) / maxValue) * height;
      return `${x},${y}`;
    }).join(' ');

    // Gray line (expenses trend)
    const grayPoints = months.map((_, idx) => {
      const x = (idx / (months.length - 1)) * width;
      const baseValue = 350 + Math.sin(idx * 0.3) * 80;
      const variation = Math.random() * 60 - 30;
      const y = height - ((baseValue + variation) / maxValue) * height;
      return `${x},${y}`;
    }).join(' ');

    return { bluePoints, grayPoints };
  };

  const { bluePoints, grayPoints } = generateChartPoints();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            Hi {userName} Deer!
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Links & Stats */}
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
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl ${link.bgColor} hover:shadow-md transition-all cursor-pointer`}
                  >
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                      <link.icon className={`w-6 h-6 ${link.iconColor}`} />
                    </div>
                    <span className={`text-sm font-medium ${link.iconColor}`}>{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Total Clients */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <Users className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {totalClients < 10 ? `0${totalClients}` : totalClients}
                </p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">11.01%</span>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  ₹{totalExpenses.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600 font-medium">9.05%</span>
                </div>
              </div>
            </div>

            {/* Statistics Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
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
                  <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border border-gray-200 dark:border-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>05 Feb - 06 March</span>
                  </button>
                </div>
              </div>

              {/* Line Chart */}
              <div className="h-72 relative">
                <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={40 * i}
                      x2="800"
                      y2={40 * i}
                      stroke="currentColor"
                      className="text-gray-200 dark:text-gray-700"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Blue line (top) */}
                  <polyline
                    points={bluePoints}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                  />
                  
                  {/* Blue area fill */}
                  <polygon
                    points={`${bluePoints} 800,240 0,240`}
                    fill="url(#blueGradient)"
                    opacity="0.2"
                  />
                  
                  {/* Gray line (bottom) */}
                  <polyline
                    points={grayPoints}
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  />
                  
                  {/* Gray area fill */}
                  <polygon
                    points={`${grayPoints} 800,240 0,240`}
                    fill="url(#grayGradient)"
                    opacity="0.1"
                  />
                  
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
                  <span>1000</span>
                  <span>800</span>
                  <span>600</span>
                  <span>400</span>
                  <span>200</span>
                  <span>0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Monthly Revenue */}
          <div className="space-y-6">
            {/* Monthly Revenue Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Monthly Revenue</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Revenue breakdown for each month of the fiscal year
              </p>

              {/* Circular Revenue Display */}
              <div className="relative flex items-center justify-center mb-6" style={{ height: '280px' }}>
                <svg className="w-64 h-64 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="currentColor"
                    className="text-gray-100 dark:text-gray-700"
                    strokeWidth="12"
                  />
                  {/* Progress circle */}
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

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Month markers with dots */}
                  <div className="absolute w-full h-full">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                      const angle = (idx * 30 - 90) * (Math.PI / 180);
                      const radius = 118;
                      const x = 128 + radius * Math.cos(angle);
                      const y = 128 + radius * Math.sin(angle);
                      
                      // Dot positions (slightly inside the arc)
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
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">$20K</p>
                  <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bills Received</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">$16K</p>
                  <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bills Pending</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">$1.5K</p>
                  <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}