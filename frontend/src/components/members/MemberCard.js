// ============================================
// ENHANCED MemberCard.js - Complete Member Information Display
// ============================================
// Purpose: Display comprehensive member information with tracking
// Features: Full details, registration tracking, role management, activity status
// ============================================

import React, { useState } from 'react';
import { MEMBER_ROLES, COMPANY_TYPES } from '../../utils/constants';

const MemberCard = ({ member, onRemove, onEditRole, isOwner, currentUserRole }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${member.displayName || member.email} from this contract?`)) {
      return;
    }

    setIsRemoving(true);
    try {
      await onRemove(member.id);
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // ============================================
  // BADGE HELPERS
  // ============================================

  const getRoleBadge = (role) => {
    const badges = {
      owner: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '👑', label: 'Owner' },
      admin: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '⚡', label: 'Admin' },
      editor: { bg: 'bg-green-100', text: 'text-green-800', icon: '✏️', label: 'Editor' },
      viewer: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '👁️', label: 'Viewer' },
      submitter: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '📤', label: 'Submitter' },
      reviewer: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: '🔍', label: 'Reviewer' },
      approver: { bg: 'bg-teal-100', text: 'text-teal-800', icon: '✅', label: 'Approver' },
      auditor: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '📊', label: 'Auditor' },
      readonly: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '🔒', label: 'Read Only' }
    };
    const badge = badges[role] || badges.viewer;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const getCompanyTypeBadge = (type) => {
    const badges = {
      main_contractor: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🏗️', label: 'Main Contractor' },
      subcontractor: { bg: 'bg-green-100', text: 'text-green-800', icon: '👷', label: 'Subcontractor' },
      consultant: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '📋', label: 'Consultant' },
      supplier: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🚚', label: 'Supplier' }
    };
    const badge = badges[type] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: '👤', label: type };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓', label: 'Active', pulse: false },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳', label: 'Pending', pulse: true },
      removed: { bg: 'bg-red-100', text: 'text-red-800', icon: '✗', label: 'Removed', pulse: false }
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.pulse && <span className="animate-pulse mr-1">●</span>}
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  // ============================================
  // DATE HELPERS
  // ============================================

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // ============================================
  // PERMISSIONS HELPER
  // ============================================

  const getPermissionSummary = (role) => {
    const permissions = {
      owner: 'Full control - All permissions',
      admin: 'Manage members, approve work, full access',
      editor: 'Create & edit content, submit work',
      viewer: 'View all content, no editing',
      submitter: 'Submit diaries & claims',
      reviewer: 'Review submissions',
      approver: 'Approve claims & work',
      auditor: 'View reports & audit trails',
      readonly: 'Read-only access'
    };
    return permissions[role] || 'No permissions';
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
      {/* Header Section */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between">
          {/* Left: Member Info */}
          <div className="flex items-start space-x-3 flex-1">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {(member.displayName || member.position || member.email || 'M').charAt(0).toUpperCase()}
            </div>

            {/* Name & Basic Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {member.displayName || member.position || 'Team Member'}
                </h3>
                {getStatusBadge(member.invitation_status)}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {member.position || 'No position specified'}
              </p>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2">
                {getRoleBadge(member.member_role || 'viewer')}
                {getCompanyTypeBadge(member.company_type || member.userRole)}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Edit Role Button */}
            {isOwner && member.member_role !== 'owner' && member.invitation_status === 'active' && (
              <button
                onClick={() => onEditRole(member)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit role"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Remove Button */}
            {isOwner && member.member_role !== 'owner' && member.invitation_status === 'active' && (
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Remove member"
              >
                {isRemoving ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}

            {/* Toggle Details Button */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title={showDetails ? "Hide details" : "Show details"}
            >
              <svg className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details Section */}
      {showDetails && (
        <div className="p-5 bg-gray-50 space-y-4">
          {/* Contact Information */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-900 truncate">{member.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-gray-900">{member.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Organization</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Organization Name</p>
                <p className="text-sm text-gray-900">{member.organizationName || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Trade/Scope</p>
                <p className="text-sm text-gray-900">{member.trade_scope || 'General'}</p>
              </div>
              {member.cidb_registration && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">CIDB Registration</p>
                  <p className="text-sm text-gray-900">{member.cidb_registration}</p>
                </div>
              )}
              {member.ssm_registration && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">SSM Registration</p>
                  <p className="text-sm text-gray-900">{member.ssm_registration}</p>
                </div>
              )}
            </div>
          </div>

          {/* Registration Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Registration Timeline</h4>
            <div className="space-y-2">
              {/* Invited */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600">📧</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Invited</p>
                  <p className="text-sm text-gray-900">{formatDateTime(member.invited_at)}</p>
                  <p className="text-xs text-gray-500">{getTimeSince(member.invited_at)}</p>
                </div>
              </div>

              {/* Accepted */}
              {member.accepted_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Accepted</p>
                    <p className="text-sm text-gray-900">{formatDateTime(member.accepted_at)}</p>
                    <p className="text-xs text-gray-500">{getTimeSince(member.accepted_at)}</p>
                  </div>
                </div>
              )}

              {/* Last Active */}
              {member.last_active_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600">🔄</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Last Active</p>
                    <p className="text-sm text-gray-900">{formatDateTime(member.last_active_at)}</p>
                    <p className="text-xs text-gray-500">{getTimeSince(member.last_active_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Permissions Summary */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Permissions</h4>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-900">{getPermissionSummary(member.member_role)}</p>
            </div>
          </div>

          {/* Invited By */}
          {member.inviterInfo && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Invited By</h4>
              <p className="text-sm text-gray-900">{member.inviterInfo}</p>
            </div>
          )}

          {/* User ID (for debugging) */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">System Information</h4>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">User ID</p>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-mono text-gray-700 flex-1 truncate">{member.user_id}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(member.user_id);
                    alert('User ID copied to clipboard');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberCard;
