// frontend/src/utils/reports/chartGenerators.js
// UPDATED VERSION - WITH PERCENTAGE LABELS ON PIE CHARTS

import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';  // ✅ NEW: For percentage labels

/**
 * Wait for animation/rendering to complete
 */
const waitForChart = (ms = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ===========================================
// 1. PIE CHART - Status Distribution
// ===========================================
/**
 * Generate status distribution pie chart as base64 PNG
 * ✅ FIXED: Accepts both 'name' and 'label' fields
 * ✅ Uses metadata for colors if provided
 * ✅ NEW: Shows percentages on pie slices
 * 
 * @param {Array} statusData - Array of {name/label, value} objects
 * @param {Object} metadata - Chart configuration from reportService
 * @returns {Promise<string|null>} - Base64 encoded PNG image
 */
export const generateStatusChartImage = async (statusData, metadata = {}) => {
  if (!statusData || statusData.length === 0) {
    console.warn('No status data provided for chart');
    return null;
  }

  console.log('Generating status chart with data:', statusData);
  console.log('Using metadata:', metadata);

  // Create offscreen canvas with proper A4-friendly dimensions
  const canvas = document.createElement('canvas');
  canvas.width = 600;   // Good width for A4 (fits ~170mm at 72 DPI)
  canvas.height = 400;  // Good height, maintains aspect ratio

  // Add to DOM temporarily (required for some browsers)
  canvas.style.position = 'absolute';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Default colors
  const defaultColors = [
    '#10b981', // green - completed
    '#f59e0b', // yellow - in progress  
    '#6b7280', // gray - not started
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ef4444'  // red
  ];

  try {
    // Get colors from metadata or use defaults
    const colors = statusData.map((item, index) => {
      const itemName = item.name || item.label;
      if (metadata.colors && metadata.colors[itemName]) {
        return metadata.colors[itemName];
      }
      return defaultColors[index % defaultColors.length];
    });

    // Create Chart.js pie chart
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        // ✅ FIXED: Accept both 'label' and 'name' fields
        labels: statusData.map(d => d.label || d.name || 'Unknown'),
        datasets: [{
          data: statusData.map(d => d.value || 0),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      plugins: [ChartDataLabels],  // ✅ NEW: Enable datalabels plugin
      options: {
        responsive: false,
        maintainAspectRatio: true,
        animation: {
          duration: 0 // Disable animation for faster rendering
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 10,
              font: {
                size: 11
              },
              boxWidth: 15
            }
          },
          title: {
            display: true,
            text: metadata.title || 'Status Distribution',
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 10
            }
          },
          
          // ✅ NEW: Configure percentage labels on pie slices
          datalabels: {
            formatter: (value, ctx) => {
              // Calculate percentage
              const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / sum) * 100).toFixed(0);
              const label = ctx.chart.data.labels[ctx.dataIndex];
              
              // Return formatted label: "Sunny: 25%"
              return label + ': ' + percentage + '%';
            },
            color: '#fff',  // White text for contrast
            font: {
              weight: 'bold',
              size: 11
            },
            textAlign: 'center',
            anchor: 'center',
            align: 'center',
            // Add text shadow for better readability
            textStrokeColor: 'rgba(0, 0, 0, 0.5)',
            textStrokeWidth: 2
          }
        }
      }
    });

    // CRITICAL: Wait for chart to fully render
    await waitForChart(500);

    // Convert canvas to base64 PNG
    const imageData = canvas.toDataURL('image/png', 1.0);

    console.log('Status chart generated successfully with percentage labels');

    // Cleanup
    chart.destroy();
    document.body.removeChild(canvas);

    return imageData;

  } catch (error) {
    console.error('Error generating status chart:', error);
    
    // Cleanup on error
    try {
      document.body.removeChild(canvas);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return null;
  }
};

// ===========================================
// 2. LINE CHART - Cumulative Progress
// ===========================================
/**
 * Generate cumulative line chart as base64 PNG
 * ✅ Uses metadata for configuration
 * 
 * @param {Array} cumulativeData - Array of {date, cumulative} objects
 * @param {Object} metadata - Chart configuration from reportService
 * @returns {Promise<string|null>} - Base64 encoded PNG image
 */
export const generateCumulativeChart = async (cumulativeData, metadata = {}) => {
  if (!cumulativeData || cumulativeData.length === 0) {
    console.warn('No cumulative data provided for chart');
    return null;
  }

  console.log('Generating cumulative chart with metadata:', metadata);

  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 400;
  canvas.style.position = 'absolute';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Get configuration from metadata
  const xAxisKey = metadata?.xAxisKey || 'date';
  const datasets = metadata?.datasets || [{
    key: 'cumulative',
    label: 'Cumulative Amount',
    color: '#3b82f6'
  }];
  const chartTitle = metadata?.title || 'Cumulative Progress';

  try {
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: cumulativeData.map(d => d[xAxisKey]),
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: cumulativeData.map(d => d[ds.key] || 0),
          borderColor: ds.color,
          backgroundColor: ds.color.replace('f6', 'cc') + '40', // Add transparency
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }))
      },
      options: {
        responsive: false,
        animation: {
          duration: 0
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              padding: 10,
              font: {
                size: 11
              }
            }
          },
          title: {
            display: true,
            text: chartTitle,
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 10
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        }
      }
    });

    await waitForChart(500);

    const imageData = canvas.toDataURL('image/png', 1.0);

    console.log('Cumulative chart generated successfully');

    chart.destroy();
    document.body.removeChild(canvas);

    return imageData;

  } catch (error) {
    console.error('Error generating cumulative chart:', error);
    try {
      document.body.removeChild(canvas);
    } catch (e) {}
    return null;
  }
};

