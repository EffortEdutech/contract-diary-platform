// AddMemberModal.js - Modal to add new members to contract
import React, { useState } from 'react';

const AddMemberModal = ({ isOpen, onClose, onAddMember, contractId }) => {
  const [formData, setFormData] = useState({
    userId: '',
    email: '',
    role: 'subcontractor',
    tradeScope: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [useEmailInvite, setUseEmailInvite] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (useEmailInvite) {
        // Email-based invitation (requires backend)
        setError('Email invitations require Supabase Edge Function (not yet implemented). Please use User ID for now.');
        setIsSubmitting(false);
        return;
      }

      if (!formData.userId.trim()) {
        setError('Please enter a valid User ID');
        setIsSubmitting(false);
        return;
      }

      await onAddMember({
        userId: formData.userId.trim(),
        role: formData.role,
        tradeScope: formData.tradeScope.trim() || null
      });

      // Reset form
      setFormData({
        userId: '',
        email: '',
        role: 'subcontractor',
        tradeScope: ''
      });
      onClose();
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err.message || 'Failed to add member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Team Member</h2>
                <p className="text-blue-100 text-sm">Invite someone to collaborate on this contract</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invitation Method Toggle */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-900 mb-1">MVP Limitation Notice</h4>
                <p className="text-sm text-yellow-800">
                  Currently, you need to provide the <strong>User ID</strong> of the person you want to add. 
                  Email-based invitations will be available in a future update (requires Supabase Edge Function).
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  💡 <strong>Workaround:</strong> Ask the user to sign up first, then share their User ID with you from their profile page.
                </p>
              </div>
            </div>
          </div>

          {/* User ID Input (Primary Method) */}
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
              User ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="mt-2 text-xs text-gray-500">
              The unique identifier (UUID) of the user you want to add. They can find this in their profile settings.
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Member Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="subcontractor">Subcontractor</option>
              <option value="consultant">Consultant</option>
              <option value="supplier">Supplier</option>
              <option value="main_contractor">Main Contractor (Co-MC)</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              Select the role this person will have in the contract
            </p>
          </div>

          {/* Trade/Scope Input */}
          <div>
            <label htmlFor="tradeScope" className="block text-sm font-medium text-gray-700 mb-2">
              Trade / Scope of Work
            </label>
            <input
              type="text"
              id="tradeScope"
              name="tradeScope"
              value={formData.tradeScope}
              onChange={handleChange}
              placeholder="e.g., Piling Works, M&E Installation, Structural Works"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              Describe what this member will be responsible for (optional)
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

          {/* Role Permissions Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions:</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="font-medium min-w-[140px]">Subcontractor:</span>
                <span>Can create diaries, submit claims (own work only)</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium min-w-[140px]">Consultant:</span>
                <span>Can view all data, cannot make changes</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium min-w-[140px]">Supplier:</span>
                <span>Can track material deliveries, view BOQ</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium min-w-[140px]">Main Contractor:</span>
                <span>Full access (acknowledge diaries, approve claims)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.userId.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
