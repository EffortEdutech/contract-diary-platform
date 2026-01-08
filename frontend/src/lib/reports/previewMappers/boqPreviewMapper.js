// src/lib/reports/previewMappers/boqPreviewMapper.js

export function boqPreviewMapper(rawData = {}, contract = {}) {
  const summary = rawData.summary || {};

  return {
    header: {
      title: 'BOQ Progress Report',
      contractNo: contract?.contract_number || '',
      projectName: contract?.project_name || '',
      employer: contract?.employer || ''
    },

    summary: {
      totalItems: summary.total ?? 0,
      completed: summary.completed ?? 0,
      inProgress: summary.inProgress ?? 0,
      notStarted: summary.notStarted ?? 0,
      completionPercentage: summary.completionPercentage ?? 0
    },

    statusChart: Array.isArray(rawData.statusData)
      ? rawData.statusData
      : [],

    sections: Array.isArray(rawData.sections)
      ? rawData.sections.map(sec => ({
          id: sec.id,
          label: `${sec.section_number} - ${sec.title}`,
          totalItems: sec.totalItems ?? 0,
          completedItems: sec.completedItems ?? 0,
          progress: sec.progress ?? 0
        }))
      : [],

    items: Array.isArray(rawData.items)
      ? rawData.items.map(item => ({
          id: item.id,
          number: item.item_number,
          description: item.description,
          quantity: `${item.quantity} ${item.unit}`,
          done: `${item.quantity_done || 0} ${item.unit}`,
          progress: item.percentage_complete || 0
        }))
      : []
  };
}
