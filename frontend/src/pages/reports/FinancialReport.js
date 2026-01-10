// frontend/src/pages/reports/FinancialReport.js
// REFACTORED VERSION - Uses Chart Metadata

import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { getFinancialReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';
import { supabase } from '../../lib/supabase';

const FinancialReport = ({ contractId, contract: propContract }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [contract, setContract] = useState(propContract);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadReportData();
    if (!contract) {
      loadContract();
    }
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getFinancialReportData(contractId, startDate, endDate);
      console.log('Financial Report data loaded:', data);
      console.log('Has chartMetadata:', !!data.chartMetadata);
      setReportData(data);
    } catch (error) {
      console.error('Error loading financial report:', error);
      setReportData({
        statistics: {
          totalClaims: 0,
          totalClaimAmount: 0,
          totalPaid: 0,
          totalRetention: 0,
          contractValue: 0,
          progressPercentage: 0
        },
        cumulativeData: [],
        monthlyBreakdown: [],
        paymentTimeline: []
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

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'RM 0.00';
    return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    doc.text('FINANCIAL REPORT', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 28);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Claims', stats.totalClaims],
        ['Total Claim Amount', formatCurrency(stats.totalClaimAmount)],
        ['Total Paid', formatCurrency(stats.totalPaid)],
        ['Total Retention', formatCurrency(stats.totalRetention)],
        ['Contract Value', formatCurrency(stats.contractValue)],
        ['Progress %', `${stats.progressPercentage}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    if (reportData?.paymentTimeline?.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Payment Timeline', 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['Claim No.', 'Date', 'Amount', 'Status']],
        body: reportData.paymentTimeline.map(p => [
          p.claimNumber,
          formatDate(p.claimDate),
          formatCurrency(p.amount),
          p.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    doc.save(`Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Excel Export
  const exportToExcel = () => {
    const stats = reportData?.statistics || {};

    const summaryData = [
      ['Financial Report'],
      ['Period:', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Generated:', formatDate(new Date())],
      [],
      ['Summary'],
      ['Total Claims', stats.totalClaims],
      ['Total Claim Amount', stats.totalClaimAmount],
      ['Total Paid', stats.totalPaid],
      ['Total Retention', stats.totalRetention],
      ['Contract Value', stats.contractValue],
      ['Progress %', `${stats.progressPercentage}%`]
    ];

    const timelineData = reportData?.paymentTimeline?.length > 0 ? [
      [],
      ['Payment Timeline'],
      ['Claim No.', 'Date', 'Amount', 'Certified', 'Retention', 'Status'],
      ...reportData.paymentTimeline.map(p => [
        p.claimNumber,
        formatDate(p.claimDate),
        p.amount,
        p.certified,
        p.retention,
        p.status
      ])
    ] : [];

    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...timelineData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Report');
    XLSX.writeFile(wb, `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = reportData?.statistics || {};

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
          <div className="text-sm text-gray-500 mb-1">Total Claims</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalClaims}</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Total Claimed</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalClaimAmount)}</div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-600 mb-1">Progress</div>
          <div className="text-3xl font-bold text-green-700">{stats.progressPercentage}%</div>
        </div>
      </div>

      {/* Charts Row - ✅ USES METADATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cumulative Chart - ✅ USES METADATA */}
        {reportData?.cumulativeData && reportData.cumulativeData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {/* ✅ USE METADATA TITLE */}
              {reportData.chartMetadata?.cumulativeChart?.title || 'Cumulative Claim Amount'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={reportData.chartMetadata?.cumulativeChart?.xAxisKey || 'date'} />
                <YAxis />
                <Tooltip />
                <Legend />
                {reportData.chartMetadata?.cumulativeChart?.datasets?.map((dataset, index) => (
                  <Line 
                    key={index}
                    type="monotone" 
                    dataKey={dataset.key} 
                    stroke={dataset.color} 
                    strokeWidth={2} 
                    name={dataset.label} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Breakdown Dual Bar - ✅ USES METADATA */}
        {reportData?.monthlyBreakdown && reportData.monthlyBreakdown.length > 0 && reportData.chartMetadata?.monthlyBreakdown && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {/* ✅ USE METADATA TITLE */}
              {reportData.chartMetadata.monthlyBreakdown.title || 'Monthly Breakdown'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={reportData.chartMetadata.monthlyBreakdown.xAxisKey || 'month'} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                
                {/* ✅ MAP DATASETS FROM METADATA */}
                {reportData.chartMetadata.monthlyBreakdown.datasets.map((dataset, index) => (
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

      {/* Payment Timeline Table */}
      {reportData?.paymentTimeline && reportData.paymentTimeline.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Payment Timeline</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Certified</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Retention</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.paymentTimeline.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.claimNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(payment.claimDate)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(payment.certified)}</td>
                    <td className="px-4 py-3 text-sm text-right text-yellow-600">{formatCurrency(payment.retention)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.status === 'certified' ? 'bg-blue-100 text-blue-800' :
                        payment.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                        payment.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status}
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
        reportType="financial"
        reportData={reportData}
        contract={contract}
      />
    </div>
  );
};

export default FinancialReport;
