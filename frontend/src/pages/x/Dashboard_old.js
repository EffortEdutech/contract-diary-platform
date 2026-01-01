import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Contract Diary Platform
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              👤 Your Profile
            </h2>
            <p className="text-gray-700">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-gray-700">
              <strong>Role:</strong> {user?.user_metadata?.role || 'User'}
            </p>
            <p className="text-gray-700">
              <strong>User ID:</strong> {user?.id}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contracts Card */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contracts
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Manage your construction contracts and track progress
              </p>
              <button
                onClick={() => navigate('/contracts')}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Contracts
              </button>
            </div>

            {/* Daily Diaries Card - ENABLED! */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-orange-500 transition-colors">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Daily Diaries
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Record daily work progress and activities
              </p>
              <button
                onClick={() => navigate('/contracts')}
                className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Access Diaries
              </button>
            </div>

            {/* Progress Claims Card - ENABLED! */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 transition-colors">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Progress Claims
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Generate and submit payment claims
              </p>
              <button
                onClick={() => navigate('/contracts')}
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Manage Claims
              </button>
            </div>

            {/* Reports Card */}
            <div className="border-2 border-gray-200 rounded-lg p-6 opacity-50">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Reports
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                View project analytics and insights
              </p>
              <button
                disabled
                className="inline-block px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
