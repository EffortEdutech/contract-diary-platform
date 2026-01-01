// frontend/src/pages/reports/BOQProgressReport.js
// FIXED VERSION - Added null safety for summary object
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getBOQProgressReportData } from '../../services/reportService';

const BOQProgressReport = ({ contractId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReportData();
  }, [contractId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBOQProgressReportData(contractId);
      setReportData(data);
    } catch (err) {
      console.error('Error loading BOQ progress report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    'Completed': '#10b981',
    'In Progress': '#f59e0b',
    'Not Started': '#6b7280'
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('BOQ Progress Report', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-MY', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })}`, 14, 22);
    
    if (reportData?.boq) {
      doc.text(`BOQ: ${reportData.boq.boq_number} - ${reportData.boq.title}`, 14, 28);
    }

    const summary = reportData?.summary || {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0
    };

    doc.autoTable({
      startY: 35,
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

    if (reportData?.sections && reportData.sections.length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Section', 'Items', 'Completed', 'Progress %']],
        body: reportData.sections.map(section => [
          section.title,
          section.totalItems,
          section.completedItems,
          `${section.progress}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    doc.save(`BOQ_Progress_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
      ...reportData.sections.map(section => [
        section.title,
        section.totalItems,
        section.completedItems,
        `${section.progress}%`
      ])
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

      {/* Charts */}
      {reportData.statusData && reportData.statusData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Status Distribution</h3>
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
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sections Progress */}
      {reportData.sections && reportData.sections.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Section</h3>
          <div className="space-y-4">
            {reportData.sections.map((section) => (
              <div key={section.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{section.section_number} - {section.title}</h4>
                    <p className="text-sm text-gray-500">
                      {section.completedItems} / {section.totalItems} items completed
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">{section.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${section.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Table */}
      {reportData.items && reportData.items.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Detail</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Done</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity_done || 0} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.percentage_complete >= 100 ? 'bg-green-100 text-green-800' :
                        item.percentage_complete > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.percentage_complete || 0}%
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
    </div>
  );
};

export default BOQProgressReport;
