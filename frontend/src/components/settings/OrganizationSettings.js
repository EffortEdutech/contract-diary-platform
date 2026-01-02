// OrganizationSettings.js - Organization Settings
import React, { useState } from 'react';
import { updateOrganization, createOrganization } from '../../services/settingsService';

const OrganizationSettings = ({ organization, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(!organization);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    registration_number: organization?.registration_number || '',
    cidb_registration: organization?.cidb_registration || '',
    cidb_grade: organization?.cidb_grade || '',
    organization_type: organization?.organization_type || 'main_contractor',
    address: organization?.address || '',
    phone: organization?.phone || '',
    email: organization?.email || ''
  });

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
      
      if (isCreating) {
        await createOrganization(formData);
        setIsCreating(false);
      } else {
        await updateOrganization(organization.id, formData);
      }
      
      await onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Failed to save organization. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isCreating && !organization) {
      setFormData({
        name: '',
        registration_number: '',
        cidb_registration: '',
        cidb_grade: '',
        organization_type: 'main_contractor',
        address: '',
        phone: '',
        email: ''
      });
    } else {
      setFormData({
        name: organization?.name || '',
        registration_number: organization?.registration_number || '',
        cidb_registration: organization?.cidb_registration || '',
        cidb_grade: organization?.cidb_grade || '',
        organization_type: organization?.organization_type || 'main_contractor',
        address: organization?.address || '',
        phone: organization?.phone || '',
        email: organization?.email || ''
      });
    }
    setIsEditing(false);
    if (!organization) {
      setIsCreating(true);
    }
  };

  const isFormEditable = isEditing || isCreating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization</h2>
          <p className="mt-1 text-sm text-gray-500">
            {organization ? 'Manage your company information' : 'Create your organization profile'}
          </p>
        </div>
        {organization && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Organization
          </button>
        )}
      </div>

      {/* No Organization Message */}
      {!organization && !isCreating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Organization</h3>
              <p className="text-sm text-yellow-800 mb-4">
                You haven't set up your organization yet. Create one to manage contracts and team members.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
              >
                Create Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Form */}
      {(organization || isCreating) && (
        <>
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  required
                  placeholder="e.g., Bina Jaya Construction Sdn Bhd"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="organization_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="organization_type"
                  name="organization_type"
                  value={formData.organization_type}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  required
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  <option value="main_contractor">Main Contractor</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="consultant">Consultant</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>

              <div>
                <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700 mb-2">
                  SSM Registration Number
                </label>
                <input
                  type="text"
                  id="registration_number"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  placeholder="e.g., 202001234567"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* CIDB Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CIDB Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cidb_registration" className="block text-sm font-medium text-gray-700 mb-2">
                  CIDB Registration Number
                </label>
                <input
                  type="text"
                  id="cidb_registration"
                  name="cidb_registration"
                  value={formData.cidb_registration}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  placeholder="e.g., A12345678"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="cidb_grade" className="block text-sm font-medium text-gray-700 mb-2">
                  CIDB Grade
                </label>
                <select
                  id="cidb_grade"
                  name="cidb_grade"
                  value={formData.cidb_grade}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  <option value="">Select Grade</option>
                  <option value="G1">G1</option>
                  <option value="G2">G2</option>
                  <option value="G3">G3</option>
                  <option value="G4">G4</option>
                  <option value="G5">G5</option>
                  <option value="G6">G6</option>
                  <option value="G7">G7</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  rows={3}
                  placeholder="Company address"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
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
                  disabled={!isFormEditable}
                  placeholder="+60123456789"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isFormEditable}
                  placeholder="company@example.com"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isFormEditable ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>

            {isFormEditable && (
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
                  disabled={isSaving || !formData.name}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isCreating ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    isCreating ? 'Create Organization' : 'Save Changes'
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OrganizationSettings;
