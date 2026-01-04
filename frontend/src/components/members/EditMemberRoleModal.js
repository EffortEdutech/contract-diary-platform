// ============================================
// EditMemberRoleModal.js - Change Member Role with Permission Preview
// ============================================
// Purpose: Allow owners/admins to update member roles
// Features: Role selection, permission preview, validation, activity logging
// ============================================

import React, { useState } from 'react';
import { updateMemberRole } from '../../services/memberService';

const MEMBER_ROLES = [
  { 
    value: 'owner', 
    label: 'Owner', 
    icon: '👑',
    permissions: [
      'Full system access',
      'Manage all members',
      'Delete contract',
      'Approve payments',
      'All module access'
    ],
    description: 'Complete control over the contract',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    icon: '⚡',
    permissions: [
      'Manage members (except owner)',
      'Approve claims',
      'Manage BOQ',
      'Access all modules',
      'View reports'
    ],
    description: 'High-level administrative access',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  { 
    value: 'editor', 
    label: 'Editor', 
    icon: '✏️',
    permissions: [
      'Edit BOQ items',
      'Edit diary entries',
      'Submit claims',
      'Upload documents',
      'No approval rights'
    ],
    description: 'Can create and edit content',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  { 
    value: 'viewer', 
    label: 'Viewer', 
    icon: '👁️',
    permissions: [
      'View BOQ',
      'View diaries',
      'View claims',
      'View reports',
      'No editing allowed'
    ],
    description: 'Read-only access to all content',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  },
  { 
    value: 'submitter', 
    label: 'Submitter', 
    icon: '📤',
    permissions: [
      'Submit daily diaries',
      'Submit progress claims',
      'Upload photos',
      'View own submissions',
      'Cannot approve'
    ],
    description: 'Submit work documentation',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200'
  },
  { 
    value: 'reviewer', 
    label: 'Reviewer', 
    icon: '🔍',
    permissions: [
      'Review diaries',
      'Comment on submissions',
      'Request changes',
      'View all content',
      'Cannot approve'
    ],
    description: 'Review and provide feedback',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  { 
    value: 'approver', 
    label: 'Approver', 
    icon: '✅',
    permissions: [
      'Approve claims',
      'Approve diaries',
      'Sign off work',
      'View reports',
      'Cannot edit BOQ'
    ],
    description: 'Approve work and payments',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  { 
    value: 'auditor', 
    label: 'Auditor', 
    icon: '📊',
    permissions: [
      'View all records',
      'Export reports',
      'Audit trail access',
      'Read-only access',
      'No modifications'
    ],
    description: 'Compliance and audit oversight',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  { 
    value: 'readonly', 
    label: 'Read Only', 
    icon: '🔒',
    permissions: [
      'View content only',
      'No editing',
      'No submissions',
      'No approvals',
      'Minimal access'
    ],
    description: 'Restricted view-only access',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200'
  }
];

const EditMemberRoleModal = ({ isOpen, onClose, member, currentUserRole, onSuccess }) => {
  const [selectedRole, setSelectedRole] = useState(member?.member_role || 'viewer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    if (currentUserRole === 'owner') {
      // Owner can assign any role except owner
      return MEMBER_ROLES.filter(r => r.value !== 'owner');
    } else if (currentUserRole === 'admin') {
      // Admin can assign roles below admin
      return MEMBER_ROLES.filter(r => !['owner', 'admin'].includes(r.value));
    }
    return [];
  };

  const availableRoles = getAvailableRoles();
  const selectedRoleData = MEMBER_ROLES.find(r => r.value === selectedRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedRole === member.member_role) {
      setError('Please select a different role');
      return;
    }

    if (member.member_role === 'owner') {
      setError('Cannot change owner role');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await updateMemberRole(member.id, selectedRole, notes);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update member role');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedRole(member?.member_role || 'viewer');
      setNotes('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Member Role</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update access level for {member.displayName || member.email}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Member Info */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {(member.displayName || 'M').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{member.displayName}</p>
                <p className="text-sm text-gray-600">{member.position || member.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Current role:</span>
                  <span className="text-xs font-medium text-gray-900 uppercase">{member.member_role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="px-6 py-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select New Role
            </label>
            
            <div className="grid grid-cols-1 gap-3">
              {availableRoles.map((role) => (
                <div
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    selectedRole === role.value
                      ? `${role.borderColor} ${role.bgColor} shadow-md`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Radio Button */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === role.value
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedRole === role.value && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Role Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">{role.icon}</span>
                        <span className={`font-semibold ${selectedRole === role.value ? role.textColor : 'text-gray-900'}`}>
                          {role.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                      
                      {/* Permissions */}
                      <div className="space-y-1">
                        {role.permissions.map((permission, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-700">{permission}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="px-6 py-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for role change..."
              rows={3}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200">
              <div className="flex items-center space-x-2 text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedRole === member.member_role}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loading ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberRoleModal;
