// ============================================
// UPDATED: InviteMemberModal.js
// Session 13 - RBAC Migration
// ============================================
// CHANGES:
// - user_role field in invitation = contract member_role (not system role)
// - Clear separation: company_type vs user_role (contract role)
// - Updated role selection with MEMBER_ROLES
// ============================================

import React, { useState } from 'react';
import { COMPANY_TYPES, COMPANY_TYPE_LABELS, MEMBER_ROLES, MEMBER_ROLE_LABELS, MEMBER_ROLE_DESCRIPTIONS } from '../../utils/constants';
import { getAvailableRoles } from '../../utils/permissions';

const InviteMemberModal = ({ isOpen, onClose, onInvite, contractId, currentUserRole }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    position: '',
    phone: '',
    company_type: 'subcontractor', // Company identity
    user_role: 'editor', // Contract role they'll get
    cidb_registration: '',
    ssm_registration: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

    // Validation
    if (!formData.email || !formData.full_name || !formData.position) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await onInvite({
        ...formData,
        contract_id: contractId
      });
      
      // Reset form
      setFormData({
        email: '',
        full_name: '',
        position: '',
        phone: '',
        company_type: 'subcontractor',
        user_role: 'editor',
        cidb_registration: '',
        ssm_registration: ''
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      email: '',
      full_name: '',
      position: '',
      phone: '',
      company_type: 'subcontractor',
      user_role: 'editor',
      cidb_registration: '',
      ssm_registration: ''
    });
    setError(null);
    onClose();
  };

  // Get roles that current user can assign
  const availableRoles = getAvailableRoles(currentUserRole || MEMBER_ROLES.OWNER);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleCancel}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Invite New Member
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Send an invitation to join this contract
              </p>
            </div>
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
            
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position / Title *
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Site Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Phone */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+60123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Company Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Type *
              </label>
              <select
                name="company_type"
                value={formData.company_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Object.entries(COMPANY_TYPES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {COMPANY_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This defines their business identity (Main Contractor, Subcontractor, etc.)
              </p>
            </div>

            {/* Contract Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Role *
              </label>
              <select
                name="user_role"
                value={formData.user_role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select role...</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {MEMBER_ROLE_LABELS[role]} - {MEMBER_ROLE_DESCRIPTIONS[role]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This determines what they can do on this specific contract
              </p>
            </div>

            {/* Role Description */}
            {formData.user_role && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  {MEMBER_ROLE_LABELS[formData.user_role]} Permissions:
                </h4>
                <p className="text-xs text-blue-800">
                  {MEMBER_ROLE_DESCRIPTIONS[formData.user_role]}
                </p>
              </div>
            )}

            {/* Registration Details (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CIDB Registration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CIDB Registration (Optional)
                </label>
                <input
                  type="text"
                  name="cidb_registration"
                  value={formData.cidb_registration}
                  onChange={handleChange}
                  placeholder="PKK12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* SSM Registration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSM Registration (Optional)
                </label>
                <input
                  type="text"
                  name="ssm_registration"
                  value={formData.ssm_registration}
                  onChange={handleChange}
                  placeholder="123456-A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Invitation...
                  </span>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </form>

          {/* Info Banner */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> An email will be sent to the invitee with a link to create their account. 
                  The invitation will expire in 7 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;
