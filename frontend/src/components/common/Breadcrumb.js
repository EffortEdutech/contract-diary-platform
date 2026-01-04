// ============================================
// Breadcrumb.js - Reusable Breadcrumb Navigation
// ============================================
// Purpose: Display hierarchical navigation path
// Usage: <Breadcrumb items={breadcrumbItems} />
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';

const Breadcrumb = ({ items }) => {
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {/* Separator (except for first item) */}
            {index > 0 && (
              <svg 
                className="w-6 h-6 text-gray-400 mx-1" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
            )}

            {/* Breadcrumb item */}
            {item.href ? (
              // Clickable link
              <Link
                to={item.href}
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {item.icon && (
                  <span className="mr-2">{item.icon}</span>
                )}
                {item.label}
              </Link>
            ) : (
              // Current page (not clickable)
              <span className="inline-flex items-center text-sm font-medium text-gray-900">
                {item.icon && (
                  <span className="mr-2">{item.icon}</span>
                )}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
