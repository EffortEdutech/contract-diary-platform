import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

function ContractForm({ onSuccess, existingContract = null }) {
  const { user } = useAuth();
  const isEditing = !!existingContract;

  const [formData, setFormData] = useState({
    contract_number: existingContract?.contract_number || '',
    project_name: existingContract?.project_name || '',
    location: existingContract?.location || '',
    contract_type: existingContract?.contract_type || 'PWD_203A',
    contract_value: existingContract?.contract_value || '',
    start_date: existingContract?.start_date || '',
    end_date: existingContract?.end_date || '',
    contract_duration_days: existingContract?.contract_duration_days || '',
    client_name: existingContract?.client_name || '',
    consultant_name: existingContract?.consultant_name || '',
    status: existingContract?.status || 'draft',
    description: existingContract?.description || ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const contractTypes = [
    { value: 'PWD_203A', label: 'PWD Form 203A (Rev 1/2010)' },
    { value: 'PAM_2018', label: 'PAM Contract 2018' },
    { value: 'IEM', label: 'IEM Form' },
    { value: 'CIDB', label: 'CIDB Standard Form' },
    { value: 'JKR_DB', label: 'JKR Design & Build' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Auto-calculate duration if both dates are set
    if (name === 'start_date' || name === 'end_date') {
      const start = name === 'start_date' ? new Date(value) : new Date(formData.start_date);
      const end = name === 'end_date' ? new Date(value) : new Date(formData.end_date);
      
      if (start && end && end > start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setFormData(prev => ({
          ...prev,
          contract_duration_days: diffDays
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.contract_number.trim()) {
      newErrors.contract_number = 'Contract number is required';
    }
    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.contract_value || parseFloat(formData.contract_value) <= 0) {
      newErrors.contract_value = 'Valid contract value is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Client name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);

      const contractData = {
        ...formData,
        contract_value: parseFloat(formData.contract_value),
        contract_duration_days: parseInt(formData.contract_duration_days),
        organization_id: user.id // Link to the user's organization
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', existingContract.id);
      } else {
        result = await supabase
          .from('contracts')
          .insert([contractData]);
      }

      if (result.error) throw result.error;

      alert(isEditing ? 'Contract updated successfully!' : 'Contract created successfully!');
      
      // Reset form if creating new
      if (!isEditing) {
        setFormData({
          contract_number: '',
          project_name: '',
          location: '',
          contract_type: 'PWD_203A',
          contract_value: '',
          start_date: '',
          end_date: '',
          contract_duration_days: '',
          client_name: '',
          consultant_name: '',
          status: 'draft',
          description: ''
        });
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving contract:', error);
      alert('Error saving contract: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contract Number & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contract Number *
          </label>
          <input
            type="text"
            name="contract_number"
            value={formData.contract_number}
            onChange={handleChange}
            placeholder="e.g., MC-2024-001"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.contract_number ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.contract_number && (
            <p className="mt-1 text-sm text-red-600">{errors.contract_number}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contract Type *
          </label>
          <select
            name="contract_type"
            value={formData.contract_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {contractTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          name="project_name"
          value={formData.project_name}
          onChange={handleChange}
          placeholder="e.g., Construction of 3-Storey Office Building"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.project_name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.project_name && (
          <p className="mt-1 text-sm text-red-600">{errors.project_name}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Location *
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g., Jalan Sultan Ismail, Kuala Lumpur"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.location ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.location && (
          <p className="mt-1 text-sm text-red-600">{errors.location}</p>
        )}
      </div>

      {/* Contract Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contract Value (RM) *
        </label>
        <input
          type="number"
          name="contract_value"
          value={formData.contract_value}
          onChange={handleChange}
          placeholder="e.g., 5000000"
          step="0.01"
          min="0"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.contract_value ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.contract_value && (
          <p className="mt-1 text-sm text-red-600">{errors.contract_value}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.start_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.start_date && (
            <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.end_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.end_date && (
            <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (Days)
          </label>
          <input
            type="number"
            name="contract_duration_days"
            value={formData.contract_duration_days}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-500">Auto-calculated from dates</p>
        </div>
      </div>

      {/* Client & Consultant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name *
          </label>
          <input
            type="text"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
            placeholder="e.g., Ministry of Works"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.client_name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.client_name && (
            <p className="mt-1 text-sm text-red-600">{errors.client_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consultant Name
          </label>
          <input
            type="text"
            name="consultant_name"
            value={formData.consultant_name}
            onChange={handleChange}
            placeholder="e.g., ABC Consulting Sdn Bhd"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contract Status
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="4"
          placeholder="Enter project details, scope of work, special requirements, etc."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            isEditing ? 'Update Contract' : 'Create Contract'
          )}
        </button>
      </div>
    </form>
  );
}

export default ContractForm;