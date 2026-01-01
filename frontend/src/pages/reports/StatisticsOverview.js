// frontend/src/pages/reports/StatisticsOverview.js
// Contract Statistics Overview - Dashboard style
import React, { useState, useEffect } from 'react';
import StatsWidget from '../../components/dashboard/StatsWidget';
import { supabase } from '../../lib/supabase';

const StatisticsOverview = ({ contractId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    contract: null,
    diaries: { total: 0, acknowledged: 0, pending: 0 },
    claims: { total: 0, totalAmount: 0, paid: 0 },
    boq: { totalItems: 0, completed: 0, completionPercentage: 0 }
  });

  useEffect(() => {
    loadStatistics();
  }, [contractId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Get contract details
      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      // Get diaries statistics
      const { data: allDiaries } = await supabase
        .from('work_diaries')
        .select('status')
        .eq('contract_id', contractId);

      const diariesStats = {
        total: allDiaries?.length || 0,
        acknowledged: allDiaries?.filter(d => d.status === 'acknowledged').length || 0,
        pending: allDiaries?.filter(d => d.status === 'draft' || d.status === 'submitted').length || 0
      };

      // Get claims statistics
      const { data: allClaims } = await supabase
        .from('progress_claims')
        .select('claim_amount, status')
        .eq('contract_id', contractId);

      const claimsStats = {
        total: allClaims?.length || 0,
        totalAmount: allClaims?.reduce((sum, c) => sum + (parseFloat(c.claim_amount) || 0), 0) || 0,
        paid: allClaims?.filter(c => c.status === 'paid').length || 0
      };

      // Get BOQ statistics
      const { data: boqs } = await supabase
        .from('boq')
        .select('id')
        .eq('contract_id', contractId)
        .eq('status', 'approved');

      if (boqs && boqs.length > 0) {
        const { data: boqItems } = await supabase
          .from('boq_items')
          .select('percentage_complete')
          .eq('boq_id', boqs[0].id);

        const totalItems = boqItems?.length || 0;
        const completedItems = boqItems?.filter(item => item.percentage_complete >= 100).length || 0;
        const completionPercentage = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;

        setStats({
          contract,
          diaries: diariesStats,
          claims: claimsStats,
          boq: {
            totalItems,
            completed: completedItems,
            completionPercentage
          }
        });
      } else {
        setStats({
          contract,
          diaries: diariesStats,
          claims: claimsStats,
          boq: { totalItems: 0, completed: 0, completionPercentage: 0 }
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      'completed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' },
      'on_hold': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'On Hold' },
      'draft': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' }
    };
    const badge = badges[status] || badges['draft'];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats.contract) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-5xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Contract Data</h3>
        <p className="text-gray-500">Unable to load contract statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Overview Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{stats.contract.project_name}</h2>
            <p className="text-blue-100 mb-4">{stats.contract.contract_number}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-blue-200">Contract Type</div>
                <div className="font-semibold">{stats.contract.contract_type}</div>
              </div>
              <div>
                <div className="text-blue-200">Start Date</div>
                <div className="font-semibold">{formatDate(stats.contract.start_date)}</div>
              </div>
              <div>
                <div className="text-blue-200">Completion Date</div>
                <div className="font-semibold">{formatDate(stats.contract.completion_date)}</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(stats.contract.status)}
            <div className="mt-4">
              <div className="text-blue-200 text-sm">Contract Value</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.contract.contract_value)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Work Diaries Widget */}
        <StatsWidget
          title="Work Diaries"
          value={stats.diaries.total}
          subtitle={`${stats.diaries.acknowledged} acknowledged`}
          trend={stats.diaries.acknowledged > 0 ? "up" : "neutral"}
          trendValue={stats.diaries.total > 0 ? `${((stats.diaries.acknowledged / stats.diaries.total) * 100).toFixed(0)}%` : "0%"}
          icon="📝"
          color="orange"
        />

        {/* Progress Claims Widget */}
        <StatsWidget
          title="Claims Submitted"
          value={stats.claims.total}
          subtitle={formatCurrency(stats.claims.totalAmount)}
          trend={stats.claims.paid > 0 ? "up" : "neutral"}
          trendValue={`${stats.claims.paid} paid`}
          icon="💰"
          color="green"
        />

        {/* BOQ Completion Widget */}
        <StatsWidget
          title="BOQ Progress"
          value={`${stats.boq.completionPercentage}%`}
          subtitle={`${stats.boq.completed} of ${stats.boq.totalItems} items`}
          trend={stats.boq.completionPercentage > 50 ? "up" : "neutral"}
          trendValue={stats.boq.totalItems > 0 ? "On track" : "Not started"}
          icon="📊"
          color="blue"
        />

        {/* Pending Actions Widget */}
        <StatsWidget
          title="Pending Items"
          value={stats.diaries.pending}
          subtitle="Diaries pending acknowledgment"
          trend={stats.diaries.pending > 0 ? "down" : "neutral"}
          trendValue={stats.diaries.pending > 0 ? "Needs attention" : "All clear"}
          icon="⏳"
          color="yellow"
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diaries Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
              📝
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Work Diaries</h3>
              <p className="text-sm text-gray-500">Documentation tracking</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Entries</span>
              <span className="font-semibold text-gray-900">{stats.diaries.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Acknowledged</span>
              <span className="font-semibold text-green-600">{stats.diaries.acknowledged}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">{stats.diaries.pending}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Compliance Rate</span>
                <span className="text-lg font-bold text-orange-600">
                  {stats.diaries.total > 0 ? ((stats.diaries.acknowledged / stats.diaries.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Claims Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Progress Claims</h3>
              <p className="text-sm text-gray-500">Payment tracking</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Claims</span>
              <span className="font-semibold text-gray-900">{stats.claims.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Amount</span>
              <span className="font-semibold text-blue-600">{formatCurrency(stats.claims.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Paid Claims</span>
              <span className="font-semibold text-green-600">{stats.claims.paid}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Contract Progress</span>
                <span className="text-lg font-bold text-green-600">
                  {stats.contract.contract_value > 0 
                    ? ((stats.claims.totalAmount / stats.contract.contract_value) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOQ Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">BOQ Items</h3>
              <p className="text-sm text-gray-500">Quantity tracking</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Items</span>
              <span className="font-semibold text-gray-900">{stats.boq.totalItems}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{stats.boq.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">In Progress</span>
              <span className="font-semibold text-yellow-600">{stats.boq.totalItems - stats.boq.completed}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Completion</span>
                <span className="text-lg font-bold text-blue-600">{stats.boq.completionPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Project Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium text-gray-700">Start Date:</div>
            <div className="flex-1">
              <div className="text-gray-900">{formatDate(stats.contract.start_date)}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium text-gray-700">Completion:</div>
            <div className="flex-1">
              <div className="text-gray-900">{formatDate(stats.contract.completion_date)}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium text-gray-700">Duration:</div>
            <div className="flex-1">
              <div className="text-gray-900">
                {stats.contract.contract_duration} days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Quick Insight</h4>
          <p className="text-sm text-blue-800">
            {stats.diaries.pending > 0 
              ? `You have ${stats.diaries.pending} diary ${stats.diaries.pending === 1 ? 'entry' : 'entries'} pending acknowledgment. Review them to maintain CIPAA compliance.`
              : "All diaries are up to date! Great job maintaining documentation compliance."}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 mb-2">🎯 Progress Status</h4>
          <p className="text-sm text-green-800">
            {stats.boq.completionPercentage >= 50
              ? `Project is ${stats.boq.completionPercentage}% complete. You're on track to meet the completion date.`
              : stats.boq.totalItems > 0
              ? `Project is ${stats.boq.completionPercentage}% complete. Focus on accelerating BOQ item completion.`
              : "BOQ not yet created. Set up your Bill of Quantities to track progress."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsOverview;
