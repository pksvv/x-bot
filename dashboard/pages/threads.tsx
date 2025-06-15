import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Calendar,
  Eye,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { threadsApi, ThreadData } from '../lib/api';
import { format } from 'date-fns';

export default function Threads() {
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ThreadData | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const response = await threadsApi.getAll();
      if (response.data.success) {
        setThreads(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (threadId: string) => {
    try {
      await threadsApi.publish(threadId);
      await fetchThreads(); // Refresh the list
      alert('Thread published successfully!');
    } catch (error) {
      console.error('Error publishing thread:', error);
      alert('Failed to publish thread');
    }
  };

  const handleDelete = async (threadId: string) => {
    if (window.confirm('Are you sure you want to delete this thread?')) {
      try {
        await threadsApi.delete(threadId);
        await fetchThreads(); // Refresh the list
      } catch (error) {
        console.error('Error deleting thread:', error);
        alert('Failed to delete thread');
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Threads</h1>
            <p className="text-gray-600 mt-2">Manage your Twitter threads</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Thread
          </button>
        </div>

        {/* Threads List */}
        <div className="card">
          {threads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thread
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {threads.map((thread) => (
                    <tr key={thread.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {thread.content[0]?.substring(0, 80)}
                            {thread.content[0]?.length > 80 && '...'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {thread.content.length} tweet{thread.content.length !== 1 && 's'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(thread.status)}`}>
                          {thread.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(thread.scheduledTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(thread.publishedTime)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {thread.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handlePublish(thread.id)}
                                className="text-green-600 hover:text-green-800"
                                title="Publish now"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedThread(thread);
                                  setShowScheduleModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Schedule"
                              >
                                <Calendar className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {/* TODO: View thread */}}
                            className="text-gray-600 hover:text-gray-800"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(thread.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No threads yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first Twitter thread.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Thread
              </button>
            </div>
          )}
        </div>

        {/* Create Thread Modal */}
        {showCreateModal && (
          <CreateThreadModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchThreads();
            }}
          />
        )}

        {/* Schedule Modal */}
        {showScheduleModal && selectedThread && (
          <ScheduleModal
            thread={selectedThread}
            onClose={() => {
              setShowScheduleModal(false);
              setSelectedThread(null);
            }}
            onScheduled={() => {
              setShowScheduleModal(false);
              setSelectedThread(null);
              fetchThreads();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

// Create Thread Modal Component
function CreateThreadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tweets, setTweets] = useState(['']);
  const [loading, setLoading] = useState(false);

  const addTweet = () => {
    if (tweets.length < 10) {
      setTweets([...tweets, '']);
    }
  };

  const removeTweet = (index: number) => {
    if (tweets.length > 1) {
      setTweets(tweets.filter((_, i) => i !== index));
    }
  };

  const updateTweet = (index: number, value: string) => {
    const newTweets = [...tweets];
    newTweets[index] = value;
    setTweets(newTweets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = tweets.filter(tweet => tweet.trim().length > 0);
    
    if (content.length === 0) {
      alert('Please add at least one tweet');
      return;
    }

    setLoading(true);
    try {
      await threadsApi.create({ content });
      onCreated();
    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Failed to create thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Thread</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {tweets.map((tweet, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Tweet {index + 1}
                  </label>
                  {tweets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTweet(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={tweet}
                  onChange={(e) => updateTweet(index, e.target.value)}
                  className="textarea-field"
                  rows={3}
                  placeholder={`Write tweet ${index + 1}...`}
                  maxLength={280}
                />
                <div className="text-right text-sm text-gray-500">
                  {tweet.length}/280
                </div>
              </div>
            ))}

            {tweets.length < 10 && (
              <button
                type="button"
                onClick={addTweet}
                className="btn-secondary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tweet
              </button>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Thread'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Schedule Modal Component
function ScheduleModal({ 
  thread, 
  onClose, 
  onScheduled 
}: { 
  thread: ThreadData; 
  onClose: () => void; 
  onScheduled: () => void; 
}) {
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduledTime) {
      alert('Please select a date and time');
      return;
    }

    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      alert('Scheduled time must be in the future');
      return;
    }

    setLoading(true);
    try {
      await threadsApi.schedule(thread.id, scheduleDate.toISOString());
      onScheduled();
    } catch (error) {
      console.error('Error scheduling thread:', error);
      alert('Failed to schedule thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule Thread</h2>
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Thread preview:</p>
            <p className="font-medium text-gray-900 mt-1">
              {thread.content[0]?.substring(0, 100)}
              {thread.content[0]?.length > 100 && '...'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {thread.content.length} tweet{thread.content.length !== 1 && 's'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center"
              >
                <Clock className="h-4 w-4 mr-2" />
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}