import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Sheet, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  ArrowRightLeft,
  Download,
  Upload,
  ExternalLink,
  Info
} from 'lucide-react';
import { sheetsApi } from '../lib/api';

export default function Sheets() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await sheetsApi.validate();
      setIsConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (direction: 'to-sheets' | 'from-sheets' | 'bidirectional') => {
    setSyncing(direction);
    try {
      let response;
      switch (direction) {
        case 'to-sheets':
          response = await sheetsApi.syncFromDb();
          break;
        case 'from-sheets':
          response = await sheetsApi.syncToDb();
          break;
        case 'bidirectional':
          response = await sheetsApi.bidirectionalSync();
          break;
      }
      
      if (response.data.success) {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(null);
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Google Sheets</h1>
            <p className="text-gray-600 mt-2">Manage threads directly from Google Sheets</p>
          </div>
          <button
            onClick={checkConnection}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Connection
          </button>
        </div>

        {/* Connection Status */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isConnected ? (
                <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500 mr-4" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Connection Status
                </h3>
                <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected to Google Sheets' : 'Not connected to Google Sheets'}
                </p>
              </div>
            </div>
            {isConnected && (
              <div className="text-right text-sm text-gray-600">
                <p>Auto-sync: Every 5 minutes</p>
                <p>Last sync: Just now</p>
              </div>
            )}
          </div>
        </div>

        {isConnected ? (
          <>
            {/* Sync Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="text-center">
                  <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync to Sheets</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Push all threads from database to Google Sheets
                  </p>
                  <button
                    onClick={() => handleSync('to-sheets')}
                    disabled={syncing === 'to-sheets'}
                    className="btn-primary w-full"
                  >
                    {syncing === 'to-sheets' ? 'Syncing...' : 'Sync to Sheets'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Download className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync from Sheets</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Pull changes from Google Sheets to database
                  </p>
                  <button
                    onClick={() => handleSync('from-sheets')}
                    disabled={syncing === 'from-sheets'}
                    className="btn-primary w-full"
                  >
                    {syncing === 'from-sheets' ? 'Syncing...' : 'Sync from Sheets'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="text-center">
                  <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ArrowRightLeft className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bidirectional Sync</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Sync both ways to ensure data consistency
                  </p>
                  <button
                    onClick={() => handleSync('bidirectional')}
                    disabled={syncing === 'bidirectional'}
                    className="btn-primary w-full"
                  >
                    {syncing === 'bidirectional' ? 'Syncing...' : 'Full Sync'}
                  </button>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sheet className="h-5 w-5 mr-2" />
                Google Sheets Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Thread Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create and edit threads directly in sheets</li>
                    <li>• Schedule threads with date/time columns</li>
                    <li>• Track thread status (draft/scheduled/published)</li>
                    <li>• Support for up to 10 tweets per thread</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Analytics Integration</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Automatic metrics collection</li>
                    <li>• Real-time engagement data</li>
                    <li>• Views, likes, retweets, replies tracking</li>
                    <li>• Engagement rate calculations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Spreadsheet Structure */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spreadsheet Structure</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">id</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Text</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Unique thread identifier</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">tweet1-tweet10</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Text</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Individual tweets (up to 10)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">scheduledTime</td>
                      <td className="px-4 py-2 text-sm text-gray-600">DateTime</td>
                      <td className="px-4 py-2 text-sm text-gray-600">When to publish (ISO format)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">status</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Text</td>
                      <td className="px-4 py-2 text-sm text-gray-600">draft/scheduled/published/failed</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">views, likes, retweets</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Number</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Auto-populated metrics</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">engagementRate</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Number</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Calculated engagement percentage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="text-center py-12">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Google Sheets Not Connected</h3>
              <p className="text-gray-600 mb-6">
                Set up Google Sheets integration to manage threads from spreadsheets.
              </p>
              
              <div className="max-w-md mx-auto text-left">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Setup Required</h4>
                      <p className="text-sm text-blue-800">
                        Configure your Google Sheets credentials in the environment variables to enable this feature.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>Required environment variables:</strong></p>
                  <ul className="ml-4 space-y-1 text-gray-600">
                    <li>• GOOGLE_SHEETS_CLIENT_EMAIL</li>
                    <li>• GOOGLE_SHEETS_PRIVATE_KEY</li>
                    <li>• GOOGLE_SHEETS_SPREADSHEET_ID</li>
                  </ul>
                </div>

                <div className="mt-6">
                  <a
                    href="https://docs.google.com/spreadsheets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Google Sheets
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}