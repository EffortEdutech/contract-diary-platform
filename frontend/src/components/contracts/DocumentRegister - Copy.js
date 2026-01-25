/**
 * Document Register
 * Displays list of documents for a contract section
 * SESSION 19: PDF Document Handler
 */

import React, { useState, useEffect } from 'react';
import { documentService, DOCUMENT_TYPE_LABELS, STATUS_LABELS } from '../../services/documentService';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentVersionHistory from './DocumentVersionHistory';
import PDFViewer from './PDFViewer';

const DocumentRegister = ({ contractId, contractSection, isLocked = false }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [contractId, contractSection]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await documentService.getDocumentsBySection(
        contractId,
        contractSection
      );

      if (loadError) throw loadError;

      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadDocuments();
  };

  const handleViewDocument = (doc) => {
    setPdfUrl(doc.file_url);
    setShowPDFViewer(true);
  };

  const handleViewVersions = (doc) => {
    setSelectedDocument(doc);
    setShowVersionHistory(true);
  };

  const handleDownload = async (doc) => {
    try {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.document_title}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const { success, error: deleteError } = await documentService.deleteDocument(doc.id);
      
      if (deleteError) throw deleteError;

      if (success) {
        loadDocuments();
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete document');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'DRAFT': 'bg-gray-100 text-gray-700',
      'ISSUED': 'bg-green-100 text-green-700',
      'SUPERSEDED': 'bg-yellow-100 text-yellow-700',
      'LOCKED': 'bg-blue-100 text-blue-700',
      'ARCHIVED': 'bg-purple-100 text-purple-700'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  const getExpiryBadge = (expiryDate) => {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          Expired
        </span>
      );
    } else if (daysUntilExpiry <= 30) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
          Expires in {daysUntilExpiry} days
        </span>
      );
    } else if (daysUntilExpiry <= 90) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          Valid
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          Valid
        </span>
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading documents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Error loading documents</p>
        <p className="text-sm mt-1">{error}</p>
        <button 
          onClick={loadDocuments}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Document Register</h3>
          <p className="text-sm text-gray-600 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            {isLocked && (
              <span className="ml-2 text-blue-600 font-medium">
                🔒 Section Locked
              </span>
            )}
          </p>
        </div>

        {!isLocked && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
        )}
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents uploaded</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first document
          </p>
          {!isLocked && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issuer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.document_title}
                          </p>
                          {doc.document_number && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {doc.document_number}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatFileSize(doc.file_size)}
                          </p>
                          {doc.expiry_date && (
                            <div className="mt-1">
                              {getExpiryBadge(doc.expiry_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">
                        {doc.custom_document_type || DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{doc.issuer}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{formatDate(doc.issue_date)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {doc.is_locked && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">v{doc.version}</p>
                      <button
                        onClick={() => handleViewVersions(doc)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View history
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View */}
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Download */}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Download"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>

                        {/* Delete (only for drafts and not locked) */}
                        {doc.status === 'DRAFT' && !doc.is_locked && !isLocked && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        contractId={contractId}
        contractSection={contractSection}
        onUploadSuccess={handleUploadSuccess}
      />

      <DocumentVersionHistory
        isOpen={showVersionHistory}
        onClose={() => {
          setShowVersionHistory(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      <PDFViewer
        isOpen={showPDFViewer}
        onClose={() => {
          setShowPDFViewer(false);
          setPdfUrl('');
        }}
        pdfUrl={pdfUrl}
      />
    </div>
  );
};

export default DocumentRegister;
