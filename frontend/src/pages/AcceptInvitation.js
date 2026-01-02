import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ============================================
// ALL FUNCTIONS IN ONE FILE - NO IMPORTS NEEDED
// ============================================

// Get invitation by token
const getInvitationByToken = async (token) => {
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

// Accept invitation - COMPLETE VERSION
const acceptInvitation = async (token, password) => {
  try {
    const invitation = await getInvitationByToken(token)

    let userId = null
    let isNewUser = false

    // Try to create new account first
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
      options: {
        data: {
          full_name: invitation.full_name
        }
      }
    })

    // Handle different scenarios
    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
        console.log('User already exists, attempting login...')
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: password
        })

        if (signInError) {
          throw new Error('This email is already registered. Please use the correct password or contact your administrator.')
        }

        userId = signInData.user.id
        isNewUser = false
        console.log('✅ Logged in with existing account')
      } else {
        throw signUpError
      }
    } else {
      userId = signUpData.user.id
      isNewUser = true
      console.log('✅ New user account created')
    }

    if (!userId) {
      throw new Error('Failed to get user ID')
    }

    // UPSERT user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
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
      })

    if (profileError) {
      console.error('Error creating/updating profile:', profileError)
      throw new Error('Failed to create user profile')
    }

    console.log('✅ User profile ' + (isNewUser ? 'created' : 'updated'))

    // Get user's organization_id for contract_members
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    // ADD USER TO CONTRACT (if contract_id exists)
    if (invitation.contract_id) {
      console.log('Adding user to contract:', invitation.contract_id)
      
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('contract_members')
        .select('id')
        .eq('contract_id', invitation.contract_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('contract_members')
          .insert({
            contract_id: invitation.contract_id,
            user_id: userId,
            organization_id: profileData?.organization_id || null,
            member_role: 'member',
            invited_by: invitation.invited_by,
            invited_at: new Date().toISOString(),
            invitation_status: 'active'
          })

        if (memberError) {
          console.error('❌ Error adding to contract:', memberError)
          console.error('Code:', memberError.code)
          console.error('Details:', memberError.details)
          console.error('Message:', memberError.message)
          
          // SHOW WARNING to user but don't block signup
          alert('⚠️ Account created but failed to add to contract team. Contact your administrator to add you manually.')
        } else {
          console.log('✅ Added to contract team successfully!')
        }
      } else {
        console.log('✅ Already a member of this contract')
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('token', token)

    console.log('✅ Invitation accepted successfully!')
    
    return { id: userId, isNewUser: isNewUser, contractId: invitation.contract_id }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    throw error
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      loadInvitation()
    } else {
      setError('Invalid invitation link')
      setLoading(false)
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      const data = await getInvitationByToken(token)
      setInvitation(data)
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Invalid or expired invitation')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setAccepting(true)

    try {
      const result = await acceptInvitation(token, password)
      
      if (result.isNewUser) {
        alert('Account created successfully! You can now sign in.')
      } else {
        alert('Welcome back! Your account has been updated with the invitation details.')
      }
      
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Failed to accept invitation. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  const getRoleBadge = (role) => {
    const roles = {
      owner: { label: 'Owner', color: 'blue', icon: '👑' },
      admin: { label: 'Admin', color: 'purple', icon: '⚡' },
      editor: { label: 'Editor', color: 'green', icon: '✏️' },
      submitter: { label: 'Submitter', color: 'yellow', icon: '📝' },
      reviewer: { label: 'Reviewer', color: 'orange', icon: '👁️' },
      approver: { label: 'Approver', color: 'indigo', icon: '✓' },
      auditor: { label: 'Auditor', color: 'gray', icon: '📊' },
      readonly: { label: 'Read-Only', color: 'gray', icon: '👀' }
    }
    return roles[role] || { label: role, color: 'gray', icon: '👤' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
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
    )
  }

  const roleBadge = getRoleBadge(invitation.user_role)

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Position</label>
                <p className="text-sm text-gray-900">{invitation.position}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Role</label>
                <p className="text-sm text-gray-900">
                  <span className="inline-flex items-center">
                    <span className="mr-1">{roleBadge.icon}</span>
                    {roleBadge.label}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Organization</label>
              <p className="text-sm text-gray-900">{invitation.organization_name}</p>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-6 bg-white rounded-lg shadow p-6" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Your Password</h3>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={accepting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Creating Account...' : 'Create Account & Sign In'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By creating an account, you agree to the Terms of Service and Privacy Policy
          </p>
        </form>

        <div className="text-sm text-center">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
