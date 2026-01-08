import autoTable from 'jspdf-autotable';
import { createBasePdf, applyHeaderFooter } from '../../utils/reports/BaseReportExporter';

export const buildClaimsPdf = async ({ data, settings, contract }) => {
  const doc = createBasePdf();
  let cursorY = 30;

  const addSectionTitle = (text) => {
    doc.setFontSize(13);
    doc.text(text, 14, cursorY);
    cursorY += 8;
  };

  /* =====================
     CLAIM SUMMARY
  ===================== */
  if (settings.content.includeSummary) {
    addSectionTitle('Claim Summary');

    const c = data.claim || {};
    const s = data.summary || {};

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      body: [
        ['Claim No', c.claim_number || '-'],
        ['Claim Title', c.claim_title || '-'],
        ['Claim Type', c.claim_type || '-'],
        ['Period', `${c.period_from || ''} – ${c.period_to || ''}`],
        ['Total Claimed', s.totalClaimed || 0],
        ['Total Certified', s.totalCertified || 0],
        ['Balance', s.balance || 0]
      ]
    });

    cursorY = doc.lastAutoTable.finalY + 10;
  }

  /* =====================
     CLAIM ITEMS
  ===================== */
  if (settings.content.includeItems && data.items?.length) {
    doc.addPage();
    cursorY = 30;

    addSectionTitle('Claim Items');

    autoTable(doc, {
      startY: cursorY,
      head: [[
        'Item No',
        'Description',
        'Claimed (RM)',
        'Certified (RM)',
        'Status'
      ]],
      body: data.items.map(i => [
        i.item_number,
        i.description,
        formatMoney(i.claimed_amount),
        formatMoney(i.certified_amount),
        i.status
      ])
    });
  }

  /* =====================
     APPLY HEADER / FOOTER
  ===================== */
  applyHeaderFooter({
    doc,
    header: settings.header,
    footer: settings.footer,
    contract
  });

  return doc;
};

/* =====================
   HELPERS
===================== */
const formatMoney = (value) => {
  if (value == null) return '0.00';
  return Number(value).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
