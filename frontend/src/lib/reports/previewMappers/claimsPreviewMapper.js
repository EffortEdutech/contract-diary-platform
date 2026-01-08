export function mapClaimsPreview(data) {
  return {
    summary: {
      totalClaims: data?.summary?.totalClaims ?? 0,
      approvedAmount: data?.summary?.approvedAmount ?? 0,
      pendingAmount: data?.summary?.pendingAmount ?? 0,
      rejectedAmount: data?.summary?.rejectedAmount ?? 0
    },

    items: (data?.claims || []).map(c => ({
      ref: c.reference_no,
      title: c.title,
      amount: c.claim_amount,
      status: c.status
    }))
  };
}
