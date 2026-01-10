import { useState, useEffect } from 'react';
import { BOQ_REPORT_PAGES } from '../../lib/reports/BOQReportSpec';
import { generateBOQPDF } from '../../lib/reports/boqPdfBuilder';
import ReportSettingsPanel from '../../components/reports/ReportSettingsPanel';
import ReportPreview from '../../components/reports/ReportPreview';
import { getBOQProgressReportData } from '../../services/reportService';

const BOQProgressReport = ({ contractId }) => {
  const [pages, setPages] = useState(BOQ_REPORT_PAGES);
  const [data, setData] = useState(null);

  useEffect(() => {
    getBOQProgressReportData(contractId).then(setData);
  }, [contractId]);

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <ReportSettingsPanel pages={pages} setPages={setPages} />

      <ReportPreview pages={pages} reportData={data} />

      <button
        className="bg-red-600 text-white px-4 py-2 rounded"
        onClick={() => generateBOQPDF(pages, data)}
      >
        📄 Export PDF
      </button>
    </div>
  );
};

export default BOQProgressReport;
