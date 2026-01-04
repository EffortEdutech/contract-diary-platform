// ============================================
// CLAIM DETAIL - View/Edit Progress Claim
// ============================================
// Purpose: View claim details with workflow actions
// Features: Claim info, items list, submit/approve/reject/pay actions
// Created: 2025-12-31
// Session: 9 - Progress Claims Module (Phase 4A)
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  getClaimById,
  getClaimItems,
  submitClaim,
  approveClaim,
  rejectClaim,
  markClaimPaid,
  formatCurrency,
  formatDate,
  getStatusColor,
  isClaimOverdue,
  getDaysUntilPaymentDue
} from '../../services/claimService';

const ClaimDetail = () => {
  const { contractId, claimId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [claim, setClaim] = useState(null);
  const [claimItems, setClaimItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);

  // Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');

  // Build breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: `/contracts/${contractId}` },
    { label: 'Claims', href: `/contracts/${contractId}/claims` },
    { label: `Claim #${claim?.claim_number || '...'}`, href: null }
  ];

  // Load data on mount
  useEffect(() => {
    if (claimId) {
      loadClaimData();
    }
  }, [claimId]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadClaimData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load contract details
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      const [claimData, itemsData] = await Promise.all([
        getClaimById(claimId),
        getClaimItems(claimId)
      ]);

      setClaim(claimData);
      setClaimItems(itemsData);
    } catch (err) {
      console.error('Error loading claim:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // WORKFLOW ACTIONS
  // ============================================

  const handleSubmit = async () => {
    if (!window.confirm('Submit this claim for Main Contractor review?')) {
      return;
    }

    try {
      setActionLoading(true);
      await submitClaim(claimId);
      await loadClaimData(); // Reload to get updated status
      alert('Claim submitted successfully!');
    } catch (err) {
      alert('Error submitting claim: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this claim?')) {
      return;
    }

    try {
      setActionLoading(true);
      await approveClaim(claimId);
      await loadClaimData(); // Reload to get updated status
      alert('Claim approved successfully!');
    } catch (err) {
      alert('Error approving claim: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await rejectClaim(claimId, rejectionReason);
      await loadClaimData(); // Reload to get updated status
      setShowRejectModal(false);
      setRejectionReason('');
      alert('Claim rejected');
    } catch (err) {
      alert('Error rejecting claim: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!paymentDate) {
      alert('Please select payment date');
      return;
    }

    try {
      setActionLoading(true);
      await markClaimPaid(claimId, paymentDate);
      await loadClaimData(); // Reload to get updated status
      setShowPaymentModal(false);
      setPaymentDate('');
      alert('Claim marked as paid!');
    } catch (err) {
      alert('Error marking claim as paid: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const getStatusBadge = (status) => {
    const colorClass = getStatusColor(status);
    const labels = {
      draft: 'Draft',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Check if current user is the creator
  const isCreator = claim && user && claim.created_by === user.id;

  // Check if current user is MC (can approve/reject)
  const isMC = user?.role === 'main_contractor' || user?.role === 'mc_admin';

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Claim not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={breadcrumbItems} />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Claim #{claim.claim_number}
              </h1>
              {getStatusBadge(claim.status)}
              {isClaimOverdue(claim) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Overdue
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">{claim.claim_title}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {/* Draft: Submit Button (Creator only) */}
          {claim.status === 'draft' && isCreator && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Submit Claim
            </button>
          )}

          {/* Submitted: Approve/Reject Buttons (MC only) */}
          {claim.status === 'submitted' && isMC && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                Reject
              </button>
            </>
          )}

          {/* Approved: Mark as Paid Button (MC only) */}
          {claim.status === 'approved' && isMC && (
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={actionLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {/* Claim Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Claim Period</p>
            <p className="font-medium text-gray-900 mt-1">
              {formatDate(claim.claim_period_from)} - {formatDate(claim.claim_period_to)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Submission Date</p>
            <p className="font-medium text-gray-900 mt-1">
              {claim.submission_date ? formatDate(claim.submission_date) : 'Not submitted'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Payment Due Date (CIPAA 30 days)</p>
            <p className="font-medium text-gray-900 mt-1">
              {claim.payment_due_date ? (
                <>
                  {formatDate(claim.payment_due_date)}
                  {getDaysUntilPaymentDue(claim.payment_due_date) !== null && claim.status === 'approved' && (
                    <span className={`ml-2 text-sm ${getDaysUntilPaymentDue(claim.payment_due_date) < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      ({Math.abs(getDaysUntilPaymentDue(claim.payment_due_date))} days {getDaysUntilPaymentDue(claim.payment_due_date) < 0 ? 'overdue' : 'remaining'})
                    </span>
                  )}
                </>
              ) : 'N/A'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Claim Amount</p>
            <p className="font-medium text-blue-600 text-lg mt-1">
              {formatCurrency(claim.claim_amount)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Retention ({claim.retention_percentage}%)</p>
            <p className="font-medium text-orange-600 text-lg mt-1">
              {formatCurrency(claim.retention_amount)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Net Amount</p>
            <p className="font-medium text-green-600 text-lg mt-1">
              {formatCurrency(claim.net_claim_amount)}
            </p>
          </div>

          {claim.approved_date && (
            <div>
              <p className="text-sm text-gray-500">Approved Date</p>
              <p className="font-medium text-gray-900 mt-1">
                {formatDate(claim.approved_date)}
              </p>
            </div>
          )}

          {claim.payment_date && (
            <div>
              <p className="text-sm text-gray-500">Payment Date</p>
              <p className="font-medium text-gray-900 mt-1">
                {formatDate(claim.payment_date)}
              </p>
            </div>
          )}

          {claim.rejection_reason && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-500">Rejection Reason</p>
              <p className="font-medium text-red-600 mt-1">
                {claim.rejection_reason}
              </p>
            </div>
          )}

          {claim.notes && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="font-medium text-gray-900 mt-1">
                {claim.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Claim Items */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Items</h2>
        
        {claimItems.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No items in this claim</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Claimed</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cumulative</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">BOQ Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claimItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.boq_item?.item_no}</p>
                        <p className="text-sm text-gray-500">{item.boq_item?.description}</p>
                        {item.work_description && (
                          <p className="text-xs text-gray-400 mt-1">{item.work_description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.boq_item?.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                      {item.quantity_claimed.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {item.cumulative_quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {item.boq_quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${item.percentage_complete >= 100 ? 'text-green-600' : 'text-gray-900'}`}>
                        {item.percentage_complete.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(item.unit_rate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="7" className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                    {formatCurrency(claim.claim_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Claim</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this claim:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Paid</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Saving...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimDetail;
