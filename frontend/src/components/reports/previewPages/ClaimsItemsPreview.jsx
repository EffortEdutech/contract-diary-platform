const ClaimsItemsPreview = ({ model }) => {
  if (!model?.items?.length) return null;

  return (
    <div className="border p-3 mt-2 text-sm">
      <h4 className="font-semibold mb-2">Claim Items</h4>
      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Title</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {model.items.map((i, idx) => (
            <tr key={idx}>
              <td>{i.ref}</td>
              <td>{i.title}</td>
              <td>{i.amount}</td>
              <td>{i.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClaimsItemsPreview;
