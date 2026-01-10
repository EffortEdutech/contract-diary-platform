// frontend/src/utils/reports/BaseReportExporter.js
// Core PDF creation utility for Malaysian construction reports

import jsPDF from 'jspdf';

/**
 * Create a base PDF document with Malaysian formatting
 * @param {Object} options - PDF configuration options
 * @returns {jsPDF} - Configured PDF document
 */
export const createBasePdf = (options = {}) => {
  const { settings = {}, contract = null } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add header if enabled
  if (settings.header?.showContractInfo && contract) {
    addContractHeader(doc, contract);
  }

  return doc;
};

/**
 * Add contract information header to PDF
 * @param {jsPDF} doc - PDF document
 * @param {Object} contract - Contract data
 */
const addContractHeader = (doc, contract) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRACT REPORT', pageWidth / 2, 15, { align: 'center' });

  // Contract details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let y = 22;
  doc.text(`Contract No: ${contract.contract_number || 'N/A'}`, 14, y);
  y += 5;
  doc.text(`Project: ${contract.project_name || 'N/A'}`, 14, y);
  y += 5;
  doc.text(`Client: ${contract.client_name || 'N/A'}`, 14, y);

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, pageWidth - 14, y + 2);
};

/**
 * Apply header and footer to all pages in PDF
 * @param {Object} options - Configuration options
 */
export const applyHeaderFooter = (options) => {
  const { doc, header = {}, footer = {}, contract = null } = options;

  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Add header to each page
    if (header.showContractInfo && contract) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${contract.project_name || 'N/A'}`, 14, 8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, 8, { align: 'right' });
    }

    // Add footer to each page
    if (footer.showPageNumber) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${formatDateMY(new Date())}`,
        14,
        pageHeight - 10
      );

      if (footer.showPageNumber) {
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    }
  }
};

/**
 * Format date in Malaysian DD/MM/YYYY format
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateMY = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format currency in Malaysian Ringgit
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrencyMY = (amount) => {
  if (amount === null || amount === undefined) return 'RM 0.00';
  return `RM ${Number(amount).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format number with Malaysian thousand separator
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number string
 */
export const formatNumberMY = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0.00';
  return Number(num).toLocaleString('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Add page break if content exceeds page height
 * @param {jsPDF} doc - PDF document
 * @param {number} currentY - Current Y position
 * @param {number} requiredSpace - Required space for next content
 * @returns {number} - New Y position after page break
 */
export const checkPageBreak = (doc, currentY, requiredSpace = 20) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20;

  if (currentY + requiredSpace > pageHeight - bottomMargin) {
    doc.addPage();
    return 20; // Reset to top margin
  }

  return currentY;
};

/**
 * Add section title with background
 * @param {jsPDF} doc - PDF document
 * @param {string} title - Section title
 * @param {number} y - Y position
 * @returns {number} - New Y position after title
 */
export const addSectionTitle = (doc, title, y) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Background rectangle
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');

  // Title text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 16, y);

  return y + 10;
};
