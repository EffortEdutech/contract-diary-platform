// ============================================
// EditInvitationModal.js - Edit Pending Invitation Details
// ============================================
// Purpose: Allow editing of pending invitation details before they accept
// Features: Edit name, position, role, phone, organization details
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const COMPANY_TYPES = [
  { value: 'main_contractor', label: 'Main Contractor', icon: '🏗️' },
  { value: 'subcontractor', label: 'Subcontractor', icon: '👷' },
  { value: 'consultant', label: 'Consultant', icon: '📋' },
  { value: 'supplier', label: 'Supplier', icon: '🚚' }
];

const USER_ROLES = [
  { value: 'owner', label: 'Owner', icon: '👑' },
  { value: 'admin', label: 'Admin', icon: '⚡' },
  { value: 'editor', label: 'Editor', icon: '✏️' },
  { value: 'viewer', label: 'Viewer', icon: '👁️' },
  { value: 'submitter', label: 'Submitter', icon: '📤' },
  { value: 'reviewer', label: 'Reviewer', icon: '🔍' },
  { value: 'approver', label: 'Approver', icon: '✅' },
  { value: 'auditor', label: 'Auditor', icon: '📊' },
  { value: 'readonly', label: 'Read Only', icon: '🔒' }
];

const EditInvitationModal = ({ isOpen, onClose, invitation, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    phone: '',
    company_type: 'subcontractor',
    user_role: 'editor',
    organization_name: '',
    cidb_registration: '',
    ssm_registration: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invitation && isOpen) {
      setFormData({
        full_name: invitation.full_name || '',
        position: invitation.position || '',
        phone: invitation.phone || '',
        company_type: invitation.company_type || 'subcontractor',
        user_role: invitation.user_role || 'editor',
        organization_name: invitation.organization_name || '',
        cidb_registration: invitation.cidb_registration || '',
        ssm_registration: invitation.ssm_registration || ''
      });
      setError('');
    }
  }, [invitation, isOpen]);

  if (!isOpen || !invitation) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Update invitation
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          full_name: formData.full_name,
          position: formData.position,
          phone: formData.phone,
          company_type: formData.company_type,
          user_role: formData.user_role,
          organization_name: formData.organization_name,
          cidb_registration: formData.cidb_registration,
          ssm_registration: formData.ssm_registration,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
        .eq('status', 'pending'); // Can only edit pending invitations

      if (updateError) throw updateError;

      alert('✅ Invitation updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating invitation:', err);
      setError(err.message || 'Failed to update invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Invitation</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update invitation details for {invitation.email}
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
          {/* Form Fields */}
          <div className="px-6 py-4 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Project Manager, Site Engineer"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="+60123456789"
              />
            </div>

            {/* Company Type & User Role (Side by Side) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Company Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="company_type"
                  value={formData.company_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {COMPANY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permission Level <span className="text-red-500">*</span>
                </label>
                <select
                  name="user_role"
                  value={formData.user_role}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {USER_ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.icon} {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="organization_name"
                value={formData.organization_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Company Sdn Bhd"
              />
            </div>

            {/* CIDB & SSM (Side by Side) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CIDB Registration
                </label>
                <input
                  type="text"
                  name="cidb_registration"
                  value={formData.cidb_registration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="PKK123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SSM Registration
                </label>
                <input
                  type="text"
                  name="ssm_registration"
                  value={formData.ssm_registration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456-X"
                />
              </div>
            </div>
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loading ? 'Updating...' : 'Update Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvitationModal;
