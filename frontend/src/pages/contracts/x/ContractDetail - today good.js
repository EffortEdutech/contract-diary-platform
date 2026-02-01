// frontend/src/pages/contracts/ContractDetail.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Breadcrumb from '../../components/common/Breadcrumb';
import ContractForm from './ContractForm';
import DocumentRegister from '../../components/contracts/DocumentRegister';
import ContractFormationLockPanel from '../../components/contracts/ContractFormationLockPanel';
import { resolveContractAuthority } from '../../utils/contractAuthority';
import { useAuth } from '../../contexts/AuthContext';

// -----------------------------------------------------------------------------
// Single Source of Truth: Tabs (ALWAYS visible)
// -----------------------------------------------------------------------------
const TAB_CONFIG = [
  { id: 'contract-info', label: 'Contract Information', icon: '📋' },
  { id: 'pre-contract', label: 'Pre-Contract & Tender', icon: '📝' },
  { id: 'contract-formation', label: 'Contract Formation', icon: '📜' },
  { id: 'project-management', label: 'Project Management & Admin', icon: '⚙️' },
  { id: 'close-out', label: 'Close-Out & Archive', icon: '🔒' },
];

// Project Management sub-sections (structure visible; actions can be gated)
const PM_SUBSECTIONS = [
  { id: 'planning', name: 'Planning & Scheduling', icon: '📅' },
  { id: 'diary', name: 'Site Diary & Daily Records', icon: '📖' },
  { id: 'hse', name: 'HSE', icon: '🦺' },
  { id: 'qaqc', name: 'QA/QC', icon: '✓' },
  { id: 'technical', name: 'Technical & Construction Docs', icon: '📐' },
  { id: 'commercial', name: 'Commercial & Contractual', icon: '💼' },
  { id: 'subcontract', name: 'Subcontract & Supplier', icon: '🤝' },
  { id: 'statutory', name: 'Statutory & Authority (MY)', icon: '🏛️' },
  { id: 'testing', name: 'Testing & Handover', icon: '🔬' },
];

// Helper: which contract statuses should “auto-lock” Formation baseline
const AUTO_LOCK_STATUSES = new Set(['active', 'suspended', 'completed', 'terminated', 'archived']);

// Optional future table (recommended) – we *try* to read it, but we don’t break if it doesn’t exist
const BASELINE_LOCK_TABLE = 'contract_baseline_locks';

