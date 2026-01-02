// settingsService.js - Settings Management Service
// Handles user profile and organization settings

import { supabase } from '../lib/supabase';

/**
 * Create user profile for new users
 * @param {string} userId - User ID from auth.users
 * @returns {Promise<Object>} Created profile
 */
const createUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        role: 'main_contractor', // Default role
        position: null,
        phone: null,
        organization_id: null,
        organization_name: null,
        cidb_registration: null,
        ssm_registration: null
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ User profile created successfully');
    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get current user's profile
 * @returns {Promise<Object>} User profile with auth data
 */
export const getUserProfile = async () => {
  try {
    // Get current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    // Get profile from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); // ✅ Use maybeSingle() instead of single() - returns null if no rows

    // If profile doesn't exist (new user), create it
    if (!profile) {
      console.log('No profile found for user, creating new profile...');
      const newProfile = await createUserProfile(user.id);
      
      // Get organization if exists
      let organization = null;
      if (newProfile.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', newProfile.organization_id)
          .single();
        organization = org;
      }

      return {
        user_id: user.id,
        email: user.email,
        created_at: user.created_at,
        ...newProfile,
        organization
      };
    }

    if (profileError) throw profileError;

    // Get organization details if exists
    let organization = null;
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      organization = org;
    }

    return {
      user_id: user.id,
      email: user.email,
      created_at: user.created_at,
      ...profile,
      organization
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} updates - Profile fields to update
 * @returns {Promise<Object>} Updated profile
 */
export const updateUserProfile = async (updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * Get user's organization
 * @returns {Promise<Object>} Organization details
 */
export const getUserOrganization = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return null;
    }

    // Get organization details
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single();

    if (error) throw error;

    return organization;
  } catch (error) {
    console.error('Error fetching organization:', error);
    throw error;
  }
};

/**
 * Create new organization
 * @param {Object} orgData - Organization data
 * @returns {Promise<Object>} Created organization
 */
export const createOrganization = async (orgData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        ...orgData,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Update user profile with organization_id
    await supabase
      .from('user_profiles')
      .update({
        organization_id: data.id,
        organization_name: data.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    return data;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

/**
 * Update organization
 * @param {string} orgId - Organization ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated organization
 */
export const updateOrganization = async (orgId, updates) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;

    // Update organization_name in user_profiles if name changed
    if (updates.name) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('user_profiles')
        .update({
          organization_name: updates.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    return data;
  } catch (error) {
    console.error('Error updating organization:', error);
    throw error;
  }
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

/**
 * Change user password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const changePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  getUserOrganization,
  createOrganization,
  updateOrganization,
  copyToClipboard,
  changePassword
};
