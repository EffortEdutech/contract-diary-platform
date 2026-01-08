import React from 'react';

const ReportPreview = ({ reportType, data, contract, settings }) => {
  console.log('REPORT PREVIEW RAW DATA >>>', data);

  return (
    <div className="text-xs space-y-4">

      <div className="border p-2 bg-yellow-50">
        <div><strong>Report Type:</strong> {reportType}</div>
        <div><strong>Has Data:</strong> {data ? 'YES' : 'NO'}</div>
        <div><strong>Data Keys:</strong> {data ? Object.keys(data).join(', ') : 'NONE'}</div>
      </div>

      <pre className="border p-2 bg-gray-100 overflow-auto max-h-[300px]">
        {JSON.stringify(data, null, 2)}
      </pre>

    </div>
  );
};

export default ReportPreview;
