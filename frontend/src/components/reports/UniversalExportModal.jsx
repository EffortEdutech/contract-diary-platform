// frontend/src/components/reports/UniversalExportModal.jsx
// COMPLETE - Supports BOQ, Claims, Financial, and Diary reports

import React, { useState } from 'react';
import { buildBOQPdf } from '../../lib/reports/boqPdfBuilder';
import { buildClaimsPdf } from '../../lib/reports/claimsPdfBuilder';
import { buildFinancialPdf } from '../../lib/reports/financialPdfBuilder';
import { buildDiaryPdf } from '../../lib/reports/diaryPdfBuilder';
import ReportPagePreview from './ReportPagePreview';

const UniversalExportModal = ({
  open,
  onClose,
  reportType,
  reportData,
  contract
}) => {

  const [settings, setSettings] = useState({
    content: {
      includeSummary: true,
      includeStatusChart: true,
      includeSectionProgress: true,
      includeItemDetails: false
    },
    page: {
      orientation: 'portrait'
    },
    header: {
      showContractInfo: true
    },
    footer: {
      showPageNumbers: true,
      showGeneratedDate: true
    }
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  if (!open) return null;

  // Toggle checkbox
  const toggle = (path) => {
    setSettings(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let ref = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = !ref[keys[keys.length - 1]];
      return updated;
    });
  };

  // Export PDF
  const handleExport = async () => {
    console.log('==========================================');
    console.log('EXPORT BUTTON CLICKED');
    console.log('Report Type:', reportType);
    console.log('Report Data:', reportData);
    console.log('Contract:', contract);
    console.log('Settings:', settings);
    console.log('==========================================');

    setIsExporting(true);
    setExportError(null);

    try {
      let doc;

      if (reportType === 'boq') {
        console.log('🔵 Calling buildBOQPdf...');
        doc = await buildBOQPdf({ data: reportData, settings, contract });
      } else if (reportType === 'claims') {
        console.log('🟢 Calling buildClaimsPdf...');
        doc = await buildClaimsPdf({ data: reportData, settings, contract });
      } else if (reportType === 'financial') {
        console.log('🟡 Calling buildFinancialPdf...');
        doc = await buildFinancialPdf({ data: reportData, settings, contract });
      } else if (reportType === 'diary') {
        console.log('🟤 Calling buildDiaryPdf...');
        doc = await buildDiaryPdf({ data: reportData, settings, contract });
      } else {
        throw new Error(`Report type "${reportType}" not yet implemented`);
      }

      if (doc) {
        const timestamp = new Date().toISOString().split('T')[0];
        const contractNo = contract?.contract_number || 'CONTRACT';
        const reportName = reportType.toUpperCase();
        const filename = `${reportName}_${contractNo}_${timestamp}.pdf`;
        
        console.log('💾 Saving as:', filename);
        doc.save(filename);
        console.log('✅ PDF saved successfully');
      }

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      setExportError(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate preview pages
  const getPreviewPages = () => {
    const pages = [];

    // PAGE 1: SUMMARY (PORTRAIT)
    if (settings.content.includeSummary) {
      let title, contentItems;
      
      if (reportType === 'boq') {
        title = 'BOQ Summary';
        contentItems = ['Total items', 'Completed items', 'In progress items', 'Not started items', 'Completion percentage'];
      } else if (reportType === 'claims') {
        title = 'Claims Overview';
        contentItems = ['Total claims', 'Average processing time', 'Status breakdown (Draft, Submitted, Approved)'];
      } else if (reportType === 'financial') {
        title = 'Financial Overview';
        contentItems = ['Total claims', 'Total claimed amount', 'Total paid', 'Retention held', 'Contract value', 'Progress percentage'];
      } else if (reportType === 'diary') {
        title = 'Diary Overview';
        contentItems = ['Total diaries', 'Total photos uploaded', 'Issues/delays reported', 'Weather distribution', 'Manpower by trade'];
      }

      pages.push({
        title,
        orientation: 'portrait',
        contentItems,
        hasTable: true,
        hasChart: false,
        footer: contract?.contract_number || 'Contract'
      });
    }

    // PAGE 2: CHART 1 (LANDSCAPE)
    if (settings.content.includeStatusChart) {
      let title, contentItems;
      
      if (reportType === 'boq') {
        title = 'Status Distribution';
        contentItems = ['Pie chart showing completion status', 'Color-coded by progress', 'Legend with percentages'];
      } else if (reportType === 'claims') {
        title = 'Claims by Status';
        contentItems = ['Pie chart showing claims by status', 'Draft, Submitted, Approved counts', 'Legend with percentages'];
      } else if (reportType === 'financial') {
        title = 'Cumulative Claim Amount';
        contentItems = ['Line chart showing cumulative progress', 'Total claimed over time', 'Trend visualization'];
      } else if (reportType === 'diary') {
        title = 'Weather Distribution';
        contentItems = ['Pie chart showing weather conditions', 'Sunny, Cloudy, Rainy days', 'Legend with percentages'];
      }

      pages.push({
        title,
        orientation: 'landscape',
        contentItems,
        hasTable: false,
        hasChart: true,
        footer: contract?.contract_number || 'Contract'
      });
    }

    // PAGE 3: CHART 2 / TABLE (Depends on report type)
    if (settings.content.includeSectionProgress) {
      if (reportType === 'boq') {
        pages.push({
          title: 'Section Progress',
          orientation: 'portrait',
          contentItems: ['Section number and title', 'Total items per section', 'Completed items', 'Progress percentage'],
          hasTable: true,
          hasChart: false,
          footer: contract?.contract_number || 'Contract'
        });
      } else if (reportType === 'claims') {
        pages.push({
          title: 'Monthly Claims Trend',
          orientation: 'landscape',
          contentItems: ['Bar chart showing monthly claims', 'Claims count and amount per month', 'Trend analysis'],
          hasTable: false,
          hasChart: true,
          footer: contract?.contract_number || 'Contract'
        });
      } else if (reportType === 'financial') {
        pages.push({
          title: 'Monthly Claims Breakdown',
          orientation: 'landscape',
          contentItems: ['Bar chart showing monthly breakdown', 'Claims count and amount', 'Monthly comparison'],
          hasTable: false,
          hasChart: true,
          footer: contract?.contract_number || 'Contract'
        });
      } else if (reportType === 'diary') {
        pages.push({
          title: 'Manpower by Trade',
          orientation: 'landscape',
          contentItems: ['Bar chart showing manpower distribution', 'Average and total workers per trade', 'Resource analysis'],
          hasTable: false,
          hasChart: true,
          footer: contract?.contract_number || 'Contract'
        });
      }
    }

    // PAGE 4: DETAILED TABLE / ITEM DETAILS
    if (reportType === 'boq' && settings.content.includeItemDetails) {
      pages.push({
        title: 'Item Details',
        orientation: 'portrait',
        contentItems: ['Item number', 'Description', 'Quantity', 'Quantity done', 'Progress percentage'],
        hasTable: true,
        hasChart: false,
        footer: contract?.contract_number || 'Contract'
      });
    } else if (reportType === 'claims') {
      // Claims list always shown
      pages.push({
        title: 'Claims List',
        orientation: 'portrait',
        contentItems: ['Claim number', 'Claim title', 'Period (from-to)', 'Submission date', 'Claim amount', 'Status'],
        hasTable: true,
        hasChart: false,
        footer: contract?.contract_number || 'Contract'
      });
    } else if (reportType === 'financial') {
      // Payment timeline always shown
      pages.push({
        title: 'Payment Timeline',
        orientation: 'portrait',
        contentItems: ['Claim number', 'Date', 'Amount', 'Certified', 'Retention', 'Status'],
        hasTable: true,
        hasChart: false,
        footer: contract?.contract_number || 'Contract'
      });
    } else if (reportType === 'diary') {
      // All diaries always shown
      pages.push({
        title: 'All Diaries',
        orientation: 'portrait',
        contentItems: ['Date', 'Weather', 'Temperature', 'Manpower', 'Photos', 'Status'],
        hasTable: true,
        hasChart: false,
        footer: contract?.contract_number || 'Contract'
      });
    }

    return pages;
  };

  const previewPages = getPreviewPages();

  // Get label text based on report type
  const getChartLabel = () => {
    if (reportType === 'boq') return 'Status Chart';
    if (reportType === 'claims') return 'Claims by Status Chart';
    if (reportType === 'financial') return 'Cumulative Chart';
    if (reportType === 'diary') return 'Weather Chart';
    return 'Chart';
  };

  const getProgressLabel = () => {
    if (reportType === 'boq') return 'Section Progress';
    if (reportType === 'claims') return 'Monthly Trend Chart';
    if (reportType === 'financial') return 'Monthly Breakdown Chart';
    if (reportType === 'diary') return 'Manpower Chart';
    return 'Progress';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Export to PDF</h2>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">{reportType.toUpperCase()}</span> Report - {contract?.project_name || 'N/A'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">

            {/* LEFT: SETTINGS */}
            <div className="space-y-6">
              
              {exportError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {exportError}
                  </p>
                </div>
              )}

              {/* CONTENT SECTIONS */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Content Sections
                </h3>
                <div className="pl-7 space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={settings.content.includeSummary}
                      onChange={() => toggle('content.includeSummary')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Summary Table</span>
                  </label>

                  {/* CHART 1 - ALL REPORTS */}
                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={settings.content.includeStatusChart}
                      onChange={() => toggle('content.includeStatusChart')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{getChartLabel()}</span>
                  </label>

                  {/* CHART 2 / SECTION PROGRESS */}
                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={settings.content.includeSectionProgress}
                      onChange={() => toggle('content.includeSectionProgress')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{getProgressLabel()}</span>
                  </label>

                  {/* ITEM DETAILS - BOQ ONLY */}
                  {reportType === 'boq' && (
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={settings.content.includeItemDetails}
                        onChange={() => toggle('content.includeItemDetails')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        Item Details <span className="text-xs text-gray-500">(detailed)</span>
                      </span>
                    </label>
                  )}

                  {/* NOTE FOR NON-BOQ REPORTS */}
                  {reportType !== 'boq' && (
                    <div className="text-xs text-gray-500 italic pl-2 pt-1">
                      * {reportType === 'claims' ? 'Claims list' : reportType === 'financial' ? 'Payment timeline' : 'All diaries'} always included
                    </div>
                  )}
                </div>
              </div>

              {/* HEADER / FOOTER */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Header & Footer
                </h3>
                <div className="pl-7 space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={settings.header.showContractInfo}
                      onChange={() => toggle('header.showContractInfo')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Contract Info</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={settings.footer.showPageNumbers}
                      onChange={() => toggle('footer.showPageNumbers')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Page Numbers</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={settings.footer.showGeneratedDate}
                      onChange={() => toggle('footer.showGeneratedDate')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Generated Date</span>
                  </label>
                </div>
              </div>

              {/* FILENAME PREVIEW */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs font-medium text-blue-800 mb-1">Output filename:</div>
                <div className="text-sm font-mono text-blue-900 break-all">
                  {reportType.toUpperCase()}_{contract?.contract_number || 'CONTRACT'}_{new Date().toISOString().split('T')[0]}.pdf
                </div>
              </div>

            </div>

            {/* RIGHT: VISUAL PREVIEW */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Page Preview
              </h3>
              
              <ReportPagePreview pages={previewPages} />
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || previewPages.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>Generate PDF</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UniversalExportModal;
