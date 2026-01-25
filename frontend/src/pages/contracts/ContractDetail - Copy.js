import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ContractForm from './ContractForm';
import Breadcrumb from '../../components/common/Breadcrumb';
import DocumentRegister from '../../components/contracts/DocumentRegister';
import ContractFormationLockPanel from '../../components/contracts/ContractFormationLockPanel';

function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('contract-info');
  const [activeSubSection, setActiveSubSection] = useState('planning'); // For Project Management tab
  const [formationLocked, setFormationLocked] = useState(false); // NEW: Track lock status

  useEffect(() => {
    fetchContract();
  }, [id]);

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
                isLocked={contract.status !== 'draft'} // Lock if contract is active
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
            
            {/* ========================================== */}
            {/* TAB 1: CONTRACT INFORMATION                */}
            {/* ========================================== */}
            {activeTab === 'contract-info' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Contract Information</h2>
                
                {isEditing ? (
                  <ContractForm existingContract={contract} onSuccess={handleUpdateSuccess} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Type</h3>
                        <p className="text-base text-gray-900">{contractTypeLabels[contract.contract_type]}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Value</h3>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(contract.contract_value)}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Project Location</h3>
                        <p className="text-base text-gray-900">{contract.location}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Client Name</h3>
                        <p className="text-base text-gray-900">{contract.client_name}</p>
                      </div>

                      {contract.consultant_name && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Consultant Name</h3>
                          <p className="text-base text-gray-900">{contract.consultant_name}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Period</h3>
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-900">
                            <span className="text-sm font-medium mr-2">Start:</span>
                            <span>{formatDate(contract.start_date)}</span>
                          </div>
                          <div className="flex items-center text-gray-900">
                            <span className="text-sm font-medium mr-2">End:</span>
                            <span>{formatDate(contract.end_date)}</span>
                          </div>
                          <div className="flex items-center text-gray-900">
                            <span className="text-sm font-medium mr-2">Duration:</span>
                            <span>{contract.contract_duration_days} days</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Created Date</h3>
                        <p className="text-base text-gray-900">{formatDate(contract.created_at)}</p>
                      </div>

                      {contract.updated_at && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
                          <p className="text-base text-gray-900">{formatDate(contract.updated_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {!isEditing && contract.description && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Project Description</h3>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">{contract.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 2: PRE-CONTRACT & TENDER               */}
            {/* ========================================== */}
            {activeTab === 'pre-contract' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pre-Contract & Tender Stage Documents</h2>
                <p className="text-gray-600 mb-6">Preserve tender intent and pricing baseline (Read-only once contract is executed)</p>
                
                {/* Accordion Sections */}
                <div className="space-y-4">
                  {/* Employer/Client Documents */}
                  <div className="border border-gray-200 rounded-lg">
                    <button className="w-full px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                      <span>📄 Employer / Client Documents</span>
                      <span className="text-gray-400">▸</span>
                    </button>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-500 italic">Document register will be displayed here</p>
                      <div className="mt-2 text-sm text-blue-600">🚧 Coming in Session 19+</div>
                    </div>
                  </div>

                  {/* Tender Documents */}
                  <div className="border border-gray-200 rounded-lg">
                    <button className="w-full px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                      <span>📋 Tender Documents</span>
                      <span className="text-gray-400">▸</span>
                    </button>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        • Tender Drawings<br/>
                        • Tender Specifications<br/>
                        • Bills of Quantities (Tender BOQ)<br/>
                        • Addenda & Clarifications<br/>
                        • Tender Queries (Q&A Log)
                      </p>
                      <div className="mt-2 text-sm text-blue-600">🚧 Coming in Session 19+</div>
                    </div>
                  </div>

                  {/* Contractor Tender Submissions */}
                  <div className="border border-gray-200 rounded-lg">
                    <button className="w-full px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                      <span>📝 Contractor Tender Submissions</span>
                      <span className="text-gray-400">▸</span>
                    </button>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-500 italic">Submission documents will be displayed here</p>
                      <div className="mt-2 text-sm text-blue-600">🚧 Coming in Session 19+</div>
                    </div>
                  </div>
                </div>

                {contract.status !== 'draft' && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Read-Only Section:</strong> This section is read-only as the contract is now {contract.status}. 
                      Pre-contract documents are preserved for reference and pricing baseline comparison.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 3: CONTRACT FORMATION                  */}
            {/* ========================================== */}
            {activeTab === 'contract-formation' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Formation Documents</h2>
                <p className="text-gray-600 mb-6">Establish legally binding contract baseline</p>
                
                {/* Document Checklist */}
                <div className="space-y-3">
                  {[
                    { name: 'Letter of Award (LOA)', status: 'pending' },
                    { name: 'Articles of Agreement', status: 'pending' },
                    { name: 'Conditions of Contract (General & Particular)', status: 'pending' },
                    { name: 'Appendix to Conditions', status: 'pending' },
                    { name: 'Contract Drawings (IFC)', status: 'pending' },
                    { name: 'Specifications', status: 'pending' },
                    { name: 'Priced BOQ / Contract Sum Analysis', status: 'uploaded' },
                    { name: 'Contract Programme', status: 'pending' },
                    { name: 'Bonds & Insurance (CAR, PL, WC, PI)', status: 'pending' }
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={doc.status === 'uploaded'} className="h-5 w-5 text-blue-600" readOnly />
                        <span className="font-medium text-gray-900">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'uploaded' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">✓ Uploaded</span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Pending</span>
                        )}
                        <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Upload
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lock Baseline Button */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">Lock Contract Baseline</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Once locked, these documents become immutable and form the contract baseline snapshot.
                        All future changes must be tracked as variations.
                      </p>
                      <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                        🔒 Lock Contract Baseline
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  <p>🚧 Full document management system coming in Session 19+</p>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 4: PROJECT MANAGEMENT & ADMIN          */}
            {/* ========================================== */}
            {activeTab === 'project-management' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Management & Administration</h2>
                <p className="text-gray-600 mb-6">Day-to-day contract administration and operational core</p>
                
                {/* Sub-Navigation + Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Left: Sub-Navigation */}
                  <div className="lg:col-span-1">
                    <nav className="space-y-1">
                      {projectMgmtSubSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveSubSection(section.id)}
                          className={`
                            w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition-colors
                            ${activeSubSection === section.id
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-700 hover:bg-gray-50'
                            }
                          `}
                        >
                          <span className="mr-2">{section.icon}</span>
                          {section.name}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Right: Sub-Section Content */}
                  <div className="lg:col-span-3">
                    <div className="border border-gray-200 rounded-lg p-6 bg-white">
                      
                      {/* Planning & Scheduling */}
                      {activeSubSection === 'planning' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Planning & Scheduling</h3>
                          <div className="space-y-4">
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <h4 className="font-medium text-gray-900 mb-2">Master Programme</h4>
                              <p className="text-sm text-gray-600 mb-3">Contract-level master schedule and critical path</p>
                              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Programme →</button>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <h4 className="font-medium text-gray-900 mb-2">Look-Ahead Schedules</h4>
                              <p className="text-sm text-gray-600 mb-3">2-week and 4-week rolling schedules</p>
                              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Schedules →</button>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <h4 className="font-medium text-gray-900 mb-2">Programme Impact Analysis</h4>
                              <p className="text-sm text-gray-600 mb-3">Delay analysis and EOT justification</p>
                              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Analysis →</button>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 Programme Module coming in Session 19+</div>
                        </div>
                      )}

                      {/* Site Diary & Daily Records */}
                      {activeSubSection === 'diary' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">📖 Site Diary & Daily Records</h3>
                          <p className="text-gray-600 mb-4">System anchor module - all execution evidence flows through daily diaries</p>
                          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-green-900 mb-2">✅ Daily Diary Module Active</h4>
                                <p className="text-sm text-green-700 mb-4">
                                  Full diary functionality including weather tracking, manpower records, material deliveries, and photo documentation.
                                </p>
                                <button 
                                  onClick={() => navigate(`/contracts/${contract.id}/diaries`)}
                                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                                >
                                  Go to Daily Diaries →
                                </button>
                              </div>
                              <div className="text-6xl">📖</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HSE */}
                      {activeSubSection === 'hse' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">🦺 Health, Safety & Environment</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">HSE Plan</h4>
                              <p className="text-sm text-gray-600 mt-1">Upload and maintain HSE management plan</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Toolbox Meeting Records</h4>
                              <p className="text-sm text-gray-600 mt-1">Daily safety briefings and attendance</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Incident / Accident Reports</h4>
                              <p className="text-sm text-gray-600 mt-1">DOSH-compliant incident reporting</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 HSE Module coming in future sessions</div>
                        </div>
                      )}

                      {/* QA/QC */}
                      {activeSubSection === 'qaqc' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">✓ Quality Control / Quality Assurance</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Inspection & Test Plans (ITP)</h4>
                              <p className="text-sm text-gray-600 mt-1">Quality checkpoints and hold points</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Site Inspection Requests (IR)</h4>
                              <p className="text-sm text-gray-600 mt-1">Request consultant inspections</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Non-Conformance Reports (NCR)</h4>
                              <p className="text-sm text-gray-600 mt-1">Quality issues and corrective actions</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 QA/QC Module coming in future sessions</div>
                        </div>
                      )}

                      {/* Technical & Construction Documents */}
                      {activeSubSection === 'technical' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">📐 Technical & Construction Documents</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Construction Drawings</h4>
                              <p className="text-sm text-gray-600 mt-1">Current issued drawings register</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Shop Drawings</h4>
                              <p className="text-sm text-gray-600 mt-1">Detailed fabrication drawings for approval</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">RFI (Request for Information)</h4>
                              <p className="text-sm text-gray-600 mt-1">Technical clarifications and queries</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 Technical Docs Module coming in future sessions</div>
                        </div>
                      )}

                      {/* Commercial & Contractual */}
                      {activeSubSection === 'commercial' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Commercial & Contractual</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">Progress Claims</h4>
                                  <p className="text-sm text-gray-600 mt-1">✅ Module Active - BOQ-based valuation</p>
                                </div>
                                <button 
                                  onClick={() => navigate(`/contracts/${contract.id}/claims`)}
                                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                                >
                                  View Claims →
                                </button>
                              </div>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Variation Orders (VO)</h4>
                              <p className="text-sm text-gray-600 mt-1">Contract changes and scope variations</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Architect / Engineer Instructions</h4>
                              <p className="text-sm text-gray-600 mt-1">Official instructions and directives</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">EOT Claims</h4>
                              <p className="text-sm text-gray-600 mt-1">Extension of time applications</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 VO & EOT Modules coming in future sessions</div>
                        </div>
                      )}

                      {/* Subcontract & Supplier */}
                      {activeSubSection === 'subcontract' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">🤝 Subcontract & Supplier Management</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Subcontract Agreements</h4>
                              <p className="text-sm text-gray-600 mt-1">Subcontractor contracts and terms</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Supplier Purchase Orders</h4>
                              <p className="text-sm text-gray-600 mt-1">Material procurement tracking</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Subcontractor Claims</h4>
                              <p className="text-sm text-gray-600 mt-1">Back-to-back payment tracking</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 Subcontract Module coming in future sessions</div>
                        </div>
                      )}

                      {/* Statutory & Authority (MY) */}
                      {activeSubSection === 'statutory' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏛️ Statutory & Authority (Malaysia)</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">CIDB Registration</h4>
                              <p className="text-sm text-gray-600 mt-1">Construction Industry Development Board compliance</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">DOSH Approvals</h4>
                              <p className="text-sm text-gray-600 mt-1">Department of Occupational Safety & Health</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Local Authority (PBT) Approvals</h4>
                              <p className="text-sm text-gray-600 mt-1">Municipal and local authority permits</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">CCC-Related Submissions</h4>
                              <p className="text-sm text-gray-600 mt-1">Certificate of Completion & Compliance</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 Statutory Compliance Module coming in future sessions</div>
                        </div>
                      )}

                      {/* Testing & Handover */}
                      {activeSubSection === 'testing' && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔬 Testing, Commissioning & Handover</h3>
                          <div className="space-y-3">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Testing Records</h4>
                              <p className="text-sm text-gray-600 mt-1">Material and workmanship test results</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Commissioning Certificates</h4>
                              <p className="text-sm text-gray-600 mt-1">System testing and commissioning</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Practical Completion (PC)</h4>
                              <p className="text-sm text-gray-600 mt-1">PC certificate and substantial completion</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900">Defects Liability Period (DLP)</h4>
                              <p className="text-sm text-gray-600 mt-1">Post-completion defect tracking</p>
                            </div>
                          </div>
                          <div className="mt-4 text-sm text-blue-600">🚧 Testing & Handover Module coming in future sessions</div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 5: CLOSE-OUT & ARCHIVE                 */}
            {/* ========================================== */}
            {activeTab === 'close-out' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Close-Out & Archive</h2>
                <p className="text-gray-600 mb-6">Final contractual closure and legal defensibility</p>
                
                {/* Lock Status Information (if not completed) */}
                {contract.status !== 'completed' && (
                  <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-yellow-900 mb-1">ℹ️ Close-Out Actions Not Yet Available</h4>
                        <p className="text-sm text-yellow-700 mb-2">
                          You can view all close-out requirements below to plan ahead. Actions and uploads will be enabled after 
                          Practical Completion (PC) or Certificate of Practical Completion (CPC) is issued.
                        </p>
                        <p className="text-sm text-yellow-800">
                          <strong>Current Contract Status:</strong> {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Close-Out Sections (Always visible for vision completeness) */}
                <div className="space-y-4">
                  
                  {/* 1. Practical Completion */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">🏗️</span>
                        1. Practical Completion (PC) / Certificate of Practical Completion (CPC)
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">PC Certificate</h4>
                          <p className="text-sm text-gray-600">
                            Certificate of Practical Completion marking substantial completion of works.
                            Triggers release of half retention and start of Defects Liability Period.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                          Not Issued
                        </span>
                      </div>
                      
                      <div className="pl-4 border-l-2 border-gray-200">
                        <p className="text-xs text-gray-500 mb-2"><strong>Required Documents:</strong></p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• PC Application Letter</li>
                          <li>• List of Outstanding Works</li>
                          <li>• Statutory Compliance (CF, CCC, BOMBA, etc.)</li>
                          <li>• As-Built Drawings (Preliminary)</li>
                          <li>• M&E Completion Certificate</li>
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          📄 Upload PC Documents →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Defects Liability Period (DLP) */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">🔧</span>
                        2. Defects Liability Period (DLP)
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">DLP Management</h4>
                          <p className="text-sm text-gray-600">
                            12-month maintenance period (typical) for rectification of defects.
                            Track defect reports, rectification progress, and completion status.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                          Not Started
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-400">0</p>
                          <p className="text-xs text-gray-600">Defects Reported</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-400">0</p>
                          <p className="text-xs text-gray-600">Defects Rectified</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-400">0</p>
                          <p className="text-xs text-gray-600">Outstanding</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          📋 Manage DLP Defects →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Final Account Agreement */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">💰</span>
                        3. Final Account Agreement
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">Final Contract Sum</h4>
                          <p className="text-sm text-gray-600">
                            Agreed final contract value including all approved variations, claims, and adjustments.
                            Must be signed by Employer, Contractor, and Consultant.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                          Pending
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">Original Contract Sum</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(contract.contract_value)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Approved Variations</p>
                            <p className="font-semibold text-gray-400">+ RM 0.00</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Omissions</p>
                            <p className="font-semibold text-gray-400">- RM 0.00</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Final Contract Sum</p>
                            <p className="font-bold text-blue-600">{formatCurrency(contract.contract_value)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pl-4 border-l-2 border-gray-200">
                        <p className="text-xs text-gray-500 mb-2"><strong>Required Components:</strong></p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Final BOQ with all VOs</li>
                          <li>• Final Payment Certificate</li>
                          <li>• Agreed Claims & Contra Claims</li>
                          <li>• Daywork Sheets (if applicable)</li>
                          <li>• Final Account Statement</li>
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          💼 Prepare Final Account →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4. Final Completion Certificate */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">✅</span>
                        4. Final Completion Certificate (Certificate of Making Good Defects)
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">Making Good Defects Certificate</h4>
                          <p className="text-sm text-gray-600">
                            Certificate issued after successful completion of DLP and rectification of all defects.
                            Triggers release of remaining retention money.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                          Not Issued
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2"><strong>Prerequisites:</strong></p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <input type="checkbox" disabled className="h-4 w-4" />
                            <span className="text-gray-600">All DLP defects rectified and verified</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <input type="checkbox" disabled className="h-4 w-4" />
                            <span className="text-gray-600">Final inspection completed</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <input type="checkbox" disabled className="h-4 w-4" />
                            <span className="text-gray-600">All as-built drawings submitted</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <input type="checkbox" disabled className="h-4 w-4" />
                            <span className="text-gray-600">O&M manuals delivered</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          📜 Apply for Final Certificate →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5. Release of Retention Money */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">💵</span>
                        5. Release of Retention Money
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">Retention Release Management</h4>
                          <p className="text-sm text-gray-600">
                            Track and manage release of retention money (typically 5% of contract sum).
                            First half released at PC, second half after DLP completion.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total Retention (5%)</p>
                          <p className="text-lg font-bold text-gray-400">{formatCurrency(contract.contract_value * 0.05)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Released to Date</p>
                          <p className="text-lg font-bold text-gray-400">RM 0.00</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">First Half (at PC)</p>
                          <p className="text-sm font-semibold text-gray-400">{formatCurrency(contract.contract_value * 0.025)}</p>
                          <span className="text-xs text-gray-500">Pending PC</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Second Half (after DLP)</p>
                          <p className="text-sm font-semibold text-gray-400">{formatCurrency(contract.contract_value * 0.025)}</p>
                          <span className="text-xs text-gray-500">Pending DLP</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          💸 Process Retention Release →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 6. Performance Bond Release */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">🛡️</span>
                        6. Performance Bond Release
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">Bond Discharge</h4>
                          <p className="text-sm text-gray-600">
                            Request release/discharge of performance bond after final completion certificate.
                            Typically 10% of contract sum, valid until DLP completion + buffer period.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                          Active
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Bond Amount (10%)</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(contract.contract_value * 0.10)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Bond Expiry Date</span>
                          <span className="font-semibold text-gray-900">-</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Issuing Bank</span>
                          <span className="font-semibold text-gray-900">-</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Status</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Valid</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          📋 Request Bond Release →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 7. Dispute Records (if any) */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">⚖️</span>
                        7. Dispute Records & Resolution
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">CIPAA / Arbitration / Litigation</h4>
                          <p className="text-sm text-gray-600">
                            Record of any disputes, adjudication decisions, arbitration awards, or court judgments.
                            Essential for complete contract closure and legal defensibility.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                          No Disputes
                        </span>
                      </div>

                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-green-800">
                            <strong>No disputes recorded</strong> - Contract closure can proceed smoothly
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          📁 View Dispute Register →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 8. Complete Contract Archive */}
                  <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
                    <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
                      <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                        <span className="text-xl">🗄️</span>
                        8. Complete Contract Archive (Immutable Record)
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900 mb-1">Legal Archive & Audit Trail</h4>
                          <p className="text-sm text-blue-800">
                            Once contract is formally closed, entire contract becomes an immutable archive.
                            Full audit trail preserved for legal defensibility, tax purposes, and future reference.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-blue-800 mb-2">Archive Contents:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            All Contract Documents
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            All Daily Diaries
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Complete BOQ History
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            All Variation Orders
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Payment Certificates
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            QA/QC Records
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Site Instructions
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Correspondence
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Meeting Minutes
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            As-Built Drawings
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Photo Documentation
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Statutory Approvals
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-blue-200 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-700">Archive Status</p>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">Not Archived</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Total Documents:</span>
                            <span className="font-medium">-</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Size:</span>
                            <span className="font-medium">-</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Archive Date:</span>
                            <span className="font-medium">Pending</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-blue-200">
                        <button className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={contract.status !== 'completed'}>
                          🔒 Archive Contract (Make Immutable)
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Notice */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium mb-1">
                        🚧 Close-Out Module Implementation
                      </p>
                      <p className="text-xs text-blue-700">
                        Full close-out functionality including document management, retention tracking, and archive system will be implemented in future sessions. 
                        The structure above provides complete visibility of the close-out process requirements.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
