// ============================================
// DASHBOARD - CLEAN SIMPLE VERSION
// ============================================
// Shows only diary date and status - no weather icons or details
// Created: 2025-12-31
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('diaries');
  const [userContracts, setUserContracts] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedContracts, setExpandedContracts] = useState({});
  const [diariesData, setDiariesData] = useState({});
  const [claimsData, setClaimsData] = useState({});
  const [reportsData, setReportsData] = useState({});

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    if (userContracts.length > 0) {
      loadTabData();
    }
  }, [activeTab, userContracts]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id);

      let userProfile = profiles && profiles.length > 0 ? profiles[0] : null;
      setUserRole(userProfile?.role || 'user');

      const { data: memberships } = await supabase
        .from('contract_members')
        .select('contract_id, member_role')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        setUserContracts([]);
        setLoading(false);
        return;
      }

      const contractIds = memberships.map(m => m.contract_id);

      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, contract_number, project_name, status, contract_value, organization_id')
        .in('id', contractIds);

      const contractsList = contracts.map(contract => {
        const membership = memberships.find(m => m.contract_id === contract.id);
        return {
          ...contract,
          member_role: membership?.member_role || 'member'
        };
      });

      setUserContracts(contractsList);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (activeTab === 'diaries') {
      await loadDiariesData();
    } else if (activeTab === 'claims') {
      await loadClaimsData();
    } else if (activeTab === 'reports') {
      await loadReportsData();
    }
  };

  const loadDiariesData = async () => {
    const data = {};
    for (const contract of userContracts) {
      // SIMPLE QUERY: Just date and status
      const { data: diaries } = await supabase
        .from('work_diaries')
        .select('id, diary_date, status')
        .eq('contract_id', contract.id)
        .order('diary_date', { ascending: false })
        .limit(7);

      data[contract.id] = diaries || [];
    }
    setDiariesData(data);
  };

  const loadClaimsData = async () => {
    const data = {};
    for (const contract of userContracts) {
      const { data: claims } = await supabase
        .from('progress_claims')
        .select('id, claim_number, claim_title, status, claim_amount, submission_date')
        .eq('contract_id', contract.id)
        .order('claim_number', { ascending: false })
        .limit(10);

      data[contract.id] = claims || [];
    }
    setClaimsData(data);
  };

  const loadReportsData = async () => {
    const data = {};
    for (const contract of userContracts) {
      data[contract.id] = [
        { id: 1, name: 'Progress Report', type: 'progress', status: 'available' },
        { id: 2, name: 'Financial Summary', type: 'financial', status: 'available' },
        { id: 3, name: 'S-Curve Analysis', type: 's-curve', status: 'coming_soon' }
      ];
    }
    setReportsData(data);
  };

  const toggleContract = (contractId) => {
    setExpandedContracts(prev => ({
      ...prev,
      [contractId]: !prev[contractId]
    }));
  };

  const isContractExpanded = (contractId) => {
    return expandedContracts[contractId] || false;
  };

  const canSeeTab = (tabName) => {
    if (!userRole) return false;
    const permissions = {
      diaries: ['main_contractor', 'subcontractor', 'consultant', 'supplier'],
      reports: ['main_contractor', 'subcontractor', 'consultant', 'supplier'],
      claims: ['main_contractor', 'subcontractor', 'consultant', 'supplier'],
      contracts: ['main_contractor', 'subcontractor']
    };
    return permissions[tabName]?.includes(userRole);
  };

  const tabs = [
    { id: 'diaries', name: 'Work Diary', icon: '📝', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-500', hoverBg: 'hover:bg-orange-50' },
    { id: 'reports', name: 'Reports', icon: '📊', bgColor: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-500', hoverBg: 'hover:bg-purple-50' },
    { id: 'claims', name: 'Claims', icon: '💰', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-500', hoverBg: 'hover:bg-green-50' },
    { id: 'contracts', name: 'Contracts', icon: '📄', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-500', hoverBg: 'hover:bg-blue-50' }
  ];

  const visibleTabs = tabs.filter(tab => canSeeTab(tab.id));

  useEffect(() => {
    if (visibleTabs.length > 0 && !canSeeTab(activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, userRole]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-purple-100 text-purple-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      acknowledged: 'bg-green-100 text-green-700'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${badges[status] || badges.draft}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap -mb-px">
              {visibleTabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id ? `${tab.borderColor} ${tab.textColor}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}>
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {userContracts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts Found</h3>
                <p className="text-gray-500 mb-4">You're not assigned to any contracts yet.</p>
                <button onClick={() => navigate('/contracts')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Contracts</button>
              </div>
            ) : (
              <div className="space-y-4">
                {userContracts.map((contract) => (
                  <div key={contract.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleContract(contract.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <svg className={`w-5 h-5 text-gray-500 transition-transform ${isContractExpanded(contract.id) ? 'transform rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{contract.project_name}</h3>
                            <p className="text-sm text-gray-500">
                              {contract.contract_number} • {getStatusBadge(contract.status)} • 
                              <span className="ml-1 text-xs">Role: {contract.member_role?.replace('_', ' ')}</span>
                            </p>
                          </div>
                        </div>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            if (activeTab === 'diaries') navigate(`/contracts/${contract.id}/diaries`);
                            else if (activeTab === 'claims') navigate(`/contracts/${contract.id}/claims`);
                            else if (activeTab === 'reports') navigate(`/contracts/${contract.id}/reports`);
                            else if (activeTab === 'contracts') navigate(`/contracts/${contract.id}`);
                          }}
                          className={`px-4 py-2 ${visibleTabs.find(t => t.id === activeTab)?.bgColor} ${visibleTabs.find(t => t.id === activeTab)?.textColor} rounded-lg font-medium text-sm ${visibleTabs.find(t => t.id === activeTab)?.hoverBg} transition-colors`}>
                          Go to {visibleTabs.find(t => t.id === activeTab)?.name} →
                        </button>
                      </div>
                    </div>

                    {isContractExpanded(contract.id) && (
                      <div className="p-4 bg-white">
                        {/* WORK DIARY - SIMPLE: Just date and status */}
                        {activeTab === 'diaries' && (
                          <div>
                            {diariesData[contract.id]?.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 mb-3">Recent Diaries:</p>
                                {diariesData[contract.id].map((diary) => (
                                  <div key={diary.id} onClick={() => navigate(`/contracts/${contract.id}/diaries/${diary.id}`)}
                                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors">
                                    <div>
                                      <p className="font-medium text-gray-900">{formatDate(diary.diary_date)}</p>
                                      <div className="mt-1">{getStatusBadge(diary.status)}</div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm py-4 text-center">No diaries yet for this contract</p>
                            )}
                          </div>
                        )}

                        {/* CLAIMS */}
                        {activeTab === 'claims' && (
                          <div>
                            {claimsData[contract.id]?.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 mb-3">Recent Claims:</p>
                                {claimsData[contract.id].map((claim) => (
                                  <div key={claim.id} onClick={() => navigate(`/contracts/${contract.id}/claims/${claim.id}`)}
                                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-colors">
                                    <div>
                                      <p className="font-medium text-gray-900">Claim #{claim.claim_number}</p>
                                      <p className="text-sm text-gray-500">{claim.claim_title || 'No title'}</p>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-sm font-medium text-green-600">{formatCurrency(claim.claim_amount)}</span>
                                        {getStatusBadge(claim.status)}
                                      </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm py-4 text-center">No claims yet for this contract</p>
                            )}
                          </div>
                        )}

                        {/* REPORTS */}
                        {activeTab === 'reports' && (
                          <div>
                            {reportsData[contract.id]?.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 mb-3">Available Reports:</p>
                                {reportsData[contract.id].map((report) => (
                                  <div key={report.id}
                                    className={`flex items-center justify-between p-3 bg-purple-50 rounded-lg ${
                                      report.status === 'available' ? 'hover:bg-purple-100 cursor-pointer' : 'opacity-50'
                                    } transition-colors`}>
                                    <div className="flex items-center space-x-3">
                                      <div className="text-2xl">📊</div>
                                      <div>
                                        <p className="font-medium text-gray-900">{report.name}</p>
                                        <p className="text-sm text-gray-500 capitalize">{report.type} report</p>
                                      </div>
                                    </div>
                                    {report.status === 'available' ? (
                                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    ) : (
                                      <span className="text-xs text-gray-500">Coming Soon</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm py-4 text-center">No reports available</p>
                            )}
                          </div>
                        )}

                        {/* CONTRACTS */}
                        {activeTab === 'contracts' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Contract Value</p>
                                <p className="text-lg font-semibold text-gray-900">{formatCurrency(contract.contract_value)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Your Role</p>
                                <p className="text-lg font-semibold text-gray-900 capitalize">{contract.member_role?.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2 pt-2">
                              <button onClick={() => navigate(`/contracts/${contract.id}/boq`)}
                                className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">BOQ</button>
                              <button onClick={() => navigate(`/contracts/${contract.id}/diaries`)}
                                className="flex-1 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium">Diaries</button>
                              <button onClick={() => navigate(`/contracts/${contract.id}/claims`)}
                                className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">Claims</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
