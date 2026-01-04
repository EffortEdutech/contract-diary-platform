// ============================================
// DIARY LIST PAGE - Phase 3A: Daily Diary Module
// ============================================
// Purpose: Display all work diaries for a contract
// Features: Statistics, filters, sort, create/edit/view navigation
// Mobile-optimized layout
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDiariesByContract,
  getDiaryStatistics,
  formatDiaryDate,
  DIARY_STATUS
} from '../../services/diaryService';
import { supabase } from '../../lib/supabase';

import Breadcrumb from '../../components/common/Breadcrumb';

const DiaryList = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();

  // State
  const [contract, setContract] = useState(null);
  const [diaries, setDiaries] = useState([]);
  const [filteredDiaries, setFilteredDiaries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = newest first

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadContractAndDiaries();
  }, [contractId]);

  useEffect(() => {
    applyFilters();
  }, [diaries, statusFilter, dateFromFilter, dateToFilter, sortOrder]);

  const loadContractAndDiaries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load contract details
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // Load all diaries for this contract
      const diariesData = await getDiariesByContract(contractId, {
        sortOrder: 'desc' // Always load newest first, filter will handle sorting
      });
      setDiaries(diariesData);

      // Load statistics
      const stats = await getDiaryStatistics(contractId);
      setStatistics(stats);

    } catch (err) {
      console.error('Error loading diaries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTERS
  // ============================================

  const applyFilters = () => {
    let filtered = [...diaries];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Date range filter
    if (dateFromFilter) {
      filtered = filtered.filter(d => d.diary_date >= dateFromFilter);
    }
    if (dateToFilter) {
      filtered = filtered.filter(d => d.diary_date <= dateToFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.diary_date);
      const dateB = new Date(b.diary_date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredDiaries(filtered);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setSortOrder('desc');
  };

  // ============================================
  // HELPERS
  // ============================================

  const getStatusBadge = (status) => {
    const badges = {
      [DIARY_STATUS.DRAFT]: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Draft'
      },
      [DIARY_STATUS.SUBMITTED]: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Submitted'
      },
      [DIARY_STATUS.ACKNOWLEDGED]: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Acknowledged'
      }
    };

    const badge = badges[status] || badges[DIARY_STATUS.DRAFT];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getWeatherIcon = (weather) => {
    const icons = {
      'Sunny': '☀️',
      'Cloudy': '☁️',
      'Rainy': '🌧️',
      'Heavy Rain': '⛈️',
      'Stormy': '🌩️'
    };
    return icons[weather] || '🌤️';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-MY', options);
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Build breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: `/contracts/${contractId}` },  // ✅ NEW
    { label: 'Daily Diaries', href: null }
  ];    

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Daily Diaries</h1>
            {contract && (
              <p className="text-sm text-gray-600 mt-1">{contract.project_name}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/contracts/${contractId}/diaries/new`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Diary
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Diaries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.total}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{statistics.draft}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{statistics.submitted}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Acknowledged</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{statistics.acknowledged}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value={DIARY_STATUS.DRAFT}>Draft</option>
              <option value={DIARY_STATUS.SUBMITTED}>Submitted</option>
              <option value={DIARY_STATUS.ACKNOWLEDGED}>Acknowledged</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              max={getTodayDate()}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              max={getTodayDate()}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredDiaries.length} of {diaries.length} diaries
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Diary List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredDiaries.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No diaries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {diaries.length === 0 
                ? "Get started by creating your first daily diary entry."
                : "Try adjusting your filters to see more results."}
            </p>
            {diaries.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={() => navigate(`/contracts/${contractId}/diaries/new`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Diary
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weather
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manpower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDiaries.map((diary) => (
                  <tr 
                    key={diary.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/contracts/${contractId}/diaries/${diary.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(diary.diary_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">
                          {getWeatherIcon(diary.weather_conditions)}
                        </span>
                        <span className="text-sm text-gray-700">
                          {diary.weather_conditions || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {diary.work_progress || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {diary.manpower && Array.isArray(diary.manpower) 
                          ? `${diary.manpower.reduce((sum, m) => sum + (m.count || 0), 0)} workers`
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(diary.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/contracts/${contractId}/diaries/${diary.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      {diary.status === DIARY_STATUS.DRAFT && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contracts/${contractId}/diaries/${diary.id}/edit`);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredDiaries.map((diary) => (
                <div 
                  key={diary.id}
                  onClick={() => navigate(`/contracts/${contractId}/diaries/${diary.id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {formatDate(diary.diary_date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">{getWeatherIcon(diary.weather_conditions)}</span>
                        {diary.weather_conditions || '-'}
                      </div>
                    </div>
                    {getStatusBadge(diary.status)}
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                    {diary.work_progress || 'No work progress recorded'}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {diary.manpower && Array.isArray(diary.manpower)
                        ? `${diary.manpower.reduce((sum, m) => sum + (m.count || 0), 0)} workers`
                        : 'No manpower data'}
                    </span>
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/contracts/${contractId}/diaries/${diary.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {diary.status === DIARY_STATUS.DRAFT && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contracts/${contractId}/diaries/${diary.id}/edit`);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryList;
