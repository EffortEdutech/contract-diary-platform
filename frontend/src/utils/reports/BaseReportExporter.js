import jsPDF from 'jspdf';

export const createBasePdf = () => {
  return new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
};

/**
 * Apply header + footer to ALL pages
 */
export const applyHeaderFooter = ({
  doc,
  header,
  footer,
  contract
}) => {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    /* =====================
       HEADER
    ===================== */
    if (header) {
      doc.setFontSize(10);
      doc.setTextColor(40);

      if (header.title) {
        doc.setFontSize(12);
        doc.text(header.title, 14, 12);
      }

      if (header.subtitle) {
        doc.setFontSize(9);
        doc.text(header.subtitle, 14, 17);
      }

      if (header.showContractInfo && contract) {
        doc.setFontSize(8);
        const info = [
          contract.contract_number,
          contract.contract_title
        ].filter(Boolean).join(' - ');

        if (info) {
          doc.text(info, 14, 22);
        }
      }

      // separator line
      doc.setDrawColor(200);
      doc.line(14, 25, 196, 25);
    }

    /* =====================
       FOOTER
    ===================== */
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(8);
    doc.setTextColor(120);

    if (footer?.customText) {
      doc.text(footer.customText, 14, pageHeight - 10);
    }

    if (footer?.showGeneratedDate) {
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-MY')}`,
        140,
        pageHeight - 10
      );
    }

    if (footer?.showPageNumber) {
      doc.text(
        `Page ${i} of ${pageCount}`,
        196,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }
};
