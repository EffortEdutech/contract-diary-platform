// ============================================
// CLAIM SERVICE - Complete Service Layer
// ============================================
// Purpose: Handle all progress claims operations
// Features: CRUD, workflows, calculations, cumulative tracking
// Created: 2025-12-31
// Session: 9 - Progress Claims Module (Phase 4A)
// ============================================

import { supabase } from '../lib/supabase';

// ============================================
// PROGRESS CLAIMS CRUD OPERATIONS
// ============================================

/**
 * Get all claims for a contract
 * @param {string} contractId - Contract UUID
 * @returns {Promise<Array>} Array of claim objects with creator info
 */
export const getClaimsByContract = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('progress_claims')
      .select(`
        *,
        created_by_profile:user_profiles!progress_claims_created_by_fkey(
          id,
          role,
          organization_name,
          position
        ),
        approved_by_profile:user_profiles!progress_claims_approved_by_fkey(
          id,
          role,
          organization_name,
          position
        )
      `)
      .eq('contract_id', contractId)
      .order('claim_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching claims:', error);
    throw error;
  }
};

/**
 * Get single claim by ID with all details
 * @param {string} claimId - Claim UUID
 * @returns {Promise<Object>} Claim object with items and profiles
 */
export const getClaimById = async (claimId) => {
  try {
    const { data, error } = await supabase
      .from('progress_claims')
      .select(`
        *,
        created_by_profile:user_profiles!progress_claims_created_by_fkey(
          id,
          role,
          organization_name,
          position
        ),
        approved_by_profile:user_profiles!progress_claims_approved_by_fkey(
          id,
          role,
          organization_name,
          position
        ),
        contract:contracts(
          id,
          project_name,
          contract_number,
          contract_type
        )
      `)
      .eq('id', claimId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching claim:', error);
    throw error;
  }
};

/**
 * Create a new progress claim
 * @param {Object} claimData - Claim data object
 * @returns {Promise<Object>} Created claim object
 */
export const createClaim = async (claimData) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next claim number for this contract
    const { data: nextNumber, error: numberError } = await supabase
      .rpc('get_next_claim_number', { p_contract_id: claimData.contract_id });

    if (numberError) throw numberError;

    // Prepare claim data (retention defaults to 5% as per CIPAA)
    const newClaim = {
      contract_id: claimData.contract_id,
      created_by: user.id,
      claim_number: nextNumber,
      claim_title: claimData.claim_title || `Progress Claim #${nextNumber}`,
      claim_period_from: claimData.claim_period_from,
      claim_period_to: claimData.claim_period_to,
      retention_percentage: claimData.retention_percentage || 5.00, // Default 5% as per CIPAA
      notes: claimData.notes || null,
      status: 'draft'
    };

    // Insert claim
    const { data, error } = await supabase
      .from('progress_claims')
      .insert([newClaim])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating claim:', error);
    throw error;
  }
};

/**
 * Update an existing claim (draft only)
 * @param {string} claimId - Claim UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated claim object
 */
