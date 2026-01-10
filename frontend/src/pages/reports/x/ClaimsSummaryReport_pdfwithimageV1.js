// frontend/src/pages/reports/ClaimsSummaryReport.js
// With internal date filter
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { format, subMonths } from 'date-fns';
import { getClaimsSummaryReportData } from '../../services/reportService';
import DateRangeFilter from '../../components/reports/DateRangeFilter';

const ClaimsSummaryReport = ({ contractId }) => {
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
      const data = await getClaimsSummaryReportData(contractId, startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error('Error loading claims summary:', err);
      // Don't set error - let component show empty state instead
      setReportData({
        totalClaims: 0,
        statusData: [],
        monthlyTrend: [],
        processingTimes: [],
        avgProcessingTime: 0,
        allClaims: []
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    'Draft': '#6b7280',
    'Submitted': '#f59e0b',
    'Approved': '#8b5cf6',
    'Certified': '#3b82f6',
    'Paid': '#10b981'
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

  const addHeaderFooter = (doc, subtitle = '') => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageNumber = doc.internal.getNumberOfPages();

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('USAHA KITA BINA SDN. BHD.', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Claims Summary Report FY ${new Date().getFullYear()}`, 14, 18);

    if (subtitle) {
      doc.text(subtitle, pageWidth - 14, 18, { align: 'right' });
    }

    doc.setDrawColor(200);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(8);
    doc.text(
      `Generated on ${formatDate(new Date().toISOString())}`,
      14,
      pageHeight - 10
    );
    doc.text(
      `Page ${pageNumber}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: 'right' }
    );
  };

  const captureChartImage = async (elementId) => {
    const node = document.getElementById(elementId);
    if (!node) return null;

    return await toPng(node, {
      backgroundColor: 'white',
      pixelRatio: 2
    });
  };

  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    addHeaderFooter(doc, 'Summary');

    doc.setFontSize(16);
    doc.text('Claims Summary Report', 14, 30);

    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Claims', reportData?.totalClaims || 0],
        ['Avg Processing Time', `${reportData?.avgProcessingTime || 0} days`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    if (reportData?.allClaims?.length > 0) {
      doc.addPage();
      addHeaderFooter(doc, 'Claims List');

      autoTable(doc, {
        startY: 30,
        head: [['Claim No.', 'Date', 'Amount (RM)', 'Status']],
        body: reportData.allClaims.map(c => [
          c.claim_number,
          formatDate(c.claim_date),
          formatCurrency(c.claim_amount),
          c.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          2: { halign: 'right' }
        }
      });
    }

    // --- Charts (LANDSCAPE) ---
    const statusImg = await captureChartImage('status-chart');
    if (statusImg) {
      doc.addPage('a4', 'landscape');
      addHeaderFooter(doc, 'Claims by Status');
      doc.text('Claims Distribution by Status', 14, 30);
      const imgProps = doc.getImageProperties(statusImg);
      const ratio = imgProps.width / imgProps.height;
      const height = 110;
      const width = height * ratio;
      doc.addImage(statusImg, 'PNG', 14, 40, width, height);
    }

    const monthlyImg = await captureChartImage('monthly-chart');
    if (monthlyImg) {
      doc.addPage('a4', 'landscape');
      addHeaderFooter(doc, 'Monthly Trend');
      doc.text('Monthly Claims Trend', 14, 30);
      const imgProps = doc.getImageProperties(monthlyImg);
      const ratio = imgProps.width / imgProps.height;
      const height = 110;
      const width = height * ratio;
      doc.addImage(monthlyImg, 'PNG', 14, 40, width, height);      
    }

    doc.save(`Claims_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    // =========================
    // SUMMARY SHEET DATA
    // =========================
    const summaryRows = [
      ['Claims Summary Report'],
      ['Company', 'USAHA KITA BINA SDN. BHD.'],
      ['Period', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Generated', formatDate(new Date().toISOString())],
      [],
      ['Metric', 'Value'],
      ['Total Claims', reportData.totalClaims],
      ['Avg Processing Time (days)', reportData.avgProcessingTime]
    ];

    // =========================
    // CLAIMS TABLE DATA
    // =========================
    const claimsRows = reportData.allClaims?.length
      ? [
          [],
          ['Claims List'],
          ['Claim No.', 'Date', 'Amount (RM)', 'Status'],
          ...reportData.allClaims.map(c => [
            c.claim_number,
            formatDate(c.claim_date),
            c.claim_amount, // keep number for Excel
            c.status
          ])
        ]
      : [];

    // =========================
    // CREATE WORKBOOK
    // =========================
    const worksheet = XLSX.utils.aoa_to_sheet([
      ...summaryRows,
      ...claimsRows
    ]);

    // Format RM column (Excel style)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = 0; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 2 });
      if (worksheet[cellAddress] && typeof worksheet[cellAddress].v === 'number') {
        worksheet[cellAddress].z = '"RM"#,##0.00';
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims Summary');

    XLSX.writeFile(
      workbook,
      `Claims_Summary_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };


  // Always render filter and conditional content together
  const hasNoData = !reportData?.totalClaims || reportData.totalClaims === 0;

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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
          <div className="text-purple-400 text-5xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Data</h3>
          <p className="text-gray-500">
            No claims found for the selected date range. Create claims to see summary analysis.
          </p>
        </div>
      )}

      {/* Main Content - Only when data exists */}
      {!loading && !hasNoData && (
        <>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Total Claims</div>
          <div className="text-3xl font-bold text-gray-900">{reportData.totalClaims}</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Average Processing Time</div>
          <div className="text-3xl font-bold text-blue-700">{reportData.avgProcessingTime} days</div>
        </div>
      </div>

      {/* Status Distribution Chart */}
      {reportData.statusData && reportData.statusData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims by Status</h3>
          <div id="status-chart">
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
                  dataKey="value"
                >
                  {reportData.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {reportData.monthlyTrend && reportData.monthlyTrend.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Claims Trend</h3>
          <div id="monthly-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Number of Claims" />
                <Bar yAxisId="right" dataKey="amount" fill="#10b981" name="Total Amount (RM)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Processing Time Analysis */}
      {reportData.processingTimes && reportData.processingTimes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Time by Claim</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim No.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Processing Days</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.processingTimes.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.claimNumber}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.days <= 7 ? 'bg-green-100 text-green-800' :
                        item.days <= 14 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.days} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'paid' ? 'bg-green-100 text-green-800' :
                        item.status === 'certified' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                        item.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
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

      {/* Claims List */}
      {reportData.allClaims && reportData.allClaims.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Claims</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.allClaims.map((claim, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{claim.claim_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(claim.claim_date)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(claim.claim_amount)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        claim.status === 'paid' ? 'bg-green-100 text-green-800' :
                        claim.status === 'certified' ? 'bg-blue-100 text-blue-800' :
                        claim.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                        claim.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
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
      )}
    </div>
  );
};

export default ClaimsSummaryReport;
