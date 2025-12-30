import React, { useState, useEffect } from 'react';
import { updateBOQItem, validateBOQItem } from '../../services/boqService';

function EditBOQItemModal({ isOpen, onClose, item, onItemUpdated }) {
  const [formData, setFormData] = useState({
    item_number: '',
    description: '',
    item_type: 'material',
    unit: 'm²',
    quantity: '',
    unit_rate: '',
    specifications: '',
    notes: ''
  });

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Item type options
  const itemTypes = [
    { value: 'material', label: 'Material' },
    { value: 'labor', label: 'Labor' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'subcontractor', label: 'Subcontractor' }
  ];

  // Common construction units
  const units = [
    'm²',   // Square meter
    'm³',   // Cubic meter
    'm',    // Meter
    'kg',   // Kilogram
    'ton',  // Ton
    'pcs',  // Pieces
    'set',  // Set
    'day',  // Day
    'hour', // Hour
    'lump sum', // Lump sum
    'lot'   // Lot
  ];

  // Pre-fill form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        item_number: item.item_number || '',
        description: item.description || '',
        item_type: item.item_type || 'material',
        unit: item.unit || 'm²',
        quantity: item.quantity?.toString() || '',
        unit_rate: item.unit_rate?.toString() || '',
        specifications: item.specifications || '',
        notes: item.notes || ''
      });
    }
  }, [item]);

  // Calculate amount automatically
  const calculatedAmount = formData.quantity && formData.unit_rate 
    ? parseFloat(formData.quantity) * parseFloat(formData.unit_rate) 
    : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    
    // Validate form data
    const validation = validateBOQItem(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    
    try {
      // Update BOQ item
      const result = await updateBOQItem(item.id, {
        item_number: formData.item_number,
        description: formData.description,
        item_type: formData.item_type,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        unit_rate: parseFloat(formData.unit_rate),
        specifications: formData.specifications || null,
        notes: formData.notes || null
      });

      if (result.success) {
        // Notify parent to refresh list
        onItemUpdated();
        
        // Close modal
        onClose();
      } else {
        setErrors([result.error]);
      }
    } catch (err) {
      console.error('Error updating item:', err);
      setErrors([err.message || 'Failed to update item']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset errors and close
    setErrors([]);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              Edit BOQ Item
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {/* Row 1: Item Number and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Number */}
              <div>
                <label htmlFor="item_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="item_number"
                  name="item_number"
                  value={formData.item_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., A.1.1"
                />
              </div>

              {/* Item Type */}
              <div>
                <label htmlFor="item_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="item_type"
                  name="item_type"
                  value={formData.item_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {itemTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed description of the item"
              />
            </div>

            {/* Row 2: Unit, Quantity, Rate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Unit */}
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  step="0.001"
                  min="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Unit Rate */}
              <div>
                <label htmlFor="unit_rate" className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Rate (RM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="unit_rate"
                  name="unit_rate"
                  value={formData.unit_rate}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Calculated Amount Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Updated Amount:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  RM {calculatedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Quantity × Unit Rate = Amount
              </p>
            </div>

            {/* Specifications (Optional) */}
            <div>
              <label htmlFor="specifications" className="block text-sm font-medium text-gray-700 mb-1">
                Specifications <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                id="specifications"
                name="specifications"
                value={formData.specifications}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Technical specifications, standards, etc."
              />
            </div>

            {/* Notes (Optional) */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes or comments"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditBOQItemModal;
