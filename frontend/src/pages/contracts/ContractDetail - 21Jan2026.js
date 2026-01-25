import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ContractForm from './ContractForm';
import Breadcrumb from '../../components/common/Breadcrumb';
import DocumentRegister from '../../components/contracts/DocumentRegister';
import ContractFormationLockPanel from '../../components/contracts/ContractFormationLockPanel';
import { resolveContractAuthority } from '../../utils/contractAuthority';
import { useAuth } from '../../contexts/AuthContext'

function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { user, profile, loading: authLoading } = useAuth()

  // Tab Management
  const [activeTab, setActiveTab] = useState('info');
  const [activeSubSection, setActiveSubSection] = useState('planning'); // For Project Management tab
  const [formationLocked, setFormationLocked] = useState(false); // NEW: Track lock status

  // inside ContractDetail()
  const [memberRole, setMemberRole] = useState(null);

  useEffect(() => {
    fetchContract();
    fetchMyMemberRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchMyMemberRole = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('contract_members')
      .select('member_role')
      .eq('contract_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching member role:', error);
      setMemberRole(null);
      return;
    }

    setMemberRole(data?.member_role || null);
  };
 
  const fetchContract = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
      alert('Error loading contract: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading || !contract || !profile) {
    return <div>Loading contract...</div>
  }

  const authority = resolveContractAuthority({
    contractStatus: contract.status,
    memberRole,                     // ✅ contract_members.member_role
    userDefaultRole: profile.user_role, // ✅ fallback (system default)
  });
 
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Contract deleted successfully');
      navigate('/contracts');
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Error deleting contract: ' + error.message);
    }
  };

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    fetchContract();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const contractTypeLabels = {
    PWD_203A: 'PWD Form 203A (Rev 1/2010)',
    PAM_2018: 'PAM Contract 2018',
    IEM: 'IEM Form',
    CIDB: 'CIDB Standard Form',
    JKR_DB: 'JKR Design & Build'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    suspended: 'bg-red-100 text-red-800'
  };

  // ========================================
  // STEP 3: TAB DEFINITIONS (Update your tabs array)
  // ========================================

  const tabs = [
    { id: 'info', label: 'Contract Information', icon: '📋' },
    { id: 'pre-contract', label: 'Pre-Contract', icon: '📝' },
    { id: 'formation', label: 'Contract Formation', icon: '📄' },
    { id: 'management', label: 'Project Management', icon: '🏗️' },
    { id: 'close-out', label: 'Close-Out', icon: '✅' },
  ];

  // ========================================
  // STEP 4: TAB CONTENT RENDERING
  // ========================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="bg-white rounded-lg border p-6">
            {/* Existing Contract Info content */}
            <h2 className="text-xl font-semibold mb-4">Contract Information</h2>
            {/* ... your existing contract info fields ... */}
          </div>
        );

      case 'pre-contract':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Pre-Contract Documents</h2>
              <p className="text-sm text-gray-600 mb-6">
                Tender documents, submissions, and pre-contract correspondence
              </p>
              
              {/* Document Register Component */}
              <DocumentRegister 
                contractId={contract.id}
                contractSection="PRE_CONTRACT"
                isLocked={contract.status !== 'draft'}
                authority={authority}
              />
            </div>

            {/* Information Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Pre-Contract documents become read-only once the contract status is changed to "Active".
              </p>
            </div>
          </div>
        );

      case 'formation':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Contract Formation Documents</h2>
              <p className="text-sm text-gray-600 mb-6">
                Core contract documents that establish the legal baseline
              </p>

              {/* Document Register Component */}
              <DocumentRegister 
                contractId={contract.id}
                contractSection="CONTRACT_FORMATION"
                isLocked={formationLocked}
              />
            </div>

            {/* Contract Formation Lock Panel */}
            {!formationLocked && contract.status === 'active' && (
              <ContractFormationLockPanel 
                contractId={contract.id}
                onLockSuccess={() => setFormationLocked(true)}
              />
            )}

            {/* Information Panel */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">Contract Baseline Process</h4>
              <ol className="text-sm text-amber-800 space-y-1 ml-4 list-decimal">
                <li>Upload all Contract Formation documents (LOA, Agreement, Bonds, Insurance, etc.)</li>
                <li>Verify all documents are correct and complete</li>
                <li>Lock Contract Baseline - this creates an immutable snapshot</li>
                <li>All future changes must be tracked as Variations</li>
              </ol>
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Project Management & Administration</h2>
            {/* Your existing management content */}
            <p className="text-gray-600">Day-to-day contract administration...</p>
          </div>
        );

      case 'close-out':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Close-Out Documents</h2>
              <p className="text-sm text-gray-600 mb-6">
                Final completion certificates, as-built drawings, warranties, and archive
              </p>

              {/* Document Register Component */}
              <DocumentRegister 
                contractId={contract.id}
                contractSection="CLOSE_OUT"
                isLocked={contract.status === 'completed'} // Lock if contract completed
              />
            </div>

            {/* Information Panel */}
            {contract.status === 'completed' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <strong>Contract Completed:</strong> Close-Out documents are now in read-only archive mode.
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };


  // Tab availability - ALL TABS ALWAYS ENABLED for vision completeness
  // Only content/actions inside tabs are locked based on status
  const getAvailableTabs = () => {
    const status = contract?.status;
    
    const allTabs = [
      { id: 'contract-info', name: 'Contract Information', icon: '📋', enabled: true },
      { id: 'pre-contract', name: 'Pre-Contract & Tender', icon: '📝', enabled: true },
      { id: 'contract-formation', name: 'Contract Formation', icon: '📜', enabled: true },
      { id: 'project-management', name: 'Project Management & Admin', icon: '⚙️', enabled: true },
      { id: 'close-out', name: 'Close-Out & Archive', icon: '🔒', enabled: true }
    ];

    // ALL tabs are always enabled (vision completeness)
    // Locking happens inside tab content, not at tab level
    return allTabs;
  };

  // Project Management Sub-Sections
  const projectMgmtSubSections = [
    { id: 'planning', name: 'Planning & Scheduling', icon: '📅' },
    { id: 'diary', name: 'Site Diary & Daily Records', icon: '📖' },
    { id: 'hse', name: 'HSE', icon: '🦺' },
    { id: 'qaqc', name: 'QA/QC', icon: '✓' },
    { id: 'technical', name: 'Technical & Construction Docs', icon: '📐' },
    { id: 'commercial', name: 'Commercial & Contractual', icon: '💼' },
    { id: 'subcontract', name: 'Subcontract & Supplier', icon: '🤝' },
    { id: 'statutory', name: 'Statutory & Authority (MY)', icon: '🏛️' },
    { id: 'testing', name: 'Testing & Handover', icon: '🔬' }
  ];

  // Build breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: null }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Contract not found</h3>
          <p className="mt-1 text-sm text-gray-500">The contract you're looking for doesn't exist.</p>
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* ========================================== */}
        {/* CONTRACT HEADER (PERSISTENT)               */}
        {/* ========================================== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{contract.contract_number}</h1>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[contract.status]}`}>
                  {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                </span>
              </div>
              <p className="text-lg text-gray-600 mb-4">{contract.project_name}</p>
              
              {/* Contract Metadata - Compact Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Form:</span>
                  <p className="font-medium text-gray-900">{contractTypeLabels[contract.contract_type]}</p>
                </div>
                <div>
                  <span className="text-gray-500">Employer:</span>
                  <p className="font-medium text-gray-900">{contract.client_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Contract Sum:</span>
                  <p className="font-medium text-blue-600">{formatCurrency(contract.contract_value)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Completion:</span>
                  <p className="font-medium text-gray-900">{formatDate(contract.end_date)}</p>
                </div>
              </div>
            </div>

            {/* Quick Status Indicators */}
            <div className="flex flex-col gap-2 ml-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">⏱ EOT Status:</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No Claims</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">💰 Payment:</span>
                <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Current</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">⚠ Outstanding:</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded text-xs">0 Items</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Contract'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Contract
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MAIN CONTRACT TABS                         */}
        {/* ========================================== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* ========================================== */}
        {/* QUICK ACTIONS (PERSISTENT)                 */}
        {/* ========================================== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* BOQ Button */}
            <button 
              onClick={() => navigate(`/contracts/${contract.id}/boq`)}
              className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg hover:border-blue-600 hover:bg-blue-100 transition-colors text-left"
            >
              <svg className="w-6 h-6 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="font-medium text-gray-900">Bill of Quantities</p>
              <p className="text-sm text-blue-600">✅ Active</p>
            </button>

            {/* Daily Diaries */}
            <button 
              onClick={() => navigate(`/contracts/${contract.id}/diaries`)}
              className="p-4 border-2 border-green-500 bg-green-50 rounded-lg hover:border-green-600 hover:bg-green-100 transition-colors text-left"
            >
              <svg className="w-6 h-6 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-medium text-gray-900">Daily Diaries</p>
              <p className="text-sm text-green-600">✅ Active</p>
            </button>

            {/* Progress Claims */}
            <button
              onClick={() => navigate(`/contracts/${contract.id}/claims`)}
              className="p-4 border-2 border-orange-500 bg-orange-50 rounded-lg hover:border-orange-600 hover:bg-orange-100 transition-colors text-left"
            >
              <svg className="w-6 h-6 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-gray-900">Progress Claims</p>
              <p className="text-sm text-orange-600">✅ Active</p>
            </button>

            {/* Reports Button - NEW */}
            <button 
              onClick={() => navigate(`/contracts/${contract.id}/reports`)}
              className="p-4 border-2 border-teal-500 bg-teal-50 rounded-lg hover:border-teal-600 hover:bg-teal-100 transition-colors text-left"
            >
              <svg className="w-6 h-6 text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-medium text-gray-900">Reports</p>
              <p className="text-sm text-teal-600">✅ Active</p>
            </button>

            {/* Work Programme */}
            <button className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left">
              <svg className="w-6 h-6 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium text-gray-900">Work Programme</p>
              <p className="text-sm text-gray-600">Coming Soon</p>
            </button>

            {/* Team Members */}
            <button 
              onClick={() => navigate(`/contracts/${contract.id}/members`)}
              className="p-4 border-2 border-indigo-500 bg-indigo-50 rounded-lg hover:border-indigo-600 hover:bg-indigo-100 transition-colors text-left"
            >
              <svg className="w-6 h-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="font-medium text-gray-900">Team Members</p>
              <p className="text-sm text-indigo-600">✅ Active</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ContractDetail;
