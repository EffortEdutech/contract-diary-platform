// AcceptInvitation.js - FIXED VERSION
// Bug fixed: Added email field to user_profiles insert
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getInvitationByToken = async (token) => {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Invalid or expired invitation');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting invitation:', error);
    throw error;
  }
};

const acceptInvitation = async (token, password) => {
  try {
    console.log('🔄 Starting invitation acceptance...');
    
    // Step 1: Get invitation details
    const invitation = await getInvitationByToken(token);
    console.log('✅ Invitation found:', invitation.email);

    let userId;
    let isNewUser = true;

    // Step 2: Try to create new user
    console.log('🔄 Creating auth user...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
      options: {
        data: {
          full_name: invitation.full_name
        }
      }
    });

    // Handle existing user
    if (signUpError && signUpError.message.includes('already registered')) {
      console.log('⚠️ User already exists, attempting sign in...');
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password
      });

      if (signInError) {
        if (signInError.message.includes('Invalid')) {
          throw new Error('This email is already registered. Please use the correct password or contact your administrator.');
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

    // Step 3: UPSERT user profile (with email)
    console.log('🔄 Creating/updating user profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: invitation.email, // ✅ Store email for display
        role: invitation.company_type,
        user_role: invitation.user_role,
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
      console.error('❌ Profile error:', profileError);
      console.error('Error details:', profileError.message);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    console.log('✅ User profile ' + (isNewUser ? 'created' : 'updated'));

    // Step 4: Add user to contract (if contract_id exists)
    if (invitation.contract_id) {
      console.log('🔄 Adding user to contract:', invitation.contract_id);
      
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('contract_members')
        .select('id')
        .eq('contract_id', invitation.contract_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('contract_members')
          .insert({
            contract_id: invitation.contract_id,
            user_id: userId,
            organization_id: invitation.organization_id,
            member_role: invitation.user_role || 'member', // Use invited role
            invited_by: invitation.invited_by,
            invited_at: new Date().toISOString(),
            invitation_status: 'active'
          });

        if (memberError) {
          console.error('❌ Error adding to contract:', memberError);
          console.error('Code:', memberError.code);
          console.error('Details:', memberError.details);
          
          // Show warning but don't block signup
          alert('⚠️ Account created but failed to add to contract team. Contact your administrator to add you manually.');
        } else {
          console.log('✅ Added to contract team successfully!');
        }
      } else {
        console.log('✅ Already a member of this contract');
      }
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
    
    return { 
      id: userId, 
      isNewUser: isNewUser, 
      contractId: invitation.contract_id 
    };
  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    throw error;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const data = await getInvitationByToken(token);
      setInvitation(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Invalid or expired invitation');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setAccepting(true);

    try {
      const result = await acceptInvitation(token, password);
      
      if (result.isNewUser) {
        alert('✅ Account created successfully! You can now sign in.');
      } else {
        alert('✅ Welcome back! Your account has been updated with the invitation details.');
      }
      
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      owner: { label: 'Owner', color: 'blue', icon: '👑' },
      admin: { label: 'Admin', color: 'purple', icon: '⚡' },
      editor: { label: 'Editor', color: 'green', icon: '✏️' },
      viewer: { label: 'Viewer', color: 'gray', icon: '👁️' },
      submitter: { label: 'Submitter', color: 'yellow', icon: '📝' },
      reviewer: { label: 'Reviewer', color: 'orange', icon: '🔍' },
      approver: { label: 'Approver', color: 'indigo', icon: '✓' },
      auditor: { label: 'Auditor', color: 'gray', icon: '📊' },
      readonly: { label: 'Read-Only', color: 'gray', icon: '👀' }
    };
    return roles[role] || { label: role, color: 'gray', icon: '👤' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleBadge = getRoleBadge(invitation.user_role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accept Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join Contract Diary Platform
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Account Details</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Email</label>
              <p className="text-sm text-gray-900 font-medium">{invitation.email}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Full Name</label>
              <p className="text-sm text-gray-900">{invitation.full_name}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Position</label>
              <p className="text-sm text-gray-900">{invitation.position}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Role</label>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${roleBadge.color}-100 text-${roleBadge.color}-800`}>
                  <span className="mr-1">{roleBadge.icon}</span>
                  {roleBadge.label}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Organization</label>
              <p className="text-sm text-gray-900">{invitation.organization_name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Your Password</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={accepting}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
