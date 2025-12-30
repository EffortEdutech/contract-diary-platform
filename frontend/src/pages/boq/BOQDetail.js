import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBOQById, calculateBOQSummary, updateBOQStatus, getBOQItems, deleteBOQItem } from '../../services/boqService';
import AddBOQItemModal from '../../components/boq/AddBOQItemModal';
import EditBOQItemModal from '../../components/boq/EditBOQItemModal';

function BOQDetail() {
  const { boqId } = useParams();
  const navigate = useNavigate();

  const [boq, setBoq] = useState(null);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

        // Fetch items
        await fetchItems();
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

  const fetchItems = async () => {
    try {
      const itemsResult = await getBOQItems(boqId);
      if (itemsResult.success) {
        setItems(itemsResult.data);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const handleItemAdded = async () => {
    // Refresh items and summary after adding new item
    await fetchItems();
    
    // Recalculate summary
    const summaryResult = await calculateBOQSummary(boqId, 6);
    if (summaryResult.success) {
      setSummary(summaryResult.data);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditItemModal(true);
  };

  const handleItemUpdated = async () => {
    // Refresh items and summary after updating item
    await fetchItems();
    
    // Recalculate summary
    const summaryResult = await calculateBOQSummary(boqId, 6);
    if (summaryResult.success) {
      setSummary(summaryResult.data);
    }
    
    // Close modal and clear selection
    setShowEditItemModal(false);
    setSelectedItem(null);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    
    try {
      const result = await deleteBOQItem(itemToDelete.id);
      
      if (result.success) {
        // Refresh items and summary
        await fetchItems();
        
        // Recalculate summary
        const summaryResult = await calculateBOQSummary(boqId, 6);
        if (summaryResult.success) {
          setSummary(summaryResult.data);
        }
        
        // Close modal and clear selection
        setShowDeleteModal(false);
        setItemToDelete(null);
      } else {
        alert('Failed to delete item: ' + result.error);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
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

  const formatNumber = (number, decimals = 3) => {
    return parseFloat(number).toLocaleString('en-MY', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const getItemTypeBadgeColor = (type) => {
    switch (type) {
      case 'material':
        return 'bg-purple-100 text-purple-800';
      case 'labor':
        return 'bg-blue-100 text-blue-800';
      case 'equipment':
        return 'bg-orange-100 text-orange-800';
      case 'subcontractor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={`/contracts/${boq.contract?.id}/boq`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 inline-block"
            >
              ← Back to BOQ List
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{boq.title}</h1>
            <p className="text-gray-600 mt-1">BOQ Number: {boq.boq_number}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(boq.status)}`}>
              {boq.status.charAt(0).toUpperCase() + boq.status.slice(1)}
            </span>
            {boq.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('approved')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
              >
                Approve BOQ
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

      {/* BOQ Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Basic Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">BOQ Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Contract</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {boq.contract?.contract_number} - {boq.contract?.project_name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Currency</dt>
              <dd className="mt-1 text-sm text-gray-900">{boq.currency || 'MYR'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{boq.description || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(boq.created_at).toLocaleDateString('en-MY')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Statistics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
          {summary && (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Items</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">{summary.totalItems}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Quantity</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  {formatNumber(summary.totalQuantity, 2)}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* Financial Summary */}
        {summary && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Subtotal</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(summary.subtotal)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">SST (6%)</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(summary.sst)}
                </dd>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500">Grand Total</dt>
                <dd className="mt-1 text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.grandTotal)}
                </dd>
              </div>
            </dl>

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
          <h3 className="text-lg font-semibold text-gray-900">BOQ Items ({items.length})</h3>
          {boq.status === 'draft' && (
            <button 
              onClick={() => setShowAddItemModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  {boq.status === 'draft' && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{item.description}</div>
                        {item.specifications && (
                          <div className="text-xs text-gray-500 mt-1">
                            Specs: {item.specifications.substring(0, 100)}
                            {item.specifications.length > 100 && '...'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getItemTypeBadgeColor(item.item_type)}`}>
                        {item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.unit_rate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                    {boq.status === 'draft' && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900 font-medium transition"
                            title="Edit item"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900 font-medium transition"
                            title="Delete item"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
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
              <button
                onClick={() => setShowAddItemModal(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add First Item
              </button>
            )}
          </div>
        )}

        {/* Info Message for Approved BOQ */}
        {boq.status === 'approved' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This BOQ is approved. Items cannot be added, edited, or deleted.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AddBOQItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        boqId={boqId}
        onItemAdded={handleItemAdded}
      />

      {/* Edit Item Modal */}
      <EditBOQItemModal
        isOpen={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onItemUpdated={handleItemUpdated}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete BOQ Item
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>

              {/* Item Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-700">Item Number:</dt>
                    <dd className="text-gray-900">{itemToDelete.item_number}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-700">Description:</dt>
                    <dd className="text-gray-900 text-right ml-4">{itemToDelete.description}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-700">Type:</dt>
                    <dd className="text-gray-900 capitalize">{itemToDelete.item_type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-700">Amount:</dt>
                    <dd className="text-gray-900 font-semibold">
                      {formatCurrency(itemToDelete.amount)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      BOQ totals will be recalculated automatically after deletion.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Item
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BOQDetail;
