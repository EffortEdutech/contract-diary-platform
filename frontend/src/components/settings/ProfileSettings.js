// ============================================
// UPDATED: ProfileSettings.js
// Session 13 - RBAC Migration
// ============================================
// CHANGES:
// - Removed user_role field from form (doesn't exist in DB)
// - Only displays company type (role) as read-only badge
// - User's contract-specific roles managed via contract_members
// ============================================

import React, { useState } from 'react';
import { copyToClipboard, updateUserProfile } from '../../services/settingsService';

const ProfileSettings = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    position: profile?.position || '',
    phone: profile?.phone || '',
    cidb_registration: profile?.cidb_registration || '',
    ssm_registration: profile?.ssm_registration || ''
  });

  const handleCopyUserId = async () => {
    const success = await copyToClipboard(profile.user_id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateUserProfile(formData);
      await onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      position: profile?.position || '',
      phone: profile?.phone || '',
      cidb_registration: profile?.cidb_registration || '',
      ssm_registration: profile?.ssm_registration || ''
    });
    setIsEditing(false);
  };

  const getCompanyTypeBadge = (role) => {
    const badges = {
      main_contractor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Main Contractor', icon: '🏗️' },
      subcontractor: { bg: 'bg-green-100', text: 'text-green-800', label: 'Subcontractor', icon: '👷' },
      consultant: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Consultant', icon: '📋' },
      supplier: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Supplier', icon: '🚚' }
    };
    const badge = badges[role] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role, icon: '👤' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            Update your personal information and contact details
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          
          {/* Read-Only Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Email (Read-Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={profile?.email || '-'}
                  disabled
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 cursor-not-allowed"
                />
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-600">
                  🔒 Cannot change
                </span>
              </div>
            </div>

            {/* Company Type (Read-Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Type
              </label>
              <div className="flex items-center space-x-2">
                {getCompanyTypeBadge(profile?.role)}
                <span className="text-xs text-gray-500">
                  (Business identity)
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                💡 Your permissions on each contract are set by the contract owner.
              </p>
            </div>

            {/* User ID (Read-Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={profile?.user_id || '-'}
                  disabled
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 font-mono text-xs cursor-not-allowed"
                />
                <button
                  onClick={handleCopyUserId}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Copy User ID"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Organization (Read-Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <input
                type="text"
                value={profile?.organization_name || '-'}
                disabled
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6"></div>

          {/* Editable Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position / Title
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., Project Manager, Site Engineer"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., +60123456789"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>

            {/* CIDB Registration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CIDB Registration
              </label>
              <input
                type="text"
                name="cidb_registration"
                value={formData.cidb_registration}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., PKK12345678"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>

            {/* SSM Registration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SSM Registration
              </label>
              <input
                type="text"
                name="ssm_registration"
                value={formData.ssm_registration}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., 123456-A"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons (Only visible in edit mode) */}
          {isEditing && (
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Account Metadata */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Account Information</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Account Created</dt>
                <dd className="mt-1 text-gray-900">{formatDate(profile?.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-gray-900">{formatDate(profile?.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Company Type & Permissions</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                <strong>Company Type</strong> defines who you are (Main Contractor, Subcontractor, etc.). 
                This cannot be changed as it's tied to your organization.
              </p>
              <p className="mt-2">
                <strong>Contract Permissions</strong> are set individually for each contract you join. 
                The contract owner assigns your role (Owner, Admin, Editor, Viewer, etc.) which determines 
                what you can do on that specific contract.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
