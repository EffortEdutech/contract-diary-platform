// frontend/src/pages/reports/Reports.js
// UPDATED: Date filters moved INSIDE each tab - tabs stay in same position!
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import StatisticsOverview from './StatisticsOverview';
import ProgressReport from './ProgressReport';
import FinancialReport from './FinancialReport';
import DiaryReport from './DiaryReport';
import BOQProgressReport from './BOQProgressReport';
import ClaimsSummaryReport from './ClaimsSummaryReport';
import { supabase } from '../../lib/supabase';
import Breadcrumb from '../../components/common/Breadcrumb';

const Reports = () => {
  const { contractId } = useParams();
  const [activeTab, setActiveTab] = useState('statistics');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Build breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: `/contracts/${contractId}` },  // ✅ NEW
    { label: 'Reports', href: null }
  ];    

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'statistics', label: 'Statistics', icon: '📊' },
    { id: 'progress', label: 'Progress Report', icon: '📈' },
    { id: 'financial', label: 'Financial Report', icon: '💰' },
    { id: 'diary', label: 'Diary Report', icon: '📝' },
    { id: 'boq', label: 'BOQ Progress', icon: '📋' },
    { id: 'claims', label: 'Claims Summary', icon: '📄' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 text-5xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Contract Not Found</h3>
        <p className="text-gray-500">Unable to load contract details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-1xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">{contract.project_name}</p>
      </div>

      {/* Tab Navigation - STAYS IN SAME POSITION! */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content - Each tab manages its own date filters */}
        <div className="p-6">
          {activeTab === 'statistics' && (
            <StatisticsOverview contractId={contractId} />
          )}
          {activeTab === 'progress' && (
            <ProgressReport contractId={contractId} />
          )}
          {activeTab === 'financial' && (
            <FinancialReport contractId={contractId} />
          )}
          {activeTab === 'diary' && (
            <DiaryReport contractId={contractId} />
          )}
          {activeTab === 'boq' && (
            <BOQProgressReport contractId={contractId} />
          )}
          {activeTab === 'claims' && (
            <ClaimsSummaryReport contractId={contractId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
