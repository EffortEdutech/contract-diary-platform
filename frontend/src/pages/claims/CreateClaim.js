// ============================================
// CREATE CLAIM - New Progress Claim Form
// ============================================
// Purpose: Create new progress claim with BOQ item selection
// Features: Period selection, BOQ item picker, cumulative tracking, real-time calculations
// Created: 2025-12-31
// Session: 9 - Progress Claims Module (Phase 4A)
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { supabase } from '../../lib/supabase';
import {
  createClaim,
  addClaimItem,
  getAvailableBoqItems,
  formatCurrency
} from '../../services/claimService';

const CreateClaim = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    claim_title: '',
    claim_period_from: '',
    claim_period_to: '',
    notes: ''
  });

  // BOQ items state
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]); // Array of { boq_item_id, quantity_claimed, work_description }
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [contract, setContract] = useState(null);

  // Build breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: `/contracts/${contractId}` },
    { label: 'Claims', href: `/contracts/${contractId}/claims` },
    { label: 'Create New Claim', href: null }
  ];
  
  // Load available BOQ items
  useEffect(() => {
    if (contractId) {
      loadAvailableItems();
    }
  }, [contractId]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadAvailableItems = async () => {
    try {
      setLoading(true);
      
      // Load contract details
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);
      
      const items = await getAvailableBoqItems(contractId);
      setAvailableItems(items);
    } catch (err) {
      console.error('Error loading BOQ items:', err);
      setError('Failed to load BOQ items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = (boqItem) => {
    // Check if item already added
    if (selectedItems.find(item => item.boq_item_id === boqItem.id)) {
      alert('This item is already added to the claim');
      return;
    }

    // Add item with default quantity
    setSelectedItems(prev => [...prev, {
      boq_item_id: boqItem.id,
      boq_item: boqItem, // Store full item for display
      quantity_claimed: 0,
      work_description: ''
    }]);

    setShowItemPicker(false);
  };

  const handleRemoveItem = (boqItemId) => {
    setSelectedItems(prev => prev.filter(item => item.boq_item_id !== boqItemId));
  };

  const handleItemQuantityChange = (boqItemId, quantity) => {
    setSelectedItems(prev => prev.map(item =>
      item.boq_item_id === boqItemId
        ? { ...item, quantity_claimed: parseFloat(quantity) || 0 }
        : item
    ));
  };

  const handleItemDescriptionChange = (boqItemId, description) => {
    setSelectedItems(prev => prev.map(item =>
      item.boq_item_id === boqItemId
        ? { ...item, work_description: description }
        : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.claim_period_from || !formData.claim_period_to) {
      alert('Please select claim period');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Please add at least one BOQ item to the claim');
      return;
    }

    // Check all items have quantity
    const invalidItems = selectedItems.filter(item => !item.quantity_claimed || item.quantity_claimed <= 0);
    if (invalidItems.length > 0) {
      alert('Please enter quantity for all items');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create claim
      const newClaim = await createClaim({
        contract_id: contractId,
        claim_title: formData.claim_title || `Progress Claim - ${formData.claim_period_from}`,
        claim_period_from: formData.claim_period_from,
        claim_period_to: formData.claim_period_to,
        notes: formData.notes
      });

      // Add items to claim
      for (const item of selectedItems) {
        await addClaimItem(newClaim.id, {
          boq_item_id: item.boq_item_id,
          quantity_claimed: item.quantity_claimed,
          work_description: item.work_description
        });
      }

      // Navigate to claim detail
      navigate(`/contracts/${contractId}/claims/${newClaim.id}`);

    } catch (err) {
      console.error('Error creating claim:', err);
      setError('Failed to create claim: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // CALCULATIONS
  // ============================================

  const calculateTotalAmount = () => {
    return selectedItems.reduce((total, item) => {
      const amount = item.quantity_claimed * item.boq_item.unit_rate;
      return total + amount;
    }, 0);
  };

  // ============================================
  // FILTER BOQ ITEMS
  // ============================================

  const filteredAvailableItems = availableItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.item_number || '').toLowerCase().includes(searchLower) ||
      (item.description || '').toLowerCase().includes(searchLower) ||
      (item.boq_section?.title || '').toLowerCase().includes(searchLower)
    );
  });

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={breadcrumbItems} />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Progress Claim</h1>
            <p className="text-gray-600 mt-1">Create a new payment claim with BOQ items</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Claim Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claim Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Title
              </label>
              <input
                type="text"
                name="claim_title"
                value={formData.claim_title}
                onChange={handleInputChange}
                placeholder="e.g., Progress Claim #1 - January 2026"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Period From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="claim_period_from"
                value={formData.claim_period_from}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Period To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period To <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="claim_period_to"
                value={formData.claim_period_to}
                onChange={handleInputChange}
                required
                min={formData.claim_period_from}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes or remarks..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Claim Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Claim Items</h2>
            <button
              type="button"
              onClick={() => setShowItemPicker(!showItemPicker)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add BOQ Item
            </button>
          </div>

          {/* BOQ Item Picker */}
          {showItemPicker && (
            <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search BOQ items..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredAvailableItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No BOQ items found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableItems.map(item => (
                      <div
                        key={item.id}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer"
                        onClick={() => handleAddItem(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{item.item_no}</span>
                              <span className="text-xs text-gray-500">{item.boq_section?.title}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-600">
                              <span>Qty: {item.quantity} {item.unit}</span>
                              <span>Rate: {formatCurrency(item.unit_rate)}</span>
                              <span>Progress: {item.percentage_complete.toFixed(1)}%</span>
                              <span>Remaining: {item.remaining_quantity.toFixed(2)} {item.unit}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="ml-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Items */}
          {selectedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No items added yet. Click "Add BOQ Item" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">This Claim</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedItems.map(item => {
                    const amount = item.quantity_claimed * item.boq_item.unit_rate;
                    return (
                      <tr key={item.boq_item_id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.boq_item.item_no}</p>
                            <p className="text-sm text-gray-500">{item.boq_item.description}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.boq_item.claimed_quantity.toFixed(2)} {item.boq_item.unit}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity_claimed || ''}
                            onChange={(e) => handleItemQuantityChange(item.boq_item_id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                          <span className="ml-1 text-sm text-gray-500">{item.boq_item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(item.boq_item.unit_rate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          {formatCurrency(amount)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.work_description}
                            onChange={(e) => handleItemDescriptionChange(item.boq_item_id, e.target.value)}
                            placeholder="Work description..."
                            className="w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.boq_item_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          {selectedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Claim Amount:</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateTotalAmount())}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/contracts/${contractId}/claims`)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || selectedItems.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Claim'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClaim;
