// frontend/src/pages/reports/ClaimsSummaryReport.js
// COMPLETE REFACTORED VERSION - Uses Chart Metadata

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { getClaimsSummaryReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';
import { supabase } from '../../lib/supabase';

const ClaimsSummaryReport = ({ contract: propContract }) => {
  const { contractId } = useParams();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [contract, setContract] = useState(propContract);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const hasNoData = !reportData || reportData.totalClaims === 0;

  useEffect(() => {
    loadReportData();
    if (!contract) {
      loadContract();
    }
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getClaimsSummaryReportData(contractId, startDate, endDate);
      console.log('Claims Report data loaded:', data);
      console.log('Has chartMetadata:', !!data.chartMetadata);
      setReportData(data);
    } catch (error) {
      console.error('Error loading claims summary:', error);
      setReportData({
        totalClaims: 0,
        avgProcessingTime: 0,
        statusData: [],
        monthlyTrend: [],
        processingTimes: [],
        allClaims: []
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

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'RM 0.00';
    return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ✅ DEFAULT COLORS (fallback if no metadata)
  const COLORS = {
    'Draft': '#9ca3af',
    'Submitted': '#fbbf24',
    'Approved': '#8b5cf6',
    'Certified': '#3b82f6',
    'Paid': '#10b981'
  };

  // ===========================================
  // QUICK PDF EXPORT (Old Style - Direct)
  // ===========================================
  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CLAIMS SUMMARY REPORT', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 28);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 34);

    // Summary Table
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Claims', reportData.totalClaims],
        ['Avg Processing Time', `${reportData.avgProcessingTime} days`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Claims List Table
    if (reportData.allClaims?.length > 0) {
      doc.addPage();
      
      doc.setFontSize(14);
      doc.text('Claims List', 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['No.', 'Title', 'Date', 'Amount', 'Status']],
        body: reportData.allClaims.map(c => [
          c.claim_number,
          c.claim_title,
          formatDate(c.submission_date),
          formatCurrency(c.claim_amount),
          c.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          3: { halign: 'right' }
        }
      });
    }

    doc.save(`Claims_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ===========================================
  // EXCEL EXPORT
  // ===========================================
  const exportToExcel = () => {
    const summaryData = [
      ['Claims Summary Report'],
      ['Period:', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Generated:', formatDate(new Date())],
      [],
      ['Summary'],
      ['Total Claims', reportData.totalClaims],
      ['Avg Processing Time (days)', reportData.avgProcessingTime]
    ];

    const claimsData = reportData.allClaims?.length > 0 ? [
      [],
      ['Claims List'],
      ['No.', 'Title', 'Date', 'Amount', 'Status'],
      ...reportData.allClaims.map(c => [
        c.claim_number,
        c.claim_title,
        formatDate(c.submission_date),
        c.claim_amount,
        c.status
      ])
    ] : [];

    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...claimsData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Claims Summary');
    XLSX.writeFile(wb, `Claims_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ===========================================
  // LOADING & ERROR STATES
  // ===========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Date Filter - ALWAYS VISIBLE */}
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

      {/* Loading or No Data State */}
      {hasNoData ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-yellow-400 text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Data</h3>
          <p className="text-gray-500">
            No claims found for the selected date range. Try adjusting your date filter.
          </p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Total Claims</div>
              <div className="text-3xl font-bold text-gray-900">{reportData.totalClaims}</div>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Avg Processing Time</div>
              <div className="text-3xl font-bold text-blue-700">{reportData.avgProcessingTime} days</div>
            </div>
          </div>

          {/* Charts Row - ✅ USES METADATA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Status Pie Chart - ✅ USES METADATA */}
            {reportData.statusData && reportData.statusData.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {/* ✅ USE METADATA TITLE */}
                  {reportData.chartMetadata?.statusChart?.title || 'Claims by Status'}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      // ✅ USE METADATA DATA/LABEL KEYS
                      dataKey={reportData.chartMetadata?.statusChart?.dataKey || 'value'}
                      nameKey={reportData.chartMetadata?.statusChart?.labelKey || 'name'}
                    >
                      {reportData.statusData.map((entry, index) => {
                        // ✅ USE METADATA COLORS IF AVAILABLE
                        const metadata = reportData.chartMetadata?.statusChart;
                        const color = metadata?.colors?.[entry.name] || COLORS[entry.name] || '#6b7280';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Trend Bar Chart - ✅ USES METADATA */}
            {reportData.monthlyTrend && reportData.monthlyTrend.length > 0 && reportData.chartMetadata?.monthlyTrend && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {/* ✅ USE METADATA TITLE */}
                  {reportData.chartMetadata.monthlyTrend.title || 'Monthly Trend'}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={reportData.chartMetadata.monthlyTrend.xAxisKey || 'month'} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    
                    {/* ✅ MAP DATASETS FROM METADATA */}
                    {reportData.chartMetadata.monthlyTrend.datasets.map((dataset, index) => (
                      <Bar
                        key={index}
                        yAxisId={dataset.yAxis === 'left' ? 'left' : 'right'}
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

          {/* Claims Overview Table */}
          {reportData.statusData && reportData.statusData.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900">Claims Overview</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.statusData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.value}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reportData.statusData.reduce((sum, item) => sum + item.value, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Claims List Table */}
          {reportData.allClaims && reportData.allClaims.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Claims List</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.allClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {claim.claim_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{claim.claim_title}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(claim.submission_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(claim.claim_amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            claim.status === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                            claim.status === 'approved' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                            claim.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            {claim.status}
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
        </>
      )}

      {/* Universal Export Modal */}
      <UniversalExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        reportType="claims"
        reportData={reportData}
        contract={contract}
      />
    </div>
  );
};

export default ClaimsSummaryReport;
