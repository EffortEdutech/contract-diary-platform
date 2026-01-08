const ClaimsSummaryPreview = ({ model }) => {
  if (!model?.summary) return null;

  const s = model.summary;

  return (
    <div className="border p-3 text-sm">
      <h4 className="font-semibold mb-2">Claims Summary</h4>
      <div>Total Claims: {s.totalClaims}</div>
      <div>Approved: RM {s.approvedAmount}</div>
      <div>Pending: RM {s.pendingAmount}</div>
      <div>Rejected: RM {s.rejectedAmount}</div>
    </div>
  );
};

export default ClaimsSummaryPreview;
