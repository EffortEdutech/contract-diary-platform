// ============================================
// UPDATED: invitationService.js
// Session 13 - RBAC Migration
// ============================================
// CHANGES:
// - Removed user_role from acceptInvitation UPSERT
// - Only uses 'role' (company type)
// - Member role assigned via contract_members.member_role
// ============================================

import { supabase } from '../lib/supabase';

/**
 * Accept an invitation by token
 * Creates user account if needed, adds to contract
 */
export const acceptInvitation = async (token, password) => {
  try {
    // Step 1: Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError) throw inviteError;
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if invitation expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('This invitation has expired');
    }

    let userId;
    let isNewUser = false;

    // Step 2: Try to sign up (new user) or sign in (existing user)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
      options: {
        data: {
          full_name: invitation.full_name
        }
      }
    });

    // If user already exists, try signing in
    if (signUpError?.message?.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('An account with this email already exists. Please use the correct password or contact your administrator.');
        }
        throw signInError;
      }

      userId = signInData.user.id;
      isNewUser = false;
      console.log('✅ Logged in with existing account');
    } else if (signUpError) {
      throw signUpError;
    } else {
      userId = signUpData.user.id;
      isNewUser = true;
      console.log('✅ New user account created');
    }

    if (!userId) {
      throw new Error('Failed to get user ID');
    }

    // Step 3: UPSERT user profile
    // ✅ FIXED: Only insert 'role' (company type), NOT 'user_role'
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        role: invitation.company_type, // ✅ Company type only (MC/SC/Consultant/Supplier)
        // ❌ REMOVED: user_role field (no longer exists in database)
        position: invitation.position,
        phone: invitation.phone,
        organization_id: invitation.organization_id,
        organization_name: invitation.organization_name,
        cidb_registration: invitation.cidb_registration,
        ssm_registration: invitation.ssm_registration
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating/updating profile:', profileError);
      throw new Error('Failed to create user profile');
    }

    console.log('✅ User profile ' + (isNewUser ? 'created' : 'updated'));

    // Step 4: Get user's organization_id for contract_members
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    // Step 5: Add user to contract (if contract_id exists)
    if (invitation.contract_id) {
      console.log('Adding user to contract:', invitation.contract_id);
      
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('contract_members')
        .select('id')
        .eq('contract_id', invitation.contract_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingMember) {
        // ✅ FIXED: Use member_role from invitation.user_role
        // The invitation stores the desired member_role in user_role field
        const { error: memberError } = await supabase
          .from('contract_members')
          .insert({
            contract_id: invitation.contract_id,
            user_id: userId,
            organization_id: profileData?.organization_id || null,
            member_role: invitation.user_role || 'editor', // ✅ Contract role from invitation
            invited_by: invitation.invited_by,
            invited_at: new Date().toISOString(),
            invitation_status: 'active'
          });

        if (memberError) {
          console.error('❌ Error adding to contract:', memberError);
          // Show warning but don't block signup
          console.warn('Account created but failed to add to contract team. Contact administrator.');
        } else {
          console.log('✅ Added to contract team successfully!');
        }
      } else {
        console.log('✅ Already a member of this contract');
      }
    }

    // Step 6: Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation status:', updateError);
      // Don't throw - user is already in system
    }

    return {
      success: true,
      isNewUser,
      userId,
      contractId: invitation.contract_id
    };

  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Create and send invitation
 */
export const sendInvitation = async (invitationData) => {
  try {
    // Generate unique token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

    // Set expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: invitationData.email,
        token: token,
        full_name: invitationData.full_name,
        position: invitationData.position,
        phone: invitationData.phone || null,
        organization_id: invitationData.organization_id,
        organization_name: invitationData.organization_name,
        company_type: invitationData.company_type,
        user_role: invitationData.user_role, // ✅ This is the contract member_role they'll get
        cidb_registration: invitationData.cidb_registration || null,
        ssm_registration: invitationData.ssm_registration || null,
        invited_by: invitationData.invited_by,
        contract_id: invitationData.contract_id || null,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Generate invitation link
    const invitationLink = `${window.location.origin}/accept-invitation/${token}`;

    return {
      success: true,
      invitation: data,
      invitationLink
    };

  } catch (error) {
    console.error('Error sending invitation:', error);
    throw error;
  }
};

/**
 * Get invitation by token
 */
export const getInvitation = async (token) => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting invitation:', error);
    throw error;
  }
};

/**
 * Cancel an invitation
 */
export const cancelInvitation = async (invitationId) => {
  try {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    throw error;
  }
};

/**
 * Get all invitations for a contract
 */
export const getContractInvitations = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('contract_id', contractId)
      .order('invited_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting contract invitations:', error);
    throw error;
  }
};

/**
 * Resend invitation (creates new token with new expiry)
 */
export const resendInvitation = async (invitationId) => {
  try {
    // Get original invitation
    const { data: originalInvitation, error: getError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (getError) throw getError;

    // Generate new token and expiry
    const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update invitation with new token
    const { data, error: updateError } = await supabase
      .from('invitations')
      .update({
        token: newToken,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Generate new invitation link
    const invitationLink = `${window.location.origin}/accept-invitation/${newToken}`;

    return {
      success: true,
      invitation: data,
      invitationLink
    };

  } catch (error) {
    console.error('Error resending invitation:', error);
    throw error;
  }
};

export default {
  acceptInvitation,
  sendInvitation,
  getInvitation,
  cancelInvitation,
  getContractInvitations,
  resendInvitation
};
