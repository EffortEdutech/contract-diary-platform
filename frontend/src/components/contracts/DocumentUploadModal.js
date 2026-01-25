// src/components/contracts/DocumentUploadModal.js
import React, { useMemo, useState, useEffect } from 'react';
import { documentService, DOCUMENT_TYPE_LABELS } from '../../services/documentService';

const DocumentUploadModal = ({
  isOpen,
  onClose,
  contractId,
  contractSection,
  onUploadSuccess,
  authority,
  isLocked,
  presetTemplate,
}) => {
  const isChecklistUpload = !!presetTemplate?.id;

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
    file: null,
    templateId: null, // ✅ keep it inside formData
  });

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const canUpload = !!authority?.canUploadDocument && !isLocked;
  const disabledReason = authority?.isReadOnly
    ? 'Read-only mode'
    : isLocked
      ? 'Section is locked'
      : !authority?.canUploadDocument
        ? 'No permission to upload'
        : null;

  // ✅ Pre-fill when opened from checklist item
  useEffect(() => {
    if (!isOpen) return;

    if (isChecklistUpload) {
      setFormData((p) => ({
        ...p,
        templateId: presetTemplate.id,
        documentTitle: presetTemplate.item_title || p.documentTitle,
        documentType: 'OTHER',
        customDocumentType: presetTemplate.item_code || '',
      }));
    } else {
      // When opened manually (not from checklist), clear templateId
      setFormData((p) => ({ ...p, templateId: null }));
    }
  }, [isOpen, isChecklistUpload, presetTemplate]);

  const documentTypes = useMemo(() => {
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
    }

    if (contractSection === 'CONTRACT_FORMATION') {
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
    }

    if (contractSection === 'CLOSE_OUT') {
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
  }, [contractSection]);

  const requiresExpiryDate = () =>
    (formData.documentType || '').includes('BOND') ||
    (formData.documentType || '').includes('INSURANCE') ||
    (formData.documentType || '').includes('WARRANTY');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((p) => ({ ...p, file }));
  };

  // DocumentUploadModal.js
  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsUploading(true);
    setError(null);

    try {
      // ✅ build payload ONLY from formData (single source of truth)
      const payload = {
        contractId,
        contractSection,

        // templateId is stored in formData (prefilled by checklist)
        templateId: formData.templateId,

        documentTitle: formData.documentTitle,
        documentType: formData.documentType || 'OTHER',
        customDocumentType: formData.customDocumentType || null,

        documentNumber: formData.documentNumber || null,
        issueDate: formData.issueDate || null,
        issuer: formData.issuer || null,
        recipient: formData.recipient || null,
        expiryDate: formData.expiryDate || null,
        description: formData.description || null,
        remarks: formData.remarks || null,

        // you don’t have tags in formData (yet) → keep null
        tags: null,

        file: formData.file
      };

      const result = await documentService.uploadDocument(payload);

      if (!result) {
        throw new Error(
          'uploadDocument() returned undefined. Check documentService return { data, error }.'
        );
      }

      const { data, error } = result;
      if (error) throw error;

      onUploadSuccess?.(data);
      onClose?.();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
            <p className="text-sm text-gray-600">Section: {contractSection}</p>
            {isChecklistUpload && (
              <p className="text-xs text-blue-700 mt-1">
                Checklist item: <strong>{presetTemplate?.item_title}</strong>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {disabledReason && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
            Upload disabled: <strong>{disabledReason}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ✅ Hide Document Type selection for checklist uploads */}
          {!isChecklistUpload && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Document Type</label>
              <select
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                disabled={!canUpload || isUploading}
                className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
                required
              >
                <option value="">Select type…</option>
                {documentTypes.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Show read-only type for checklist uploads */}
          {isChecklistUpload && (
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="text-xs text-gray-600">Document Type</div>
              <div className="text-sm font-semibold text-gray-900">
                {DOCUMENT_TYPE_LABELS[formData.documentType] || formData.documentType || 'OTHER'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Document Title</label>
            <input
              name="documentTitle"
              value={formData.documentTitle}
              onChange={handleInputChange}
              disabled={!canUpload || isUploading || isChecklistUpload} // ✅ lock title for checklist
              className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
              required
            />
            {isChecklistUpload && (
              <p className="text-xs text-gray-500 mt-1">
                Title is fixed because you are uploading against a checklist item.
              </p>
            )}
          </div>

          {requiresExpiryDate() && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                disabled={!canUpload || isUploading}
                className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">PDF File</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={!canUpload || isUploading}
              className="mt-1 w-full"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canUpload || isUploading}
              title={!canUpload ? disabledReason || 'Upload disabled' : 'Upload document'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
