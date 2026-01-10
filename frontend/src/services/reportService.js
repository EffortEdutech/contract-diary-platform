// frontend/src/services/reportService.js
// COMPLETE REFACTORED VERSION - With Chart Metadata

import { supabase } from '../lib/supabase';

// ===========================================
// 1. PROGRESS REPORT (Diary-based)
// ===========================================
export const getProgressReportData = async (contractId, startDate, endDate) => {
  try {
    const { data: diaries, error } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate)
      .order('diary_date', { ascending: false });

    if (error) throw error;

    const totalDiaries = diaries?.length || 0;
    const submittedDiaries = diaries?.filter(d => d.status === 'submitted' || d.status === 'acknowledged').length || 0;
    const acknowledgedDiaries = diaries?.filter(d => d.status === 'acknowledged').length || 0;

    const weatherCounts = {};
    diaries?.forEach(diary => {
      const weather = diary.weather_conditions || 'Unknown';
      weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
    });

    const weatherData = Object.entries(weatherCounts).map(([name, value]) => ({ name, value }));

    const statusCounts = {
      draft: diaries?.filter(d => d.status === 'draft').length || 0,
      submitted: diaries?.filter(d => d.status === 'submitted').length || 0,
      acknowledged: diaries?.filter(d => d.status === 'acknowledged').length || 0
    };

    const statusData = Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

    const manpowerData = {};
    diaries?.forEach(diary => {
      const date = diary.diary_date;
      manpowerData[date] = diary.total_manpower || 0;
    });

    const manpowerTrend = Object.entries(manpowerData).map(([date, count]) => ({
      date,
      count
    }));

    const recentDiaries = diaries?.slice(0, 10) || [];

    return {
      statistics: {
        totalDiaries,
        submittedDiaries,
        acknowledgedDiaries,
        completionRate: totalDiaries > 0 ? ((submittedDiaries / totalDiaries) * 100).toFixed(1) : 0
      },
      weatherData,
      statusData,
      manpowerTrend,
      recentDiaries
    };
  } catch (error) {
    console.error('Error fetching progress report data:', error);
    throw error;
  }
};

// ===========================================
// 2. FINANCIAL REPORT (Claims-based)
// ===========================================
export const getFinancialReportData = async (contractId, startDate, endDate) => {
  try {
    const { data: claims, error: claimsError } = await supabase
      .from('progress_claims')
      .select('*')
      .eq('contract_id', contractId)
      .gte('submission_date', startDate)
      .lte('submission_date', endDate)
      .order('submission_date', { ascending: true });

    if (claimsError) throw claimsError;

    const { data: contract } = await supabase
      .from('contracts')
      .select('contract_value')
      .eq('id', contractId)
      .single();

    const contractValue = contract?.contract_value || 0;
    const totalClaims = claims?.length || 0;
    const totalClaimAmount = claims?.reduce((sum, c) => sum + (parseFloat(c.claim_amount) || 0), 0) || 0;
    const totalPaid = claims?.reduce((sum, c) => sum + (parseFloat(c.cumulative_certified_amount) || 0), 0) || 0;
    const totalRetention = claims?.reduce((sum, c) => sum + (parseFloat(c.retention_amount) || 0), 0) || 0;

    let cumulative = 0;
    const cumulativeData = claims?.map(claim => {
      cumulative += parseFloat(claim.claim_amount) || 0;
      return {
        date: claim.submission_date,
        cumulative: cumulative
      };
    }) || [];

    const monthlyData = {};
    claims?.forEach(claim => {
      const month = new Date(claim.submission_date).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, amount: 0, count: 0 };
      }
      monthlyData[month].amount += parseFloat(claim.claim_amount) || 0;
      monthlyData[month].count += 1;
    });

    const monthlyBreakdown = Object.values(monthlyData);

    const paymentTimeline = claims?.map(claim => ({
      claimNumber: claim.claim_number,
      claimDate: claim.submission_date,
      amount: claim.claim_amount,
      certified: claim.cumulative_certified_amount,
      retention: claim.retention_amount,
      status: claim.status
    })) || [];

    return {
      statistics: {
        totalClaims,
        totalClaimAmount,
        totalPaid,
        totalRetention,
        contractValue,
        progressPercentage: contractValue > 0 ? ((totalClaimAmount / contractValue) * 100).toFixed(1) : 0
      },
      cumulativeData,
      monthlyBreakdown,
      paymentTimeline,
      
      // ✅ CHART METADATA
      chartMetadata: {
        cumulativeChart: {
          title: 'Cumulative Claim Amount',
          type: 'line',
          xAxisKey: 'date',
          datasets: [
            {
              key: 'cumulative',
              label: 'Cumulative Amount (RM)',
              color: '#3b82f6'
            }
          ]
        },
        monthlyBreakdown: {
          title: 'Monthly Claims Breakdown',
          type: 'dualBar',
          xAxisKey: 'month',
          datasets: [
            {
              key: 'count',
              label: 'Number of Claims',
              color: '#3b82f6',
              yAxis: 'left'
            },
            {
              key: 'amount',
              label: 'Total Amount (RM)',
              color: '#10b981',
              yAxis: 'right'
            }
          ]
        }
      }
    };
  } catch (error) {
    console.error('Error fetching financial report data:', error);
    throw error;
  }
};