export const updateClaim = async (claimId, updates) => {
  try {
    // Remove fields that shouldn't be updated directly
    const { id, created_by, created_at, claim_number, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('progress_claims')
      .update(safeUpdates)
      .eq('id', claimId)
      .eq('status', 'draft') // Only draft claims can be updated
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Claim not found or not in draft status');
    
    return data;
  } catch (error) {
    console.error('Error updating claim:', error);
    throw error;
  }
};

/**
 * Delete a claim (draft only)
 * @param {string} claimId - Claim UUID
 * @returns {Promise<boolean>} Success status
 */
export const deleteClaim = async (claimId) => {
  try {
    const { error } = await supabase
      .from('progress_claims')
      .delete()
      .eq('id', claimId)
      .eq('status', 'draft'); // Only draft claims can be deleted

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting claim:', error);
    throw error;
  }
};

// ============================================
// CLAIM ITEMS CRUD OPERATIONS
// ============================================

/**
 * Get all items for a claim
 * @param {string} claimId - Claim UUID
 * @returns {Promise<Array>} Array of claim item objects with BOQ details
 */
export const getClaimItems = async (claimId) => {
  try {
    const { data, error } = await supabase
      .from('claim_items')
      .select(`
        *,
        boq_item:boq_items(
          id,
          item_no,
          description,
          unit,
          quantity,
          unit_rate,
          amount,
          item_type,
          boq_section:boq_sections(
            id,
            section_no,
            title
          )
        )
      `)
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching claim items:', error);
    throw error;
  }
};

/**
 * Add a BOQ item to a claim
 * @param {string} claimId - Claim UUID
 * @param {Object} itemData - Item data (boq_item_id, quantity_claimed, etc.)
 * @returns {Promise<Object>} Created claim item
 */
export const addClaimItem = async (claimId, itemData) => {
  try {
    // Get BOQ item details
    const { data: boqItem, error: boqError } = await supabase
      .from('boq_items')
      .select('id, quantity, unit_rate')
      .eq('id', itemData.boq_item_id)
      .single();

    if (boqError) throw boqError;

    // Get previous cumulative quantity for this BOQ item
    const { data: previousCumulative, error: cumulativeError } = await supabase
      .rpc('get_previous_cumulative_quantity', {
        p_boq_item_id: itemData.boq_item_id,
        p_current_claim_id: claimId
      });

    if (cumulativeError) throw cumulativeError;

    // Calculate new cumulative quantity
    const cumulativeQuantity = (previousCumulative || 0) + parseFloat(itemData.quantity_claimed);

    // Prepare claim item data
    const newItem = {
      claim_id: claimId,
      boq_item_id: itemData.boq_item_id,
      quantity_claimed: parseFloat(itemData.quantity_claimed),
      cumulative_quantity: cumulativeQuantity,
      boq_quantity: parseFloat(boqItem.quantity),
      unit_rate: parseFloat(boqItem.unit_rate),
      work_description: itemData.work_description || null,
      notes: itemData.notes || null
    };

    // Insert claim item (triggers will calculate amount and percentage)
    const { data, error } = await supabase
      .from('claim_items')
      .insert([newItem])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding claim item:', error);
    throw error;
  }
};

/**
 * Update a claim item (quantity, description, etc.)
 * @param {string} itemId - Claim item UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated claim item
 */
export const updateClaimItem = async (itemId, updates) => {
  try {
    // If quantity_claimed is being updated, recalculate cumulative
    if (updates.quantity_claimed !== undefined) {
      // Get current item to find previous cumulative
      const { data: currentItem, error: currentError } = await supabase
        .from('claim_items')
        .select('boq_item_id, claim_id, quantity_claimed')
        .eq('id', itemId)
        .single();

      if (currentError) throw currentError;

      // Get previous cumulative (excluding this claim)
      const { data: previousCumulative, error: cumulativeError } = await supabase
        .rpc('get_previous_cumulative_quantity', {
          p_boq_item_id: currentItem.boq_item_id,
          p_current_claim_id: currentItem.claim_id
        });

      if (cumulativeError) throw cumulativeError;

      // Calculate new cumulative
      updates.cumulative_quantity = (previousCumulative || 0) + parseFloat(updates.quantity_claimed);
    }

    // Remove unsafe fields
    const { id, claim_id, boq_item_id, created_at, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('claim_items')
      .update(safeUpdates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating claim item:', error);
    throw error;
  }
};

/**
 * Remove an item from a claim
 * @param {string} itemId - Claim item UUID
 * @returns {Promise<boolean>} Success status
 */
export const removeClaimItem = async (itemId) => {
  try {
    const { error } = await supabase
      .from('claim_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing claim item:', error);
    throw error;
  }
};

// ============================================
// WORKFLOW OPERATIONS
// ============================================

/**
 * Submit a claim for MC review
 * @param {string} claimId - Claim UUID
 * @returns {Promise<Object>} Result object with success status
 */
export const submitClaim = async (claimId) => {
  try {
    const { data, error } = await supabase
      .rpc('submit_claim', { p_claim_id: claimId });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error submitting claim:', error);
    throw error;
  }
};

/**
 * Approve a submitted claim (MC only)
 * @param {string} claimId - Claim UUID
 * @param {number} approvedAmount - Optional approved amount (defaults to claim_amount)
 * @returns {Promise<Object>} Result object with success status
 */
export const approveClaim = async (claimId, approvedAmount = null) => {
  try {
    const { data, error } = await supabase
      .rpc('approve_claim', {
        p_claim_id: claimId,
        p_approved_amount: approvedAmount
      });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error approving claim:', error);
    throw error;
  }
};

/**
 * Reject a submitted claim (MC only)
 * @param {string} claimId - Claim UUID
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} Result object with success status
 */
export const rejectClaim = async (claimId, rejectionReason) => {
  try {
    const { data, error } = await supabase
      .rpc('reject_claim', {
        p_claim_id: claimId,
        p_rejection_reason: rejectionReason
      });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error rejecting claim:', error);
    throw error;
  }
};

/**
 * Mark a claim as paid (MC only)
 * @param {string} claimId - Claim UUID
 * @param {string} paymentDate - Payment date (YYYY-MM-DD)
 * @returns {Promise<Object>} Result object with success status
 */
export const markClaimPaid = async (claimId, paymentDate) => {
  try {
    const { data, error } = await supabase
      .rpc('mark_claim_paid', {
        p_claim_id: claimId,
        p_payment_date: paymentDate
      });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error marking claim as paid:', error);
    throw error;
  }
};

// ============================================
// CALCULATION & ANALYTICS
// ============================================

/**
 * Get claim summary statistics for a contract
 * @param {string} contractId - Contract UUID
 * @returns {Promise<Object>} Summary statistics
 */
export const getClaimSummary = async (contractId) => {
  try {
    const { data: claims, error } = await supabase
      .from('progress_claims')
      .select('*')
      .eq('contract_id', contractId);

    if (error) throw error;

    // Calculate summary
    const summary = {
      total_claims: claims.length,
      draft_claims: claims.filter(c => c.status === 'draft').length,
      submitted_claims: claims.filter(c => c.status === 'submitted').length,
      approved_claims: claims.filter(c => c.status === 'approved').length,
      paid_claims: claims.filter(c => c.status === 'paid').length,
      rejected_claims: claims.filter(c => c.status === 'rejected').length,
      
      total_claimed: claims
        .filter(c => c.status !== 'rejected')
        .reduce((sum, c) => sum + parseFloat(c.claim_amount || 0), 0),
      
      total_approved: claims
        .filter(c => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.claim_amount || 0), 0),
      
      total_paid: claims
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.claim_amount || 0), 0),
      
      total_retention: claims
        .filter(c => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.retention_amount || 0), 0),
      
      overdue_claims: claims.filter(c => {
        if (c.status === 'approved' && c.payment_due_date) {
          return new Date(c.payment_due_date) < new Date();
        }
        return false;
      }).length
    };

    return summary;
  } catch (error) {
    console.error('Error getting claim summary:', error);
    throw error;
  }
};

