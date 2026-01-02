// MemberCard.js - Display individual contract member
import React, { useState } from 'react';

const MemberCard = ({ member, onRemove, isOwner }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${member.email} from this contract?`)) {
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

  const getRoleBadge = (role) => {
    const badges = {
      main_contractor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Main Contractor' },
      subcontractor: { bg: 'bg-green-100', text: 'text-green-800', label: 'Subcontractor' },
      consultant: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Consultant' },
      supplier: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Supplier' }
    };
    const badge = badges[role] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active', icon: '✓' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: '⏳' },
      removed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Removed', icon: '✗' }
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: '?' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        {/* Left: Member Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {(member.displayName || member.position || 'M').charAt(0).toUpperCase()}
            </div>

            {/* Name & User ID */}
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {member.displayName || member.position || 'Team Member'}
              </h3>
              <p className="text-xs text-gray-500 font-mono" title={member.user_id}>
                ID: {member.user_id.substring(0, 8)}...
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Company Type:</span>
              <div className="mt-1">{getRoleBadge(member.userRole || 'member')}</div>
            </div>

            <div>
              <span className="text-gray-500">Status:</span>
              <div className="mt-1">{getStatusBadge(member.invitation_status)}</div>
            </div>

            {member.contractRole && (
              <div className="col-span-2">
                <span className="text-gray-500 text-xs">Contract Access:</span>
                <p className="mt-1 text-gray-700 text-xs capitalize">{member.contractRole}</p>
              </div>
            )}

            {member.trade_scope && (
              <div className="col-span-2">
                <span className="text-gray-500">Trade/Scope:</span>
                <p className="mt-1 text-gray-900">{member.trade_scope}</p>
              </div>
            )}

            {member.organizationName && (
              <div className="col-span-2">
                <span className="text-gray-500">Organization:</span>
                <p className="mt-1 text-gray-900">{member.organizationName}</p>
              </div>
            )}

            {member.phone && (
              <div>
                <span className="text-gray-500">Phone:</span>
                <p className="mt-1 text-gray-900">{member.phone}</p>
              </div>
            )}

            <div>
              <span className="text-gray-500">Added:</span>
              <p className="mt-1 text-gray-900">{formatDate(member.invited_at)}</p>
            </div>

            {member.inviterEmail && (
              <div className="col-span-2">
                <span className="text-gray-500 text-xs">Invited by:</span>
                <p className="mt-1 text-gray-700 text-xs">{member.inviterEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {isOwner && member.invitation_status === 'active' && member.contractRole !== 'owner' && (
          <div className="ml-4">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberCard;
