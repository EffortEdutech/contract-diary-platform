// memberService.js - Member Management Service
// FIXED: Changed .single() to .maybeSingle() to handle missing profiles gracefully

import { supabase } from '../lib/supabase';

/**
 * Get all members for a specific contract
 * @param {string} contractId - Contract UUID
 * @returns {Promise<Array>} Array of member objects with user details
 */
export const getContractMembers = async (contractId) => {
  try {
    // Get current user for permission check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('contract_members')
      .select(`
        id,
        member_role,
        invitation_status,
        trade_scope,
        invited_at,
        user_id,
        invited_by
      `)
      .eq('contract_id', contractId)
      .order('invited_at', { ascending: false });

    if (error) throw error;

    // Fetch user details for each member
    const membersWithDetails = await Promise.all(
      data.map(async (member) => {
        // Get user profile details
        // FIXED: Changed .single() to .maybeSingle() to handle missing profiles
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, organization_id, organization_name, phone, position, user_role')
          .eq('id', member.user_id)
          .maybeSingle();  // ✅ Returns null instead of error if not found

        if (profileError) {
          console.warn(`Could not fetch profile for user ${member.user_id}:`, profileError);
        }
        
        // Get organization name if exists
        let organizationName = profile?.organization_name || null;
        if (!organizationName && profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .maybeSingle();  // ✅ Also fixed here
          organizationName = org?.name;
        }

        // Get inviter name
        let inviterInfo = 'System';
        if (member.invited_by) {
          if (member.invited_by === user.id) {
            inviterInfo = 'You';
          } else {
            const inviterMember = data.find(m => m.user_id === member.invited_by);
            if (inviterMember) {
              inviterInfo = `Member (${inviterMember.member_role})`;
            }
          }
        }

        return {
          ...member,
          email: member.user_id, // Display UUID (free tier limitation)
          displayName: profile?.position || 'Team Member',
          phone: profile?.phone,
          position: profile?.position,
          userRole: profile?.role, // Company type (main_contractor, subcontractor, etc.)
          contractRole: member.member_role, // Contract access (owner, member, viewer)
          organizationName,
          inviterEmail: inviterInfo
        };
      })
    );

    return membersWithDetails;
  } catch (error) {
    console.error('Error fetching contract members:', error);
    throw error;
  }
};

/**
 * Add a new member to a contract by email
 */
export const addContractMember = async (contractId, email, role, tradeScope = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    throw new Error('Email-based invitation requires Supabase Edge Function. Please provide user_id instead.');
  } catch (error) {
    console.error('Error adding contract member:', error);
    throw error;
  }
};

/**
 * Add member by user_id
 */
export const addContractMemberById = async (contractId, userId, role, tradeScope = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('contract_members')
      .select('id')
      .eq('contract_id', contractId)
      .eq('user_id', userId)
      .maybeSingle();  // ✅ Fixed here too

    if (existing) {
      throw new Error('User is already a member of this contract');
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)  // Changed from user_id to id
      .maybeSingle();  // ✅ Fixed here too

    // Insert new member
    const { data, error } = await supabase
      .from('contract_members')
      .insert({
        contract_id: contractId,
        user_id: userId,
        member_role: role,
        organization_id: userProfile?.organization_id,
        invited_by: user.id,
        invitation_status: 'active',
        trade_scope: tradeScope
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding contract member by ID:', error);
    throw error;
  }
};

/**
 * Remove a member from a contract
 */
export const removeContractMember = async (memberId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('contract_members')
      .update({ 
        invitation_status: 'removed',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing contract member:', error);
    throw error;
  }
};

/**
 * Update member role or trade scope
 */
export const updateContractMember = async (memberId, updates) => {
  try {
    const { data, error } = await supabase
      .from('contract_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating contract member:', error);
    throw error;
  }
};

/**
 * Check if current user is owner of contract
 */
export const isContractOwner = async (contractId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('contract_members')
      .select('member_role')
      .eq('contract_id', contractId)
      .eq('user_id', user.id)
      .maybeSingle();  // ✅ Fixed here too

    return data?.member_role === 'owner';
  } catch (error) {
    console.error('Error checking contract ownership:', error);
    return false;
  }
};

// FIXED getMemberStats function with debugging
// Replace in memberService.js starting at line ~240

// UPDATED getMemberStats - Includes pending invitations from invitations table
// Replace in memberService.js starting at line ~240

export const getMemberStats = async (contractId) => {
  try {
    // Step 1: Get contract members (already in contract)
    const { data: members, error: membersError } = await supabase
      .from('contract_members')
      .select('member_role, invitation_status, user_id')
      .eq('contract_id', contractId);

    if (membersError) throw membersError;

    // Step 2: Get pending invitations (not yet accepted)
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invitations')
      .select('id, email, status')
      .eq('contract_id', contractId)
      .eq('status', 'pending');

    if (invitesError) {
      console.error('Error fetching pending invitations:', invitesError);
      // Don't throw - continue with members only
    }

    // Step 3: Get user profiles for company type breakdown
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create profile map
    const profileMap = {};
    profiles?.forEach(p => {
      profileMap[p.id] = p.role;
    });

    // Step 4: Calculate stats
    const stats = {
      total: members.length + (pendingInvites?.length || 0), // ✅ Include pending invites
      active: members.filter(m => m.invitation_status === 'active').length,
      pending: (pendingInvites?.length || 0), // ✅ Count from invitations table
      byContractRole: {
        owner: members.filter(m => m.member_role === 'owner').length,
        member: members.filter(m => m.member_role === 'member').length,
        viewer: members.filter(m => m.member_role === 'viewer').length
      },
      byCompanyType: {
        main_contractor: members.filter(m => profileMap[m.user_id] === 'main_contractor').length,
        subcontractor: members.filter(m => profileMap[m.user_id] === 'subcontractor').length,
        consultant: members.filter(m => profileMap[m.user_id] === 'consultant').length,
        supplier: members.filter(m => profileMap[m.user_id] === 'supplier').length
      }
    };

    return stats;
  } catch (error) {
    console.error('Error getting member stats:', error);
    throw error;
  }
};


export default {
  getContractMembers,
  addContractMember,
  addContractMemberById,
  removeContractMember,
  updateContractMember,
  isContractOwner,
  getMemberStats
};
