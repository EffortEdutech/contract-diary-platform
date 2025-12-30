import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createBOQ, generateBOQNumber } from '../../services/boqService';
import { supabase } from '../../lib/supabase';

function CreateBOQ() {
  const { contractId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    boq_number: '',
    title: '',
    description: '',
    currency: 'MYR'
  });

  useEffect(() => {
    fetchContractAndGenerateNumber();
  }, [contractId]);

  const fetchContractAndGenerateNumber = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching contract with ID:', contractId);

      // Fetch contract details - NO permission check needed
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      console.log('Contract query result:', { contractData, contractError });

      if (contractError) {
        console.error('Contract error:', contractError);
        if (contractError.code === 'PGRST116') {
          throw new Error('Contract not found. Please check the contract ID.');
        }
        throw new Error(`Database error: ${contractError.message}`);
      }

      if (!contractData) {
        throw new Error('Contract not found.');
      }

      console.log('Contract loaded successfully:', contractData.contract_number);
      setContract(contractData);

      // Generate next BOQ number
      console.log('Generating BOQ number...');
      const nextNumber = await generateBOQNumber(contractId);
      console.log('Generated BOQ number:', nextNumber);
      setFormData(prev => ({ ...prev, boq_number: nextNumber }));

    } catch (err) {
      console.error('Error in fetchContractAndGenerateNumber:', err);
      setError(err.message || 'Failed to load contract data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate
      if (!formData.boq_number.trim()) {
        throw new Error('BOQ number is required');
      }
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      // Create BOQ
      const result = await createBOQ({
        contract_id: contractId,
        boq_number: formData.boq_number,
        title: formData.title,
        description: formData.description,
        currency: formData.currency
      });

      if (result.success) {
        // Navigate to the new BOQ details page
        navigate(`/boq/${result.data.id}`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error creating BOQ:', err);
      setError(err.message || 'Failed to create BOQ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Link to="/contracts" className="hover:text-blue-600">Contracts</Link>
          <span className="mx-2">/</span>
          <Link to={`/contracts/${contractId}`} className="hover:text-blue-600">
            {contract?.contract_number}
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/contracts/${contractId}/boq`} className="hover:text-blue-600">
            BOQ
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Create</span>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">Create Bill of Quantities</h1>
        <p className="text-gray-600 mt-1">{contract?.project_name}</p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BOQ Number */}
          <div>
            <label htmlFor="boq_number" className="block text-sm font-medium text-gray-700 mb-1">
              BOQ Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="boq_number"
              name="boq_number"
              value={formData.boq_number}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., BOQ-001"
            />
            <p className="mt-1 text-sm text-gray-500">
              Auto-generated based on existing BOQs
            </p>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Main Building Structure"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter detailed description of this BOQ..."
            />
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MYR">MYR (Malaysian Ringgit)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="SGD">SGD (Singapore Dollar)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contractId}/boq`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create BOQ'
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Next Steps
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>After creating the BOQ, you can:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Add sections to organize items</li>
                  <li>Add BOQ items (materials, labor, equipment)</li>
                  <li>Import items from Excel/CSV</li>
                  <li>Calculate totals with SST</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateBOQ;