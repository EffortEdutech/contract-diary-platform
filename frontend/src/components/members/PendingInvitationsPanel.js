// ============================================
// PendingInvitationsPanel.js - Display Pending Invitations with Management
// ============================================
// Purpose: Show all pending invitations with tracking and resend functionality
// Features: Invitation status, expiry tracking, resend option, copy link
// ============================================

import React, { useState, useEffect } from 'react';
import { getPendingInvitations, resendInvitation, cancelInvitation } from '../../services/memberService';
import EditInvitationModal from './EditInvitationModal';

const PendingInvitationsPanel = ({ contractId, onRefresh }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  useEffect(() => {
    loadPendingInvitations();
  }, [contractId]);

  const loadPendingInvitations = async () => {
    try {
      setLoading(true);
      const data = await getPendingInvitations(contractId);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId) => {
    try {
      setResending(invitationId);
      await resendInvitation(invitationId);
      await loadPendingInvitations();
      if (onRefresh) onRefresh();
      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Failed to resend invitation. Please try again.');
    } finally {
      setResending(null);
    }
  };

  const handleCancel = async (invitationId, email) => {
    if (!window.confirm(`Cancel invitation for ${email}?\n\nThis cannot be undone and they will not be able to use this invitation link.`)) {
      return;
    }

    try {
      setCancelling(invitationId);
      await cancelInvitation(invitationId);
      await loadPendingInvitations();
      if (onRefresh) onRefresh();
      alert('✅ Invitation cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Failed to cancel invitation. Please try again.');
    } finally {
      setCancelling(null);
    }
  };

  const handleEdit = (invitation) => {
    setSelectedInvitation(invitation);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    loadPendingInvitations();
    if (onRefresh) onRefresh();
    setShowEditModal(false);
    setSelectedInvitation(null);
  };

  const copyInvitationLink = (token) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Invitation link copied to clipboard!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getExpiryStatus = (invitation) => {
    if (invitation.is_expired) {
      return {
        text: 'Expired',
        color: 'text-red-600',
        bg: 'bg-red-100',
        icon: '⚠️'
      };
    }
    
    if (invitation.days_until_expiry <= 1) {
      return {
        text: 'Expires Today',
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        icon: '⏰'
      };
    }
    
    if (invitation.days_until_expiry <= 3) {
      return {
        text: `${invitation.days_until_expiry} days left`,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        icon: '⏳'
      };
    }
    
    return {
      text: `${invitation.days_until_expiry} days left`,
      color: 'text-green-600',
      bg: 'bg-green-100',
      icon: '✓'
    };
  };

  const getRoleBadge = (role) => {
    const badges = {
      owner: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Owner' },
      admin: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Admin' },
      editor: { bg: 'bg-green-100', text: 'text-green-800', label: 'Editor' },
      viewer: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Viewer' },
      member: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Member' }
    };
    const badge = badges[role] || badges.member;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading pending invitations...</span>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Pending Invitations</h3>
          <p className="mt-1 text-sm text-gray-500">All invitations have been accepted or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pending Invitations</h3>
            <p className="text-sm text-gray-600 mt-1">
              {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'} awaiting acceptance
            </p>
          </div>
          <button
            onClick={loadPendingInvitations}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Invitations List */}
      <div className="divide-y divide-gray-200">
        {invitations.map((invitation) => {
          const expiryStatus = getExpiryStatus(invitation);
          
          return (
            <div key={invitation.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                {/* Left: Invitation Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {invitation.full_name ? invitation.full_name.charAt(0).toUpperCase() : '?'}
                    </div>

                    {/* Name & Email */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {invitation.full_name || 'No name provided'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{invitation.email}</p>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${expiryStatus.bg} ${expiryStatus.color} flex items-center space-x-1`}>
                      <span>{expiryStatus.icon}</span>
                      <span>{expiryStatus.text}</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Position</p>
                      <p className="text-gray-900">{invitation.position || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Role</p>
                      <div>{getRoleBadge(invitation.user_role)}</div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company Type</p>
                      <p className="text-gray-900 capitalize">{invitation.company_type?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sent</p>
                      <p className="text-gray-900">{formatDate(invitation.invited_at)}</p>
                      <p className="text-xs text-gray-500">{invitation.days_since_invite} days ago</p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(invitation.phone || invitation.organization_name) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                      {invitation.phone && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{invitation.phone}</span>
                        </div>
                      )}
                      {invitation.organization_name && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>{invitation.organization_name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="ml-4 flex flex-col space-y-2">
                  {/* Edit Button */}
                  <button
                    onClick={() => handleEdit(invitation)}
                    className="px-3 py-2 text-xs border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-1"
                    title="Edit invitation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    onClick={() => copyInvitationLink(invitation.token)}
                    className="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
                    title="Copy invitation link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Link</span>
                  </button>

                  {/* Resend Button */}
                  <button
                    onClick={() => handleResend(invitation.id)}
                    disabled={resending === invitation.id}
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
                  >
                    {resending === invitation.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Resending...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Resend</span>
                      </>
                    )}
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => handleCancel(invitation.id, invitation.email)}
                    disabled={cancelling === invitation.id}
                    className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
                    title="Cancel invitation"
                  >
                    {cancelling === invitation.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expiry Warning */}
              {invitation.days_until_expiry <= 2 && !invitation.is_expired && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Invitation expiring soon</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This invitation will expire {invitation.days_until_expiry === 0 ? 'today' : `in ${invitation.days_until_expiry} day${invitation.days_until_expiry === 1 ? '' : 's'}`}. 
                      Consider resending if the recipient hasn't responded.
                    </p>
                  </div>
                </div>
              )}

              {/* Expired Notice */}
              {invitation.is_expired && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Invitation expired</p>
                    <p className="text-xs text-red-700 mt-1">
                      This invitation has expired. Click "Resend" to send a new invitation with extended validity.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

      {/* Edit Invitation Modal */}
      <EditInvitationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInvitation(null);
        }}
        invitation={selectedInvitation}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default PendingInvitationsPanel;
