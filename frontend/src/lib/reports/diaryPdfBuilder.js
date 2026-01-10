// frontend/src/lib/reports/diaryPdfBuilder.js
// FIXED VERSION - Correct data structure for manpower chart

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  formatDateMY
} from '../../utils/reports/BaseReportExporter';

import { 
  generateStatusChartImage,
  generateMonthlyProgressChart
} from '../../utils/reports/chartGenerators';

export const buildDiaryPdf = async ({ data, settings, contract }) => {
  console.log('==========================================');
  console.log('DIARY PDF BUILDER CALLED (REFACTORED - FIXED)');
  console.log('Has chartMetadata:', !!data.chartMetadata);
  console.log('==========================================');

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
  const includeWeatherChart = settings.content?.includeStatusChart !== false;
  const includeManpowerChart = settings.content?.includeSectionProgress !== false;
  const includeDiariesList = true;

  const stats = data.statistics || {};

  // ===========================================
  // PAGE 1: SUMMARY TABLE (PORTRAIT)
  // ===========================================
  if (includeSummary) {
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
    console.log('Weather data for PDF:', weatherData);
    
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // ✅ USE METADATA TITLE
    const chartTitle = data.chartMetadata?.weatherChart?.title || 'WEATHER DISTRIBUTION';
    doc.text(chartTitle, 14, 20);

    try {
      // ✅ PASS METADATA
      const chartImage = await generateStatusChartImage(
        weatherData,
        data.chartMetadata?.weatherChart
      );
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 200);
        const chartHeight = (chartWidth / 600) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Weather chart added with metadata');
      }
    } catch (error) {
      console.error('❌ Weather chart error:', error);
    }
  }

  // ===========================================
  // PAGE 3: MANPOWER BAR CHART (LANDSCAPE)
  // ===========================================
  // ✅ FIXED: Use correct data structure matching HTML
  const manpowerData = Object.entries(data.manpowerSummary || {}).map(([category, info]) => ({
    category: category,  // ✅ Matches xAxisKey from metadata
    avgWorkers: parseFloat(info.avgWorkers || 0),  // ✅ Matches dataset[0].key
    totalWorkers: info.totalWorkers || 0  // ✅ Matches dataset[1].key
  }));
  
  console.log('Manpower data for PDF:', manpowerData);
  
  if (includeManpowerChart && manpowerData.length > 0) {
    doc.addPage('a4', 'landscape');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // ✅ USE METADATA TITLE
    const chartTitle = data.chartMetadata?.manpowerChart?.title || 'MANPOWER BY TRADE';
    doc.text(chartTitle, 14, 20);

    try {
      // ✅ PASS METADATA
      const chartImage = await generateMonthlyProgressChart(
        manpowerData,
        data.chartMetadata?.manpowerChart
      );
      
      if (chartImage) {
        const landscapeWidth = doc.internal.pageSize.getWidth();
        const chartWidth = Math.min(landscapeWidth - 40, 220);
        const chartHeight = (chartWidth / 700) * 400;
        
        doc.addImage(chartImage, 'PNG', 20, 30, chartWidth, chartHeight);
        console.log('✅ Manpower chart added with metadata');
      } else {
        console.warn('⚠️ Manpower chart returned null');
      }
    } catch (error) {
      console.error('❌ Manpower chart error:', error);
    }
  }

  // ===========================================
  // PAGE 4: ALL DIARIES TABLE (PORTRAIT)
  // ===========================================
  const diaries = data.diaries || [];
  
  if (includeDiariesList && diaries.length > 0) {
    doc.addPage('a4', 'portrait');
    cursorY = 30;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ALL DIARIES', 14, cursorY);
    cursorY += 8;

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
        diary.weather_conditions || '-',
        diary.temperature ? `${diary.temperature}°C` : '-',
        diary.total_manpower || 0,
        diary.photo_count || 0,
        (diary.status || 'draft').toUpperCase()
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 30, halign: 'center' }
      }
    });

    console.log('✅ Diaries list added');
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

  console.log('✅ DIARY PDF complete');
  console.log('==========================================');

  return doc;
};

export default buildDiaryPdf;
