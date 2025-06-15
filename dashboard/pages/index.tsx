import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  BarChart3, 
  FileText, 
  Calendar, 
  TrendingUp,
  Eye,
  Heart,
  Repeat,
  MessageCircle
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { metricsApi, threadsApi, MetricsSummary, ThreadData } from '../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, threadsRes] = await Promise.all([
        metricsApi.getSummary(),
        threadsApi.getAll()
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      if (threadsRes.data.success) {
        setThreads(threadsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentThreads = threads.slice(0, 5);
  
  const statusCounts = threads.reduce((acc, thread) => {
    acc[thread.status] = (acc[thread.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = {
    labels: ['Draft', 'Scheduled', 'Published', 'Failed'],
    datasets: [
      {
        data: [
          statusCounts.draft || 0,
          statusCounts.scheduled || 0,
          statusCounts.published || 0,
          statusCounts.failed || 0
        ],
        backgroundColor: [
          '#6B7280',
          '#F59E0B', 
          '#10B981',
          '#EF4444'
        ],
        borderWidth: 0,
      },
    ],
  };

  const engagementChartData = {
    labels: ['Views', 'Likes', 'Retweets', 'Replies'],
    datasets: [
      {
        label: 'Total Engagement',
        data: summary ? [
          summary.totalViews,
          summary.totalLikes,
          summary.totalRetweets,
          summary.totalReplies
        ] : [0, 0, 0, 0],
        backgroundColor: 'rgba(29, 161, 242, 0.8)',
        borderColor: 'rgba(29, 161, 242, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-twitter-blue"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your Twitter thread performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Threads</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.totalThreads || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.publishedThreads || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.totalViews?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Engagement</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.averageEngagementRate ? `${summary.averageEngagementRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thread Status</h3>
            <div className="h-64">
              <Doughnut 
                data={statusChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Engagement</h3>
            <div className="h-64">
              <Bar 
                data={engagementChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Recent Threads */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Threads</h3>
          {recentThreads.length > 0 ? (
            <div className="space-y-4">
              {recentThreads.map((thread) => (
                <div key={thread.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {thread.content[0]?.substring(0, 100)}
                      {thread.content[0]?.length > 100 && '...'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {thread.content.length} tweets
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full status-${thread.status}`}>
                      {thread.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No threads yet. Create your first thread!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}