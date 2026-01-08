// frontend/src/pages/reports/ClaimsSummaryReport.js
// UI charts = Recharts
// PDF charts = Chart.js (offscreen canvas, deterministic sizing)

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart } from 'chart.js/auto';
import * as XLSX from 'xlsx';

import { format, subMonths } from 'date-fns';
import { getClaimsSummaryReportData } from '../../services/reportService';
import DateRangeFilter from '../../components/reports/DateRangeFilter';

import ExportReportModal from '../../components/reports/ExportReportModal';

/* ============================================================
   CONFIG
============================================================ */

const COMPANY_NAME = 'USAHA KITA BINA SDN. BHD.';

const STATUS_COLORS = {
  Draft: '#6b7280',
  Submitted: '#f59e0b',
  Approved: '#8b5cf6',
  Certified: '#3b82f6',
  Paid: '#10b981'
};

/* ============================================================
   UTILITY FUNCTIONS
============================================================ */

const formatCurrency = (amount) =>
  new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount || 0);

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

/* ============================================================
   PDF HELPERS
============================================================ */

const addHeaderFooter = (doc, subtitle = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageNumber = doc.internal.getNumberOfPages();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(COMPANY_NAME, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Claims Summary Report FY ${new Date().getFullYear()}`, 14, 18);

  if (subtitle) {
    doc.text(subtitle, pageWidth - 14, 18, { align: 'right' });
  }

  doc.setDrawColor(200);
  doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

  doc.setFontSize(8);
  doc.text(`Generated on ${formatDate(new Date().toISOString())}`, 14, pageHeight - 10);
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
};

/* ============================================================
   CHART.JS PDF GENERATORS (OFFSCREEN)
============================================================ */

// Pie Chart (square, perfect for status distribution)
const generateStatusPiePNG = async (statusData) => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;

  new Chart(canvas, {
    type: 'pie',
    data: {
      labels: statusData.map(d => d.name),
      datasets: [{
        data: statusData.map(d => d.value),
        backgroundColor: statusData.map(
          d => STATUS_COLORS[d.name] || '#6b7280'
        )
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // ⏳ WAIT for render
  await new Promise(resolve => requestAnimationFrame(resolve));

  return canvas.toDataURL('image/png');
};


// Bar Chart (wide, landscape)
const generateMonthlyBarPNG = async (monthlyTrend) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: monthlyTrend.map(d => d.month),
      datasets: [
        {
          label: 'Claims',
          data: monthlyTrend.map(d => d.count),
          backgroundColor: '#3b82f6',
          yAxisID: 'yCount'
        },
        {
          label: 'Amount (RM)',
          data: monthlyTrend.map(d => d.amount),
          backgroundColor: '#10b981',
          yAxisID: 'yAmount'
        }
      ]
    },
    options: {
      responsive: false,
      animation: false,
      scales: {
        yCount: { beginAtZero: true },
        yAmount: {
          position: 'right',
          beginAtZero: true,
          ticks: {
            callback: v => `RM ${v.toLocaleString()}`
          }
        }
      }
    }
  });

  // ⏳ WAIT
  await new Promise(resolve => requestAnimationFrame(resolve));

  return canvas.toDataURL('image/png');
};


/* ============================================================
   COMPONENT
============================================================ */

const ClaimsSummaryReport = ({ contractId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showExport, setShowExport] = useState(false);

  const hasNoData =
    !reportData ||
    reportData.totalClaims === 0;

  
  useEffect(() => {
    loadReportData();
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getClaimsSummaryReportData(contractId, startDate, endDate);
      setReportData(data);
    } catch {
      setReportData({
        totalClaims: 0,
        avgProcessingTime: 0,
        statusData: [],
        monthlyTrend: [],
        allClaims: []
      });
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     PDF EXPORT
  ============================================================ */


  const exportToPDF = async () => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // =========================
  // PAGE 1 – SUMMARY (PORTRAIT)
  // =========================
  addHeaderFooter(doc, 'Summary');

  doc.setFontSize(16);
  doc.text('Claims Summary Report', 14, 30);

  doc.setFontSize(10);
  doc.text(
    `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`,
    14,
    38
  );

  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: [
      ['Total Claims', reportData.totalClaims],
      ['Avg Processing Time', `${reportData.avgProcessingTime} days`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  // =========================
  // PAGE 2 – CLAIMS TABLE
  // =========================
  if (reportData.allClaims?.length > 0) {
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

  // =========================
  // PAGE 3 – STATUS PIE (LANDSCAPE)
  // =========================
  if (reportData.statusData?.length > 0) {
    const statusImg = await generateStatusPiePNG(reportData.statusData);

    doc.addPage('a4', 'landscape');
    addHeaderFooter(doc, 'Claims by Status');

    doc.setFontSize(14);
    doc.text('Claims Distribution by Status', 14, 30);

    // Center square chart
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartSize = 110;
    const x = (pageWidth - chartSize) / 2;

    doc.addImage(statusImg, 'PNG', x, 40, chartSize, chartSize);
  }

  // =========================
  // PAGE 4 – MONTHLY TREND (LANDSCAPE)
  // =========================
  if (reportData.monthlyTrend?.length > 0) {
    const monthlyImg = await generateMonthlyBarPNG(reportData.monthlyTrend);

    doc.addPage('a4', 'landscape');
    addHeaderFooter(doc, 'Monthly Trend');

    doc.setFontSize(14);
    doc.text('Monthly Claims Trend', 14, 30);

    doc.addImage(monthlyImg, 'PNG', 14, 40, 260, 120);
  }

  // =========================
  // SAVE
  // =========================
  doc.save(
    `Claims_Summary_${new Date().toISOString().split('T')[0]}.pdf`
  );
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




  /* ============================================================
     UI
  ============================================================ */

  if (loading) {
    return <div className="h-64 flex items-center justify-center">Loading…</div>;
  }

return (
  <div className="space-y-6">
    {/* Date Filter – always visible */}
    <DateRangeFilter
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
    />

    {/* Loading */}
    {loading && (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )}

    {/* No Data */}
    {!loading && hasNoData && (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
        <div className="text-5xl mb-4">📄</div>
        <h3 className="text-lg font-medium mb-2">
          No Claims Data
        </h3>
        <p className="text-gray-600">
          No claims found for the selected period.
        </p>
      </div>
    )}

    {/* MAIN CONTENT */}
    {!loading && !hasNoData && (
      <>
        {/* ===== STATUS PIE (UI) ===== */}
        {reportData.statusData?.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              Claims by Status
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {reportData.statusData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        STATUS_COLORS[entry.name] ||
                        '#6b7280'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ===== MONTHLY BAR (UI) ===== */}
        {reportData.monthlyTrend?.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              Monthly Claims Trend
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  name="Number of Claims"
                />
                <Bar
                  dataKey="amount"
                  fill="#10b981"
                  name="Amount (RM)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ===== EXPORT BUTTON ===== */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            📄 Export PDF
          </button>

          <ExportReportModal
            open={showExport}
            onClose={() => setShowExport(false)}
            reportType="claims"
            reportData={reportData}
            contract={reportData.contract}
          />


          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
