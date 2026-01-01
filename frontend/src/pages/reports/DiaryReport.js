// frontend/src/pages/reports/DiaryReport.js
import React, { useState, useEffect } from 'react';
import { getDiaryReportData } from '../../services/reportService';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, subMonths } from 'date-fns';
import DateRangeFilter from '../../components/reports/DateRangeFilter';

const DiaryReport = ({ contractId }) => {
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
      const data = await getDiaryReportData(contractId, startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error('Error loading diary report:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const { contract, statistics, issuesDelays, manpowerSummary } = reportData;

    doc.setFontSize(18);
    doc.text('Diary Summary Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Contract: ${contract.contract_number} - ${contract.project_name}`, 14, 28);
    doc.text(`Period: ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 34);

    doc.setFontSize(14);
    doc.text('Summary', 14, 46);

    const summaryData = [
      ['Metric', 'Value'],
      ['Total Diaries', statistics.totalDiaries],
      ['Total Photos', statistics.totalPhotos],
      ['Issues Reported', statistics.issuesCount]
    ];

    doc.autoTable({
      startY: 50,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Diary_Report_${contract.contract_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const { contract, diaries, issuesDelays, manpowerSummary, equipmentUtilization } = reportData;
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Diary Summary Report'],
      ['Contract', contract.contract_number],
      ['Project', contract.project_name],
      ['Period', `${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Issues sheet
    const ws2 = XLSX.utils.json_to_sheet(issuesDelays);
    XLSX.utils.book_append_sheet(wb, ws2, 'Issues & Delays');

    XLSX.writeFile(wb, `Diary_Report_${contract.contract_number}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Always render filter and conditional content together
  const hasNoData = !reportData || !reportData.diaries || reportData.diaries.length === 0;

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
      {!loading && !error && hasNoData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-yellow-600 text-5xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Data Available</h3>
          <p className="text-yellow-700">No diaries found for the selected date range.</p>
        </div>
      )}

      {/* Main Content - Only when data exists */}
      {!loading && !error && !hasNoData && (() => {
        const { contract, statistics, issuesDelays, manpowerSummary, equipmentUtilization } = reportData;

        const weatherData = Object.entries(statistics.weatherDistribution).map(([name, value]) => ({ name, value }));
        const manpowerData = Object.entries(manpowerSummary).map(([category, data]) => ({
          category,
          avgWorkers: parseFloat(data.avgWorkers),
          totalWorkers: data.totalWorkers
        }));

        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        return (
          <>

      {/* Export Buttons */}
      <div className="flex gap-3">
        <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <span>📄</span> Export PDF
        </button>
        <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <span>📊</span> Export Excel
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Diaries</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{statistics.totalDiaries}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Total Photos</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{statistics.totalPhotos}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-sm text-red-600 font-medium">Issues Reported</div>
          <div className="text-2xl font-bold text-red-900 mt-1">{statistics.issuesCount}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Weather Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={weatherData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {weatherData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Manpower Summary */}
        {manpowerData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Manpower by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={manpowerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgWorkers" fill="#3B82F6" name="Avg Workers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Issues and Delays Table */}
      {issuesDelays.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Issues and Delays</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues / Delays</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuesDelays.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3 text-sm">{item.issues}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                        item.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
          </>
        );
      })()}
    </div>
  );
};

export default DiaryReport;
