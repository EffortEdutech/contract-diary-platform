// frontend/src/pages/reports/FinancialReport.js
// With internal date filter
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, subMonths } from 'date-fns';
import { getFinancialReportData } from '../../services/reportService';
import DateRangeFilter from '../../components/reports/DateRangeFilter';

const FinancialReport = ({ contractId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadReportData();
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFinancialReportData(contractId, startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error('Error loading financial report:', err);
      // Don't set error - let component show empty state instead
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Financial Report', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 22);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 28);

    const stats = reportData?.statistics || {};
    doc.autoTable({
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Total Claims', stats.totalClaims || 0],
        ['Total Claim Amount', formatCurrency(stats.totalClaimAmount)],
        ['Total Paid', formatCurrency(stats.totalPaid)],
        ['Total Retention', formatCurrency(stats.totalRetention)],
        ['Contract Value', formatCurrency(stats.contractValue)],
        ['Progress %', `${stats.progressPercentage || 0}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    if (reportData?.paymentTimeline && reportData.paymentTimeline.length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Claim No.', 'Date', 'Amount', 'Certified', 'Retention', 'Status']],
        body: reportData.paymentTimeline.map(payment => [
          payment.claimNumber,
          formatDate(payment.claimDate),
          formatCurrency(payment.amount),
          formatCurrency(payment.certified),
          formatCurrency(payment.retention),
          payment.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    doc.save(`Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const stats = reportData?.statistics || {};
    
    const summaryData = [
      ['Financial Report'],
      ['Period:', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Generated:', formatDate(new Date().toISOString())],
      [],
      ['Financial Summary'],
      ['Total Claims', stats.totalClaims || 0],
      ['Total Claim Amount', stats.totalClaimAmount || 0],
      ['Total Paid', stats.totalPaid || 0],
      ['Total Retention', stats.totalRetention || 0],
      ['Contract Value', stats.contractValue || 0],
      ['Progress %', `${stats.progressPercentage || 0}%`]
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

  // Always render filter and conditional content together
  const hasNoData = !reportData?.statistics?.totalClaims || reportData.statistics.totalClaims === 0;

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

      {/* No Data State */}
      {!loading && hasNoData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="text-blue-400 text-5xl mb-4">💰</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Data</h3>
          <p className="text-gray-500">
            No claims found for the selected date range. Create claims to see financial analysis.
          </p>
        </div>
      )}

      {/* Main Content - Only when data exists */}
      {!loading && !hasNoData && (() => {
        const stats = reportData.statistics;

        return (
          <>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Total Claims</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalClaims}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-600">Total Claimed</div>
          <div className="text-xl font-bold text-blue-700">{formatCurrency(stats.totalClaimAmount)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-600">Total Paid</div>
          <div className="text-xl font-bold text-green-700">{formatCurrency(stats.totalPaid)}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-600">Retention Held</div>
          <div className="text-xl font-bold text-yellow-700">{formatCurrency(stats.totalRetention)}</div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Contract Progress</h3>
          <span className="text-2xl font-bold text-blue-600">{stats.progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(stats.progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Contract Value: {formatCurrency(stats.contractValue)}</span>
          <span>Claimed: {formatCurrency(stats.totalClaimAmount)}</span>
        </div>
      </div>

      {/* Cumulative Progress Chart */}
      {reportData.cumulativeData && reportData.cumulativeData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Claim Amount</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="claimNumber" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} name="Cumulative Amount" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Breakdown Chart */}
      {reportData.monthlyBreakdown && reportData.monthlyBreakdown.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Claims</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="Claim Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Timeline Table */}
      {reportData.paymentTimeline && reportData.paymentTimeline.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Timeline</h3>
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

      {/* Export Buttons */}
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
      </div>
          </>
        );
      })()}
    </div>
  );
};

export default FinancialReport;