/**
 * Get BOQ items available for claiming
 * @param {string} contractId - Contract UUID
 * @returns {Promise<Array>} Array of BOQ items with progress
 */
export const getAvailableBoqItems = async (contractId) => {
  try {
    // Get BOQ for this contract
    const { data: boq, error: boqError } = await supabase
      .from('boq')
      .select('id')
      .eq('contract_id', contractId)
      .eq('status', 'approved')
      .single();

    if (boqError) throw boqError;
    if (!boq) return [];

    // Get all BOQ items with their cumulative claimed quantities
    const { data: items, error: itemsError } = await supabase
      .from('boq_items')
      .select(`
        *,
        boq_section:boq_sections(
          id,
          section_no,
          title
        )
      `)
      .eq('boq_id', boq.id)
      .order('item_no', { ascending: true });

    if (itemsError) throw itemsError;

    // For each item, get cumulative claimed quantity
    const itemsWithProgress = await Promise.all(
      items.map(async (item) => {
        // Get latest cumulative quantity from approved/paid claims
        const { data: claimItems, error: claimError } = await supabase
          .from('claim_items')
          .select(`
            cumulative_quantity,
            claim:progress_claims(status)
          `)
          .eq('boq_item_id', item.id)
          .in('claim.status', ['approved', 'paid'])
          .order('cumulative_quantity', { ascending: false })
          .limit(1);

        if (claimError) {
          console.error('Error fetching claim items:', claimError);
          return {
            ...item,
            claimed_quantity: 0,
            remaining_quantity: item.quantity,
            percentage_complete: 0,
            is_complete: false
          };
        }

        const claimedQuantity = claimItems?.[0]?.cumulative_quantity || 0;
        const remainingQuantity = item.quantity - claimedQuantity;
        const percentageComplete = (claimedQuantity / item.quantity) * 100;

        return {
          ...item,
          claimed_quantity: claimedQuantity,
          remaining_quantity: remainingQuantity,
          percentage_complete: Math.min(percentageComplete, 100),
          is_complete: claimedQuantity >= item.quantity
        };
      })
    );

    return itemsWithProgress;
  } catch (error) {
    console.error('Error getting available BOQ items:', error);
    throw error;
  }
};

