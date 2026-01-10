// frontend/src/pages/reports/FinancialReport.js  
// CONSISTENT FORMAT - Matching BOQ structure with comprehensive sections

import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { getFinancialReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';

const FinancialReport = ({ contractId, contract }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadReportData();
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getFinancialReportData(contractId, startDate, endDate);
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

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'RM 0.00';
    return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    doc.text('FINANCIAL REPORT', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 28);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 34);

    // Summary Table
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Claims', stats.totalClaims || 0],
        ['Total Claimed', formatCurrency(stats.totalClaimAmount)],
        ['Total Paid', formatCurrency(stats.totalPaid)],
        ['Retention Held', formatCurrency(stats.totalRetention)],
        ['Contract Value', formatCurrency(stats.contractValue)],
        ['Progress', `${stats.progressPercentage || 0}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    // Payment Timeline
    if (reportData?.paymentTimeline?.length > 0) {
      doc.addPage();
      
      doc.setFontSize(14);
      doc.text('Payment Timeline', 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['Claim No.', 'Date', 'Amount', 'Certified', 'Retention', 'Status']],
        body: reportData.paymentTimeline.map(p => [
          p.claimNumber,
          formatDate(p.claimDate),
          formatCurrency(p.amount),
          formatCurrency(p.certified),
          formatCurrency(p.retention),
          p.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' }
        }
      });
    }

    doc.save(`Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ============================================
  // EXPORT TO EXCEL
  // ============================================
  const exportToExcel = () => {
    const stats = reportData?.statistics || {};
    
    const summaryData = [
      ['Financial Report'],
      ['Period:', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Generated:', formatDate(new Date())],
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

  const hasNoData = !reportData?.statistics?.totalClaims || reportData.statistics.totalClaims === 0;

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
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      )}

      {/* No Data */}
      {!loading && hasNoData && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financial Data</h3>
          <p className="text-gray-600">Create claims to see financial analysis.</p>
        </div>
      )}

      {/* Main Content */}
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

            {/* Financial Overview Table */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
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
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Total Claims</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{stats.totalClaims}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Total Claimed Amount</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">{formatCurrency(stats.totalClaimAmount)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Total Paid</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{formatCurrency(stats.totalPaid)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Retention Held</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-yellow-600">{formatCurrency(stats.totalRetention)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">Contract Value</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">{formatCurrency(stats.contractValue)}</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="px-6 py-4 text-sm font-bold text-blue-900">Progress Percentage</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-blue-900">{stats.progressPercentage}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Contract Progress</h3>
                <span className="text-2xl font-bold text-blue-600">{stats.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ width: `${stats.progressPercentage}%` }}
                >
                  {stats.progressPercentage > 10 && `${stats.progressPercentage}%`}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>Start</span>
                <span>{formatCurrency(stats.totalPaid)} / {formatCurrency(stats.contractValue)}</span>
                <span>Complete</span>
              </div>
            </div>

            {/* Cumulative Chart */}
            {reportData.cumulativeData && reportData.cumulativeData.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Claim Amount</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} name="Cumulative (RM)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Breakdown Chart */}
            {reportData.monthlyBreakdown && reportData.monthlyBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Claims Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Number of Claims" />
                    <Bar yAxisId="right" dataKey="amount" fill="#10b981" name="Amount (RM)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payment Timeline Table */}
            {reportData.paymentTimeline && reportData.paymentTimeline.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Timeline</h3>
                  <span className="text-sm text-gray-500">{reportData.paymentTimeline.length} claims</span>
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
          reportType="financial"
          reportData={reportData}
          contract={contract}
        />
      )}
    </div>
  );
};

export default FinancialReport;
