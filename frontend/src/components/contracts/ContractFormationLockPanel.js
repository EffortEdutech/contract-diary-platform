/**
 * Contract Formation Lock Panel
 * Lock Contract Formation documents as immutable baseline
 * SESSION 19: PDF Document Handler
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

const ContractFormationLockPanel = ({ contractId, onLockSuccess }) => {
  const { user } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lockReason, setLockReason] = useState('Contract baseline established');

  // ✅ React state for irreversible confirmation
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    checkLockStatus();
    loadDocumentCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const checkLockStatus = async () => {
    const { isLocked: locked } = await documentService.isContractFormationLocked(contractId);
    setIsLocked(locked);
    setLoading(false);
  };

  const loadDocumentCount = async () => {
    const { data } = await documentService.getDocumentsBySection(contractId, 'CONTRACT_FORMATION');
    setDocumentCount(data?.length || 0);
  };

  const resetModalState = () => {
    setShowConfirmModal(false);
    setLockReason('Contract baseline established');
    setConfirmChecked(false);
  };

  const handleLockConfirm = async () => {
    if (!confirmChecked) {
      alert('Please confirm that you understand this action is irreversible.');
      return;
    }

    setIsLocking(true);

    try {
      // ---------------------------------------------------------------------
      // 1) Lock Contract Formation documents (existing behaviour)
      // ---------------------------------------------------------------------
      const { data, error } = await documentService.lockContractFormation(contractId, lockReason);
      if (error) throw error;      

      console.log('✅ Contract Formation docs locked:', data);

      // ---------------------------------------------------------------------
      // 2) Persist contract-level baseline lock row (NEW)
      //    - If already exists (unique index), we ignore that case gracefully.
      // ---------------------------------------------------------------------
      const { error: baselineErr } = await supabase
        .from('contract_baseline_locks')
        .insert({
          contract_id: contractId,
          is_locked: true,
          locked_by: user?.id ?? null,
          lock_reason: lockReason || 'Contract baseline established',
        });

      if (baselineErr) {
        // 23505 = unique violation (already locked)
        if (baselineErr.code !== '23505') {
          throw baselineErr;
        }
      }

      // ---------------------------------------------------------------------
      // 3) Activate contract (ONLY if currently draft)
      // ---------------------------------------------------------------------
      const { error: statusErr } = await supabase
        .from('contracts')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', contractId)
        .eq('status', 'draft');

      if (statusErr) throw statusErr;

      // ---------------------------------------------------------------------
      // UI state update
      // ---------------------------------------------------------------------
      setIsLocked(true);
      resetModalState();

      if (onLockSuccess) {
        await onLockSuccess();
      }

      alert(
        `✅ Baseline locked and contract activated.\n\n` +
          `Locked ${data?.length || 0} Contract Formation documents.\n\n` +
          `These documents now form the immutable contract baseline.`
      );
    } catch (err) {
      console.error('❌ Lock error:', err);
      alert(`Failed to lock Contract Formation:\n\n${err?.message || 'Unknown error'}`);
    } finally {
      setIsLocking(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-32" />;
  }

  if (isLocked) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">🔒 Contract Baseline Locked</h3>
            <p className="text-sm text-blue-800 mb-3">
              All Contract Formation documents have been locked and now form the immutable contract baseline. No
              further uploads or modifications are permitted.
            </p>
            <div className="bg-blue-100 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">Contract Baseline Established</p>
              <p className="text-xs text-blue-700 mt-1">
                All future changes must be tracked as variations through proper change management procedures.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">Lock Contract Baseline</h3>
            <p className="text-sm text-orange-800 mb-4">
              Once locked, these Contract Formation documents become immutable and form the contract baseline snapshot.
              All future changes must be tracked as variations.
            </p>

            {/* Warning Box */}
            <div className="bg-white border border-orange-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Important: This action cannot be undone
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-7">
                <li>• No new documents can be uploaded to Contract Formation</li>
                <li>• Existing documents cannot be replaced or deleted</li>
                <li>• Documents will remain in read-only mode permanently</li>
                <li>
                  • {documentCount} document{documentCount !== 1 ? 's' : ''} will be locked
                </li>
                <li>• Contract status will become <strong>Active</strong></li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={documentCount === 0}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Lock Contract Baseline
              </button>

              {documentCount === 0 && <p className="text-sm text-gray-600">⚠️ Upload contract documents first before locking</p>}
            </div>

            {/* Status Info */}
            {documentCount > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Ready to lock:</strong> {documentCount} document{documentCount !== 1 ? 's' : ''} uploaded
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Contract Baseline Lock</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-900">This action is irreversible</p>
                    <p className="text-sm text-red-700 mt-1">
                      Once locked, Contract Formation documents cannot be modified, replaced, or deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">You are about to:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Lock {documentCount} Contract Formation document{documentCount !== 1 ? 's' : ''}</li>
                  <li>• Set contract status to <strong>Active</strong></li>
                  <li>• Create immutable baseline snapshot</li>
                </ul>
              </div>

              {/* Lock Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Locking (Optional)</label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Contract baseline established, all parties signed"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-lock"
                  className="mt-1"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                />
                <label htmlFor="confirm-lock" className="text-sm text-gray-700">
                  I understand that this action is irreversible and will permanently lock all Contract Formation documents.
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={resetModalState}
                disabled={isLocking}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleLockConfirm}
                disabled={isLocking}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLocking ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Locking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Lock Contract Baseline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContractFormationLockPanel;
