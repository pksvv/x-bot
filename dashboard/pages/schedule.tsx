import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { threadsApi, ThreadData } from '../lib/api';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export default function Schedule() {
  const [scheduledThreads, setScheduledThreads] = useState<ThreadData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledThreads();
  }, []);

  const fetchScheduledThreads = async () => {
    try {
      const response = await threadsApi.getAll();
      if (response.data.success) {
        const scheduled = response.data.data.filter(
          thread => thread.status === 'scheduled' && thread.scheduledTime
        );
        // Sort by scheduled time
        scheduled.sort((a, b) => 
          new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime()
        );
        setScheduledThreads(scheduled);
      }
    } catch (error) {
      console.error('Error fetching scheduled threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnschedule = async (threadId: string) => {
    if (window.confirm('Are you sure you want to unschedule this thread?')) {
      try {
        await threadsApi.update(threadId, { 
          status: 'draft',
          scheduledTime: undefined 
        });
        await fetchScheduledThreads();
      } catch (error) {
        console.error('Error unscheduling thread:', error);
        alert('Failed to unschedule thread');
      }
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'HH:mm'),
      isPast: isBefore(date, new Date()),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      isSoon: isAfter(date, new Date()) && isBefore(date, addDays(new Date(), 1))
    };
  };

  const getStatusColor = (scheduledTime: string) => {
    const timing = formatScheduledTime(scheduledTime);
    if (timing.isPast) return 'bg-red-100 text-red-800 border-red-200';
    if (timing.isSoon) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getStatusText = (scheduledTime: string) => {
    const timing = formatScheduledTime(scheduledTime);
    if (timing.isPast) return 'Overdue';
    if (timing.isSoon) return 'Coming Soon';
    return 'Scheduled';
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600 mt-2">Manage your scheduled Twitter threads</p>
          </div>
          <div className="text-sm text-gray-600">
            <p>Auto-publishing every minute</p>
          </div>
        </div>

        {/* Calendar View */}
        {scheduledThreads.length > 0 ? (
          <div className="space-y-6">
            {/* Upcoming Threads */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Scheduled Threads ({scheduledThreads.length})
              </h3>

              <div className="space-y-4">
                {scheduledThreads.map((thread) => {
                  const timing = formatScheduledTime(thread.scheduledTime!);
                  return (
                    <div 
                      key={thread.id} 
                      className={`border rounded-lg p-4 ${
                        timing.isPast ? 'border-red-200 bg-red-50' : 
                        timing.isSoon ? 'border-yellow-200 bg-yellow-50' : 
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(thread.scheduledTime!)}`}>
                              {getStatusText(thread.scheduledTime!)}
                            </span>
                            {timing.isPast && (
                              <div className="ml-2 flex items-center text-red-600">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                <span className="text-xs">Missed schedule</span>
                              </div>
                            )}
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-2">
                            {thread.content[0]?.substring(0, 100)}
                            {thread.content[0]?.length > 100 && '...'}
                          </h4>
                          
                          <div className="flex items-center text-sm text-gray-600 space-x-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {timing.date}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {timing.time}
                            </div>
                            <div>
                              {thread.content.length} tweet{thread.content.length !== 1 && 's'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {/* TODO: Edit schedule */}}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit schedule"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUnschedule(thread.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Unschedule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
                    <p className="text-2xl font-bold text-gray-900">{scheduledThreads.length}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Coming Soon</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {scheduledThreads.filter(t => {
                        const timing = formatScheduledTime(t.scheduledTime!);
                        return timing.isSoon;
                      }).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {scheduledThreads.filter(t => {
                        const timing = formatScheduledTime(t.scheduledTime!);
                        return timing.isPast;
                      }).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled threads</h3>
              <p className="text-gray-600 mb-6">
                Schedule your threads to automatically publish them at the perfect time.
              </p>
              <div className="space-y-4">
                <div className="text-sm text-gray-500 space-y-1">
                  <p>💡 <strong>Tips for scheduling:</strong></p>
                  <p>• Post when your audience is most active</p>
                  <p>• Schedule threads in advance for consistency</p>
                  <p>• Use different time zones to reach global audiences</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheduling Info */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Automatic Publishing</h4>
              <p className="text-blue-800 text-sm mb-2">
                Scheduled threads are automatically published every minute. Make sure your times are accurate!
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Threads are checked for publishing every minute</p>
                <p>• Failed threads will be marked as 'failed' status</p>
                <p>• You can manually publish or reschedule failed threads</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}