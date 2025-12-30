// frontend/src/components/boq/ExportPDFButton.js
import React, { useState } from 'react';
import { generateBOQPDF } from '../../utils/pdfGenerator';
import { getBOQItems, getBOQSections, calculateBOQSummary } from '../../services/boqService';

function ExportPDFButton({ boq, contract, className = '' }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Fetch all required data
      const itemsResult = await getBOQItems(boq.id);
      const sectionsResult = await getBOQSections(boq.id);
      
      if (!itemsResult.success) {
        throw new Error('Failed to fetch BOQ items');
      }
      
      if (!sectionsResult.success) {
        throw new Error('Failed to fetch BOQ sections');
      }
      
      const items = itemsResult.data || [];
      const sections = sectionsResult.data || [];
      
      if (items.length === 0) {
        alert('No items to export. Please add items to the BOQ first.');
        return;
      }
      
      // Generate PDF
      generateBOQPDF(boq, items, sections, contract);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {exporting ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export PDF</span>
        </>
      )}
    </button>
  );
}

export default ExportPDFButton;
