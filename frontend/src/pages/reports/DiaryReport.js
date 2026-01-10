// frontend/src/pages/reports/DiaryReport.js
// REFACTORED VERSION - Uses Chart Metadata

import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { getDiaryReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';
import { supabase } from '../../lib/supabase';

const WEATHER_COLORS = {
  'Sunny': '#FCD34D',
  'Cloudy': '#9CA3AF',
  'Rainy': '#3B82F6',
  'Heavy Rain': '#1E40AF',
  'Stormy': '#fc2f2fff',
};

const DiaryReport = ({ contractId, contract: propContract }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [contract, setContract] = useState(propContract);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (contractId) {
      loadReportData();
      if (!contract) {
        loadContract();
      }
    }
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getDiaryReportData(contractId, startDate, endDate);
      console.log('Diary Report data loaded:', data);
      console.log('Has chartMetadata:', !!data.chartMetadata);
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
        manpowerSummary: {},
        issuesDelays: [],
        diaries: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (err) {
      console.error('Error loading contract:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Quick PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const stats = reportData?.statistics || {};

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DIARY SUMMARY REPORT', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 28);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 34);

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

    if (reportData?.diaries?.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('All Diaries', 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['Date', 'Weather', 'Manpower', 'Photos']],
        body: reportData.diaries.map(d => [
          formatDate(d.diary_date),
          d.weather_conditions || '-',
          d.total_manpower || 0,
          d.photo_count || 0
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    doc.save(`Diary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Excel Export
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
      ['Date', 'Weather', 'Temperature', 'Manpower', 'Photos', 'Status'],
      ...reportData.diaries.map(d => [
        formatDate(d.diary_date),
        d.weather_conditions || '-',
        d.temperature ? `${d.temperature}°C` : '-',
        d.total_manpower || 0,
        d.photo_count || 0,
        d.status || 'draft'
      ])
    ] : [];

    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...diariesData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Diary Report');
    XLSX.writeFile(wb, `Diary_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = reportData?.statistics || {};
  const weatherData = Object.entries(stats.weatherDistribution || {}).map(([name, value]) => ({ name, value }));
  const manpowerData = Object.entries(reportData?.manpowerSummary || {}).map(([category, info]) => ({
    category,
    avgWorkers: parseFloat(info.avgWorkers || 0),
    totalWorkers: info.totalWorkers || 0
  }));

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={loadReportData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Apply
          </button>
        </div>
      </div>

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

      {/* Charts Row - ✅ USES METADATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weather Pie Chart - ✅ USES METADATA */}
        {weatherData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {/* ✅ USE METADATA TITLE */}
              {reportData.chartMetadata?.weatherChart?.title || 'Weather Distribution'}
            </h3>
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
                  dataKey={reportData.chartMetadata?.weatherChart?.dataKey || 'value'}
                  nameKey={reportData.chartMetadata?.weatherChart?.labelKey || 'name'}
                >
                  {weatherData.map((entry, index) => {
                    // ✅ USE METADATA COLORS IF AVAILABLE
                    const metadata = reportData.chartMetadata?.weatherChart;
                    const color = metadata?.colors?.[entry.name] || WEATHER_COLORS[entry.name] || '#6b7280';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Manpower Bar Chart - ✅ USES METADATA */}
        {manpowerData.length > 0 && reportData.chartMetadata?.manpowerChart && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {/* ✅ USE METADATA TITLE */}
              {reportData.chartMetadata.manpowerChart.title || 'Manpower by Trade'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={manpowerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={reportData.chartMetadata.manpowerChart.xAxisKey || 'category'} />
                <YAxis />
                <Tooltip />
                <Legend />
                
                {/* ✅ MAP DATASETS FROM METADATA */}
                {reportData.chartMetadata.manpowerChart.datasets?.map((dataset, index) => (
                  <Bar
                    key={index}
                    dataKey={dataset.key}
                    fill={dataset.color}
                    name={dataset.label}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* All Diaries Table */}
      {reportData?.diaries && reportData.diaries.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Diaries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weather</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Temp</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manpower</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Photos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.diaries.map((diary, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(diary.diary_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{diary.weather_conditions || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {diary.temperature ? `${diary.temperature}°C` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{diary.total_manpower || 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{diary.photo_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        diary.status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                        diary.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
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

      {/* Export Buttons - 3-button layout */}
      <div className="flex gap-3">
        <button
          onClick={exportToPDF}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span>📄</span>
          Export PDF
        </button>
        
        <button
          onClick={exportToExcel}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span>📊</span>
          Export Excel
        </button>
        
        <button
          onClick={() => setShowExport(true)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span>🎨</span>
          Export PDF (Advanced)
        </button>
      </div>

      {/* Universal Export Modal */}
      <UniversalExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        reportType="diary"
        reportData={reportData}
        contract={contract}
      />
    </div>
  );
};

export default DiaryReport;
