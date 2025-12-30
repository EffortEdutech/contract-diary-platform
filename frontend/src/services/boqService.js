// src/services/boqService.js
import { supabase } from '../lib/supabase';

// =====================================================
// BOQ MAIN OPERATIONS
// =====================================================

/**
 * Create a new BOQ for a contract
 * @param {Object} boqData - BOQ details
 * @returns {Object} Created BOQ with id
 */
export const createBOQ = async (boqData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verify contract exists
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, organization_id, contract_number')
      .eq('id', boqData.contract_id)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    // Create BOQ
    const { data, error } = await supabase
      .from('boq')
      .insert([{
        contract_id: boqData.contract_id,
        boq_number: boqData.boq_number,
        title: boqData.title,
        description: boqData.description || null,
        currency: boqData.currency || 'MYR',
        status: 'draft',
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating BOQ:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Create BOQ error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all BOQs for a specific contract
 * @param {string} contractId - Contract UUID
 * @returns {Array} List of BOQs
 */
export const getBOQsByContract = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('boq')
      .select(`
        *,
        contract:contracts(
          id,
          contract_number,
          project_name,
          contract_type
        )
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching BOQs:', error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get BOQs error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get single BOQ with full details
 * @param {string} boqId - BOQ UUID
 * @returns {Object} BOQ with sections and items
 */
export const getBOQById = async (boqId) => {
  try {
    // Get BOQ with contract details
    const { data: boq, error: boqError } = await supabase
      .from('boq')
      .select(`
        *,
        contract:contracts(
          id,
          contract_number,
          project_name,
          contract_type,
          contract_value,
          location,
          client_name
        )
      `)
      .eq('id', boqId)
      .single();

    if (boqError) {
      console.error('Error fetching BOQ:', boqError);
      throw boqError;
    }

    // Get sections for this BOQ
    const { data: sections, error: sectionsError } = await supabase
      .from('boq_sections')
      .select('*')
      .eq('boq_id', boqId)
      .order('display_order', { ascending: true });

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
    }

    // Get items for this BOQ
    const { data: items, error: itemsError } = await supabase
      .from('boq_items')
      .select('*')
      .eq('boq_id', boqId)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }

    // Combine data
    const fullBOQ = {
      ...boq,
      sections: sections || [],
      items: items || []
    };

    return { success: true, data: fullBOQ };
  } catch (error) {
    console.error('Get BOQ by ID error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update BOQ details (only draft BOQs can be updated)
 * @param {string} boqId - BOQ UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated BOQ
 */
export const updateBOQ = async (boqId, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if BOQ exists and is draft
    const { data: existingBOQ, error: checkError } = await supabase
      .from('boq')
      .select('id, status, created_by')
      .eq('id', boqId)
      .single();

    if (checkError || !existingBOQ) {
      throw new Error('BOQ not found');
    }

    if (existingBOQ.created_by !== user.id) {
      throw new Error('You do not have permission to update this BOQ');
    }

    if (existingBOQ.status !== 'draft') {
      throw new Error('Only draft BOQs can be updated');
    }

    // Update BOQ
    const { data, error } = await supabase
      .from('boq')
      .update({
        title: updates.title,
        description: updates.description,
        currency: updates.currency,
        updated_at: new Date().toISOString()
      })
      .eq('id', boqId)
      .select()
      .single();

    if (error) {
      console.error('Error updating BOQ:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Update BOQ error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update BOQ status (draft -> approved -> locked)
 * @param {string} boqId - BOQ UUID
 * @param {string} newStatus - New status (draft, approved, locked)
 * @returns {Object} Updated BOQ
 */
export const updateBOQStatus = async (boqId, newStatus) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const validStatuses = ['draft', 'approved', 'locked'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status');
    }

    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // If approving, record who approved and when
    if (newStatus === 'approved') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('boq')
      .update(updateData)
      .eq('id', boqId)
      .select()
      .single();

    if (error) {
      console.error('Error updating BOQ status:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Update BOQ status error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete BOQ (only draft BOQs can be deleted)
 * @param {string} boqId - BOQ UUID
 * @returns {Object} Success status
 */
export const deleteBOQ = async (boqId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if BOQ exists and is draft
    const { data: existingBOQ, error: checkError } = await supabase
      .from('boq')
      .select('id, status, created_by')
      .eq('id', boqId)
      .single();

    if (checkError || !existingBOQ) {
      throw new Error('BOQ not found');
    }

    if (existingBOQ.created_by !== user.id) {
      throw new Error('You do not have permission to delete this BOQ');
    }

    if (existingBOQ.status !== 'draft') {
      throw new Error('Only draft BOQs can be deleted');
    }

    // Delete BOQ (cascade will delete sections and items)
    const { error } = await supabase
      .from('boq')
      .delete()
      .eq('id', boqId);

    if (error) {
      console.error('Error deleting BOQ:', error);
      throw error;
    }

    return { success: true, message: 'BOQ deleted successfully' };
  } catch (error) {
    console.error('Delete BOQ error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// BOQ SECTIONS OPERATIONS
// =====================================================

/**
 * Create a new section in BOQ
 * @param {Object} sectionData - Section details
 * @returns {Object} Created section
 */
export const createBOQSection = async (sectionData) => {
  try {
    const { data, error } = await supabase
      .from('boq_sections')
      .insert([{
        boq_id: sectionData.boq_id,
        section_number: sectionData.section_number,
        title: sectionData.title,
        description: sectionData.description || null,
        display_order: sectionData.display_order || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating section:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Create section error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update BOQ section
 * @param {string} sectionId - Section UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated section
 */
export const updateBOQSection = async (sectionId, updates) => {
  try {
    const { data, error } = await supabase
      .from('boq_sections')
      .update({
        section_number: updates.section_number,
        title: updates.title,
        description: updates.description,
        display_order: updates.display_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating section:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Update section error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete BOQ section
 * @param {string} sectionId - Section UUID
 * @returns {Object} Success status
 */
export const deleteBOQSection = async (sectionId) => {
  try {
    const { error } = await supabase
      .from('boq_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      console.error('Error deleting section:', error);
      throw error;
    }

    return { success: true, message: 'Section deleted successfully' };
  } catch (error) {
    console.error('Delete section error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// BOQ ITEMS OPERATIONS
// =====================================================

/**
 * Create a new BOQ item
 * @param {Object} itemData - Item details
 * @returns {Object} Created item
 */
export const createBOQItem = async (itemData) => {
  try {
    const { data, error } = await supabase
      .from('boq_items')
      .insert([{
        boq_id: itemData.boq_id,
        section_id: itemData.section_id || null,
        item_number: itemData.item_number,
        description: itemData.description,
        item_type: itemData.item_type,
        unit: itemData.unit,
        quantity: itemData.quantity,
        unit_rate: itemData.unit_rate,
        specifications: itemData.specifications || null,
        notes: itemData.notes || null,
        display_order: itemData.display_order || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Create item error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all items for a BOQ
 * @param {string} boqId - BOQ UUID
 * @returns {Array} List of items
 */
export const getBOQItems = async (boqId) => {
  try {
    const { data, error } = await supabase
      .from('boq_items')
      .select(`
        *,
        section:boq_sections(
          id,
          section_number,
          title
        )
      `)
      .eq('boq_id', boqId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching items:', error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get items error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update BOQ item
 * @param {string} itemId - Item UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated item
 */
export const updateBOQItem = async (itemId, updates) => {
  try {
    const { data, error } = await supabase
      .from('boq_items')
      .update({
        item_number: updates.item_number,
        description: updates.description,
        item_type: updates.item_type,
        unit: updates.unit,
        quantity: updates.quantity,
        unit_rate: updates.unit_rate,
        section_id: updates.section_id !== undefined ? updates.section_id : null, // ← FIX: Include section_id
        specifications: updates.specifications,
        notes: updates.notes,
        display_order: updates.display_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Update item error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete BOQ item
 * @param {string} itemId - Item UUID
 * @returns {Object} Success status
 */
export const deleteBOQItem = async (itemId) => {
  try {
    const { error } = await supabase
      .from('boq_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting item:', error);
      throw error;
    }

    return { success: true, message: 'Item deleted successfully' };
  } catch (error) {
    console.error('Delete item error:', error);
    return { success: false, error: error.message };
  }
};


// =====================================================
// SECTION HELPER FUNCTIONS (NEW)
// =====================================================

/**
 * Get all sections for a BOQ
 * @param {string} boqId - BOQ UUID
 * @returns {Array} List of sections ordered by display_order
 */
export const getBOQSections = async (boqId) => {
  try {
    const { data, error } = await supabase
      .from('boq_sections')
      .select('*')
      .eq('boq_id', boqId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get sections error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all items in a specific section
 * @param {string} sectionId - Section UUID
 * @returns {Array} List of items in the section
 */
export const getItemsBySection = async (sectionId) => {
  try {
    const { data, error } = await supabase
      .from('boq_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching items by section:', error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get items by section error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Move item to a different section (or remove from section)
 * @param {string} itemId - Item UUID
 * @param {string|null} sectionId - Target section UUID (null to remove from section)
 * @returns {Object} Updated item
 */
export const moveItemToSection = async (itemId, sectionId) => {
  try {
    const { data, error } = await supabase
      .from('boq_items')
      .update({
        section_id: sectionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error moving item to section:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Move item error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reorder sections in a BOQ
 * @param {Array} sectionOrders - Array of {id, display_order} objects
 * @returns {Object} Success status
 */
export const reorderSections = async (sectionOrders) => {
  try {
    // Update each section's display_order
    const updates = sectionOrders.map(({ id, display_order }) =>
      supabase
        .from('boq_sections')
        .update({ display_order, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Error reordering sections:', errors);
      throw new Error('Failed to reorder sections');
    }

    return { success: true, message: 'Sections reordered successfully' };
  } catch (error) {
    console.error('Reorder sections error:', error);
    return { success: false, error: error.message };
  }
};


// =====================================================
// BOQ CALCULATIONS & SST
// =====================================================

/**
 * Calculate BOQ summary with SST
 * @param {string} boqId - BOQ UUID
 * @param {number} sstRate - SST percentage (default 6% for materials)
 * @returns {Object} Summary with totals and SST
 */
export const calculateBOQSummary = async (boqId, sstRate = 6) => {
  try {
    // Get all items
    const { data: items, error } = await supabase
      .from('boq_items')
      .select('*')
      .eq('boq_id', boqId);

    if (error) {
      throw error;
    }

    if (!items || items.length === 0) {
      return {
        success: true,
        data: {
          subtotal: 0,
          sst: 0,
          grandTotal: 0,
          totalItems: 0,
          totalQuantity: 0,
          byType: {
            material: 0,
            labor: 0,
            equipment: 0,
            subcontractor: 0
          }
        }
      };
    }

    // Calculate totals by type
    const byType = {
      material: 0,
      labor: 0,
      equipment: 0,
      subcontractor: 0
    };

    let subtotal = 0;
    let totalQuantity = 0;

    items.forEach(item => {
      const amount = parseFloat(item.amount || 0);  // Use database-calculated amount
      const quantity = parseFloat(item.quantity || 0);
      
      subtotal += amount;
      totalQuantity += quantity;
      
      if (byType.hasOwnProperty(item.item_type)) {
        byType[item.item_type] += amount;
      }
    });

    // Calculate SST (only on materials in Malaysia)
    const materialAmount = byType.material;
    const sst = (materialAmount * sstRate) / 100;
    const grandTotal = subtotal + sst;

    return {
      success: true,
      data: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        sst: parseFloat(sst.toFixed(2)),
        sstRate: sstRate,
        grandTotal: parseFloat(grandTotal.toFixed(2)),  // Changed from 'total'
        totalItems: items.length,  // Changed from 'itemCount'
        totalQuantity: parseFloat(totalQuantity.toFixed(3)),  // Added this field
        byType: {
          material: parseFloat(byType.material.toFixed(2)),
          labor: parseFloat(byType.labor.toFixed(2)),
          equipment: parseFloat(byType.equipment.toFixed(2)),
          subcontractor: parseFloat(byType.subcontractor.toFixed(2))
        }
      }
    };
  } catch (error) {
    console.error('Calculate summary error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get BOQ statistics for dashboard
 * @param {string} contractId - Contract UUID (optional)
 * @returns {Object} BOQ statistics
 */
export const getBOQStatistics = async (contractId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('boq')
      .select('id, status, total_amount, total_items, contract_id');

    if (contractId) {
      query = query.eq('contract_id', contractId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const stats = {
      total: data.length,
      draft: data.filter(b => b.status === 'draft').length,
      approved: data.filter(b => b.status === 'approved').length,
      locked: data.filter(b => b.status === 'locked').length,
      totalValue: data.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0),
      totalItems: data.reduce((sum, b) => sum + parseInt(b.total_items || 0), 0)
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Get statistics error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate next BOQ number for a contract
 * @param {string} contractId - Contract UUID
 * @returns {string} Next BOQ number (e.g., BOQ-001, BOQ-002)
 */
export const generateBOQNumber = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('boq')
      .select('boq_number')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return 'BOQ-001';
    }

    // Extract number from last BOQ number
    const lastNumber = data[0].boq_number;
    const match = lastNumber.match(/BOQ-(\d+)/);
    
    if (match) {
      const nextNum = parseInt(match[1]) + 1;
      return `BOQ-${String(nextNum).padStart(3, '0')}`;
    }

    return 'BOQ-001';
  } catch (error) {
    console.error('Generate BOQ number error:', error);
    return 'BOQ-001';
  }
};

/**
 * Validate BOQ item data
 * @param {Object} itemData - Item to validate
 * @returns {Object} Validation result
 */
export const validateBOQItem = (itemData) => {
  const errors = [];

  if (!itemData.item_number || itemData.item_number.trim() === '') {
    errors.push('Item number is required');
  }

  if (!itemData.description || itemData.description.trim() === '') {
    errors.push('Description is required');
  }

  if (!itemData.item_type) {
    errors.push('Item type is required');
  }

  const validTypes = ['material', 'labor', 'equipment', 'subcontractor'];
  if (itemData.item_type && !validTypes.includes(itemData.item_type)) {
    errors.push('Invalid item type');
  }

  if (!itemData.unit || itemData.unit.trim() === '') {
    errors.push('Unit is required');
  }

  if (!itemData.quantity || parseFloat(itemData.quantity) <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (itemData.unit_rate === undefined || parseFloat(itemData.unit_rate) < 0) {
    errors.push('Unit rate must be 0 or greater');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  // BOQ operations
  createBOQ,
  getBOQsByContract,
  getBOQById,
  updateBOQ,
  updateBOQStatus,
  deleteBOQ,
  
  // Section operations
  createBOQSection,
  updateBOQSection,
  deleteBOQSection,
  getBOQSections,          // ← ADD THIS
  getItemsBySection,       // ← ADD THIS
  moveItemToSection,       // ← ADD THIS
  reorderSections,         // ← ADD THIS
  
  // Item operations
  createBOQItem,
  getBOQItems,
  updateBOQItem,
  deleteBOQItem,
  
  // Calculations
  calculateBOQSummary,
  getBOQStatistics,
  
  // Helpers
  generateBOQNumber,
  validateBOQItem
};