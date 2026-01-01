import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ContractForm from './ContractForm';

function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
      alert('Error loading contract: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Contract deleted successfully');
      navigate('/contracts');
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Error deleting contract: ' + error.message);
    }
  };

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    fetchContract();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const contractTypeLabels = {
    PWD_203A: 'PWD Form 203A (Rev 1/2010)',
    PAM_2018: 'PAM Contract 2018',
    IEM: 'IEM Form',
    CIDB: 'CIDB Standard Form',
    JKR_DB: 'JKR Design & Build'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    suspended: 'bg-red-100 text-red-800'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Contract not found</h3>
          <p className="mt-1 text-sm text-gray-500">The contract you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/contracts')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/contracts')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Contracts
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{contract.project_name}</h1>
              <p className="mt-1 text-sm text-gray-500">{contract.contract_number}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[contract.status]}`}>
              {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Contract'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Contract
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isEditing ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Contract</h2>
              <ContractForm existingContract={contract} onSuccess={handleUpdateSuccess} />
            </div>
          ) : (
            <div className="p-6">
              {/* Contract Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Type</h3>
                    <p className="text-base text-gray-900">{contractTypeLabels[contract.contract_type]}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Value</h3>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(contract.contract_value)}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Project Location</h3>
                    <p className="text-base text-gray-900">{contract.location}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Client Name</h3>
                    <p className="text-base text-gray-900">{contract.client_name}</p>
                  </div>

                  {contract.consultant_name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Consultant Name</h3>
                      <p className="text-base text-gray-900">{contract.consultant_name}</p>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Period</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-900">
                        <span className="text-sm font-medium mr-2">Start:</span>
                        <span>{formatDate(contract.start_date)}</span>
                      </div>
                      <div className="flex items-center text-gray-900">
                        <span className="text-sm font-medium mr-2">End:</span>
                        <span>{formatDate(contract.end_date)}</span>
                      </div>
                      <div className="flex items-center text-gray-900">
                        <span className="text-sm font-medium mr-2">Duration:</span>
                        <span>{contract.contract_duration_days} days</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Created Date</h3>
                    <p className="text-base text-gray-900">
                      {formatDate(contract.created_at)}
                    </p>
                  </div>

                  {contract.updated_at && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
                      <p className="text-base text-gray-900">
                        {formatDate(contract.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {contract.description && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Project Description</h3>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{contract.description}</p>
                </div>
              )}


              {/* Quick Actions */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* BOQ Button - NOW WORKING! */}
                  <button 
                    onClick={() => navigate(`/contracts/${contract.id}/boq`)}
                    className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg hover:border-blue-600 hover:bg-blue-100 transition-colors text-left"
                  >
                    <svg className="w-6 h-6 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium text-gray-900">Bill of Quantities</p>
                    <p className="text-sm text-blue-600">✅ Phase 2 Ready</p>
                  </button>

                  {/* Daily Diaries */}
                  <button 
                    onClick={() => navigate(`/contracts/${contract.id}/diaries`)}
                    className="p-4 border-2 border-green-500 bg-green-50 rounded-lg hover:border-green-600 hover:bg-green-100 transition-colors text-left"
                  >
                    <svg className="w-6 h-6 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium text-gray-900">Daily Diaries</p>
                    <p className="text-sm text-green-600">✅ Phase 3 Ready</p>
                  </button>

                  {/* Progress Claims Tab */}
                  <button
                    onClick={() => navigate(`/contracts/${contract.id}/claims`)}
                    className="p-4 border-2 border-orange-500 bg-orange-50 rounded-lg hover:border-orange-600 hover:bg-orange-100 transition-colors text-left"
                  >
                      <svg className="w-6 h-6 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    <p className="font-medium text-gray-900">Claims</p>
                    <p className="text-sm text-orange-600">✅ Phase 4 Ready</p>
                  </button>

                  {/* Documents */}
                  <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                    <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium text-gray-900">Documents</p>
                    <p className="text-sm text-gray-500">Phase 4</p>
                  </button>
                </div>
              </div>              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractDetail;