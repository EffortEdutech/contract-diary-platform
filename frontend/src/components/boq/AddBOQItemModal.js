// frontend/src/components/boq/AddBOQItemModal.js - ENHANCED WITH SECTION SUPPORT
import React, { useState } from 'react';
import { createBOQItem, validateBOQItem } from '../../services/boqService';

function AddBOQItemModal({ isOpen, onClose, boqId, sections = [], onItemAdded }) {
  const [formData, setFormData] = useState({
    item_number: '',
    description: '',
    item_type: 'material',
    unit: 'm³',
    quantity: '',
    unit_rate: '',
    section_id: '', // NEW: Section selection
    specifications: '',
    notes: ''
  });

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Malaysian construction units
  const units = ['m²', 'm³', 'm', 'kg', 'ton', 'pcs', 'day', 'hour', 'lot', 'sum'];
  const itemTypes = [
    { value: 'material', label: 'Material' },
    { value: 'labor', label: 'Labor' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'subcontractor', label: 'Subcontractor' }
  ];

  // Calculate amount in real-time
  const calculatedAmount = formData.quantity && formData.unit_rate
    ? parseFloat(formData.quantity) * parseFloat(formData.unit_rate)
    : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
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
      // Create BOQ item
      const result = await createBOQItem({
        boq_id: boqId,
        section_id: formData.section_id || null, // NEW: Include section_id
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
        // Reset form
        setFormData({
          item_number: '',
          description: '',
          item_type: 'material',
          unit: 'm³',
          quantity: '',
          unit_rate: '',
          section_id: '',
          specifications: '',
          notes: ''
        });

        // Notify parent to refresh list
        onItemAdded();

        // Close modal
        onClose();
      } else {
        setErrors([result.error]);
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setErrors([err.message || 'Failed to add item']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form and errors
    setFormData({
      item_number: '',
      description: '',
      item_type: 'material',
      unit: 'm³',
      quantity: '',
      unit_rate: '',
      section_id: '',
      specifications: '',
      notes: ''
    });
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900">Add BOQ Item</h3>
          <p className="text-sm text-gray-500 mt-1">Fill in the item details below</p>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Row 1: Item Number and Section */}
            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., A.1.1, B.2.3"
                  required
                />
              </div>

              {/* Section (Optional) - NEW */}
              {sections && sections.length > 0 && (
                <div>
                  <label htmlFor="section_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Section <span className="text-gray-400">(Optional)</span>
                  </label>
                  <select
                    id="section_id"
                    name="section_id"
                    value={formData.section_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        Section {section.section_number}: {section.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Excavation for foundation, Concrete Grade 30"
                required
              />
            </div>

            {/* Row 2: Item Type and Unit */}
            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {itemTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Quantity and Unit Rate */}
            <div className="grid grid-cols-2 gap-4">
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
                  step="0.001"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.000"
                  required
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
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Calculated Amount Display */}
            {calculatedAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Calculated Amount:</span>
                  <span className="text-lg font-bold text-blue-900">
                    RM {calculatedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

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
                  Adding...
                </>
              ) : (
                '+ Add Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBOQItemModal;
