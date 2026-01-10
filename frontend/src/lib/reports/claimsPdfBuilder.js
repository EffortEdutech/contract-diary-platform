// frontend/src/lib/reports/claimsPdfBuilder.js
// COMPLETE REFACTORED VERSION - With Chart Metadata Support

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  formatCurrencyMY,
  formatDateMY
} from '../../utils/reports/BaseReportExporter';

import { 
  generateStatusChartImage,
  generateDualBarChart
} from '../../utils/reports/chartGenerators';

/**
 * Build Claims Summary Report PDF
 * ✅ REFACTORED: Uses chartMetadata from reportService
 * ✅ Uses generateDualBarChart for monthly trend (count + amount)
 */
export const buildClaimsPdf = async ({ data, settings, contract }) => {
  console.log('==========================================');
  console.log('CLAIMS PDF BUILDER CALLED (REFACTORED)');
  console.log('Data keys:', Object.keys(data));
  console.log('Has chartMetadata:', !!data.chartMetadata);
  console.log('==========================================');

  // Start with PORTRAIT
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // CLAIMS HEADER
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CLAIMS SUMMARY REPORT', pageWidth / 2, 15, { align: 'center' });
  console.log('✅ Added CLAIMS header');

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
  const includeMonthlyChart = settings.content?.includeSectionProgress !== false;
  const includeClaimsList = true; // Always show claims list

  console.log('Content flags:', {
    includeSummary,
    includeStatusChart,
    includeMonthlyChart,
    includeClaimsList
  });

  // ===========================================
  // SECTION 1: SUMMARY TABLE (PORTRAIT)
  // ===========================================
  if (includeSummary) {
    console.log('Adding summary section...');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLAIMS OVERVIEW', 14, cursorY);
    cursorY += 8;

    const summaryData = [];
    
    if (data.totalClaims !== undefined) {
      summaryData.push(['Total Claims', data.totalClaims]);
    }
    
    if (data.avgProcessingTime !== undefined) {
      summaryData.push(['Avg Processing Time', `${data.avgProcessingTime} days`]);
    }

    // Status breakdown
    if (data.statusData && data.statusData.length > 0) {
      summaryData.push(['', '']); // Blank row
      summaryData.push(['STATUS BREAKDOWN', '']);
      data.statusData.forEach(status => {
        summaryData.push([`  ${status.name}`, status.value]);
      });
    }

    if (summaryData.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        theme: 'grid',
        head: [['Metric', 'Value']],
        body: summaryData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 70, halign: 'right' }
        }
      });

      console.log('✅ Summary table added');
    }
  }

  // ===========================================
  // SECTION 2: STATUS PIE CHART (LANDSCAPE)
  // ===========================================
  if (includeStatusChart && data.statusData && data.statusData.length > 0) {
    console.log('Adding status chart...');
    console.log('Chart metadata:', data.chartMetadata?.statusChart);
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // ✅ USE METADATA FOR TITLE
    const chartTitle = data.chartMetadata?.statusChart?.title || 'CLAIMS BY STATUS';
    doc.text(chartTitle, 14, 20);

    try {
      // ✅ PASS METADATA TO CHART GENERATOR
      const chartImage = await generateStatusChartImage(
        data.statusData,
        data.chartMetadata?.statusChart  // ✅ Pass metadata
      );
      
      if (chartImage) {
        // Landscape page width
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 200);
        const chartHeight = (chartWidth / 600) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Status chart added (landscape page) with metadata');
      } else {
        console.warn('⚠️ Status chart generation returned null');
        doc.setFontSize(10);
        doc.text('Chart could not be generated', 20, 30);
      }
    } catch (error) {
      console.error('❌ Status chart error:', error);
      doc.setFontSize(10);
      doc.text('Error: ' + error.message, 20, 30);
    }
  }

  // ===========================================
  // SECTION 3: MONTHLY TREND DUAL BAR CHART (LANDSCAPE)
  // ===========================================
  if (includeMonthlyChart && data.monthlyTrend && data.monthlyTrend.length > 0) {
    console.log('Adding monthly trend chart...');
    console.log('Chart metadata:', data.chartMetadata?.monthlyTrend);
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // ✅ USE METADATA FOR TITLE
    const chartTitle = data.chartMetadata?.monthlyTrend?.title || 'MONTHLY CLAIMS TREND';
    doc.text(chartTitle, 14, 20);

    try {
      // ✅ USE NEW generateDualBarChart WITH METADATA
      const chartImage = await generateDualBarChart(
        data.monthlyTrend,
        data.chartMetadata?.monthlyTrend  // ✅ Pass metadata
      );
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Monthly trend chart added (landscape page) with dual bars and metadata');
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
  // SECTION 4: CLAIMS LIST TABLE (PORTRAIT)
  // ===========================================
  const claimsList = data.allClaims || [];
  
  console.log('Claims list length:', claimsList.length);

  if (includeClaimsList && claimsList.length > 0) {
    console.log('Adding claims list...');
    
    // NEW PAGE - PORTRAIT for table
    doc.addPage('a4', 'portrait');
    let cursorY = 30;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLAIMS LIST', 14, cursorY);
    cursorY += 8;

    // Create detailed claims table
    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      head: [[
        'No.',
        'Title',
        'Date',
        'Amount',
        'Status'
      ]],
      body: claimsList.map(claim => [
        claim.claim_number || '',
        claim.claim_title || '',
        formatDateMY(claim.submission_date),
        formatCurrencyMY(claim.claim_amount || 0),
        claim.status || ''
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 25 }
      }
    });

    console.log('✅ Claims list added');
  } else {
    console.log('⏭️ Claims list skipped or empty');
  }

  // ===========================================
  // FOOTER ON ALL PAGES
  // ===========================================
  if (settings.footer?.showPageNumbers || settings.footer?.showGeneratedDate) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      const currentPageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      if (settings.footer.showGeneratedDate) {
        doc.text(`Generated: ${formatDateMY(new Date())}`, 14, pageHeight - 10);
      }
      
      if (settings.footer.showPageNumbers) {
        doc.text(`Page ${i} of ${pageCount}`, currentPageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    }
  }

  console.log('✅ CLAIMS PDF generation complete');
  console.log('Total pages:', doc.internal.getNumberOfPages());
  console.log('==========================================');

  return doc;
};

export default buildClaimsPdf;