function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);

  // Tabs (single canonical ids)
  const [activeTab, setActiveTab] = useState('contract-info');
  const [activeSubSection, setActiveSubSection] = useState('planning');

  // Formation baseline lock
  const [baselineLockRow, setBaselineLockRow] = useState(null); // row from contract_baseline_locks if exists
  const [baselineLockLoading, setBaselineLockLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Contract
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (err) {
      console.error('Error fetching contract:', err);
      alert('Error loading contract: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Load baseline lock row (if table exists). If not, we gracefully fallback.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!contract?.id) return;
    loadBaselineLock(contract.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id]);

  const loadBaselineLock = async (contractId) => {
    setBaselineLockLoading(true);
    try {
      const { data, error } = await supabase
        .from(BASELINE_LOCK_TABLE)
        .select('*')
        .eq('contract_id', contractId)
        .order('locked_at', { ascending: false })
        .limit(1);

      // If table doesn't exist, Supabase returns an error; we treat as “no row”
      if (error) {
        setBaselineLockRow(null);
        return;
      }
      setBaselineLockRow((data && data[0]) || null);
    } finally {
      setBaselineLockLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Authority (role/status gating)
  // ---------------------------------------------------------------------------
  const authority = useMemo(() => {
    if (!contract || !profile) return null;
    return resolveContractAuthority({
      contractStatus: contract.status,
      userRole: profile.role,
    });
  }, [contract, profile]);

  // ---------------------------------------------------------------------------
  // Lock policy (your decision)
  // - Formation baseline locks when:
  //   1) Contract status becomes Active (or later), OR
  //   2) User clicks Lock Baseline after checklist (baseline lock row exists)
  // - When locked: All Formation documents read-only, Management continues.
  // ---------------------------------------------------------------------------
  const formationLocked = useMemo(() => {
    if (!contract) return false;
    if (AUTO_LOCK_STATUSES.has(contract.status)) return true;
    if (baselineLockRow?.is_locked) return true;
    return false;
  }, [contract, baselineLockRow]);

  // ---------------------------------------------------------------------------
  // Tab-specific “isLocked” for DocumentRegister
  // ---------------------------------------------------------------------------
  const preContractLocked = useMemo(() => {
    if (!contract) return true;
    // Pre-contract becomes read-only once contract is not draft (as you stated earlier)
    return contract.status !== 'draft';
  }, [contract]);

  const closeOutLocked = useMemo(() => {
    if (!contract) return true;
    // Close-out becomes archive read-only when completed (or later)
    return ['completed', 'terminated', 'archived'].includes(contract.status);
  }, [contract]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleDeleteContract = async () => {
    if (!window.confirm('Delete this contract? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      alert('Contract deleted');
      navigate('/contracts');
    } catch (err) {
      console.error('Delete contract error:', err);
      alert(err?.message || 'Failed to delete contract');
    }
  };

  // Manual baseline lock (after checklist) — best practice to write lock row.
  // If BASELINE_LOCK_TABLE doesn't exist yet, we show a clear message.
  const handleManualBaselineLock = async () => {
    if (!contract?.id) return;

    if (
      !window.confirm(
        'Lock Contract Formation baseline?\n\nThis will make Contract Formation documents read-only.\nProject Management continues normally.'
      )
    ) {
      return;
    }

    try {
      // Try to insert lock row (recommended table).
      // If table doesn't exist, this will error and we show instruction.
      const payload = {
        contract_id: contract.id,
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: user?.id || null,
        lock_reason: 'Manual baseline lock after checklist',
      };

      const { error } = await supabase.from(BASELINE_LOCK_TABLE).insert(payload);
      if (error) {
        console.warn('Baseline lock table missing or insert failed:', error);
        alert(
          `Baseline lock could not be saved in DB.\n\nRecommended fix:\nCreate table "${BASELINE_LOCK_TABLE}" to persist baseline lock.\n\nFor now, baseline will still auto-lock when status becomes Active.`
        );
        return;
      }

      await loadBaselineLock(contract.id);
      alert('Baseline locked successfully.');
    } catch (err) {
      console.error('Manual lock error:', err);
      alert(err?.message || 'Failed to lock baseline');
    }
  };

  // ---------------------------------------------------------------------------
  // UI Helpers
  // ---------------------------------------------------------------------------
  const contractTypeLabels = {
    PWD_203A: 'PWD Form 203A (Rev 1/2010)',
    PAM_2018: 'PAM Contract 2018',
    IEM: 'IEM Form',
    CIDB: 'CIDB Standard Form',
    JKR_DB: 'JKR Design & Build',
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    suspended: 'bg-red-100 text-red-800',
    terminated: 'bg-red-100 text-red-800',
    archived: 'bg-purple-100 text-purple-800',
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const breadcrumbItems = useMemo(
    () => [
      { label: 'Contracts', href: '/contracts', icon: '📄' },
      { label: contract?.contract_number || 'Loading...', href: null },
    ],
    [contract]
  );

  // ---------------------------------------------------------------------------
  // Loading states
  // ---------------------------------------------------------------------------
  if (loading || authLoading || !profile) {
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
        <div className="text-center bg-white border rounded-lg p-8">
          <h3 className="text-sm font-medium text-gray-900">Contract not found</h3>
          <p className="mt-1 text-sm text-gray-500">The contract you're looking for doesn't exist.</p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/contracts')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Contracts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab content renderers
  // ---------------------------------------------------------------------------
  const renderContractInfo = () => {
    if (isEditing) {
      return (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Contract</h2>
          <ContractForm contract={contract} onSuccess={() => { setIsEditing(false); fetchContract(); }} />
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Contract Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-gray-500">Contract Number</p>
            <p className="font-medium text-gray-900">{contract.contract_number}</p>
          </div>

          <div>
            <p className="text-gray-500">Project Name</p>
            <p className="font-medium text-gray-900">{contract.project_name}</p>
          </div>

          <div>
            <p className="text-gray-500">Contract Form</p>
            <p className="font-medium text-gray-900">
              {contractTypeLabels[contract.contract_type] || contract.contract_type || 'N/A'}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Employer / Client</p>
            <p className="font-medium text-gray-900">{contract.client_name || 'N/A'}</p>
          </div>

          <div>
            <p className="text-gray-500">Contract Sum</p>
            <p className="font-medium text-blue-600">{formatCurrency(contract.contract_value)}</p>
          </div>

          <div>
            <p className="text-gray-500">Completion Date</p>
            <p className="font-medium text-gray-900">{formatDate(contract.end_date)}</p>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 border rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Authority Mode:</strong> {authority?.isReadOnly ? 'Read-only' : 'Editable'} (role/status gated)
          </p>
        </div>
      </div>
    );
  };

  const renderPreContract = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Pre-Contract & Tender</h2>
          <p className="text-sm text-gray-600 mb-6">
            Tender documents, submissions, pre-contract correspondence (read-only once contract is Active).
          </p>

          <DocumentRegister
            contractId={contract.id}
            contractSection="PRE_CONTRACT"
            isLocked={preContractLocked}
            authority={authority}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Rule:</strong> Pre-Contract becomes read-only once contract status is not <code>draft</code>.
          </p>
        </div>
      </div>
    );
  };

  const renderFormation = () => {
    const lockReason =
      AUTO_LOCK_STATUSES.has(contract.status)
        ? `Auto-locked because status is "${contract.status}".`
        : baselineLockRow?.is_locked
          ? 'Locked manually after checklist.'
          : null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Contract Formation</h2>
              <p className="text-sm text-gray-600">
                Core legal baseline documents (LOA, Agreement, Bonds, Insurance, etc.)
              </p>
            </div>

            {/* Always visible lock action (vision completeness), but gated */}
            <button
              onClick={handleManualBaselineLock}
              disabled={formationLocked || authority?.isReadOnly}
              title={
                formationLocked
                  ? 'Baseline already locked'
                  : authority?.isReadOnly
                    ? 'Read-only mode'
                    : 'Lock baseline after checklist'
              }
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              🔒 Lock Baseline
            </button>
          </div>

          {baselineLockLoading && (
            <p className="text-xs text-gray-500 mt-3">Checking baseline lock status…</p>
          )}

          {formationLocked && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Formation Locked:</strong> All Contract Formation documents are now read-only.
              </p>
              {lockReason && <p className="text-sm text-amber-800 mt-1">{lockReason}</p>}
              <p className="text-sm text-amber-800 mt-2">
                Project Management & Admin continues normally.
              </p>
            </div>
          )}

          <div className="mt-6">
            <DocumentRegister
              contractId={contract.id}
              contractSection="CONTRACT_FORMATION"
              isLocked={formationLocked}
              authority={authority}
            />
          </div>
        </div>

        {/* Checklist panel (visible when not locked) */}
        {!formationLocked && (
          <div className="bg-white rounded-lg border p-6">
            <ContractFormationLockPanel
              contractId={contract.id}
              onLockSuccess={async () => {
                // If your panel creates lock row or updates status, refresh
                await fetchContract();
                await loadBaselineLock(contract.id);
              }}
            />

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">Baseline Process</h4>
              <ol className="text-sm text-amber-800 space-y-1 ml-4 list-decimal">
                <li>Upload all Formation documents</li>
                <li>Verify completeness and correctness</li>
                <li>Lock baseline (manual) OR activate the contract (auto-lock)</li>
                <li>Future changes are tracked via variations/admin actions</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProjectManagement = () => {
    // Management continues even if formationLocked is true.
    // We keep “structure visible”; per-module actions can be implemented later.
    const goToDiaries = () => navigate(`/contracts/${contract.id}/diaries`);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex gap-2 overflow-x-auto">
            {PM_SUBSECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSubSection(s.id)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap border ${
                  activeSubSection === s.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{s.icon}</span>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-section content (placeholders but visible) */}
        {activeSubSection === 'planning' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Planning & Scheduling</h2>
            <p className="text-sm text-gray-600 mb-4">
              Programme uploads and revisions (imported data) – coming soon.
            </p>

            {/* Vision completeness: buttons visible but disabled */}
            <div className="flex gap-3">
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                Upload Baseline Programme
              </button>
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                Upload Revised Programme
              </button>
            </div>
          </div>
        )}

        {activeSubSection === 'diary' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Site Diary & Daily Records</h2>
            <p className="text-sm text-gray-600 mb-4">
              Diary is the factual anchor of the platform.
            </p>

            <div className="flex gap-3">
              <button
                onClick={goToDiaries}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Open Diaries
              </button>
            </div>
          </div>
        )}

        {activeSubSection === 'technical' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Technical & Construction Docs</h2>
            <p className="text-sm text-gray-600 mb-6">
              Drawings, method statements, specs, submissions (PDF register).
            </p>

            <DocumentRegister
              contractId={contract.id}
              contractSection="PROJECT_MANAGEMENT"
              isLocked={false}
              authority={authority}
            />
          </div>
        )}

        {/* Other PM sections: keep visible placeholders */}
        {['hse', 'qaqc', 'commercial', 'subcontract', 'statutory', 'testing'].includes(activeSubSection) && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">
              {PM_SUBSECTIONS.find((x) => x.id === activeSubSection)?.name}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Module structure is visible; actions will be implemented with role/status gating.
            </p>

            <div className="flex gap-3 flex-wrap">
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                Create Platform Record
              </button>
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                Upload Supporting PDF
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCloseOut = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Close-Out & Archive</h2>
          <p className="text-sm text-gray-600 mb-6">
            As-builts, warranties, completion certs, final account, archive index.
          </p>

          <DocumentRegister
            contractId={contract.id}
            contractSection="CLOSE_OUT"
            isLocked={closeOutLocked}
            authority={authority}
          />
        </div>

        {closeOutLocked && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>Archive Mode:</strong> Close-out is read-only because status is “{contract.status}”.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'contract-info':
        return renderContractInfo();
      case 'pre-contract':
        return renderPreContract();
      case 'contract-formation':
        return renderFormation();
      case 'project-management':
        return renderProjectManagement();
      case 'close-out':
        return renderCloseOut();
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Contract Header (persistent) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{contract.contract_number}</h1>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    statusColors[contract.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {String(contract.status || '').charAt(0).toUpperCase() + String(contract.status || '').slice(1)}
                </span>

                {/* Formation lock indicator always visible */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    formationLocked ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                  }`}
                  title={formationLocked ? 'Contract Formation baseline locked' : 'Baseline not locked yet'}
                >
                  {formationLocked ? '🔒 Formation Locked' : '🔓 Formation Open'}
                </span>
              </div>

              <p className="text-lg text-gray-600 mb-4">{contract.project_name}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Form:</span>
                  <p className="font-medium text-gray-900">
                    {contractTypeLabels[contract.contract_type] || contract.contract_type || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Employer:</span>
                  <p className="font-medium text-gray-900">{contract.client_name || 'N/A'}</p>
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

            {/* Header actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsEditing((v) => !v)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Contract'}
              </button>

              <button
                onClick={handleDeleteContract}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Contract
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">{renderTabContent()}</div>
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
