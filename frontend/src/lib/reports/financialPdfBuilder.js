// frontend/src/lib/reports/financialPdfBuilder.js
// REFACTORED VERSION - With Chart Metadata Support

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  formatCurrencyMY,
  formatDateMY
} from '../../utils/reports/BaseReportExporter';

import { 
  generateCumulativeChart,
  generateDualBarChart
} from '../../utils/reports/chartGenerators';

export const buildFinancialPdf = async ({ data, settings, contract }) => {
  console.log('==========================================');
  console.log('FINANCIAL PDF BUILDER CALLED (REFACTORED)');
  console.log('Has chartMetadata:', !!data.chartMetadata);
  console.log('==========================================');

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

  const includeSummary = settings.content?.includeSummary !== false;
  const includeCumulativeChart = settings.content?.includeStatusChart !== false;
  const includeMonthlyChart = settings.content?.includeSectionProgress !== false;
  const includeTimeline = true;

  const stats = data.statistics || {};

  // ===========================================
  // PAGE 1: FINANCIAL SUMMARY (PORTRAIT)
  // ===========================================
  if (includeSummary) {
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
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // ✅ USE METADATA TITLE
    const chartTitle = data.chartMetadata?.cumulativeChart?.title || 'CUMULATIVE CLAIM AMOUNT';
    doc.text(chartTitle, 14, 20);

    try {
      // ✅ PASS METADATA
      const chartImage = await generateCumulativeChart(
        data.cumulativeData,
        data.chartMetadata?.cumulativeChart
      );
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Cumulative chart added with metadata');
      }
    } catch (error) {
      console.error('❌ Cumulative chart error:', error);
    }
  }

  // ===========================================
  // PAGE 3: MONTHLY BREAKDOWN DUAL BAR (LANDSCAPE)
  // ===========================================
  if (includeMonthlyChart && data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // ✅ USE METADATA TITLE
    const chartTitle = data.chartMetadata?.monthlyBreakdown?.title || 'MONTHLY CLAIMS BREAKDOWN';
    doc.text(chartTitle, 14, 20);

    try {
      // ✅ USE DUAL BAR CHART WITH METADATA
      const chartImage = await generateDualBarChart(
        data.monthlyBreakdown,
        data.chartMetadata?.monthlyBreakdown
      );
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Monthly breakdown chart added with dual bars');
      }
    } catch (error) {
      console.error('❌ Monthly chart error:', error);
    }
  }

  // ===========================================
  // PAGE 4: PAYMENT TIMELINE (PORTRAIT)
  // ===========================================
  const timeline = data.paymentTimeline || [];
  
  if (includeTimeline && timeline.length > 0) {
    doc.addPage('a4', 'portrait');
    cursorY = 30;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT TIMELINE', 14, cursorY);
    cursorY += 8;

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
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 25, halign: 'center' }
      }
    });

    console.log('✅ Payment timeline added');
  }

  // ===========================================
  // FOOTER ON ALL PAGES
  // ===========================================
  if (settings.footer?.showPageNumbers || settings.footer?.showGeneratedDate) {
    const pageCount = doc.internal.getNumberOfPages();
    
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

  console.log('✅ FINANCIAL PDF complete');
  console.log('==========================================');

  return doc;
};

export default buildFinancialPdf;
