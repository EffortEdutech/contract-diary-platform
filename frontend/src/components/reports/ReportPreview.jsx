// frontend/src/components/reports/ReportPreview.jsx
// Report preview component for export modal

import React from 'react';

/**
 * ReportPreview - Wrapper component for report preview pages
 * Provides A4-like preview styling
 */
const ReportPreview = ({ children }) => {
  return (
    <div className="report-preview-container">
      {/* A4 Paper Preview */}
      <div className="bg-white shadow-lg rounded-lg mx-auto" style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        boxSizing: 'border-box'
      }}>
        {children}
      </div>
    </div>
  );
};

export default ReportPreview;
