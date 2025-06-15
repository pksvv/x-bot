import React, { useState } from 'react';
import Layout from '../components/Layout';
import { 
  Settings as SettingsIcon, 
  Save, 
  TestTube,
  AlertCircle,
  CheckCircle,
  Twitter,
  Sheet,
  Clock
} from 'lucide-react';

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved successfully!');
    }, 1000);
  };

  const handleTest = async (service: string) => {
    setTesting(service);
    // Simulate test
    setTimeout(() => {
      setTesting(null);
      alert(`${service} connection test completed!`);
    }, 2000);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Configure your Twitter Thread Bot</p>
        </div>

        {/* Service Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Service Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Twitter className="h-8 w-8 text-twitter-blue mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Twitter API</p>
                  <p className="text-sm text-green-600">Connected</p>
                </div>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Sheet className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Google Sheets</p>
                  <p className="text-sm text-green-600">Connected</p>
                </div>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Scheduler</p>
                  <p className="text-sm text-green-600">Running</p>
                </div>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Twitter Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Twitter className="h-5 w-5 mr-2" />
              Twitter Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Status
                </label>
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-800">Connected and working</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Limits
                </label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Tweets per 15 min</p>
                    <p className="font-medium">300 / 300</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reads per 15 min</p>
                    <p className="font-medium">75 / 75</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTest('Twitter')}
                disabled={testing === 'Twitter'}
                className="btn-secondary w-full flex items-center justify-center"
              >
                <TestTube className={`h-4 w-4 mr-2 ${testing === 'Twitter' ? 'animate-pulse' : ''}`} />
                {testing === 'Twitter' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {/* Scheduling Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Scheduling Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Interval
                </label>
                <select className="input-field">
                  <option value="1">Every minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Timezone
                </label>
                <select className="input-field">
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retry Failed Posts
                </label>
                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm text-gray-600">Automatically retry failed posts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Google Sheets Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Sheet className="h-5 w-5 mr-2" />
              Google Sheets Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto-sync Interval
                </label>
                <select className="input-field">
                  <option value="1">Every minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="60">Every hour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sync Direction
                </label>
                <select className="input-field">
                  <option value="bidirectional">Bidirectional</option>
                  <option value="to-sheets">Database → Sheets</option>
                  <option value="from-sheets">Sheets → Database</option>
                </select>
              </div>

              <button
                onClick={() => handleTest('Google Sheets')}
                disabled={testing === 'Google Sheets'}
                className="btn-secondary w-full flex items-center justify-center"
              >
                <TestTube className={`h-4 w-4 mr-2 ${testing === 'Google Sheets' ? 'animate-pulse' : ''}`} />
                {testing === 'Google Sheets' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {/* Metrics Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Collection</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Interval
                </label>
                <select className="input-field">
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every hour</option>
                  <option value="120">Every 2 hours</option>
                  <option value="360">Every 6 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Scope
                </label>
                <select className="input-field">
                  <option value="recent">Recent threads (7 days)</option>
                  <option value="all">All published threads</option>
                  <option value="top">Top performing threads only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Limiting
                </label>
                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm text-gray-600">Add delays between API calls</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center"
          >
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* System Info */}
        <div className="card bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Application</h4>
              <div className="space-y-1 text-gray-600">
                <p>Version: 1.0.0</p>
                <p>Environment: Development</p>
                <p>Node.js: v18.0.0</p>
                <p>Uptime: 2h 34m</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Database</h4>
              <div className="space-y-1 text-gray-600">
                <p>Type: SQLite</p>
                <p>Location: ./database/threads.db</p>
                <p>Size: 2.3 MB</p>
                <p>Tables: threads, metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}