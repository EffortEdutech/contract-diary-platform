// frontend/src/lib/reports/diaryPdfBuilder.js
// Diary Report PDF Builder with charts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  formatDateMY
} from '../../utils/reports/BaseReportExporter';

import { 
  generateStatusChartImage,
  generateMonthlyProgressChart
} from '../../utils/reports/chartGenerators';

/**
 * Build Diary Summary Report PDF
 * Structure: Summary → Weather Chart → Manpower Chart → All Diaries
 */
export const buildDiaryPdf = async ({ data, settings, contract }) => {
  console.log('==========================================');
  console.log('DIARY PDF BUILDER CALLED');
  console.log('Data structure:', Object.keys(data));
  console.log('==========================================');

  // Start with PORTRAIT
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // DIARY HEADER
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DIARY SUMMARY REPORT', pageWidth / 2, 15, { align: 'center' });
  console.log('✅ Added DIARY header');

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
  const includeWeatherChart = settings.content?.includeStatusChart !== false; // Using statusChart flag
  const includeManpowerChart = settings.content?.includeSectionProgress !== false; // Using sectionProgress flag
  const includeDiariesList = true; // Always show diaries

  console.log('Content flags:', {
    includeSummary,
    includeWeatherChart,
    includeManpowerChart,
    includeDiariesList
  });

  const stats = data.statistics || {};

  // ===========================================
  // PAGE 1: SUMMARY TABLE (PORTRAIT)
  // ===========================================
  if (includeSummary) {
    console.log('Adding diary summary...');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DIARY OVERVIEW', 14, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      head: [['Metric', 'Value']],
      body: [
        ['Total Diaries', stats.totalDiaries || 0],
        ['Total Photos', stats.totalPhotos || 0],
        ['Issues Reported', stats.issuesCount || 0]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right' }
      }
    });

    console.log('✅ Diary summary added');
  }

  // ===========================================
  // PAGE 2: WEATHER PIE CHART (LANDSCAPE)
  // ===========================================
  const weatherData = Object.entries(stats.weatherDistribution || {}).map(([name, value]) => ({ name, value }));
  
  if (includeWeatherChart && weatherData.length > 0) {
    console.log('Adding weather chart...');
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('WEATHER DISTRIBUTION', 14, 20);

    try {
      const chartImage = await generateStatusChartImage(weatherData);
      
      if (chartImage) {
        // Landscape page width
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 200);
        const chartHeight = (chartWidth / 600) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Weather chart added (landscape page)');
      } else {
        console.warn('⚠️ Weather chart generation returned null');
        doc.setFontSize(10);
        doc.text('Chart could not be generated', 20, 30);
      }
    } catch (error) {
      console.error('❌ Weather chart error:', error);
      doc.setFontSize(10);
      doc.text('Error: ' + error.message, 20, 30);
    }
  }

  // ===========================================
  // PAGE 3: MANPOWER BAR CHART (LANDSCAPE)
  // ===========================================
  const manpowerData = Object.entries(data.manpowerSummary || {}).map(([category, info]) => ({
    month: category,  // Using 'month' field for X-axis compatibility
    value: parseFloat(info.avgWorkers || 0),
    count: info.totalWorkers || 0
  }));
  
  if (includeManpowerChart && manpowerData.length > 0) {
    console.log('Adding manpower chart...');
    
    // NEW PAGE - LANDSCAPE for chart
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MANPOWER BY TRADE', 14, 20);

    try {
      const chartImage = await generateMonthlyProgressChart(manpowerData);
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Manpower chart added (landscape page)');
      } else {
        console.warn('⚠️ Manpower chart generation returned null');
        doc.setFontSize(10);
        doc.text('Chart could not be generated', 20, 30);
      }
    } catch (error) {
      console.error('❌ Manpower chart error:', error);
      doc.setFontSize(10);
      doc.text('Error: ' + error.message, 20, 30);
    }
  }

  // ===========================================
  // PAGE 4: ALL DIARIES TABLE (PORTRAIT)
  // ===========================================
  const diaries = data.diaries || [];
  
  console.log('Diaries list length:', diaries.length);

  if (includeDiariesList && diaries.length > 0) {
    console.log('Adding diaries list...');
    
    // NEW PAGE - PORTRAIT for table
    doc.addPage('a4', 'portrait');
    cursorY = 30;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ALL DIARIES', 14, cursorY);
    cursorY += 8;

    // Create diaries table
    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      head: [[
        'Date',
        'Weather',
        'Temp.',
        'Manpower',
        'Photos',
        'Status'
      ]],
      body: diaries.map(diary => [
        formatDateMY(diary.diary_date),
        diary.weather || '-',
        diary.temperature ? `${diary.temperature}°C` : '-',
        diary.total_manpower || 0,
        diary.photo_count || 0,
        (diary.status || 'draft').toUpperCase()
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 30, halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 }
    });

    console.log('✅ Diaries list added');
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
  console.log('✅ DIARY PDF generation complete');
  console.log(`📄 Total pages: ${finalPageCount}`);
  console.log('==========================================');

  return doc;
};
