// frontend/src/components/reports/ExportReportModal.jsx
// Universal Export Report Modal with Preview and Settings

import React, { useState } from 'react';
import ReportPreview from './ReportPreview';
import { buildBOQPdf } from '../../lib/reports/boqPdfBuilder';
import { buildClaimsPdf } from '../../lib/reports/claimsPdfBuilder';

const ExportReportModal = ({
  open,
  onClose,
  reportType,   // 'boq' | 'claims' | 'financial'
  reportData,
  contract
}) => {

  /* =========================
     EXPORT SETTINGS
  ========================= */
  const [settings, setSettings] = useState({
    content: {
      includeSummary: true,
      includeStatusChart: true,   // BOQ only
      includeSections: true,      // BOQ only
      includeItems: false         // BOQ + Claims
    },
    header: {
      title: '',
      showContractInfo: true,
      showLogo: false
    },
    footer: {
      showPageNumber: true,
      showGeneratedDate: true
    }
  });

  const [isExporting, setIsExporting] = useState(false);

  /* =========================
     EARLY EXIT
  ========================= */
  if (!open) return null;

  /* =========================
     TOGGLE HELPER
  ========================= */
  const toggle = (path) => {
    setSettings(prev => {
      const updated = structuredClone(prev);
      const keys = path.split('.');
      let ref = updated;
      keys.slice(0, -1).forEach(k => (ref = ref[k]));
      ref[keys.at(-1)] = !ref[keys.at(-1)];
      return updated;
    });
  };

  /* =========================
     PDF EXPORT
  ========================= */
  const handleExport = async () => {
    setIsExporting(true);

    try {
      let doc;

      if (reportType === 'boq') {
        doc = await buildBOQPdf({
          data: reportData,
          settings,
          contract
        });
      } else if (reportType === 'claims') {
        doc = await buildClaimsPdf({
          data: reportData,
          settings,
          contract
        });
      }

      if (doc) {
        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const contractNo = contract?.contract_number || 'CONTRACT';
        const filename = `${reportType.toUpperCase()}_Report_${contractNo}_${timestamp}.pdf`;
        
        doc.save(filename);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /* =========================
     PREVIEW SUMMARY DATA
  ========================= */
  const renderPreviewSummary = () => {
    if (reportType === 'boq' && reportData?.summary) {
      const s = reportData.summary;
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Total Items:</span><span className="font-medium">{s.total || 0}</span></div>
          <div className="flex justify-between"><span>Completed:</span><span className="font-medium text-green-600">{s.completed || 0}</span></div>
          <div className="flex justify-between"><span>In Progress:</span><span className="font-medium text-yellow-600">{s.inProgress || 0}</span></div>
          <div className="flex justify-between"><span>Not Started:</span><span className="font-medium text-gray-600">{s.notStarted || 0}</span></div>
          <div className="flex justify-between pt-2 border-t"><span>Progress:</span><span className="font-bold text-blue-600">{s.completionPercentage || 0}%</span></div>
        </div>
      );
    }

    if (reportType === 'claims' && reportData?.claim) {
      const c = reportData.claim;
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Claim No:</span><span className="font-medium">{c.claim_number}</span></div>
          <div className="flex justify-between"><span>Title:</span><span className="font-medium">{c.claim_title}</span></div>
          <div className="flex justify-between"><span>Status:</span><span className="font-medium uppercase">{c.status}</span></div>
        </div>
      );
    }

    return <div className="text-sm text-gray-500">No preview available</div>;
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            Export {reportType.toUpperCase()} Report
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* BODY - SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* LEFT: SETTINGS */}
            <div className="space-y-6">
              
              {/* CONTENT SETTINGS */}
              <div>
                <h3 className="font-medium mb-3 text-gray-900">Report Content</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.content.includeSummary}
                      onChange={() => toggle('content.includeSummary')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Summary</span>
                  </label>

                  {reportType === 'boq' && (
                    <>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.content.includeStatusChart}
                          onChange={() => toggle('content.includeStatusChart')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Status Chart</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.content.includeSections}
                          onChange={() => toggle('content.includeSections')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Section Progress</span>
                      </label>
                    </>
                  )}

                  {(reportType === 'boq' || reportType === 'claims') && (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.content.includeItems}
                        onChange={() => toggle('content.includeItems')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">Item Details</span>
                    </label>
                  )}
                </div>
              </div>

              {/* HEADER / FOOTER SETTINGS */}
              <div>
                <h3 className="font-medium mb-3 text-gray-900">Header / Footer</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.header.showContractInfo}
                      onChange={() => toggle('header.showContractInfo')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Contract Info</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.footer.showPageNumber}
                      onChange={() => toggle('footer.showPageNumber')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Page Numbers</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.footer.showGeneratedDate}
                      onChange={() => toggle('footer.showGeneratedDate')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Generated Date</span>
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="md:col-span-2">
              <h3 className="font-medium mb-3 text-gray-900">Preview</h3>
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px]">
                <div className="bg-white rounded shadow-sm p-4">
                  <h4 className="font-semibold mb-4 text-center text-lg">
                    {reportType.toUpperCase()} Report
                  </h4>
                  {renderPreviewSummary()}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER - ACTIONS */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportReportModal;
