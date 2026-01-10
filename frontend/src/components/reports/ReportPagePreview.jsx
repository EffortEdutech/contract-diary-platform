// frontend/src/components/reports/ReportPagePreview.jsx
// Visual page preview component - Shows actual page representations

import React from 'react';

const ReportPagePreview = ({ pages }) => {
  if (!pages || pages.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
        <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-gray-500">No sections selected</p>
        <p className="text-xs text-gray-400 mt-1">Select at least one section to preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-gray-600 uppercase mb-2">
        PDF Preview ({pages.length} page{pages.length > 1 ? 's' : ''})
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {pages.map((page, index) => (
          <div
            key={index}
            className={`
              bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden
              ${page.orientation === 'landscape' ? 'aspect-[1.41/1]' : 'aspect-[1/1.41]'}
            `}
            style={{
              width: page.orientation === 'landscape' ? '100%' : '70%',
              margin: page.orientation === 'landscape' ? '0' : '0 auto'
            }}
          >
            {/* Page Header */}
            <div className="bg-gray-100 border-b border-gray-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  Page {index + 1}
                </span>
                <span className="text-xs text-gray-500 flex items-center">
                  {page.orientation === 'portrait' ? '📄' : '🖼️'} {page.orientation}
                </span>
              </div>
            </div>

            {/* Page Content */}
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-800 mb-2">
                {page.title}
              </div>
              <div className="space-y-1">
                {page.contentItems?.map((item, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="text-xs text-gray-600">{item}</span>
                  </div>
                ))}
              </div>

              {/* Visual element indicator */}
              {page.hasChart && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <svg className="w-8 h-8 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <span className="text-xs text-blue-600 font-medium">Chart</span>
                  </div>
                </div>
              )}

              {page.hasTable && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-blue-100 h-2 rounded"></div>
                      <div className="bg-blue-100 h-2 rounded"></div>
                      <div className="bg-blue-100 h-2 rounded"></div>
                      <div className="bg-gray-200 h-1.5 rounded"></div>
                      <div className="bg-gray-200 h-1.5 rounded"></div>
                      <div className="bg-gray-200 h-1.5 rounded"></div>
                      <div className="bg-gray-200 h-1.5 rounded"></div>
                      <div className="bg-gray-200 h-1.5 rounded"></div>
                      <div className="bg-gray-200 h-1.5 rounded"></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block text-center">Table</span>
                  </div>
                </div>
              )}
            </div>

            {/* Page Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {page.footer}
                </span>
                <span className="text-xs text-gray-400">
                  Page {index + 1}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-gray-300">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Total pages:</span>
            <span className="font-medium">{pages.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Portrait pages:</span>
            <span className="font-medium">{pages.filter(p => p.orientation === 'portrait').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Landscape pages:</span>
            <span className="font-medium">{pages.filter(p => p.orientation === 'landscape').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPagePreview;
