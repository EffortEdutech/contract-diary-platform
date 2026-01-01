// frontend/src/pages/reports/ProgressReport.js
import React, { useState, useEffect } from 'react';
import { getProgressReportData } from '../../services/reportService';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, subMonths } from 'date-fns';
import DateRangeFilter from '../../components/reports/DateRangeFilter';

const ProgressReport = ({ contractId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (contractId) {
      loadReportData();
    }
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProgressReportData(contractId, startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error('Error loading progress report:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const { contract, statistics, diaries } = reportData;

    // Header
    doc.setFontSize(18);
    doc.text('Progress Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Contract: ${contract.contract_number} - ${contract.project_name}`, 14, 28);
    doc.text(`Period: ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 34);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 40);

    // Statistics
    doc.setFontSize(14);
    doc.text('Statistics Summary', 14, 52);
    
    const statsData = [
      ['Metric', 'Value'],
      ['Total Diaries', statistics.totalDiaries],
      ['Submitted', statistics.submittedDiaries],
      ['Acknowledged', statistics.acknowledgedDiaries],
      ['Draft', statistics.draftDiaries],
      ['Completion Rate', `${statistics.completionRate}%`],
      ['Issues Reported', statistics.issuesCount]
    ];

    doc.autoTable({
      startY: 56,
      head: [statsData[0]],
      body: statsData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Weather Distribution
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Weather Distribution', 14, finalY);

    const weatherData = Object.entries(statistics.weatherCounts).map(([weather, count]) => [
      weather,
      count,
      `${((count / statistics.totalDiaries) * 100).toFixed(1)}%`
    ]);

    doc.autoTable({
      startY: finalY + 4,
      head: [['Weather', 'Count', 'Percentage']],
      body: weatherData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Diary Details (new page)
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Diary Details', 14, 20);

    const diaryDetails = diaries.slice(0, 50).map(diary => [
      format(new Date(diary.diary_date), 'dd/MM/yyyy'),
      diary.weather_conditions || '-',
      diary.status,
      diary.issues_delays ? 'Yes' : 'No'
    ]);

    doc.autoTable({
      startY: 24,
      head: [['Date', 'Weather', 'Status', 'Issues']],
      body: diaryDetails,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    doc.save(`Progress_Report_${contract.contract_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const { contract, statistics, diaries, manpowerByDate } = reportData;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Progress Report'],
      [''],
      ['Contract Number', contract.contract_number],
      ['Project Name', contract.project_name],
      ['Period', `${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`],
      ['Generated', format(new Date(), 'dd/MM/yyyy HH:mm')],
      [''],
      ['Statistics'],
      ['Total Diaries', statistics.totalDiaries],
      ['Submitted', statistics.submittedDiaries],
      ['Acknowledged', statistics.acknowledgedDiaries],
      ['Draft', statistics.draftDiaries],
      ['Completion Rate', `${statistics.completionRate}%`],
      ['Issues Reported', statistics.issuesCount]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: Diary Details
    const diaryData = diaries.map(diary => ({
      'Date': format(new Date(diary.diary_date), 'dd/MM/yyyy'),
      'Weather': diary.weather_conditions || '-',
      'Status': diary.status,
      'Work Progress': diary.work_progress || '-',
      'Site Conditions': diary.site_conditions || '-',
      'Issues/Delays': diary.issues_delays || '-',
      'Acknowledged': diary.status === 'acknowledged' ? 'Yes' : 'No'
    }));
    const ws2 = XLSX.utils.json_to_sheet(diaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Diary Details');

    // Sheet 3: Manpower
    const manpowerData = manpowerByDate.map(item => ({
      'Date': format(new Date(item.date), 'dd/MM/yyyy'),
      'Total Workers': item.workers
    }));
    const ws3 = XLSX.utils.json_to_sheet(manpowerData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Manpower');

    // Save file
    XLSX.writeFile(wb, `Progress_Report_${contract.contract_number}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Always render filter and conditional content together
  return (
    <div className="space-y-6">
      {/* Date Range Filter - Always visible */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && (!reportData || !reportData.diaries || reportData.diaries.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-yellow-600 text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Data Available</h3>
          <p className="text-yellow-700">No diaries found for the selected date range.</p>
        </div>
      )}

      {/* Main Content - Only when data exists */}
      {!loading && !error && reportData && reportData.diaries && reportData.diaries.length > 0 && (() => {
        const { statistics, diaries, progressTimeline, manpowerByDate } = reportData;
        
        // Colors for charts
        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        // Prepare weather pie chart data
        const weatherChartData = Object.entries(statistics.weatherCounts).map(([name, value]) => ({
          name,
          value
        }));

        // Prepare status chart data
        const statusChartData = [
          { name: 'Acknowledged', value: statistics.acknowledgedDiaries, color: '#10B981' },
          { name: 'Submitted', value: statistics.submittedDiaries - statistics.acknowledgedDiaries, color: '#3B82F6' },
          { name: 'Draft', value: statistics.draftDiaries, color: '#F59E0B' }
        ].filter(item => item.value > 0);

        return (
          <>
            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <span>📄</span>
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <span>📊</span>
                Export Excel
              </button>
            </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Diaries</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{statistics.totalDiaries}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Acknowledged</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{statistics.acknowledgedDiaries}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Submitted</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{statistics.submittedDiaries}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Draft</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{statistics.draftDiaries}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Completion Rate</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{statistics.completionRate}%</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-sm text-red-600 font-medium">Issues Reported</div>
          <div className="text-2xl font-bold text-red-900 mt-1">{statistics.issuesCount}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diary Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Diary Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weather Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Weather Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={weatherChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {weatherChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Manpower Trend */}
      {manpowerByDate && manpowerByDate.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Manpower Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={manpowerByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="workers" stroke="#3B82F6" strokeWidth={2} name="Total Workers" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Diaries Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Diary Entries</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weather</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {diaries.slice(0, 10).map((diary) => (
                <tr key={diary.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {format(new Date(diary.diary_date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm">{diary.weather_conditions || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      diary.status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                      diary.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {diary.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">
                    {diary.work_progress || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {diary.issues_delays ? (
                      <span className="text-red-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {diaries.length > 10 && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            Showing 10 of {diaries.length} diaries. Export to see all.
          </p>
        )}
      </div>
          </>
        );
      })()}
    </div>
  );
};

export default ProgressReport;
