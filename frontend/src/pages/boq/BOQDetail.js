import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBOQById, calculateBOQSummary, updateBOQStatus } from '../../services/boqService';

function BOQDetail() {
  const { boqId } = useParams();
  const navigate = useNavigate();

  const [boq, setBoq] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBOQData();
  }, [boqId]);

  const fetchBOQData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch BOQ with full details
      const boqResult = await getBOQById(boqId);
      if (boqResult.success) {
        setBoq(boqResult.data);

        // Calculate summary with SST
        const summaryResult = await calculateBOQSummary(boqId, 6); // 6% SST
        if (summaryResult.success) {
          setSummary(summaryResult.data);
        }
      } else {
        setError(boqResult.error);
      }
    } catch (err) {
      console.error('Error fetching BOQ:', err);
      setError(err.message || 'Failed to load BOQ data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const result = await updateBOQStatus(boqId, newStatus);
      if (result.success) {
        fetchBOQData(); // Refresh data
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'locked':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!boq) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          BOQ not found or you don't have permission to view it.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Link to="/contracts" className="hover:text-blue-600">Contracts</Link>
          <span className="mx-2">/</span>
          <Link to={`/contracts/${boq.contract?.id}`} className="hover:text-blue-600">
            {boq.contract?.contract_number}
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/contracts/${boq.contract?.id}/boq`} className="hover:text-blue-600">
            BOQ
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{boq.boq_number}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">{boq.boq_number}</h1>
              <span className={`ml-3 px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(boq.status)}`}>
                {boq.status}
              </span>
            </div>
            <h2 className="text-xl text-gray-700 mt-1">{boq.title}</h2>
            <p className="text-gray-600 mt-1">{boq.contract?.project_name}</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {boq.status === 'draft' && (
              <>
                <button
                  onClick={() => handleStatusChange('approved')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Approve BOQ
                </button>
                <button
                  onClick={() => navigate(`/contracts/${boq.contract_id}/boq`)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
                >
                  Back to List
                </button>
              </>
            )}
            {boq.status === 'approved' && (
              <button
                onClick={() => handleStatusChange('locked')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Lock BOQ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* BOQ Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Details Card */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">BOQ Details</h3>
          
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">BOQ Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{boq.boq_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Currency</dt>
              <dd className="mt-1 text-sm text-gray-900">{boq.currency}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Items</dt>
              <dd className="mt-1 text-sm text-gray-900">{boq.total_items}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(boq.created_at).toLocaleDateString('en-MY')}
              </dd>
            </div>
            {boq.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{boq.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Summary Card */}
        {summary && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SST ({summary.sstRate}% on materials):</span>
                <span className="font-medium text-gray-900">{formatCurrency(summary.sst)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(summary.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Breakdown by Type</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Materials:</span>
                  <span className="text-gray-900">{formatCurrency(summary.byType.material)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Labor:</span>
                  <span className="text-gray-900">{formatCurrency(summary.byType.labor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Equipment:</span>
                  <span className="text-gray-900">{formatCurrency(summary.byType.equipment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subcontractor:</span>
                  <span className="text-gray-900">{formatCurrency(summary.byType.subcontractor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">BOQ Items</h3>
          {boq.status === 'draft' && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
              + Add Item
            </button>
          )}
        </div>

        {boq.items && boq.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {boq.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{item.item_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unit_rate)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding items to this BOQ.
            </p>
            {boq.status === 'draft' && (
              <div className="mt-6">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
                  + Add First Item
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BOQDetail;