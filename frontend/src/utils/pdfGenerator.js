// frontend/src/utils/pdfGenerator.js - FIXED VERSION
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate BOQ PDF in Malaysian PWD Form 1 style
 * @param {Object} boq - BOQ data
 * @param {Array} items - BOQ items
 * @param {Array} sections - BOQ sections
 * @param {Object} contract - Contract data
 */
export const generateBOQPDF = (boq, items, sections = [], contract = null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  // ===== HEADER =====
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL OF QUANTITIES', pageWidth / 2, 20, { align: 'center' });

  // Subheading
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('(Based on PWD Form 1)', pageWidth / 2, 26, { align: 'center' });

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  // ===== PROJECT DETAILS =====
  let yPos = 38;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  if (contract) {
    doc.text('Project Name:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.project_name || 'N/A', margin + 35, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Contract Number:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.contract_number || 'N/A', margin + 35, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Contract Type:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.contract_type || 'N/A', margin + 35, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.client_name || 'N/A', margin + 35, yPos);
  }

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ Number:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.boq_number || 'N/A', margin + 35, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ Title:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(boq.title || 'N/A', margin + 35, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-MY'), margin + 35, yPos);

  // Line separator
  yPos += 4;
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ===== PREPARE TABLE DATA =====
  const tableData = [];
  let runningNumber = 1;

  if (sections && sections.length > 0) {
    // Group items by section
    sections.forEach(section => {
      // Section header row
      tableData.push([
        {
          content: `SECTION ${section.section_number}: ${section.title.toUpperCase()}`,
          colSpan: 7,
          styles: { 
            fillColor: [220, 220, 220],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 2
          }
        }
      ]);

      // Section items
      const sectionItems = items.filter(item => item.section_id === section.id);
      sectionItems.forEach(item => {
        const amount = parseFloat(item.quantity) * parseFloat(item.unit_rate);
        tableData.push([
          runningNumber++,
          item.item_number,
          item.description,
          item.unit,
          parseFloat(item.quantity).toFixed(3),
          parseFloat(item.unit_rate).toFixed(2),
          amount.toFixed(2)
        ]);
      });
    });

    // Unsectioned items
    const unsectionedItems = items.filter(item => !item.section_id);
    if (unsectionedItems.length > 0) {
      tableData.push([
        {
          content: 'UNSECTIONED ITEMS',
          colSpan: 7,
          styles: { 
            fillColor: [240, 240, 240],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 2
          }
        }
      ]);

      unsectionedItems.forEach(item => {
        const amount = parseFloat(item.quantity) * parseFloat(item.unit_rate);
        tableData.push([
          runningNumber++,
          item.item_number,
          item.description,
          item.unit,
          parseFloat(item.quantity).toFixed(3),
          parseFloat(item.unit_rate).toFixed(2),
          amount.toFixed(2)
        ]);
      });
    }
  } else {
    // No sections - list all items
    items.forEach(item => {
      const amount = parseFloat(item.quantity) * parseFloat(item.unit_rate);
      tableData.push([
        runningNumber++,
        item.item_number,
        item.description,
        item.unit,
        parseFloat(item.quantity).toFixed(3),
        parseFloat(item.unit_rate).toFixed(2),
        amount.toFixed(2)
      ]);
    });
  }

  // ===== GENERATE TABLE WITH FIXED COLUMN WIDTHS =====
  autoTable(doc, {
    startY: yPos + 6,
    head: [[
      { content: 'No.', styles: { halign: 'center', cellWidth: 8 } },
      { content: 'Item No', styles: { halign: 'left', cellWidth: 18 } },
      { content: 'Description', styles: { halign: 'left', cellWidth: 60 } },
      { content: 'Unit', styles: { halign: 'center', cellWidth: 12 } },
      { content: 'Quantity', styles: { halign: 'right', cellWidth: 22 } },
      { content: 'Rate (RM)', styles: { halign: 'right', cellWidth: 26 } },
      { content: 'Amount (RM)', styles: { halign: 'right', cellWidth: 28 } }
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 18 },
      2: { halign: 'left', cellWidth: 60 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    didDrawPage: (data) => {
      // Footer on each page
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      doc.text(
        `Generated on ${new Date().toLocaleString('en-MY')}`,
        margin,
        pageHeight - 10
      );
    }
  });

  // ===== SUMMARY SECTION =====
  const finalY = doc.lastAutoTable.finalY + 10;
  
  // Calculate totals
  let subtotal = 0;
  let materialTotal = 0;
  
  items.forEach(item => {
    const amount = parseFloat(item.quantity) * parseFloat(item.unit_rate);
    subtotal += amount;
    
    if (item.item_type === 'material') {
      materialTotal += amount;
    }
  });

  // SST (6% on materials only in Malaysia)
  const sstRate = 0.06;
  const sst = materialTotal * sstRate;
  const grandTotal = subtotal + sst;

  // Summary box
  const summaryX = pageWidth - margin - 80;
  const summaryY = finalY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Subtotal
  doc.text('Subtotal:', summaryX, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `RM ${subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin,
    summaryY,
    { align: 'right' }
  );

  // SST
  doc.setFont('helvetica', 'bold');
  doc.text('SST (6% on materials):', summaryX, summaryY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `RM ${sst.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin,
    summaryY + 6,
    { align: 'right' }
  );

  // Line
  doc.setLineWidth(0.5);
  doc.line(summaryX, summaryY + 9, pageWidth - margin, summaryY + 9);

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GRAND TOTAL:', summaryX, summaryY + 15);
  doc.text(
    `RM ${grandTotal.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin,
    summaryY + 15,
    { align: 'right' }
  );

  // ===== SIGNATURE SECTION =====
  const sigY = summaryY + 30;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Prepared by
  doc.text('Prepared by:', margin, sigY);
  doc.line(margin, sigY + 15, margin + 60, sigY + 15);
  doc.text('Signature & Date', margin, sigY + 20);

  // Verified by
  doc.text('Verified by:', pageWidth / 2, sigY);
  doc.line(pageWidth / 2, sigY + 15, pageWidth / 2 + 60, sigY + 15);
  doc.text('Signature & Date', pageWidth / 2, sigY + 20);

  // ===== SAVE PDF =====
  const filename = `${boq.boq_number.replace(/\//g, '-')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Generate BOQ summary report (simple version)
 */
export const generateBOQSummaryPDF = (boq, summary, contract = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ SUMMARY REPORT', pageWidth / 2, 20, { align: 'center' });
  
  // Project details
  let yPos = 35;
  doc.setFontSize(10);
  
  if (contract) {
    doc.text(`Project: ${contract.project_name}`, 15, yPos);
    yPos += 7;
  }
  
  doc.text(`BOQ Number: ${boq.boq_number}`, 15, yPos);
  yPos += 7;
  doc.text(`Title: ${boq.title}`, 15, yPos);
  yPos += 7;
  doc.text(`Status: ${boq.status.toUpperCase()}`, 15, yPos);
  
  // Summary data
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 15, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Items: ${summary.itemCount}`, 15, yPos);
  yPos += 7;
  doc.text(`Subtotal: RM ${summary.subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, 15, yPos);
  yPos += 7;
  doc.text(`SST (${summary.sstRate}%): RM ${summary.sst.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, 15, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: RM ${summary.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, 15, yPos);
  
  // Save
  doc.save(`${boq.boq_number}_Summary.pdf`);
};
