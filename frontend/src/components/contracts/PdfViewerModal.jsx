import React, { useEffect } from 'react';

export default function PdfViewerModal({ isOpen, onClose, title, url }) {
  // close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {title || 'Document Viewer'}
            </h3>
            <p className="text-xs text-gray-500 truncate">{url}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
            >
              Open in new tab
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 bg-gray-100">
          {/* iframe works best for Chrome PDF viewer */}
          <iframe
            title="PDF Viewer"
            src={url}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
