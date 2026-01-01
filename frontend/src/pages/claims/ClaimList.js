// ============================================
// CLAIM LIST - View All Progress Claims
// ============================================
// Purpose: List all claims for a contract with filters and statistics
// Features: Status filtering, claim cards, statistics, create new claim
// Created: 2025-12-31
// Session: 9 - Progress Claims Module (Phase 4A)
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getClaimsByContract, 
  getClaimSummary, 
  formatCurrency, 
  formatDate,
  getStatusColor,
  isClaimOverdue,
  getDaysUntilPaymentDue
} from '../../services/claimService';

const ClaimList = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();

  // State
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = newest first

  // Load data on mount
  useEffect(() => {
    if (contractId) {
      loadClaims();
    }
  }, [contractId]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [claims, statusFilter, sortOrder]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadClaims = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load claims
      const claimsData = await getClaimsByContract(contractId);
      setClaims(claimsData);

      // Load statistics
      const stats = await getClaimSummary(contractId);
      setStatistics(stats);

    } catch (err) {
      console.error('Error loading claims:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTERS
  // ============================================

  const applyFilters = () => {
    let filtered = [...claims];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Sort by claim number
    filtered.sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.claim_number - a.claim_number 
        : a.claim_number - b.claim_number;
    });

    setFilteredClaims(filtered);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSortOrder('desc');
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreateClaim = () => {
    navigate(`/contracts/${contractId}/claims/create`);
  };

  const handleViewClaim = (claimId) => {
    navigate(`/contracts/${contractId}/claims/${claimId}`);
  };

  // ============================================
  // RENDER HELPERS
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {labels[status] || status}
      </span>
    );
  };

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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Claims</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress Claims</h1>
          <p className="text-gray-600 mt-1">
            Manage payment claims and track progress
          </p>
        </div>
        <button
          onClick={handleCreateClaim}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Claim
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Total Claims */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Claims</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.total_claims}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Claimed */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Claimed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(statistics.total_claimed)}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(statistics.total_approved)}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Paid */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {formatCurrency(statistics.total_paid)}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Retention */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Retention Held</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(statistics.total_retention)}
                </p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No claims found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter !== 'all' 
              ? 'No claims match the current filter. Try changing the filter or create a new claim.'
              : 'Get started by creating your first progress claim.'
            }
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreateClaim}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Claim
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              onClick={() => handleViewClaim(claim.id)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  {/* Left: Claim Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Claim #{claim.claim_number}
                      </h3>
                      {getStatusBadge(claim.status)}
                      {isClaimOverdue(claim) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{claim.claim_title || 'No title'}</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Period</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(claim.claim_period_from)} - {formatDate(claim.claim_period_to)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Claim Amount</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(claim.claim_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Retention ({claim.retention_percentage}%)</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(claim.retention_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Net Amount</p>
                        <p className="font-medium text-blue-600">
                          {formatCurrency(claim.net_claim_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Info */}
                    {claim.status === 'approved' && claim.payment_due_date && (
                      <div className="mt-3 flex items-center text-sm">
                        <svg className="w-4 h-4 text-orange-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-600">
                          Payment due: {formatDate(claim.payment_due_date)}
                          {getDaysUntilPaymentDue(claim.payment_due_date) !== null && (
                            <span className={getDaysUntilPaymentDue(claim.payment_due_date) < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {' '}({Math.abs(getDaysUntilPaymentDue(claim.payment_due_date))} days {getDaysUntilPaymentDue(claim.payment_due_date) < 0 ? 'overdue' : 'remaining'})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {claim.status === 'paid' && claim.payment_date && (
                      <div className="mt-3 flex items-center text-sm text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Paid on {formatDate(claim.payment_date)}
                      </div>
                    )}
                  </div>

                  {/* Right: Arrow */}
                  <div className="ml-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClaimList;
