import React, { useState } from 'react';
import ReportPreview from './ReportPreview';
import ReportSettingsPanel from './ReportSettingsPanel';

import BOQSummaryPreview from './previewPages/BOQSummaryPreview';
import BOQStatusChartPreview from './previewPages/BOQStatusChartPreview';
import BOQSectionsPreview from './previewPages/BOQSectionsPreview';
import { buildBOQPdf } from '../../lib/reports/boqPdfBuilder';

const ExportBOQModal = ({ data, onClose }) => {
  const [settings, setSettings] = useState({
    includeSummary: true,
    includeStatusChart: true,
    includeSections: true,
    includeItems: false
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleGeneratePDF = async () => {
    const doc = await buildBOQPdf({
        data,
        settings
    });

    doc.save(`BOQ_Progress_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white w-[95%] h-[95%] rounded-lg shadow-xl flex overflow-hidden">

        {/* LEFT: SETTINGS */}
        <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">
            Export BOQ Report
          </h2>

          <ReportSettingsPanel
            settings={settings}
            onToggle={handleToggle}
          />

          <div className="mt-6 space-y-2">
            <button
              onClick={handleGeneratePDF}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              📄 Generate PDF
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="flex-1 bg-gray-100 overflow-auto p-6">
          <ReportPreview>

            {settings.includeSummary && (
              <BOQSummaryPreview data={data} />
            )}

            {settings.includeStatusChart && (
              <BOQStatusChartPreview data={data} />
            )}

            {settings.includeSections && (
              <BOQSectionsPreview data={data} />
            )}

            {!settings.includeSummary &&
             !settings.includeStatusChart &&
             !settings.includeSections && (
              <div className="text-center text-gray-400 mt-20">
                No sections selected for preview
              </div>
            )}

          </ReportPreview>
        </div>

      </div>
    </div>
  );
};

export default ExportBOQModal;