// ===========================================
// 3. BAR CHART - Monthly Progress
// ===========================================
/**
 * Generate monthly progress bar chart as base64 PNG
 * ✅ Uses metadata for configuration
 * 
 * @param {Array} monthlyData - Array of data objects
 * @param {Object} metadata - Chart configuration from reportService
 * @returns {Promise<string|null>} - Base64 encoded PNG image
 */
export const generateMonthlyProgressChart = async (monthlyData, metadata = {}) => {
  if (!monthlyData || monthlyData.length === 0) {
    console.warn('No monthly data provided for chart');
    return null;
  }

  console.log('Generating monthly progress chart with metadata:', metadata);

  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 400;
  canvas.style.position = 'absolute';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Get configuration from metadata
  const xAxisKey = metadata?.xAxisKey || 'month';
  const datasets = metadata?.datasets || [{
    key: 'value',
    label: 'Value',
    color: '#3b82f6'
  }];
  const chartTitle = metadata?.title || 'Monthly Progress';

  try {
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(d => d[xAxisKey]),
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: monthlyData.map(d => d[ds.key] || 0),
          backgroundColor: ds.color,
          borderColor: ds.color.replace('f6', 'eb').replace('81', '69'),
          borderWidth: 1
        }))
      },
      options: {
        responsive: false,
        animation: {
          duration: 0
        },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: {
              padding: 10,
              font: {
                size: 11
              }
            }
          },
          title: {
            display: true,
            text: chartTitle,
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 10
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        }
      }
    });

    await waitForChart(500);

    const imageData = canvas.toDataURL('image/png', 1.0);

    console.log('Monthly progress chart generated successfully');

    chart.destroy();
    document.body.removeChild(canvas);

    return imageData;

  } catch (error) {
    console.error('Error generating monthly progress chart:', error);
    try {
      document.body.removeChild(canvas);
    } catch (e) {}
    return null;
  }
};

// ===========================================
// 4. DUAL BAR CHART - Two Datasets with Two Y-Axes
// ===========================================
/**
 * Generate dual bar chart with two y-axes as base64 PNG
 * ✅ Uses metadata for configuration
 * 
 * @param {Array} monthlyData - Array of data objects
 * @param {Object} metadata - Chart configuration from reportService
 * @returns {Promise<string|null>} - Base64 encoded PNG image
 */
export const generateDualBarChart = async (monthlyData, metadata = {}) => {
  if (!monthlyData || monthlyData.length === 0) {
    console.warn('No monthly data provided for dual bar chart');
    return null;
  }

  console.log('Generating dual bar chart with metadata:', metadata);

  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 400;
  canvas.style.position = 'absolute';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Get configuration from metadata
  const xAxisKey = metadata?.xAxisKey || 'month';
  const datasets = metadata?.datasets || [
    { key: 'count', label: 'Count', color: '#3b82f6', yAxis: 'left' },
    { key: 'amount', label: 'Amount', color: '#10b981', yAxis: 'right' }
  ];
  const chartTitle = metadata?.title || 'Monthly Breakdown';

  try {
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(d => d[xAxisKey]),
        datasets: datasets.map((ds, index) => ({
          label: ds.label,
          data: monthlyData.map(d => d[ds.key] || 0),
          backgroundColor: ds.color,
          borderColor: ds.color.replace('f6', 'eb').replace('81', '69'),
          borderWidth: 1,
          yAxisID: `y${index + 1}`
        }))
      },
      options: {
        responsive: false,
        animation: {
          duration: 0
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              padding: 10,
              font: {
                size: 11
              }
            }
          },
          title: {
            display: true,
            text: chartTitle,
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        scales: {
          y1: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: datasets[0].label
            },
            ticks: {
              font: {
                size: 10
              }
            }
          },
          y2: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: datasets[1].label
            },
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              font: {
                size: 10
              }
            }
          }
        }
      }
    });

    await waitForChart(500);

    const imageData = canvas.toDataURL('image/png', 1.0);

    console.log('Dual bar chart generated successfully');

    chart.destroy();
    document.body.removeChild(canvas);

    return imageData;

  } catch (error) {
    console.error('Error generating dual bar chart:', error);
    try {
      document.body.removeChild(canvas);
    } catch (e) {}
    return null;
  }
};

// ===========================================
// EXPORTS
// ===========================================
export default {
  generateStatusChartImage,
  generateCumulativeChart,
  generateMonthlyProgressChart,
  generateDualBarChart
};
