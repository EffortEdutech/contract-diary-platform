import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ContractForm from './ContractForm';
import ContractCard from '../../components/contracts/ContractCard';
import ContractStats from '../../components/contracts/ContractStats';
import { useNavigate } from 'react-router-dom';

function Contracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Fetch contracts
  useEffect(() => {
    fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      alert('Error loading contracts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    const matchesType = filterType === 'all' || contract.contract_type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate stats
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    draft: contracts.filter(c => c.status === 'draft').length,
    completed: contracts.filter(c => c.status === 'completed').length,
    totalValue: contracts.reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0)
  };

  const handleContractCreated = () => {
    fetchContracts();
    setActiveTab('list');
  };

  const handleViewContract = (contractId) => {
    navigate(`/contracts/${contractId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
          <p className="mt-2 text-gray-600">Manage your construction contracts and track progress</p>
        </div>

        {/* Stats Cards */}
        <ContractStats stats={stats} />

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('list')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Contract List ({contracts.length})
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Create New Contract
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* LIST TAB */}
            {activeTab === 'list' && (
              <>
                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search contracts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Types</option>
                      <option value="PWD_203A">PWD 203A</option>
                      <option value="PAM_2018">PAM 2018</option>
                      <option value="IEM">IEM</option>
                      <option value="CIDB">CIDB</option>
                      <option value="JKR_DB">JKR DB</option>
                    </select>
                  </div>
                </div>

                {/* Contract List */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading contracts...</p>
                  </div>
                ) : filteredContracts.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No contracts found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new contract.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Create Contract
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContracts.map(contract => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onClick={() => handleViewContract(contract.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* CREATE TAB */}
            {activeTab === 'create' && (
              <ContractForm onSuccess={handleContractCreated} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contracts;