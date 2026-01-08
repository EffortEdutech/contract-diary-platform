import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { createBasePdf } from '../../utils/reports/BaseReportExporter';
import { generateStatusChartImage } from '../../utils/reports/chartGenerators';

export const buildBOQPdf = async ({ data, settings, contract }) => {
  const doc = createBasePdf({ settings, contract });

  let cursorY = 30;
  const content = settings.content || {};

  if (content.includeSummary && data.summary) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Items', data.summary.total],
        ['Completed', data.summary.completed],
        ['In Progress', data.summary.inProgress],
        ['Not Started', data.summary.notStarted],
        ['Completion %', `${data.summary.completionPercentage}%`]
      ]
    });

    cursorY = doc.lastAutoTable.finalY + 10;
  }

  if (content.includeStatusChart && data.statusData?.length) {
    doc.addPage();
    const img = await generateStatusChartImage(data.statusData);
    doc.addImage(img, 'PNG', 20, 30, 170, 120);
  }

  if (content.includeSections && data.sections?.length) {
    doc.addPage();
    autoTable(doc, {
      startY: 30,
      head: [['Section', 'Total', 'Completed', '%']],
      body: data.sections.map(s => [
        `${s.section_number} - ${s.title}`,
        s.totalItems,
        s.completedItems,
        `${s.progress}%`
      ])
    });
  }

  if (content.includeItems && data.items?.length) {
    doc.addPage();
    autoTable(doc, {
      startY: 30,
      head: [['Item', 'Description', 'Qty', 'Done', '%']],
      body: data.items.map(i => [
        i.item_number,
        i.description,
        i.quantity,
        i.quantity_done || 0,
        `${i.percentage_complete || 0}%`
      ])
    });
  }

  return doc;
};
