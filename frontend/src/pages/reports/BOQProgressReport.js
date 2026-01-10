// frontend/src/pages/reports/BOQProgressReport.js
// COMPLETE REFACTORED VERSION - Uses Chart Metadata

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { Chart } from 'chart.js/auto';
import * as XLSX from 'xlsx';
import { getBOQProgressReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';
import { supabase } from '../../lib/supabase';

const BOQProgressReport = ({ contractId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    loadReportData();
    loadContract();  
  }, [contractId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBOQProgressReportData(contractId);
      console.log('BOQ Report data loaded:', data);
      console.log('Has chartMetadata:', !!data.chartMetadata);
      setReportData(data);
    } catch (err) {
      console.error('Error loading BOQ progress report:', err);
      setError(err.message);
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

  // ✅ DEFAULT COLORS (fallback if no metadata)
  const COLORS = {
    'Completed': '#10b981',
    'In Progress': '#f59e0b',
    'Not Started': '#6b7280'
  };

  // ===========================================
  // QUICK PDF EXPORT (Old Style - Direct)
  // ===========================================
  const addHeaderFooter = (doc, subtitle = '') => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageNumber = doc.internal.getNumberOfPages();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('USAHA KITA BINA SDN. BHD.', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('BOQ Progress Report', 14, 18);

    if (subtitle) {
      doc.text(subtitle, pageWidth - 14, 18, { align: 'right' });
    }

    doc.setDrawColor(200);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-MY')}`,
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

  const generateBOQStatusPiePNG = async (statusData) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;

    // ✅ USE METADATA COLORS IF AVAILABLE
    const colors = statusData.map(item => {
      const metadata = reportData?.chartMetadata?.statusChart;
      if (metadata?.colors && metadata.colors[item.name]) {
        return metadata.colors[item.name];
      }
      return COLORS[item.name] || '#6b7280';
    });

    new Chart(canvas, {
      type: 'pie',
      data: {
        // ✅ USE METADATA LABEL KEY IF AVAILABLE
        labels: statusData.map(d => d.name || d.label),
        datasets: [
          {
            data: statusData.map(d => d.value),
            backgroundColor: colors
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            // ✅ USE METADATA TITLE IF AVAILABLE
            text: reportData?.chartMetadata?.statusChart?.title || 'Status Distribution'
          }
        }
      }
    });

    await new Promise(r => requestAnimationFrame(r));
    return canvas.toDataURL('image/png');
  };

  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // =========================
    // PAGE 1 – SUMMARY
    // =========================
    addHeaderFooter(doc, 'Summary');

    doc.setFontSize(16);
    doc.text('BOQ Progress Report', 14, 30);

    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })}`,
      14,
      38
    );

    if (reportData?.boq) {
      doc.text(`BOQ: ${reportData.boq.boq_number} - ${reportData.boq.title}`, 14, 44);
    }

    const summary = reportData?.summary || {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0
    };

    autoTable(doc, {
      startY: 52,
      head: [['Metric', 'Value']],
      body: [
        ['Total Items', summary.total],
        ['Completed Items', summary.completed],
        ['In Progress Items', summary.inProgress],
        ['Not Started Items', summary.notStarted],
        ['Completion Percentage', `${summary.completionPercentage}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // =========================
    // PAGE 2 – SECTIONS
    // =========================
    if (reportData?.sections && reportData.sections.length > 0) {
      doc.addPage();
      addHeaderFooter(doc, 'Sections Progress');

      // Calculate progress for each section
      const sectionsWithProgress = reportData.sections.map(section => {
        const sectionItems = reportData.items?.filter(item => item.section_id === section.id) || [];
        const totalItems = sectionItems.length;
        
        const completedItems = sectionItems.filter(item => {
          const qtyDone = parseFloat(item.quantity_done) || 0;
          const qty = parseFloat(item.quantity) || 0;
          return qty > 0 && qtyDone >= qty;
        }).length;
        
        const progress = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;
        
        return {
          title: section.title,
          totalItems,
          completedItems,
          progress
        };
      });

      autoTable(doc, {
        startY: 30,
        head: [['Section', 'Total Items', 'Completed', 'Progress %']],
        body: sectionsWithProgress.map(section => [
          section.title,
          section.totalItems,
          section.completedItems,
          `${section.progress}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    // =========================
    // PAGE 3 – STATUS PIE (LANDSCAPE)
    // =========================
    if (reportData?.statusData?.length > 0) {
      const pieImg = await generateBOQStatusPiePNG(reportData.statusData);

      doc.addPage('a4', 'landscape');
      addHeaderFooter(doc, 'Completion Status');

      doc.setFontSize(14);
      // ✅ USE METADATA TITLE
      const chartTitle = reportData?.chartMetadata?.statusChart?.title || 'BOQ Completion Status Distribution';
      doc.text(chartTitle, 14, 30);

      const pageWidth = doc.internal.pageSize.getWidth();
      const chartSize = 110;
      const x = (pageWidth - chartSize) / 2;

      doc.addImage(pieImg, 'PNG', x, 40, chartSize, chartSize);
    }

    // =========================
    // SAVE
    // =========================
    doc.save(
      `BOQ_Progress_Report_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  // ===========================================
  // EXCEL EXPORT
  // ===========================================
  const exportToExcel = () => {
    const summary = reportData?.summary || {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0
    };

    const summaryData = [
      ['BOQ Progress Report'],
      ['Generated:', new Date().toLocaleDateString('en-MY')],
      [],
      ['Summary'],
      ['Total Items', summary.total],
      ['Completed Items', summary.completed],
      ['In Progress Items', summary.inProgress],
      ['Not Started Items', summary.notStarted],
      ['Completion %', `${summary.completionPercentage}%`]
    ];

    const sectionsData = reportData?.sections?.length > 0 ? [
      [],
      ['Sections Progress'],
      ['Section', 'Total Items', 'Completed', 'Progress %'],
      ...reportData.sections.map(section => {
        const sectionItems = reportData.items?.filter(item => item.section_id === section.id) || [];
        const totalItems = sectionItems.length;
        const completedItems = sectionItems.filter(item => {
          const qtyDone = parseFloat(item.quantity_done) || 0;
          const qty = parseFloat(item.quantity) || 0;
          return qty > 0 && qtyDone >= qty;
        }).length;
        const progress = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;
        
        return [section.title, totalItems, completedItems, `${progress}%`];
      })
    ] : [];

    const itemsData = reportData?.items?.length > 0 ? [
      [],
      ['Items Detail'],
      ['Item Number', 'Description', 'Quantity', 'Done', 'Progress %'],
      ...reportData.items.map(item => [
        item.item_number,
        item.description,
        item.quantity,
        item.quantity_done || 0,
        `${item.percentage_complete || 0}%`
      ])
    ] : [];

    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...sectionsData, ...itemsData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ Progress');
    XLSX.writeFile(wb, `BOQ_Progress_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium mb-2">Error Loading Report</h3>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!reportData?.boq) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <div className="text-yellow-400 text-5xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No BOQ Available</h3>
        <p className="text-gray-500">
          No approved BOQ found for this contract. Please create and approve a BOQ first.
        </p>
      </div>
    );
  }

  const summary = reportData.summary || {
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    completionPercentage: 0
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-600">Completed</div>
          <div className="text-2xl font-bold text-green-700">{summary.completed}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-600">In Progress</div>
          <div className="text-2xl font-bold text-yellow-700">{summary.inProgress}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Not Started</div>
          <div className="text-2xl font-bold text-gray-700">{summary.notStarted}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-600">Completion</div>
          <div className="text-2xl font-bold text-blue-700">{summary.completionPercentage}%</div>
        </div>
      </div>

      {/* Status Chart - ✅ USES METADATA */}
      {reportData.statusData && reportData.statusData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {/* ✅ USE METADATA TITLE */}
            {reportData.chartMetadata?.statusChart?.title || 'Completion Status Distribution'}
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

      {/* Sections Table */}
      {reportData.sections && reportData.sections.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Section Progress</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.sections.map((section) => {
                  const sectionItems = reportData.items?.filter(item => item.section_id === section.id) || [];
                  const totalItems = sectionItems.length;
                  const completedItems = sectionItems.filter(item => {
                    const qtyDone = parseFloat(item.quantity_done) || 0;
                    const qty = parseFloat(item.quantity) || 0;
                    return qty > 0 && qtyDone >= qty;
                  }).length;
                  const progress = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;

                  return (
                    <tr key={section.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {section.section_number} - {section.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{totalItems}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{completedItems}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{progress}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Buttons - BOQ STYLE (3 buttons) */}
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
        reportType="boq"
        reportData={reportData}
        contract={contract}
      />
    </div>
  );
};

export default BOQProgressReport;