// ===========================================
// 3. DIARY REPORT (Diary summary)
// ===========================================
export const getDiaryReportData = async (contractId, startDate, endDate) => {
  try {
    console.log('=== getDiaryReportData called ===');
    console.log('contractId:', contractId);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);

    const { data: diaries, error } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate)
      .order('diary_date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Diaries fetched:', diaries?.length || 0);

    // Weather distribution count
    const weatherCounts = {};
    diaries?.forEach(diary => {
      const weather = diary.weather_conditions || 'Unknown';
      weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
    });

    console.log('Weather counts:', weatherCounts);

    // Manpower by trade
    const manpowerByTrade = {};
    diaries?.forEach(diary => {
      const manpower = Array.isArray(diary.manpower) ? diary.manpower : [];
      manpower.forEach(m => {
        const trade = m.trade || 'General';
        if (!manpowerByTrade[trade]) {
          manpowerByTrade[trade] = { totalWorkers: 0, days: 0 };
        }
        manpowerByTrade[trade].totalWorkers += parseInt(m.count) || 0;
        manpowerByTrade[trade].days += 1;
      });
    });

    // Calculate averages for manpower
    Object.keys(manpowerByTrade).forEach(trade => {
      const data = manpowerByTrade[trade];
      manpowerByTrade[trade].avgWorkers = data.days > 0 
        ? (data.totalWorkers / data.days).toFixed(1) 
        : '0.0';
    });

    console.log('Manpower by trade:', manpowerByTrade);

    // Issues and delays
    const issuesDiaries = diaries?.filter(d => 
      d.issues_delays && d.issues_delays.trim() !== ''
    ) || [];

    const issuesDelays = issuesDiaries.map(d => ({
      date: d.diary_date,
      description: d.issues_delays
    }));

    console.log('Issues found:', issuesDelays.length);

    // Count total photos
    const totalPhotos = diaries?.reduce((sum, d) => {
      const photoCount = d.photo_count || 
        (Array.isArray(d.photos_uploaded) ? d.photos_uploaded.length : 0);
      return sum + photoCount;
    }, 0) || 0;

    console.log('Total photos:', totalPhotos);

    const result = {
      statistics: {
        totalDiaries: diaries?.length || 0,
        totalPhotos: totalPhotos,
        issuesCount: issuesDelays.length,
        weatherDistribution: weatherCounts
      },
      manpowerSummary: manpowerByTrade,
      issuesDelays: issuesDelays,
      diaries: diaries || [],
      
      // ✅ CHART METADATA
      chartMetadata: {
        weatherChart: {
          title: 'Weather Distribution',
          type: 'pie',
          dataKey: 'value',
          labelKey: 'name',
          colors: {
            'Sunny': '#fcd34d',
            'Cloudy': '#9ca3af',
            'Rainy': '#3b82f6',
            'Heavy Rain': '#1e40af',
            'Stormy': '#fc2f2fff',
          }
        },
        manpowerChart: {
          title: 'Manpower by Trade',
          type: 'bar',
          xAxisKey: 'category',
          datasets: [
            {
              key: 'avgWorkers',
              label: 'Average Workers',
              color: '#3b82f6',
              yAxisLabel: 'Number of Workers'
            },
            {
              key: 'totalWorkers',
              label: 'Total Workers',
              color: '#10b981',
              yAxisLabel: 'Total Count'
            }
          ]
        }
      }
    };

    console.log('=== Result structure ===');
    console.log('statistics.totalDiaries:', result.statistics.totalDiaries);
    console.log('statistics.totalPhotos:', result.statistics.totalPhotos);
    console.log('statistics.issuesCount:', result.statistics.issuesCount);
    console.log('diaries.length:', result.diaries.length);
    console.log('========================');

    return result;

  } catch (error) {
    console.error('Error fetching diary report data:', error);
    throw error;
  }
};

