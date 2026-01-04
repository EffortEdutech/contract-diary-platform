// ============================================
// UPDATED: EditMemberModal.js
// Session 13 - RBAC Migration
// ============================================
// CHANGES:
// - Edits member_role (contract role) only
// - No user_role references
// - Uses MEMBER_ROLES constants
// ============================================

import React, { useState, useEffect } from 'react';
import { MEMBER_ROLES, MEMBER_ROLE_LABELS, MEMBER_ROLE_DESCRIPTIONS } from '../../utils/constants';
import { getAvailableRoles } from '../../utils/permissions';

const EditMemberModal = ({ isOpen, onClose, onUpdate, member, currentUserRole }) => {
  const [formData, setFormData] = useState({
    memberRole: '',
    tradeScope: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Populate form when member changes
  useEffect(() => {
    if (member) {
      setFormData({
        memberRole: member.member_role || '',
        tradeScope: member.trade_scope || ''
      });
    }
  }, [member]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.memberRole) {
      setError('Please select a role');
      return;
    }

    // Prevent changing owner role
    if (member.member_role === MEMBER_ROLES.OWNER && formData.memberRole !== MEMBER_ROLES.OWNER) {
      setError('Cannot change the owner role. Transfer ownership first.');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(member.id, {
        member_role: formData.memberRole,
        trade_scope: formData.tradeScope || null
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      memberRole: member?.member_role || '',
      tradeScope: member?.trade_scope || ''
    });
    setError(null);
    onClose();
  };

  // Get roles that current user can assign
  const availableRoles = getAvailableRoles(currentUserRole || MEMBER_ROLES.OWNER);
  
  // Add current role if not in available roles (so they can keep it)
  const selectableRoles = member?.member_role && !availableRoles.includes(member.member_role)
    ? [...availableRoles, member.member_role]
    : availableRoles;

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleCancel}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Edit Member Role
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Member Information (Read-only) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Member Information</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Organization:</dt>
                  <dd className="text-gray-900 font-medium">
                    {member.user?.organization_name || 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Position:</dt>
                  <dd className="text-gray-900">{member.user?.position || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Company Type:</dt>
                  <dd className="text-gray-900">
                    {member.user?.role === 'main_contractor' && '🏗️ Main Contractor'}
                    {member.user?.role === 'subcontractor' && '👷 Subcontractor'}
                    {member.user?.role === 'consultant' && '📋 Consultant'}
                    {member.user?.role === 'supplier' && '🚚 Supplier'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Current Role:</dt>
                  <dd className="text-gray-900 font-medium">
                    {MEMBER_ROLE_LABELS[member.member_role]}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Contract Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Contract Role *
              </label>
              <select
                name="memberRole"
                value={formData.memberRole}
                onChange={handleChange}
                disabled={member.member_role === MEMBER_ROLES.OWNER}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  member.member_role === MEMBER_ROLES.OWNER ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select role...</option>
                {selectableRoles.map((role) => (
                  <option key={role} value={role}>
                    {MEMBER_ROLE_LABELS[role]} - {MEMBER_ROLE_DESCRIPTIONS[role]}
                  </option>
                ))}
              </select>
              
              {member.member_role === MEMBER_ROLES.OWNER && (
                <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                  ⚠️ Cannot change owner role. To transfer ownership, please contact system administrator.
                </p>
              )}
              
              {member.member_role !== MEMBER_ROLES.OWNER && (
                <p className="mt-1 text-xs text-gray-500">
                  This determines what they can do on this contract
                </p>
              )}
            </div>

            {/* Role Description */}
            {formData.memberRole && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  {MEMBER_ROLE_LABELS[formData.memberRole]} Permissions:
                </h4>
                <p className="text-xs text-blue-800 mb-2">
                  {MEMBER_ROLE_DESCRIPTIONS[formData.memberRole]}
                </p>
                
                {/* Detailed permissions */}
                <div className="text-xs text-blue-700 space-y-1">
                  {formData.memberRole === MEMBER_ROLES.OWNER && (
                    <>
                      <div>✓ Full control of contract</div>
                      <div>✓ Manage all members</div>
                      <div>✓ Edit contract details</div>
                      <div>✓ Delete records</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.ADMIN && (
                    <>
                      <div>✓ Almost full control</div>
                      <div>✓ Manage members (except owner)</div>
                      <div>✓ Approve submissions</div>
                      <div>✓ Cannot delete contract</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.EDITOR && (
                    <>
                      <div>✓ Create diaries and claims</div>
                      <div>✓ Edit draft records</div>
                      <div>✓ Upload photos</div>
                      <div>✗ Cannot approve</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.VIEWER && (
                    <>
                      <div>✓ View all records</div>
                      <div>✓ Export reports</div>
                      <div>✗ Cannot create or edit</div>
                      <div>✗ Cannot approve</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.SUBMITTER && (
                    <>
                      <div>✓ Create and submit records</div>
                      <div>✓ Upload photos</div>
                      <div>✗ Cannot approve</div>
                      <div>✗ Limited editing</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.REVIEWER && (
                    <>
                      <div>✓ View all records</div>
                      <div>✓ Add comments</div>
                      <div>✓ Flag issues</div>
                      <div>✗ Cannot approve</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.APPROVER && (
                    <>
                      <div>✓ View all records</div>
                      <div>✓ Approve submissions</div>
                      <div>✓ Certify claims</div>
                      <div>✗ Cannot create records</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.AUDITOR && (
                    <>
                      <div>✓ View all records</div>
                      <div>✓ Export everything</div>
                      <div>✗ Cannot create or edit</div>
                      <div>✗ Cannot approve</div>
                    </>
                  )}
                  {formData.memberRole === MEMBER_ROLES.READONLY && (
                    <>
                      <div>✓ View records only</div>
                      <div>✗ Cannot export</div>
                      <div>✗ Cannot create or edit</div>
                      <div>✗ Most restricted access</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Trade Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Scope (Optional)
              </label>
              <input
                type="text"
                name="tradeScope"
                value={formData.tradeScope}
                onChange={handleChange}
                placeholder="e.g., Structural Works, MEP, Finishing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Describe what this member is responsible for (optional)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || member.member_role === MEMBER_ROLES.OWNER}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Role'
                )}
              </button>
            </div>
          </form>

          {/* Warning for role changes */}
          {formData.memberRole && formData.memberRole !== member.member_role && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Warning:</strong> Changing this member's role from <strong>{MEMBER_ROLE_LABELS[member.member_role]}</strong> to <strong>{MEMBER_ROLE_LABELS[formData.memberRole]}</strong> will immediately affect their permissions on this contract.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;
