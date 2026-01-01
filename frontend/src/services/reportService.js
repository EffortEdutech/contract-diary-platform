// frontend/src/services/reportService.js
// WORKING VERSION - Simplified queries with null safety
import { supabase } from '../lib/supabase';

// ===========================================
// 1. PROGRESS REPORT (Diary-based)
// ===========================================
export const getProgressReportData = async (contractId, startDate, endDate) => {
  try {
    const { data: diaries, error: diariesError } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate)
      .order('diary_date', { ascending: true });

    if (diariesError) throw diariesError;

    const totalDiaries = diaries?.length || 0;
    const submittedDiaries = diaries?.filter(d => d.status === 'submitted' || d.status === 'acknowledged').length || 0;
    const acknowledgedDiaries = diaries?.filter(d => d.status === 'acknowledged').length || 0;
    const draftDiaries = diaries?.filter(d => d.status === 'draft').length || 0;

    const weatherCounts = {};
    diaries?.forEach(diary => {
      const weather = diary.weather_conditions || 'Unknown';
      weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
    });

    const weatherData = Object.entries(weatherCounts).map(([name, value]) => ({
      name,
      value
    }));

    const statusData = [
      { name: 'Draft', value: draftDiaries },
      { name: 'Submitted', value: submittedDiaries - acknowledgedDiaries },
      { name: 'Acknowledged', value: acknowledgedDiaries }
    ].filter(item => item.value > 0);

    const manpowerTrend = diaries?.map(diary => {
      const manpower = Array.isArray(diary.manpower) ? diary.manpower : [];
      const totalWorkers = manpower.reduce((sum, m) => sum + (parseInt(m.count) || 0), 0);
      return {
        date: diary.diary_date,
        workers: totalWorkers
      };
    }) || [];

    const recentDiaries = diaries?.slice(-10).reverse() || [];

    return {
      statistics: {
        totalDiaries,
        submittedDiaries,
        acknowledgedDiaries,
        draftDiaries,
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
        claimNumber: claim.claim_number,
        amount: cumulative
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
      paymentTimeline
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
    const { data: diaries, error } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate)
      .order('diary_date', { ascending: false });

    if (error) throw error;

    const weatherCounts = {};
    diaries?.forEach(diary => {
      const weather = diary.weather_conditions || 'Unknown';
      weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
    });

    const weatherSummary = Object.entries(weatherCounts).map(([name, value]) => ({
      name,
      value
    }));

    const manpowerByTrade = {};
    diaries?.forEach(diary => {
      const manpower = Array.isArray(diary.manpower) ? diary.manpower : [];
      manpower.forEach(m => {
        const trade = m.trade || 'General';
        if (!manpowerByTrade[trade]) {
          manpowerByTrade[trade] = { trade, totalWorkers: 0, days: 0 };
        }
        manpowerByTrade[trade].totalWorkers += parseInt(m.count) || 0;
        manpowerByTrade[trade].days += 1;
      });
    });

    const manpowerSummary = Object.values(manpowerByTrade).map(m => ({
      ...m,
      avgPerDay: m.days > 0 ? (m.totalWorkers / m.days).toFixed(1) : 0
    }));

    const issuesDiaries = diaries?.filter(d => d.issues_delays && d.issues_delays.trim() !== '') || [];

    return {
      totalDiaries: diaries?.length || 0,
      weatherSummary,
      manpowerSummary,
      issuesDiaries,
      allDiaries: diaries || []
    };
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
    const { data: boqs, error: boqError } = await supabase
      .from('boq')
      .select('id, boq_number, title, status, total_amount')
      .eq('contract_id', contractId)
      .eq('status', 'approved');

    if (boqError) throw boqError;

    if (!boqs || boqs.length === 0) {
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
        }
      };
    }

    const boq = boqs[0];

    const { data: sections, error: sectionsError } = await supabase
      .from('boq_sections')
      .select('*')
      .eq('boq_id', boq.id)
      .order('display_order');

    if (sectionsError) throw sectionsError;

    const { data: items, error: itemsError } = await supabase
      .from('boq_items')
      .select('*')
      .eq('boq_id', boq.id)
      .order('display_order');

    if (itemsError) throw itemsError;

    const sectionsWithProgress = sections?.map(section => {
      const sectionItems = items?.filter(item => item.section_id === section.id) || [];
      const totalItems = sectionItems.length;
      const completedItems = sectionItems.filter(item => item.percentage_complete >= 100).length;
      const avgProgress = totalItems > 0 
        ? sectionItems.reduce((sum, item) => sum + (item.percentage_complete || 0), 0) / totalItems
        : 0;

      return {
        ...section,
        totalItems,
        completedItems,
        progress: avgProgress.toFixed(1)
      };
    }) || [];

    const totalItems = items?.length || 0;
    const completedItems = items?.filter(item => item.percentage_complete >= 100).length || 0;
    const inProgressItems = items?.filter(item => item.percentage_complete > 0 && item.percentage_complete < 100).length || 0;
    const notStartedItems = items?.filter(item => (item.percentage_complete || 0) === 0).length || 0;

    const statusData = [
      { name: 'Completed', value: completedItems },
      { name: 'In Progress', value: inProgressItems },
      { name: 'Not Started', value: notStartedItems }
    ].filter(item => item.value > 0);

    return {
      boq,
      sections: sectionsWithProgress,
      items: items || [],
      statusData,
      summary: {
        total: totalItems,
        completed: completedItems,
        inProgress: inProgressItems,
        notStarted: notStartedItems,
        completionPercentage: totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0
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
      allClaims: claims || []
    };
  } catch (error) {
    console.error('Error fetching claims summary data:', error);
    throw error;
  }
};
