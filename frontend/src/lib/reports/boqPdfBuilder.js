// frontend/src/lib/reports/boqPdfBuilder.js
// FIXED VERSION - With debug logging and guaranteed content rendering

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  formatNumberMY,
  formatDateMY
} from '../../utils/reports/BaseReportExporter';

import { 
  generateStatusChartImage
} from '../../utils/reports/chartGenerators';

/**
 * Build BOQ Progress Report PDF
 * FIXED: Proper content rendering, correct title, per-section orientation
 */
export const buildBOQPdf = async ({ data, settings, contract }) => {
  console.log('==========================================');
  console.log('BOQ PDF BUILDER CALLED');
  console.log('Settings:', settings);
  console.log('Data:', data);
  console.log('Contract:', contract);
  console.log('==========================================');

  // Start with PORTRAIT
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // BOQ HEADER
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ PROGRESS REPORT', pageWidth / 2, 15, { align: 'center' });
  console.log('✅ Added BOQ header');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let y = 22;
  if (contract) {
    doc.text(`Contract: ${contract.contract_number || 'N/A'}`, 14, y);
    y += 5;
    doc.text(`Project: ${contract.project_name || 'N/A'}`, 14, y);
    y += 5;
  }

  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  let cursorY = y + 10;

  // Content flags
  const includeSummary = settings.content?.includeSummary !== false;
  const includeStatusChart = settings.content?.includeStatusChart !== false;
  const includeSectionProgress = settings.content?.includeSectionProgress !== false;
  const includeItemDetails = settings.content?.includeItemDetails === true;

  console.log('Content flags:', {
    includeSummary,
    includeStatusChart,
    includeSectionProgress,
    includeItemDetails
  });

  // ===========================================
  // SECTION 1: SUMMARY (PORTRAIT)
  // ===========================================
  if (includeSummary && data.summary) {
    console.log('Adding summary section...');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 14, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      head: [['Metric', 'Value']],
      body: [
        ['Total Items', data.summary.total || 0],
        ['Completed', data.summary.completed || 0],
        ['In Progress', data.summary.inProgress || 0],
        ['Not Started', data.summary.notStarted || 0],
        ['Progress', `${data.summary.completionPercentage || 0}%`]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    cursorY = doc.lastAutoTable.finalY + 10;
    console.log('✅ Summary added');
  } else {
    console.log('⏭️ Summary skipped');
  }

  // ===========================================
  // SECTION 2: STATUS CHART (LANDSCAPE PAGE)
  // ===========================================
  if (includeStatusChart && data.statusData && data.statusData.length > 0) {
    console.log('Adding status chart...');
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS DISTRIBUTION', 14, 20);

    try {
      const chartImage = await generateStatusChartImage(data.statusData);
      
      if (chartImage) {
        // Landscape page width
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 200);
        const chartHeight = (chartWidth / 600) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Status chart added (landscape page)');
      } else {
        console.warn('⚠️ Chart generation returned null');
        doc.setFontSize(10);
        doc.text('Chart could not be generated', 20, 30);
      }
    } catch (error) {
      console.error('❌ Chart error:', error);
      doc.setFontSize(10);
      doc.text('Error: ' + error.message, 20, 30);
    }

    // BACK TO PORTRAIT for next sections
    doc.addPage('a4', 'portrait');
    cursorY = 30;
  } else {
    console.log('⏭️ Status chart skipped');
  }

  // ===========================================
  // SECTION 3: SECTION PROGRESS (PORTRAIT)
  // ===========================================
  if (includeSectionProgress && data.sections && data.sections.length > 0) {
    console.log('Adding section progress...');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SECTION PROGRESS', 14, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      head: [['Section', 'Total', 'Done', 'Progress']],
      body: data.sections.map(s => [
        `${s.section_number || ''} - ${s.title || ''}`,
        s.totalItems || 0,
        s.completedItems || 0,
        `${formatNumberMY(s.progress || 0, 1)}%`
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    cursorY = doc.lastAutoTable.finalY + 10;
    console.log('✅ Section progress added');
  } else {
    console.log('⏭️ Section progress skipped');
  }

  // ===========================================
  // SECTION 4: ITEM DETAILS (PORTRAIT)
  // ===========================================
  if (includeItemDetails && data.items && data.items.length > 0) {
    console.log('Adding item details...');
    
    // Check if we need new page
    if (cursorY > 200) {
      doc.addPage('a4', 'portrait');
      cursorY = 30;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM DETAILS', 14, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      head: [['Item', 'Description', 'Qty', 'Done', '%']],
      body: data.items.map(i => [
        i.item_number || '',
        i.description || '',
        formatNumberMY(i.quantity || 0, 2),
        formatNumberMY(i.quantity_done || 0, 2),
        `${formatNumberMY(i.percentage_complete || 0, 1)}%`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    console.log('✅ Item details added');
  } else {
    console.log('⏭️ Item details skipped');
  }

  // ===========================================
  // FOOTER ON ALL PAGES
  // ===========================================
  if (settings.footer?.showPageNumbers || settings.footer?.showGeneratedDate) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      if (settings.footer.showGeneratedDate) {
        doc.text(`Generated: ${formatDateMY(new Date())}`, 14, pageHeight - 10);
      }
      
      if (settings.footer.showPageNumbers) {
        const currentPageWidth = doc.internal.pageSize.getWidth();
        doc.text(`Page ${i} of ${pageCount}`, currentPageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    }
  }

  console.log('✅ BOQ PDF generation complete');
  console.log('Total pages:', doc.internal.getNumberOfPages());
  console.log('==========================================');

  return doc;
};
