// frontend/src/components/boq/AddSectionModal.js
import React, { useState } from 'react';
import { createBOQSection } from '../../services/boqService';

function AddSectionModal({ isOpen, onClose, boqId, onSectionAdded }) {
  const [formData, setFormData] = useState({
    section_number: '',
    title: '',
    description: ''
  });
  
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors = [];
    
    if (!formData.section_number.trim()) {
      newErrors.push('Section number is required');
    }
    
    if (!formData.title.trim()) {
      newErrors.push('Section title is required');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    const result = await createBOQSection({
      boq_id: boqId,
      section_number: formData.section_number.trim(),
      title: formData.title.trim(),
      description: formData.description.trim() || null
    });

    if (result.success) {
      // Reset form
      setFormData({
        section_number: '',
        title: '',
        description: ''
      });
      setErrors([]);
      
      // Notify parent component
      onSectionAdded();
      onClose();
    } else {
      setErrors([result.error || 'Failed to create section']);
    }
    
    setSubmitting(false);
  };

  const handleCancel = () => {
    setFormData({
      section_number: '',
      title: '',
      description: ''
    });
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add New Section</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create a section to organize BOQ items
          </p>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <ul className="list-disc list-inside text-sm text-red-700">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Section Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="section_number"
                value={formData.section_number}
                onChange={handleChange}
                placeholder="e.g., A, B, C or 01, 02, 03"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be unique within this BOQ
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Substructure Works, Superstructure"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details about this section..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSectionModal;
