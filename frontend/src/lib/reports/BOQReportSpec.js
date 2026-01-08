const BOQReportSpec = {
  id: 'boq-progress',

  defaultSettings: {
    includeSummary: true,
    includeStatusChart: true,
    includeSections: true,
    includeItems: false
  },

  sectionOrder: [
    'summary',
    'statusChart',
    'sections',
    'items'
  ]
};

export default BOQReportSpec;
