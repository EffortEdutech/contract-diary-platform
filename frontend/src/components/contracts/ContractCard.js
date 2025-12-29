import React from 'react';

function ContractCard({ contract, onClick }) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    suspended: 'bg-red-100 text-red-800'
  };

  const contractTypeLabels = {
    PWD_203A: 'PWD 203A',
    PAM_2018: 'PAM 2018',
    IEM: 'IEM',
    CIDB: 'CIDB',
    JKR_DB: 'JKR DB'
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {contract.project_name}
          </h3>
          <p className="text-sm text-gray-500">{contract.contract_number}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[contract.status]}`}>
          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
        </span>
      </div>

      {/* Contract Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {contract.location}
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {contractTypeLabels[contract.contract_type]}
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
        </div>
      </div>

      {/* Contract Value */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Contract Value</span>
          <span className="text-lg font-bold text-blue-600">
            {formatCurrency(contract.contract_value)}
          </span>
        </div>
      </div>

      {/* Client */}
      <div className="mt-3 text-sm text-gray-500">
        Client: <span className="text-gray-700 font-medium">{contract.client_name}</span>
      </div>
    </div>
  );
}

export default ContractCard;