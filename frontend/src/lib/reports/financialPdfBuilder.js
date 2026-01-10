// frontend/src/lib/reports/financialPdfBuilder.js
// Financial Report PDF Builder with charts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  formatCurrencyMY,
  formatDateMY
} from '../../utils/reports/BaseReportExporter';

import { 
  generateCumulativeChart,
  generateMonthlyProgressChart
} from '../../utils/reports/chartGenerators';

/**
 * Build Financial Report PDF
 * Structure: Summary → Cumulative Chart → Monthly Chart → Payment Timeline
 */
export const buildFinancialPdf = async ({ data, settings, contract }) => {
  console.log('==========================================');
  console.log('FINANCIAL PDF BUILDER CALLED');
  console.log('Data structure:', Object.keys(data));
  console.log('Settings:', settings);
  console.log('==========================================');

  // Start with PORTRAIT
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // FINANCIAL HEADER
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL REPORT', pageWidth / 2, 15, { align: 'center' });
  console.log('✅ Added FINANCIAL header');

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
  const includeCumulativeChart = settings.content?.includeStatusChart !== false; // Using statusChart flag
  const includeMonthlyChart = settings.content?.includeSectionProgress !== false; // Using sectionProgress flag
  const includeTimeline = true; // Always show timeline

  console.log('Content flags:', {
    includeSummary,
    includeCumulativeChart,
    includeMonthlyChart,
    includeTimeline
  });

  const stats = data.statistics || {};

  // ===========================================
  // PAGE 1: FINANCIAL SUMMARY (PORTRAIT)
  // ===========================================
  if (includeSummary) {
    console.log('Adding financial summary...');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL OVERVIEW', 14, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      head: [['Metric', 'Value']],
      body: [
        ['Total Claims', stats.totalClaims || 0],
        ['Total Claimed', formatCurrencyMY(stats.totalClaimAmount || 0)],
        ['Total Paid', formatCurrencyMY(stats.totalPaid || 0)],
        ['Retention Held', formatCurrencyMY(stats.totalRetention || 0)],
        ['Contract Value', formatCurrencyMY(stats.contractValue || 0)],
        ['Progress', `${stats.progressPercentage || 0}%`]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right' }
      }
    });

    console.log('✅ Financial summary added');
  }

  // ===========================================
  // PAGE 2: CUMULATIVE CHART (LANDSCAPE)
  // ===========================================
  if (includeCumulativeChart && data.cumulativeData && data.cumulativeData.length > 0) {
    console.log('Adding cumulative chart...');
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CUMULATIVE CLAIM AMOUNT', 14, 20);

    try {
      const chartImage = await generateCumulativeChart(data.cumulativeData);
      
      if (chartImage) {
        // Landscape page width
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Cumulative chart added (landscape page)');
      } else {
        console.warn('⚠️ Cumulative chart generation returned null');
        doc.setFontSize(10);
        doc.text('Chart could not be generated', 20, 30);
      }
    } catch (error) {
      console.error('❌ Cumulative chart error:', error);
      doc.setFontSize(10);
      doc.text('Error: ' + error.message, 20, 30);
    }
  }

  // ===========================================
  // PAGE 3: MONTHLY BREAKDOWN CHART (LANDSCAPE)
  // ===========================================
  if (includeMonthlyChart && data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
    console.log('Adding monthly breakdown chart...');
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTHLY CLAIMS BREAKDOWN', 14, 20);

    try {
      // Format data for chart - need to map to expected format
      const monthlyData = data.monthlyBreakdown.map(item => ({
        month: item.month,
        value: item.amount || 0,  // Use amount as primary value
        count: item.count || 0    // Keep count as secondary
      }));

      const chartImage = await generateMonthlyProgressChart(monthlyData);
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Monthly breakdown chart added (landscape page)');
      } else {
        console.warn('⚠️ Monthly chart generation returned null');
        doc.setFontSize(10);
        doc.text('Chart could not be generated', 20, 30);
      }
    } catch (error) {
      console.error('❌ Monthly chart error:', error);
      doc.setFontSize(10);
      doc.text('Error: ' + error.message, 20, 30);
    }
  }

  // ===========================================
  // PAGE 4: PAYMENT TIMELINE TABLE (PORTRAIT)
  // ===========================================
  const timeline = data.paymentTimeline || [];
  
  console.log('Payment timeline length:', timeline.length);

  if (includeTimeline && timeline.length > 0) {
    console.log('Adding payment timeline...');
    
    // NEW PAGE - PORTRAIT for table
    doc.addPage('a4', 'portrait');
    cursorY = 30;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT TIMELINE', 14, cursorY);
    cursorY += 8;

    // Create payment timeline table
    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      head: [[
        'Claim No.',
        'Date',
        'Amount',
        'Certified',
        'Retention',
        'Status'
      ]],
      body: timeline.map(payment => [
        payment.claimNumber || '-',
        formatDateMY(payment.claimDate),
        formatCurrencyMY(payment.amount || 0),
        formatCurrencyMY(payment.certified || 0),
        formatCurrencyMY(payment.retention || 0),
        (payment.status || 'pending').toUpperCase()
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 25, halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 }
    });

    console.log('✅ Payment timeline added');
  }

  // ===========================================
  // FOOTER ON ALL PAGES
  // ===========================================
  if (settings.footer?.showPageNumbers || settings.footer?.showGeneratedDate) {
    const pageCount = doc.internal.getNumberOfPages();
    
    console.log(`Adding footers to ${pageCount} pages...`);
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const currentPageHeight = doc.internal.pageSize.getHeight();
      const currentPageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      if (settings.footer.showGeneratedDate) {
        doc.text(`Generated: ${formatDateMY(new Date())}`, 14, currentPageHeight - 10);
      }
      
      if (settings.footer.showPageNumbers) {
        doc.text(`Page ${i} of ${pageCount}`, currentPageWidth - 14, currentPageHeight - 10, { align: 'right' });
      }
    }
  }

  const finalPageCount = doc.internal.getNumberOfPages();
  console.log('✅ FINANCIAL PDF generation complete');
  console.log(`📄 Total pages: ${finalPageCount}`);
  console.log('==========================================');

  return doc;
};
