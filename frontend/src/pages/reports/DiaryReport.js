// frontend/src/pages/reports/DiaryReport.js
// CONSISTENT FORMAT - Matching BOQ structure with comprehensive sections

import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { getDiaryReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';

const WEATHER_COLORS = {
  'Sunny': '#FCD34D',
  'Cloudy': '#9CA3AF',
  'Rainy': '#3B82F6',
  'Heavy Rain': '#1E40AF'
};

const DiaryReport = ({ contractId, contract }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (contractId) {
      loadReportData();
    }
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getDiaryReportData(contractId, startDate, endDate);
      setReportData(data);
    } catch (error) {
      console.error('Error loading diary report:', error);
      setReportData({
        statistics: {
          totalDiaries: 0,
          totalPhotos: 0,
          issuesCount: 0,
          weatherDistribution: {}
        },
        weatherData: [],
        manpowerSummary: {},
        issuesDelays: [],
        diaries: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // ============================================
  // EXPORT TO PDF (Old Style - Direct)
  // ============================================
  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const stats = reportData?.statistics || {};

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DIARY SUMMARY REPORT', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 28);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 34);

    // Summary Table
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Diaries', stats.totalDiaries || 0],
        ['Total Photos', stats.totalPhotos || 0],
        ['Issues Reported', stats.issuesCount || 0]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    // Diaries Table
    if (reportData?.diaries?.length > 0) {
      doc.addPage();
      
      doc.setFontSize(14);
      doc.text('All Diaries', 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['Date', 'Weather', 'Manpower', 'Photos', 'Status']],
        body: reportData.diaries.map(d => [
          formatDate(d.diary_date),
          d.weather || '-',
          d.total_manpower || 0,
          d.photo_count || 0,
          (d.status || 'draft').toUpperCase()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' }
        }
      });
    }

    doc.save(`Diary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ============================================
  // EXPORT TO EXCEL
  // ============================================
  const exportToExcel = () => {
    const stats = reportData?.statistics || {};
    
    const summaryData = [
      ['Diary Summary Report'],
      ['Period:', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Generated:', formatDate(new Date())],
      [],
      ['Summary'],
      ['Total Diaries', stats.totalDiaries || 0],
      ['Total Photos', stats.totalPhotos || 0],
      ['Issues Reported', stats.issuesCount || 0]
    ];

    const diariesData = reportData?.diaries?.length > 0 ? [
      [],
      ['All Diaries'],
      ['Date', 'Weather', 'Temperature', 'Manpower', 'Photos', 'Work Done', 'Status'],
      ...reportData.diaries.map(d => [
        formatDate(d.diary_date),
        d.weather || '-',
        d.temperature || '-',
        d.total_manpower || 0,
        d.photo_count || 0,
        d.work_done_summary || '-',
        d.status || 'draft'
      ])
    ] : [];

    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...diariesData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Diary Report');
    XLSX.writeFile(wb, `Diary_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const hasNoData = !reportData || !reportData.diaries || reportData.diaries.length === 0;

  return (
    <div className="space-y-6">
      
      {/* Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={loadReportData}
          disabled={loading}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {loading ? 'Loading...' : 'Apply'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading diary data...</p>
        </div>
      )}

      {/* No Data */}
      {!loading && hasNoData && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Diary Data</h3>
          <p className="text-gray-600">Create work diaries to see summary analysis.</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && !hasNoData && (() => {
        const stats = reportData.statistics;
        const weatherData = Object.entries(stats.weatherDistribution || {}).map(([name, value]) => ({ name, value }));
        const manpowerData = Object.entries(reportData.manpowerSummary || {}).map(([category, data]) => ({
          category,
          avgWorkers: parseFloat(data.avgWorkers || 0),
          totalWorkers: data.totalWorkers || 0
        }));

        return (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Total Diaries</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalDiaries || 0}</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
                <div className="text-sm text-blue-600 mb-1">Total Photos</div>
                <div className="text-3xl font-bold text-blue-700">{stats.totalPhotos || 0}</div>
              </div>
              <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
                <div className="text-sm text-yellow-600 mb-1">Issues Reported</div>
                <div className="text-3xl font-bold text-yellow-700">{stats.issuesCount || 0}</div>
              </div>
            </div>

            {/* Diary Overview Table */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Diary Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Metric</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Total Diaries</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{stats.totalDiaries || 0}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Total Photos Uploaded</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">{stats.totalPhotos || 0}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Issues/Delays Reported</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-yellow-600">{stats.issuesCount || 0}</td>
                    </tr>
                    
                    {/* Weather Breakdown */}
                    {weatherData.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan="2" className="px-6 py-3 text-sm font-bold text-gray-700 uppercase">Weather Distribution</td>
                        </tr>
                        {weatherData.map((weather, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700 pl-12">• {weather.name}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{weather.value} days</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Manpower Summary */}
                    {manpowerData.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan="2" className="px-6 py-3 text-sm font-bold text-gray-700 uppercase">Average Manpower by Trade</td>
                        </tr>
                        {manpowerData.map((trade, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700 pl-12">• {trade.category}</td>
                            <td className="px-6 py-4 text-sm text-right">
                              <span className="font-medium text-gray-900">{trade.avgWorkers.toFixed(1)} avg</span>
                              <span className="text-gray-500 ml-2">({trade.totalWorkers} total)</span>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weather Chart */}
            {weatherData.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weather Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={weatherData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {weatherData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WEATHER_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Manpower Chart */}
            {manpowerData.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manpower by Trade</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={manpowerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgWorkers" fill="#3b82f6" name="Average Workers" />
                    <Bar dataKey="totalWorkers" fill="#10b981" name="Total Workers" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Issues/Delays Table */}
            {reportData.issuesDelays && reportData.issuesDelays.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues & Delays</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue/Delay</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.issuesDelays.map((issue, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-600">{formatDate(issue.date)}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{issue.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Diaries Table */}
            {reportData.diaries && reportData.diaries.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">All Diaries</h3>
                  <span className="text-sm text-gray-500">{reportData.diaries.length} diaries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weather</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manpower</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Photos</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Done</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.diaries.map((diary, index) => (
                        <tr key={diary.id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">{formatDate(diary.diary_date)}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">{diary.weather || '-'}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">{diary.temperature || '-'}°C</td>
                          <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{diary.total_manpower || 0}</td>
                          <td className="px-4 py-4 text-sm text-right text-blue-600">{diary.photo_count || 0}</td>
                          <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate" title={diary.work_done_summary}>
                            {diary.work_done_summary || '-'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                              diary.status === 'acknowledged' ? 'bg-green-100 text-green-800 border border-green-300' :
                              diary.status === 'submitted' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                              {diary.status || 'draft'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Export Buttons - BOQ STYLE */}
            <div className="flex gap-3">
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                📄 Export PDF
              </button>

              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📊 Export Excel
              </button>

              <button
                onClick={() => setShowExport(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🎨 Export PDF (Advanced)
              </button>
            </div>
          </>
        );
      })()}

      {/* Universal Export Modal (Advanced Option) */}
      {showExport && reportData && (
        <UniversalExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          reportType="diary"
          reportData={reportData}
          contract={contract}
        />
      )}
    </div>
  );
};

export default DiaryReport;
