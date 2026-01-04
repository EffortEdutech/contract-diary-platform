// ============================================
// ENHANCED memberService.js - Complete Member Management
// ============================================
// Purpose: Handle all member operations with tracking and monitoring
// Features: Complete member data, activity tracking, invitation management
// ============================================

import { supabase } from '../lib/supabase';

/**
 * Get all members for a specific contract WITH COMPLETE INFORMATION
 * Includes: invitation tracking, activity status, registration details
 */
export const getContractMembers = async (contractId) => {
  try {
    // Get current user for permission check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Step 1: Get contract members
    const { data: members, error: membersError } = await supabase
      .from('contract_members')
      .select(`
        id,
        member_role,
        invitation_status,
        trade_scope,
        invited_at,
        user_id,
        invited_by,
        created_at
      `)
      .eq('contract_id', contractId)
      .order('invited_at', { ascending: false });

    if (membersError) throw membersError;

    // Step 2: Fetch user profiles for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        // Get user profile details (includes email if column was added)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', member.user_id)
          .maybeSingle();

        // Get invitation details (for accepted_at, expiry, full_name, etc.)
        const { data: invitation } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', profile?.email || '')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get organization name if exists
        let organizationName = profile?.organization_name || null;
        if (!organizationName && profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .maybeSingle();
          organizationName = org?.name;
        }

        // Get inviter information
        let inviterInfo = 'System';
        if (member.invited_by) {
          if (member.invited_by === user.id) {
            inviterInfo = 'You';
          } else {
            const { data: inviterProfile } = await supabase
              .from('user_profiles')
              .select('email, position')
              .eq('id', member.invited_by)
              .maybeSingle();
            
            if (inviterProfile) {
              inviterInfo = `${inviterProfile.position || inviterProfile.email || 'Team Member'}`;
            }
          }
        }

        // Get last activity (from user_activity table if exists, otherwise use profile updated_at)
        const lastActiveAt = profile?.updated_at || member.created_at;

        return {
          ...member,
          // Profile information
          email: profile?.email || member.user_id,
          displayName: invitation?.full_name || profile?.position || profile?.email?.split('@')[0] || 'Team Member',
          phone: profile?.phone || invitation?.phone,
          position: profile?.position || invitation?.position,
          company_type: profile?.role, // Company type (main_contractor, subcontractor, etc.)
          userRole: profile?.role,
          organizationName, // Use the variable that includes organization table lookup
          
          // Registration information
          cidb_registration: profile?.cidb_registration || invitation?.cidb_registration,
          ssm_registration: profile?.ssm_registration || invitation?.ssm_registration,
          
          // Invitation tracking
          invitation_sent_at: invitation?.invited_at || member.invited_at,
          accepted_at: invitation?.accepted_at,
          invitation_expires_at: invitation?.expires_at,
          invitation_token: invitation?.token,
          
          // Activity tracking
          last_active_at: lastActiveAt,
          profile_created_at: profile?.created_at,
          
          // Inviter information
          inviterInfo,
          inviterUserId: member.invited_by,
          
          // Calculated fields
          is_invitation_expired: invitation?.expires_at ? new Date(invitation.expires_at) < new Date() : false,
          days_since_invite: member.invited_at ? Math.floor((new Date() - new Date(member.invited_at)) / (1000 * 60 * 60 * 24)) : null,
          days_since_accepted: invitation?.accepted_at ? Math.floor((new Date() - new Date(invitation.accepted_at)) / (1000 * 60 * 60 * 24)) : null,
          is_active: member.invitation_status === 'active',
          is_pending: member.invitation_status === 'pending',
          
          // Full profile object for reference
          profile
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
 * Get pending invitations (not yet accepted)
 */
export const getPendingInvitations = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('contract_id', contractId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('invited_at', { ascending: false });

    if (error) throw error;

    return data.map(inv => ({
      ...inv,
      is_expired: new Date(inv.expires_at) < new Date(),
      days_until_expiry: Math.floor((new Date(inv.expires_at) - new Date()) / (1000 * 60 * 60 * 24)),
      days_since_invite: Math.floor((new Date() - new Date(inv.invited_at)) / (1000 * 60 * 60 * 24))
    }));
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    throw error;
  }
};

/**
 * Update member role and permissions
 */
export const updateMemberRole = async (memberId, newRole, notes = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Update member role
    const { data, error } = await supabase
      .from('contract_members')
      .update({
        member_role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    // Log the role change (if activity logging table exists)
    try {
      await supabase
        .from('member_activity_log')
        .insert({
          member_id: memberId,
          action_type: 'role_changed',
          action_by: user.id,
          old_value: data.member_role,
          new_value: newRole,
          notes: notes,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      // Activity logging is optional
      console.warn('Could not log role change:', logError);
    }

    return data;
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
};

/**
 * Resend invitation email
 */
export const resendInvitation = async (invitationId) => {
  try {
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchError) throw fetchError;

    // Update invitation with new expiry
    const { data, error } = await supabase
      .from('invitations')
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;

    // TODO: Trigger email notification
    console.log('Invitation resent:', data);

    return data;
  } catch (error) {
    console.error('Error resending invitation:', error);
    throw error;
  }
};

/**
 * Cancel/Delete pending invitation
 */
export const cancelInvitation = async (invitationId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Update invitation status to cancelled
    const { data, error } = await supabase
      .from('invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('status', 'pending') // Can only cancel pending invitations
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error('Invitation not found or already processed');
    }

    return data;
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    throw error;
  }
};

/**
 * Get member statistics with complete breakdown
 */
export const getMemberStats = async (contractId) => {
  try {
    // Get contract members
    const { data: members, error: membersError } = await supabase
      .from('contract_members')
      .select('member_role, invitation_status, user_id')
      .eq('contract_id', contractId);

    if (membersError) throw membersError;

    // Get pending invitations
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invitations')
      .select('id, email, status, expires_at')
      .eq('contract_id', contractId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    // Get user profiles for company type breakdown
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, role')
      .in('id', userIds);

    // Create profile map
    const profileMap = {};
    profiles?.forEach(p => {
      profileMap[p.id] = p.role;
    });

    // Calculate comprehensive stats
    const stats = {
      total: members.length + (pendingInvites?.length || 0),
      active: members.filter(m => m.invitation_status === 'active').length,
      pending: (pendingInvites?.length || 0),
      removed: members.filter(m => m.invitation_status === 'removed').length,
      
      byRole: {
        owner: members.filter(m => m.member_role === 'owner').length,
        admin: members.filter(m => m.member_role === 'admin').length,
        editor: members.filter(m => m.member_role === 'editor').length,
        viewer: members.filter(m => m.member_role === 'viewer').length,
        submitter: members.filter(m => m.member_role === 'submitter').length,
        reviewer: members.filter(m => m.member_role === 'reviewer').length,
        approver: members.filter(m => m.member_role === 'approver').length,
        auditor: members.filter(m => m.member_role === 'auditor').length,
        readonly: members.filter(m => m.member_role === 'readonly').length
      },
      
      byCompanyType: {
        main_contractor: members.filter(m => profileMap[m.user_id] === 'main_contractor').length,
        subcontractor: members.filter(m => profileMap[m.user_id] === 'subcontractor').length,
        consultant: members.filter(m => profileMap[m.user_id] === 'consultant').length,
        supplier: members.filter(m => profileMap[m.user_id] === 'supplier').length
      },
      
      // Additional insights
      pending_invitations_list: pendingInvites || [],
      total_with_access: members.filter(m => m.invitation_status === 'active').length
    };

    return stats;
  } catch (error) {
    console.error('Error getting member stats:', error);
    throw error;
  }
};

/**
 * Get member activity history
 */
export const getMemberActivity = async (memberId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('member_activity_log')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If table doesn't exist, return empty array
    if (error && error.code === '42P01') {
      return [];
    }

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching member activity:', error);
    return [];
  }
};

/**
 * Add contract member by user ID (legacy function for manual addition)
 */
export const addContractMemberById = async (contractId, userId, role = 'member', tradeScope = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    // Insert contract member
    const { data, error } = await supabase
      .from('contract_members')
      .insert({
        contract_id: contractId,
        user_id: userId,
        organization_id: profile?.organization_id,
        member_role: role,
        trade_scope: tradeScope,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        invitation_status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // Log the addition
    try {
      await supabase
        .from('member_activity_log')
        .insert({
          member_id: data.id,
          action_type: 'member_added',
          action_by: user.id,
          notes: `Added by user ID`,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('Could not log member addition:', logError);
    }

    return data;
  } catch (error) {
    console.error('Error adding contract member:', error);
    throw error;
  }
};

/**
 * Remove contract member
 */
export const removeContractMember = async (memberId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Soft delete - mark as removed
    const { data, error } = await supabase
      .from('contract_members')
      .update({
        invitation_status: 'removed',
        removed_at: new Date().toISOString(),
        removed_by: user.id
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    // Log the removal
    try {
      await supabase
        .from('member_activity_log')
        .insert({
          member_id: memberId,
          action_type: 'member_removed',
          action_by: user.id,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('Could not log member removal:', logError);
    }

    return data;
  } catch (error) {
    console.error('Error removing contract member:', error);
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
      .maybeSingle();

    return data?.member_role === 'owner';
  } catch (error) {
    console.error('Error checking contract ownership:', error);
    return false;
  }
};

/**
 * Check if current user can manage members (owner or admin)
 */
export const canManageMembers = async (contractId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('contract_members')
      .select('member_role')
      .eq('contract_id', contractId)
      .eq('user_id', user.id)
      .maybeSingle();

    return ['owner', 'admin'].includes(data?.member_role);
  } catch (error) {
    console.error('Error checking member management permission:', error);
    return false;
  }
};

export default {
  getContractMembers,
  getPendingInvitations,
  addContractMemberById,
  updateMemberRole,
  resendInvitation,
  cancelInvitation,
  getMemberStats,
  getMemberActivity,
  removeContractMember,
  isContractOwner,
  canManageMembers
};