// ===========================================
// 4. BOQ PROGRESS REPORT
// ===========================================
export const getBOQProgressReportData = async (contractId) => {
  try {
    const { data: boq, error: boqError } = await supabase
      .from('boq')  // ✅ FIXED - was 'boqs'
      .select('*')
      .eq('contract_id', contractId)
      .single();

    if (boqError) throw boqError;

    const { data: sections, error: sectionsError } = await supabase
      .from('boq_sections')
      .select('*')
      .eq('boq_id', boq.id)
      .order('section_number', { ascending: true });

    if (sectionsError) throw sectionsError;

    const { data: items, error: itemsError } = await supabase
      .from('boq_items')
      .select('*')
      .eq('boq_id', boq.id)
      .order('item_number', { ascending: true });

    if (itemsError) throw itemsError;

    const totalItems = items?.length || 0;
    const completedItems = items?.filter(item => {
      const qtyDone = parseFloat(item.quantity_done) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return qty > 0 && qtyDone >= qty;
    }).length || 0;

    const inProgressItems = items?.filter(item => {
      const qtyDone = parseFloat(item.quantity_done) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return qtyDone > 0 && qtyDone < qty;
    }).length || 0;

    const notStartedItems = totalItems - completedItems - inProgressItems;

    const statusData = [
      { name: 'Completed', value: completedItems },
      { name: 'In Progress', value: inProgressItems },
      { name: 'Not Started', value: notStartedItems }
    ].filter(item => item.value > 0);

    return {
      boq,
      sections,
      items,
      statusData,
      summary: {
        total: totalItems,
        completed: completedItems,
        inProgress: inProgressItems,
        notStarted: notStartedItems,
        completionPercentage: totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0
      },
      
      // ✅ CHART METADATA
      chartMetadata: {
        statusChart: {
          title: 'Completion Status',
          type: 'pie',
          dataKey: 'value',
          labelKey: 'name',
          colors: {
            'Completed': '#10b981',
            'In Progress': '#f59e0b',
            'Not Started': '#6b7280'
          }
        }
      }
    };
  } catch (error) {
    console.error('Error fetching BOQ progress data:', error);
    return {
      boq: null,
      sections: [],
      items: [],
      statusData: [],
      summary: {
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        completionPercentage: 0
      },
      chartMetadata: {
        statusChart: {
          title: 'Completion Status',
          type: 'pie',
          dataKey: 'value',
          labelKey: 'name',
          colors: {}
        }
      }
    };
  }
};

