import React from 'react';

const BOQSummaryPreview = ({ data }) => {
  if (!data) return null;

  return (
    <div className="border mb-4 p-3">
      <h4 className="font-semibold mb-2">BOQ Summary</h4>

      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr><td>Total Items</td><td>{data.totalItems}</td></tr>
          <tr><td>Completed</td><td>{data.completed}</td></tr>
          <tr><td>In Progress</td><td>{data.inProgress}</td></tr>
          <tr><td>Not Started</td><td>{data.notStarted}</td></tr>
          <tr><td>Completion</td><td>{data.completionPercentage}%</td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default BOQSummaryPreview;
