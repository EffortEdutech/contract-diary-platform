// invitationService.js - Handle member invitations
import { supabase } from '../lib/supabase'

/**
 * Create and send invitation to new team member
 * @param {Object} invitationData - Invitation details
 * @returns {Promise<Object>} Created invitation
 */
export const createInvitation = async (invitationData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Generate unique token
    const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: invitationData.email,
        token: token,
        full_name: invitationData.fullName,
        position: invitationData.position,
        phone: invitationData.phone || null,
        organization_id: invitationData.organizationId,
        organization_name: invitationData.organizationName,
        company_type: invitationData.companyType,
        user_role: invitationData.userRole,
        cidb_registration: invitationData.cidbRegistration || null,
        ssm_registration: invitationData.ssmRegistration || null,
        invited_by: user.id,
        contract_id: invitationData.contractId || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })
      .select()
      .single()

    if (error) throw error

    // Generate invitation link
    const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`

    console.log('✅ Invitation created!')
    console.log('📧 Send this link to:', invitationData.email)
    console.log('🔗 Invitation link:', invitationLink)

    // TODO: Send email with invitation link
    // For now, return the link so admin can copy it
    return {
      ...data,
      invitationLink
    }
  } catch (error) {
    console.error('Error creating invitation:', error)
    throw error
  }
}

/**
 * Get invitation by token
 * @param {string} token - Invitation token
 * @returns {Promise<Object>} Invitation details
 */
export const getInvitationByToken = async (token) => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Invalid or expired invitation')
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error getting invitation:', error)
    throw error
  }
}

/**
 * Accept invitation and create user account
 * @param {string} token - Invitation token
 * @param {string} password - User's chosen password
 * @returns {Promise<Object>} Created user
 */

// COMPLETE FIXED acceptInvitation function
// Replace in invitationService.js starting at line 90

export const acceptInvitation = async (token, password) => {
  try {
    console.log('🔄 Starting invitation acceptance...');
    
    // Step 1: Get invitation details
    const invitation = await getInvitationByToken(token);
    console.log('✅ Invitation found:', invitation.email);

    // Step 2: Create auth user
    console.log('🔄 Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
      options: {
        data: {
          full_name: invitation.full_name
        },
        emailRedirectTo: `${window.location.origin}/login`
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      throw authError;
    }
    if (!authData.user) {
      throw new Error('Failed to create user account');
    }
    console.log('✅ Auth user created:', authData.user.id);

    // Step 3: Create user profile
    console.log('🔄 Creating user profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        role: invitation.company_type,
        user_role: invitation.user_role,
        position: invitation.position,
        phone: invitation.phone,
        organization_id: invitation.organization_id,
        organization_name: invitation.organization_name,
        cidb_registration: invitation.cidb_registration,
        ssm_registration: invitation.ssm_registration
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }
    console.log('✅ User profile created');

    // Step 4: If invitation has contract_id, add user to that contract
    if (invitation.contract_id) {
      console.log('🔄 Adding to contract...', invitation.contract_id);
      
      const { error: memberError } = await supabase
        .from('contract_members')
        .insert({
          contract_id: invitation.contract_id,
          user_id: authData.user.id,
          organization_id: invitation.organization_id, // ✅ ADDED
          member_role: 'member',
          invited_by: invitation.invited_by,
          invited_at: new Date().toISOString(),
          invitation_status: 'active' // ✅ ADDED
        });

      if (memberError) {
        console.error('❌ Member error:', memberError);
        throw new Error(`Failed to add to contract: ${memberError.message}`);
      }
      console.log('✅ Added to contract');
    }

    // Step 5: Mark invitation as accepted
    console.log('🔄 Marking invitation as accepted...');
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('token', token);

    if (updateError) {
      console.error('⚠️ Warning: Could not update invitation status:', updateError);
      // Don't throw - user account is created, this is just metadata
    } else {
      console.log('✅ Invitation marked as accepted');
    }

    console.log('🎉 Invitation accepted successfully!');
    return authData.user;
    
  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Get all invitations sent by current user
 * @returns {Promise<Array>} List of invitations
 */
export const getMyInvitations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('invited_by', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting invitations:', error)
    throw error
  }
}

/**
 * Cancel invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<void>}
 */
export const cancelInvitation = async (invitationId) => {
  try {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (error) throw error
    console.log('✅ Invitation cancelled')
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    throw error
  }
}

/**
 * Resend invitation (generate new token)
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<Object>} Updated invitation
 */
export const resendInvitation = async (invitationId) => {
  try {
    const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))

    const { data, error } = await supabase
      .from('invitations')
      .update({
        token: token,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`
    
    console.log('✅ Invitation resent!')
    console.log('🔗 New invitation link:', invitationLink)

    return {
      ...data,
      invitationLink
    }
  } catch (error) {
    console.error('Error resending invitation:', error)
    throw error
  }
}
