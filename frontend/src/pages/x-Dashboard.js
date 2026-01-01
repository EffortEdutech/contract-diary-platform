// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getDashboardStatistics } from '../services/reportService';
import StatsWidget from '../components/dashboard/StatsWidget';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDiaries, setRecentDiaries] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load statistics
      const statisticsData = await getDashboardStatistics(user.id);
      setStats(statisticsData);

      // Load recent diaries
      const { data: diaries, error: diariesError } = await supabase
        .from('work_diaries')
        .select(`
          id,
          diary_date,
          status,
          contracts(project_name)
        `)
        .order('diary_date', { ascending: false })
        .limit(5);

      if (diariesError) throw diariesError;
      setRecentDiaries(diaries || []);

      // Load recent claims
      const { data: claims, error: claimsError } = await supabase
        .from('progress_claims')
        .select(`
          id,
          claim_number,
          status,
          claim_amount,
          submission_date,
          contracts(project_name)
        `)
        .order('submission_date', { ascending: false })
        .limit(5);

      if (claimsError) throw claimsError;
      setRecentClaims(claims || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `RM ${parseFloat(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to Contract Diary Platform</p>
      </div>

      {/* Statistics Widgets */}
      {stats && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Contracts */}
            <StatsWidget
              title="Total Contracts"
              value={stats.contracts.total}
              subtitle={`${stats.contracts.active} active`}
              icon="📋"
              color="blue"
            />

            {/* Contract Value */}
            <StatsWidget
              title="Total Contract Value"
              value={formatCurrency(stats.contracts.totalValue)}
              icon="💰"
              color="green"
            />

            {/* Diaries */}
            <StatsWidget
              title="Total Diaries"
              value={stats.diaries.total}
              trend={{
                direction: stats.diaries.thisWeek > 0 ? 'up' : 'neutral',
                text: `+${stats.diaries.thisWeek} this week`
              }}
              icon="📝"
              color="purple"
            />

            {/* Claims */}
            <StatsWidget
              title="Total Claims"
              value={stats.claims.total}
              subtitle={`${stats.claims.completed} completed`}
              trend={{
                direction: stats.claims.thisMonth > 0 ? 'up' : 'neutral',
                text: `+${stats.claims.thisMonth} this month`
              }}
              icon="📄"
              color="orange"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Diaries */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Diaries</h3>
          </div>
          <div className="p-6">
            {recentDiaries.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No diaries yet</p>
            ) : (
              <div className="space-y-3">
                {recentDiaries.map((diary) => (
                  <div key={diary.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {diary.contracts?.project_name || 'Unknown Project'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(diary.diary_date), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      diary.status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                      diary.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {diary.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Claims</h3>
          </div>
          <div className="p-6">
            {recentClaims.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No claims yet</p>
            ) : (
              <div className="space-y-3">
                {recentClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Claim #{claim.claim_number}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {claim.contracts?.project_name || 'Unknown Project'}
                      </div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {formatCurrency(claim.claim_amount)}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      claim.status === 'paid' ? 'bg-green-100 text-green-800' :
                      claim.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      claim.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {claim.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/contracts"
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
          >
            <span className="text-2xl">📋</span>
            <div>
              <div className="font-medium text-blue-900">Contracts</div>
              <div className="text-xs text-blue-600">Manage contracts</div>
            </div>
          </a>
          <a
            href="/diaries"
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
          >
            <span className="text-2xl">📝</span>
            <div>
              <div className="font-medium text-purple-900">Diaries</div>
              <div className="text-xs text-purple-600">Daily records</div>
            </div>
          </a>
          <a
            href="/claims"
            className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
          >
            <span className="text-2xl">💰</span>
            <div>
              <div className="font-medium text-orange-900">Claims</div>
              <div className="text-xs text-orange-600">Progress claims</div>
            </div>
          </a>
          <a
            href="/reports"
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
          >
            <span className="text-2xl">📊</span>
            <div>
              <div className="font-medium text-green-900">Reports</div>
              <div className="text-xs text-green-600">Analytics & exports</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
