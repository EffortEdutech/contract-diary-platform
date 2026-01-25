import React, { useEffect, useState } from 'react';
import { documentService } from '../../services/documentService';

const DocumentVersionsModal = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  canUploadNewVersion = false,
  isLocked = false,
  onViewPdf,          // (title, url) => void  (you already have PdfViewerModal)
  onUploaded,         // callback to refresh checklist after upload
}) => {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [changeReason, setChangeReason] = useState('Revision update');
  const [changeSummary, setChangeSummary] = useState('');

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await documentService.getDocumentVersions(documentId);
      if (error) throw error;
      setVersions(data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load versions');
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !documentId) return;
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId]);

  const handleViewVersion = async (v) => {
    try {
        if (!v) return;

        // ✅ ALWAYS prefer storage_path (correct input for createSignedUrl)
        const signed = await documentService.getSignedViewUrl(
        v.storage_path || v.file_url,
        60 * 10
        );

        onViewPdf?.(
        documentTitle || v.file_name || 'Document',
        signed
        );
    } catch (e) {
        console.error(e);
        alert(e?.message || 'Failed to open version');
    }
  };


  const handleUploadNewVersion = async () => {
    if (!file) return alert('Please select a PDF file');
    if (file.type !== 'application/pdf') return alert('PDF only');

    setUploading(true);
    try {
      const { error } = await documentService.uploadNewVersion({
        documentId,
        file,
        changeReason,
        changeSummary: changeSummary || 'Updated version',
      });

      if (error) throw error;

      setFile(null);
      setChangeSummary('');
      await loadVersions();
      onUploaded?.();
    } catch (e) {
      alert(e?.message || 'Failed to upload new version');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const allowUpload = canUploadNewVersion && !isLocked;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Versions</h2>
            <p className="text-sm text-gray-600">{documentTitle || 'Document'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse bg-gray-100 rounded-lg h-20" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
              {error}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Version list */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 text-xs font-semibold text-gray-600 px-4 py-2">
                <div className="col-span-3">Version</div>
                <div className="col-span-4">Uploaded</div>
                <div className="col-span-3">Reason</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {versions.length === 0 ? (
                <div className="px-4 py-4 text-sm text-gray-600">No versions found.</div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="grid grid-cols-12 px-4 py-3 border-t items-center">
                    <div className="col-span-3">
                      <div className="text-sm font-medium text-gray-900">{v.version}</div>
                      <div className="text-xs text-gray-500">rev {v.revision_number}</div>
                    </div>

                    <div className="col-span-4 text-sm text-gray-700">
                      {v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : '-'}
                    </div>

                    <div className="col-span-3 text-sm text-gray-700">
                      {v.change_reason || '-'}
                    </div>

                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => handleViewVersion(v)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload new version */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Upload New Version</h3>
                {isLocked && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                    Locked
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    disabled={!allowUpload || uploading}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
                  <input
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    disabled={!allowUpload || uploading}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={!allowUpload || uploading}
                />
                <button
                  onClick={handleUploadNewVersion}
                  disabled={!allowUpload || uploading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading…' : 'Upload Version'}
                </button>
              </div>

              {!canUploadNewVersion && (
                <p className="text-xs text-gray-500 mt-2">
                  You don’t have permission to upload new versions.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionsModal;
