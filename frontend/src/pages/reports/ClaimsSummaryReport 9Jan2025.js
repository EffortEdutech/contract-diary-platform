// frontend/src/pages/reports/ClaimsSummaryReport.js
// UPDATED VERSION - With Claims Overview and Claims List sections

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { getClaimsSummaryReportData } from '../../services/reportService';
import UniversalExportModal from '../../components/reports/UniversalExportModal';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = {
  'Draft': '#9ca3af',
  'Submitted': '#fbbf24',
  'Approved': '#8b5cf6',
  'Paid': '#10b981'
};

const ClaimsSummaryReport = ({ contract }) => {
  const { contractId } = useParams();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const hasNoData = !reportData || reportData.totalClaims === 0;

  useEffect(() => {
    loadReportData();
  }, [contractId, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await getClaimsSummaryReportData(contractId, startDate, endDate);
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'RM 0.00';
    return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Date Filter - ALWAYS VISIBLE */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadReportData}
            disabled={loading}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>
        
        <button
          onClick={() => setShowExport(true)}
          disabled={hasNoData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span>Export PDF</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading claims data...</p>
        </div>
      )}

      {/* No Data State */}
      {!loading && hasNoData && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Claims Data Available</h3>
          <p className="text-gray-600">
            Create claims to see summary analysis.
          </p>
        </div>
      )}

      {/* Main Content */}
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

          {/* ========================================
              SECTION 1: CLAIMS OVERVIEW TABLE
          ======================================== */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Overview</h3>
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
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{reportData.totalClaims}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Average Processing Time</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">{reportData.avgProcessingTime} days</td>
                  </tr>
                  
                  {/* Status Breakdown */}
                  {reportData.statusData && reportData.statusData.length > 0 && (
                    <>
                      <tr className="bg-gray-50">
                        <td colSpan="2" className="px-6 py-3 text-sm font-bold text-gray-700 uppercase">Status Breakdown</td>
                      </tr>
                      {reportData.statusData.map((status, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700 pl-12">• {status.name}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{status.value}</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Monthly Summary */}
                  {reportData.monthlyTrend && reportData.monthlyTrend.length > 0 && (
                    <>
                      <tr className="bg-gray-50">
                        <td colSpan="2" className="px-6 py-3 text-sm font-bold text-gray-700 uppercase">Monthly Summary</td>
                      </tr>
                      {reportData.monthlyTrend.map((month, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700 pl-12">• {month.month}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <span className="font-medium text-gray-900">{month.count} claims</span>
                            <span className="text-gray-500 ml-2">({formatCurrency(month.amount)})</span>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Distribution Chart */}
          {reportData.statusData && reportData.statusData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims by Status</h3>
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
          )}

          {/* Monthly Trend Chart */}
          {reportData.monthlyTrend && reportData.monthlyTrend.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Claims Trend</h3>
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
          )}

          {/* ========================================
              SECTION 2: CLAIMS LIST TABLE
          ======================================== */}
          {reportData.allClaims && reportData.allClaims.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Claims List</h3>
                <span className="text-sm text-gray-500">{reportData.allClaims.length} total claims</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Submitted</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Retention</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Net Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.allClaims.map((claim, index) => (
                      <tr key={claim.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {claim.claim_number}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate" title={claim.claim_title}>
                          {claim.claim_title}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(claim.claim_period_from)} - {formatDate(claim.claim_period_to)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(claim.submission_date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(claim.claim_amount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(claim.retention_amount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                          {formatCurrency(claim.net_claim_amount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                            claim.status === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                            claim.status === 'approved' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                            claim.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            claim.status === 'draft' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                            'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(reportData.allClaims.reduce((sum, claim) => sum + (claim.claim_amount || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">
                        {formatCurrency(reportData.allClaims.reduce((sum, claim) => sum + (claim.retention_amount || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                        {formatCurrency(reportData.allClaims.reduce((sum, claim) => sum + (claim.net_claim_amount || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      {showExport && reportData && (
        <UniversalExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          reportType="claims"
          reportData={reportData}
          contract={contract}
        />
      )}
    </div>
  );
};

export default ClaimsSummaryReport;
