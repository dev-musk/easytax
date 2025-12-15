import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { FileText, Users, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Clients',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Outstanding',
      value: `₹${stats?.outstandingAmount?.toLocaleString('en-IN') || 0}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'Overdue',
      value: stats?.overdueInvoices || 0,
      icon: Clock,
      color: 'bg-red-500',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => (
                <div
                  key={stat.title}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-2 text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Recent Activity
              </h2>
              <div className="text-center text-gray-500 py-8">
                No recent invoices. Create your first invoice!
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}