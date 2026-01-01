// frontend/src/components/reports/DateRangeFilter.js
// Reusable date range filter component for reports
import React from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const DateRangeFilter = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => {
  const handleQuickDateRange = (range) => {
    const today = new Date();
    switch (range) {
      case 'thisMonth':
        onStartDateChange(format(startOfMonth(today), 'yyyy-MM-dd'));
        onEndDateChange(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        onStartDateChange(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        onEndDateChange(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last3Months':
        onStartDateChange(format(subMonths(today, 3), 'yyyy-MM-dd'));
        onEndDateChange(format(today, 'yyyy-MM-dd'));
        break;
      case 'last6Months':
        onStartDateChange(format(subMonths(today, 6), 'yyyy-MM-dd'));
        onEndDateChange(format(today, 'yyyy-MM-dd'));
        break;
      case 'thisYear':
        onStartDateChange(format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'));
        onEndDateChange(format(today, 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Quick Date Range Buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 self-center mr-2">Quick Select:</span>
        <button
          onClick={() => handleQuickDateRange('thisMonth')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          This Month
        </button>
        <button
          onClick={() => handleQuickDateRange('lastMonth')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Last Month
        </button>
        <button
          onClick={() => handleQuickDateRange('last3Months')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Last 3 Months
        </button>
        <button
          onClick={() => handleQuickDateRange('last6Months')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Last 6 Months
        </button>
        <button
          onClick={() => handleQuickDateRange('thisYear')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          This Year
        </button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