// ===========================================
// 5. CLAIMS SUMMARY REPORT
// ===========================================
export const getClaimsSummaryReportData = async (contractId, startDate, endDate) => {
  try {
    const { data: claims, error } = await supabase
      .from('progress_claims')
      .select('*')
      .eq('contract_id', contractId)
      .gte('submission_date', startDate)
      .lte('submission_date', endDate)
      .order('submission_date', { ascending: false });

    if (error) throw error;

    const statusCounts = {
      draft: 0,
      submitted: 0,
      approved: 0,
      certified: 0,
      paid: 0
    };

    claims?.forEach(claim => {
      if (statusCounts.hasOwnProperty(claim.status)) {
        statusCounts[claim.status]++;
      }
    });

    const statusData = Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

    const monthlyData = {};
    claims?.forEach(claim => {
      const month = new Date(claim.submission_date).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, count: 0, amount: 0 };
      }
      monthlyData[month].count += 1;
      monthlyData[month].amount += parseFloat(claim.claim_amount) || 0;
    });

    const monthlyTrend = Object.values(monthlyData);

    const processingTimes = claims?.map(claim => {
      if (!claim.submitted_date) return null;
      
      const submitted = new Date(claim.submitted_date);
      const certified = claim.certified_date ? new Date(claim.certified_date) : new Date();
      const days = Math.floor((certified - submitted) / (1000 * 60 * 60 * 24));
      
      return {
        claimNumber: claim.claim_number,
        days,
        status: claim.status
      };
    }).filter(Boolean) || [];

    const avgProcessingTime = processingTimes.length > 0
      ? (processingTimes.reduce((sum, p) => sum + p.days, 0) / processingTimes.length).toFixed(0)
      : 0;

    return {
      totalClaims: claims?.length || 0,
      statusData,
      monthlyTrend,
      processingTimes,
      avgProcessingTime,
      allClaims: claims || [],
      
      // ✅ CHART METADATA
      chartMetadata: {
        statusChart: {
          title: 'Claims by Status',
          type: 'pie',
          dataKey: 'value',
          labelKey: 'name',
          colors: {
            'Draft': '#9ca3af',
            'Submitted': '#fbbf24',
            'Approved': '#8b5cf6',
            'Certified': '#3b82f6',
            'Paid': '#10b981'
          }
        },
        monthlyTrend: {
          title: 'Monthly Claims Trend',
          type: 'dualBar',
          xAxisKey: 'month',
          datasets: [
            {
              key: 'count',
              label: 'Number of Claims',
              color: '#3b82f6',
              yAxis: 'left'
            },
            {
              key: 'amount',
              label: 'Total Amount (RM)',
              color: '#10b981',
              yAxis: 'right'
            }
          ]
        }
      }
    };
  } catch (error) {
    console.error('Error fetching claims summary data:', error);
    throw error;
  }
};

// ===========================================
// 6. STATISTICS OVERVIEW (Dashboard)
// ===========================================
export const getStatisticsOverviewData = async (contractId) => {
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    const { data: diaries } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId);

    const { data: claims } = await supabase
      .from('progress_claims')
      .select('*')
      .eq('contract_id', contractId);

    const { data: boq } = await supabase
      .from('boq')
      .select('id')
      .eq('contract_id', contractId)
      .single();

    let boqItems = [];
    if (boq) {
      const { data } = await supabase
        .from('boq_items')
        .select('*')
        .eq('boq_id', boq.id);
      boqItems = data || [];
    }

    const totalDiaries = diaries?.length || 0;
    const submittedDiaries = diaries?.filter(d => d.status === 'submitted' || d.status === 'acknowledged').length || 0;
    
    const totalClaims = claims?.length || 0;
    const approvedClaims = claims?.filter(c => c.status === 'approved' || c.status === 'certified' || c.status === 'paid').length || 0;
    
    const totalBOQItems = boqItems.length || 0;
    const completedBOQItems = boqItems.filter(item => {
      const qtyDone = parseFloat(item.quantity_done) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return qty > 0 && qtyDone >= qty;
    }).length || 0;

    return {
      contract,
      statistics: {
        diaries: {
          total: totalDiaries,
          submitted: submittedDiaries,
          percentage: totalDiaries > 0 ? ((submittedDiaries / totalDiaries) * 100).toFixed(1) : 0
        },
        claims: {
          total: totalClaims,
          approved: approvedClaims,
          percentage: totalClaims > 0 ? ((approvedClaims / totalClaims) * 100).toFixed(1) : 0
        },
        boq: {
          total: totalBOQItems,
          completed: completedBOQItems,
          percentage: totalBOQItems > 0 ? ((completedBOQItems / totalBOQItems) * 100).toFixed(1) : 0
        }
      },
      recentDiaries: diaries?.slice(0, 5) || [],
      recentClaims: claims?.slice(0, 5) || []
    };
  } catch (error) {
    console.error('Error fetching statistics overview:', error);
    throw error;
  }
};

export default {
  getProgressReportData,
  getFinancialReportData,
  getDiaryReportData,
  getBOQProgressReportData,
  getClaimsSummaryReportData,
  getStatisticsOverviewData
};
