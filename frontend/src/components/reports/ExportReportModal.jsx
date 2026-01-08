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
     EXPORT SETTINGS (SINGLE SOURCE)
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

  /* =========================
     EARLY EXIT (AFTER HOOKS)
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
    let doc;

    if (reportType === 'boq') {
      doc = await buildBOQPdf({
        data: reportData,
        settings,
        contract
      });
    }

    if (reportType === 'claims') {
      doc = await buildClaimsPdf({
        data: reportData,
        settings,
        contract
      });
    }

    if (doc) {
      doc.save(`${reportType}_report.pdf`);
    }
  };

    console.log('EXPORT MODAL DATA', {
        reportType,
        reportData,
        contract
    });

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-6xl rounded-lg shadow-lg p-6 space-y-4">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Export Report</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-3 gap-6">

          {/* CONTENT SETTINGS */}
          <div className="space-y-3">
            <h3 className="font-medium">Content</h3>

            <label className="block">
              <input
                type="checkbox"
                checked={settings.content.includeSummary}
                onChange={() => toggle('content.includeSummary')}
              /> Summary
            </label>

            {reportType === 'boq' && (
              <>
                <label className="block">
                  <input
                    type="checkbox"
                    checked={settings.content.includeStatusChart}
                    onChange={() => toggle('content.includeStatusChart')}
                  /> Status Chart
                </label>

                <label className="block">
                  <input
                    type="checkbox"
                    checked={settings.content.includeSections}
                    onChange={() => toggle('content.includeSections')}
                  /> Section Progress
                </label>
              </>
            )}

            {(reportType === 'boq' || reportType === 'claims') && (
              <label className="block">
                <input
                  type="checkbox"
                  checked={settings.content.includeItems}
                  onChange={() => toggle('content.includeItems')}
                /> Item Details
              </label>
            )}
          </div>

          {/* HEADER / FOOTER SETTINGS */}
          <div className="space-y-3">
            <h3 className="font-medium">Header / Footer</h3>

            <label className="block">
              <input
                type="checkbox"
                checked={settings.header.showContractInfo}
                onChange={() => toggle('header.showContractInfo')}
              /> Contract Info
            </label>

            <label className="block">
              <input
                type="checkbox"
                checked={settings.footer.showPageNumber}
                onChange={() => toggle('footer.showPageNumber')}
              /> Page Number
            </label>
          </div>

          {/* PREVIEW (PRINTABLE HTML, NOT INTERACTIVE PAGE) */}
          <div className="border rounded p-2 max-h-[70vh] overflow-y-auto bg-gray-50">
            <h3 className="font-medium mb-2">PDF Preview</h3>

            <ReportPreview
              reportType={reportType}
              data={reportData}
              contract={contract}
              settings={settings}
            />
          </div>

        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Export PDF
          </button>
        </div>

      </div>
    </div>
  );




};

export default ExportReportModal;