/**
 * Get payment status for a contract
 * @param {string} contractId - Contract UUID
 * @returns {Promise<Object>} Payment status details
 */
export const getPaymentStatus = async (contractId) => {
  try {
    // Get contract value
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('contract_value')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    // Get claim summary
    const summary = await getClaimSummary(contractId);

    // Calculate percentages
    const contractValue = parseFloat(contract.contract_value || 0);
    const percentageClaimed = contractValue > 0 
      ? (summary.total_claimed / contractValue) * 100 
      : 0;
    const percentagePaid = contractValue > 0 
      ? (summary.total_paid / contractValue) * 100 
      : 0;

    return {
      contract_value: contractValue,
      total_claimed: summary.total_claimed,
      total_approved: summary.total_approved,
      total_paid: summary.total_paid,
      total_retention: summary.total_retention,
      outstanding_amount: summary.total_approved - summary.total_paid,
      percentage_claimed: percentageClaimed,
      percentage_paid: percentagePaid,
      claims_count: summary.total_claims,
      overdue_claims: summary.overdue_claims
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency for Malaysian Ringgit
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

/**
 * Format date to Malaysian format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (DD/MM/YYYY)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
};

/**
 * Get status badge color
 * @param {string} status - Claim status
 * @returns {string} Tailwind color class
 */
export const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    paid: 'bg-purple-100 text-purple-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Check if claim is overdue
 * @param {Object} claim - Claim object with payment_due_date
 * @returns {boolean} True if overdue
 */
export const isClaimOverdue = (claim) => {
  if (claim.status !== 'approved' || !claim.payment_due_date) {
    return false;
  }
  return new Date(claim.payment_due_date) < new Date();
};

/**
 * Calculate days until payment due
 * @param {string} paymentDueDate - Payment due date
 * @returns {number} Days until due (negative if overdue)
 */
export const getDaysUntilPaymentDue = (paymentDueDate) => {
  if (!paymentDueDate) return null;
  const due = new Date(paymentDueDate);
  const today = new Date();
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
  // CRUD
  getClaimsByContract,
  getClaimById,
  createClaim,
  updateClaim,
  deleteClaim,
  
  // Claim Items
  getClaimItems,
  addClaimItem,
  updateClaimItem,
  removeClaimItem,
  
  // Workflows
  submitClaim,
  approveClaim,
  rejectClaim,
  markClaimPaid,
  
  // Analytics
  getClaimSummary,
  getAvailableBoqItems,
  getPaymentStatus,
  
  // Utilities
  formatCurrency,
  formatDate,
  getStatusColor,
  isClaimOverdue,
  getDaysUntilPaymentDue
};
