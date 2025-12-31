// ============================================
// DIARY DETAIL PAGE - Phase 3A + 3B: Daily Diary + Photos
// ============================================
// Purpose: View individual diary entry (read-only) with photo gallery
// Features: Tabbed interface, photo gallery, photo upload (draft only)
// Mobile-optimized layout
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDiaryById,
  acknowledgeDiary,
  deleteDiary,
  formatDiaryDate,
  DIARY_STATUS
} from '../../services/diaryService';
import { useAuth } from '../../contexts/AuthContext';

import PhotoGallery from '../../components/diary/PhotoGallery';
import PhotoUpload from '../../components/diary/PhotoUpload';

const DiaryDetail = () => {
  const { contractId, diaryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [diary, setDiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'photos'

  useEffect(() => {
    loadDiary();
  }, [diaryId]);

  const loadDiary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDiaryById(diaryId);
      setDiary(data);
    } catch (err) {
      console.error('Error loading diary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!window.confirm('Are you sure you want to acknowledge this diary? This action cannot be undone.')) {
      return;
    }

    try {
      setAcknowledging(true);
      await acknowledgeDiary(diaryId);
      alert('Diary acknowledged successfully!');
      loadDiary(); // Reload to show updated status
    } catch (err) {
      console.error('Error acknowledging diary:', err);
      alert('Error: ' + err.message);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this draft diary? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDiary(diaryId);
      alert('Diary deleted successfully!');
      navigate(`/contracts/${contractId}/diaries`);
    } catch (err) {
      console.error('Error deleting diary:', err);
      alert('Error: ' + err.message);
    }
  };

  const handlePhotoUploadComplete = (results) => {
    console.log('Upload complete:', results);
    if (results.successful.length > 0) {
      // Show success message
      const message = results.failed.length > 0
        ? `${results.successful.length} photo(s) uploaded successfully, ${results.failed.length} failed`
        : `${results.successful.length} photo(s) uploaded successfully!`;
      alert(message);
    }
  };

  const handlePhotoDeleted = (photoId) => {
    console.log('Photo deleted:', photoId);
  };

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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Diary not found'}
        </div>
        <button
          onClick={() => navigate(`/contracts/${contractId}/diaries`)}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Diaries
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/contracts/${contractId}/diaries`)}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Diaries
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Daily Diary
            </h1>
            {diary.contracts && (
              <p className="text-sm text-gray-600">{diary.contracts.project_name}</p>
            )}
          </div>
          {getStatusBadge(diary.status)}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        
        {/* Date & Weather Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatDiaryDate(diary.diary_date)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {diary.diary_date}
              </p>
            </div>
            {diary.weather_conditions && (
              <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
                <span className="text-3xl mr-2">{getWeatherIcon(diary.weather_conditions)}</span>
                <span className="font-medium text-gray-900">{diary.weather_conditions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition flex items-center`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Details
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition flex items-center`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Photos
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              
              {/* Site Conditions */}
              {diary.site_conditions && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Site Conditions
                  </h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{diary.site_conditions}</p>
                </div>
              )}

              {/* Work Progress */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Work Progress
                </h3>
                <p className="text-gray-900 whitespace-pre-wrap">{diary.work_progress || 'No work progress recorded'}</p>
              </div>

              {/* Manpower */}
              {diary.manpower && diary.manpower.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Manpower
                  </h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Trade</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Workers</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Hours</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Man-Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {diary.manpower.map((m, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">{m.trade}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{m.count}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{m.hours}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {(m.count * m.hours).toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">Total</td>
                          <td className="px-4 py-2 text-sm font-bold text-gray-900">
                            {diary.manpower.reduce((sum, m) => sum + m.count, 0)} workers
                          </td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-sm font-bold text-gray-900">
                            {diary.manpower.reduce((sum, m) => sum + (m.count * m.hours), 0).toFixed(1)} hours
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Equipment */}
              {diary.equipment && diary.equipment.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Equipment
                  </h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Unit No.</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Hours</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {diary.equipment.map((e, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">{e.type}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{e.unit_no || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{e.hours}</td>
                            <td className="px-4 py-2 text-sm">
                              {e.breakdown ? (
                                <span className="text-red-600 font-medium">⚠️ Breakdown</span>
                              ) : (
                                <span className="text-green-600">✓ Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Materials */}
              {diary.materials_delivered && diary.materials_delivered.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Materials Delivered
                  </h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Material</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Supplier</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">DO Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {diary.materials_delivered.map((m, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">{m.material}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {m.quantity} {m.unit}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{m.supplier || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 font-mono">{m.DO_number || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Issues & Delays */}
              {diary.issues_delays && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Issues & Delays
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{diary.issues_delays}</p>
                  </div>
                </div>
              )}

              {/* Acknowledgment Info */}
              {diary.status === DIARY_STATUS.ACKNOWLEDGED && diary.acknowledged_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-900">Acknowledged by Main Contractor</p>
                      <p className="text-xs text-green-700">
                        {new Date(diary.acknowledged_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Upload Section (draft only) */}
              {diary.status === DIARY_STATUS.DRAFT && diary.created_by === user?.id && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Upload Photos</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Draft Only
                    </span>
                  </div>
                  <PhotoUpload
                    diaryId={diaryId}
                    onUploadComplete={handlePhotoUploadComplete}
                  />
                </div>
              )}

              {/* Info for non-draft diaries */}
              {diary.status !== DIARY_STATUS.DRAFT && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Photos Are Locked</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        {diary.status === DIARY_STATUS.SUBMITTED && 'This diary has been submitted. Photos are locked for CIPAA compliance.'}
                        {diary.status === DIARY_STATUS.ACKNOWLEDGED && 'This diary has been acknowledged. Photos are permanently locked as evidence.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Gallery */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Photo Gallery
                </h3>
                <PhotoGallery
                  diaryId={diaryId}
                  canEdit={diary.status === DIARY_STATUS.DRAFT && diary.created_by === user?.id}
                  onPhotoDeleted={handlePhotoDeleted}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 border-t flex flex-wrap gap-3">
          {/* Edit Button (draft only) */}
          {diary.status === DIARY_STATUS.DRAFT && diary.created_by === user?.id && (
            <button
              onClick={() => navigate(`/contracts/${contractId}/diaries/${diaryId}/edit`)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Edit Diary
            </button>
          )}

          {/* Acknowledge Button (submitted only, for MC) */}
          {diary.status === DIARY_STATUS.SUBMITTED && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {acknowledging ? 'Acknowledging...' : 'Acknowledge Diary'}
            </button>
          )}

          {/* Delete Button (draft only) */}
          {diary.status === DIARY_STATUS.DRAFT && diary.created_by === user?.id && (
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiaryDetail;
