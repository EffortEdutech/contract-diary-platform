// ProfileSettings.js - User Profile Settings
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

  const getRoleBadge = (role) => {
    const badges = {
      main_contractor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Main Contractor' },
      subcontractor: { bg: 'bg-green-100', text: 'text-green-800', label: 'Subcontractor' },
      consultant: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Consultant' },
      supplier: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Supplier' }
    };
    const badge = badges[role] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your personal information and account settings</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* User ID Section - PROMINENT */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Your User ID</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Share this ID with Main Contractors to be added to their contracts
            </p>
            <div className="bg-white border border-blue-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono text-gray-800 select-all">{profile.user_id}</code>
                <button
                  onClick={handleCopyUserId}
                  className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy ID
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={profile.email}
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Type</label>
            <div className="flex items-center h-10">
              {getRoleBadge(profile.role)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Created</label>
            <input
              type="text"
              value={formatDate(profile.created_at)}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {profile.organization_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
              <input
                type="text"
                value={profile.organization_name}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          )}
        </div>
      </div>

      {/* Personal Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
              Position / Job Title
            </label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g., Project Manager, Site Engineer"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                isEditing ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="+60123456789"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                isEditing ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label htmlFor="cidb_registration" className="block text-sm font-medium text-gray-700 mb-2">
              CIDB Registration
            </label>
            <input
              type="text"
              id="cidb_registration"
              name="cidb_registration"
              value={formData.cidb_registration}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="CIDB Registration Number"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                isEditing ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label htmlFor="ssm_registration" className="block text-sm font-medium text-gray-700 mb-2">
              SSM Registration
            </label>
            <input
              type="text"
              id="ssm_registration"
              name="ssm_registration"
              value={formData.ssm_registration}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="SSM Registration Number"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                isEditing ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
              }`}
            />
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
