/**
 * Document Upload Modal
 * SESSION 19: PDF Document Handler
 */

import React, { useState } from 'react';
import { documentService, DOCUMENT_TYPE_LABELS } from '../../services/documentService';

const DocumentUploadModal = ({ 
  isOpen, 
  onClose, 
  contractId, 
  contractSection,
  canUpload = true,
  isReadOnly = false,
  onUploadSuccess 
}) => {
  const [formData, setFormData] = useState({
    documentType: '',
    customDocumentType: '',
    documentTitle: '',
    documentNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    issuer: '',
    recipient: '',
    expiryDate: '',
    description: '',
    remarks: '',
    file: null
  });

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const uploadDisabled = isReadOnly || !canUpload;

  // Filter document types by section
  const getDocumentTypesBySection = () => {
    const types = Object.entries(DOCUMENT_TYPE_LABELS);
    
    if (contractSection === 'PRE_CONTRACT') {
      return types.filter(([key]) => 
        key.includes('TENDER') || 
        key.includes('PRELIMINARY') || 
        key.includes('PROJECT') ||
        key.includes('EMPLOYERS') ||
        key.includes('SCOPE') ||
        key.includes('CONCEPT') ||
        key.includes('RFP') ||
        key.includes('CONDITIONS_OF_TENDER') ||
        key.includes('INVITATION') ||
        key.includes('FORM_OF_TENDER') ||
        key.includes('COMPANY') ||
        key.includes('METHOD_STATEMENT_OUTLINE') ||
        key.includes('FINANCIAL_STATEMENTS') ||
        key.includes('CVS') ||
        key.includes('PLANT_EQUIPMENT') ||
        key === 'OTHER'
      );
    } else if (contractSection === 'CONTRACT_FORMATION') {
      return types.filter(([key]) => 
        key.includes('LETTER_OF') ||
        key.includes('CONTRACT') ||
        key.includes('CONDITIONS_OF_CONTRACT') ||
        key.includes('APPENDIX') ||
        key.includes('IFC') ||
        key.includes('PRICED_BOQ') ||
        key.includes('PROGRAMME') ||
        key.includes('BOND') ||
        key.includes('INSURANCE') ||
        key.includes('POWER_OF_ATTORNEY') ||
        key === 'OTHER'
      );
    } else if (contractSection === 'CLOSE_OUT') {
      return types.filter(([key]) => 
        key.includes('FINAL') ||
        key.includes('RELEASE') ||
        key.includes('AS_BUILT') ||
        key.includes('OM_MANUALS') ||
        key.includes('WARRANTIES') ||
        key.includes('COMPLETION') ||
        key.includes('ARCHIVE') ||
        key === 'OTHER'
      );
    }
    
    return types;
  };

  const documentTypes = getDocumentTypesBySection();

  // Check if document type requires expiry date
  const requiresExpiryDate = () => {
    return formData.documentType.includes('BOND') || 
           formData.documentType.includes('INSURANCE') ||
           formData.documentType.includes('WARRANTY');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        setError('File size must be less than 50MB');
        return;
      }

      setFormData(prev => ({ ...prev, file }));
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      // Validation
      if (!formData.file) {
        throw new Error('Please select a file to upload');
      }

      if (!formData.documentType) {
        throw new Error('Please select a document type');
      }

      if (formData.documentType === 'OTHER' && !formData.customDocumentType) {
        throw new Error('Please specify custom document type');
      }

      if (!formData.documentTitle.trim()) {
        throw new Error('Please enter document title');
      }

      if (!formData.issuer.trim()) {
        throw new Error('Please enter issuer');
      }

      if (requiresExpiryDate() && !formData.expiryDate) {
        throw new Error('Expiry date is required for bonds and insurance');
      }

      // Upload document
      const { data, error: uploadError } = await documentService.uploadDocument({
        contractId,
        contractSection,
        documentType: formData.documentType,
        customDocumentType: formData.customDocumentType,
        documentTitle: formData.documentTitle,
        documentNumber: formData.documentNumber,
        issueDate: formData.issueDate,
        issuer: formData.issuer,
        recipient: formData.recipient,
        expiryDate: formData.expiryDate || null,
        description: formData.description,
        remarks: formData.remarks,
        file: formData.file
      });

      if (uploadError) throw uploadError;

      // Success
      console.log('✅ Document uploaded successfully:', data);
      
      // Reset form
      setFormData({
        documentType: '',
        customDocumentType: '',
        documentTitle: '',
        documentNumber: '',
        issueDate: new Date().toISOString().split('T')[0],
        issuer: '',
        recipient: '',
        expiryDate: '',
        description: '',
        remarks: '',
        file: null
      });

      // Callback
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

      // Close modal
      onClose();

    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Upload Document
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isUploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              name="documentType"
              value={formData.documentType}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select document type</option>
              {documentTypes.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Custom Document Type (if OTHER selected) */}
          {formData.documentType === 'OTHER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Document Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customDocumentType"
                value={formData.customDocumentType}
                onChange={handleInputChange}
                required
                placeholder="e.g., Safety Certification"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="documentTitle"
              value={formData.documentTitle}
              onChange={handleInputChange}
              required
              placeholder="e.g., Main Contract Agreement"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Number (Optional)
            </label>
            <input
              type="text"
              name="documentNumber"
              value={formData.documentNumber}
              onChange={handleInputChange}
              placeholder="e.g., LOA-2024-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Issue Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Expiry Date (conditional) */}
            {requiresExpiryDate() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Issuer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issuer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="issuer"
              value={formData.issuer}
              onChange={handleInputChange}
              required
              placeholder="e.g., Client, Architect, Engineer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient (Optional)
            </label>
            <input
              type="text"
              name="recipient"
              value={formData.recipient}
              onChange={handleInputChange}
              placeholder="e.g., Main Contractor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              placeholder="Brief description of the document"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF File <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            {formData.file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              PDF only, max 50MB
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
