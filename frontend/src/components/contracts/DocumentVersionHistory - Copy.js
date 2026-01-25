/**
 * Document Version History
 * Shows all versions of a document
 * SESSION 19: PDF Document Handler
 */

import React, { useState, useEffect } from 'react';
import { documentService } from '../../services/documentService';

const DocumentVersionHistory = ({ isOpen, onClose, document }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && document) {
      loadVersions();
    }
  }, [isOpen, document]);

  const loadVersions = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await documentService.getDocumentVersions(document.id);
      
      if (loadError) throw loadError;

      setVersions(data || []);
    } catch (err) {
      console.error('Error loading versions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (version) => {
    const link = document.createElement('a');
    link.href = version.file_url;
    link.download = version.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (version) => {
    window.open(version.file_url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Version History
            </h2>
            {document && (
              <p className="text-sm text-gray-600 mt-1">
                {document.document_title}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading versions...
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Error loading versions</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No version history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Version Badge */}
              {document && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-blue-900">
                      Current Version: v{document.version}
                    </span>
                  </div>
                </div>
              )}

              {/* Version Timeline */}
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Version Items */}
                <div className="space-y-6">
                  {versions.map((version, index) => (
                    <div key={version.id} className="relative pl-10">
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        <span className="text-xs font-medium">{version.revision_number}</span>
                      </div>

                      {/* Version Card */}
                      <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                Version {version.version}
                              </h4>
                              {index === 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDate(version.uploaded_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(version)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDownload(version)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Download"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* File Details */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            {version.file_name}
                          </span>
                          <span>{formatFileSize(version.file_size)}</span>
                        </div>

                        {/* Change Information */}
                        {(version.change_reason || version.change_summary) && (
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            {version.change_reason && (
                              <div>
                                <p className="text-xs font-medium text-gray-700">Reason for Change:</p>
                                <p className="text-sm text-gray-900 mt-0.5">{version.change_reason}</p>
                              </div>
                            )}
                            {version.change_summary && (
                              <div>
                                <p className="text-xs font-medium text-gray-700">Change Summary:</p>
                                <p className="text-sm text-gray-900 mt-0.5">{version.change_summary}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Previous Version Link */}
                        {version.changed_from_version && (
                          <p className="text-xs text-gray-500 mt-2">
                            Replaced version {version.changed_from_version}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionHistory;
