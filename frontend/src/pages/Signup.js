import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [step, setStep] = useState(1) // Multi-step form
  const [organizations, setOrganizations] = useState([])
  const [formData, setFormData] = useState({
    // Step 1: Account
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Personal Info
    fullName: '',
    position: '',
    phone: '',
    cidbRegistration: '',
    ssmRegistration: '',
    
    // Step 3: Organization & Role
    organizationId: '',
    role: 'editor', // Default role
    companyType: 'main_contractor' // For filtering contracts
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Role definitions with permissions
  const roles = [
    {
      value: 'owner',
      label: 'Owner',
      description: 'Super admin (contract owner)',
      color: 'blue',
      icon: '👑'
    },
    {
      value: 'admin',
      label: 'Admin',
      description: 'Full control within organization',
      color: 'purple',
      icon: '⚡'
    },
    {
      value: 'editor',
      label: 'Editor',
      description: 'Can create and update records',
      color: 'green',
      icon: '✏️'
    },
    {
      value: 'submitter',
      label: 'Submitter',
      description: 'Can submit but not approve',
      color: 'yellow',
      icon: '📝'
    },
    {
      value: 'reviewer',
      label: 'Reviewer',
      description: 'Can review and comment',
      color: 'orange',
      icon: '👁️'
    },
    {
      value: 'approver',
      label: 'Approver',
      description: 'Can approve submissions',
      color: 'indigo',
      icon: '✓'
    },
    {
      value: 'auditor',
      label: 'Auditor',
      description: 'Read + export only',
      color: 'gray',
      icon: '📊'
    },
    {
      value: 'readonly',
      label: 'Read-Only',
      description: 'View only',
      color: 'gray',
      icon: '👀'
    }
  ]

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, organization_type, cidb_grade, registration_number')
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (err) {
      console.error('Error loading organizations:', err)
      setError('Failed to load organizations. Please refresh the page.')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = () => {
    // Validation before moving to next step
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    if (step === 2) {
      if (!formData.fullName || !formData.position || !formData.phone) {
        setError('Please fill in all required fields')
        return
      }
    }

    setError(null)
    setStep(step + 1)
  }

  const handleBack = () => {
    setError(null)
    setStep(step - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Final validation
    if (!formData.organizationId) {
      setError('Please select your organization')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      })

      if (authError) throw authError

      // Step 2: Get organization details
      const selectedOrg = organizations.find(org => org.id === formData.organizationId)

      // Step 3: Create user profile with ALL information
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            role: formData.companyType, // Company type (for filtering)
            user_role: formData.role, // Permission role (for access control)
            position: formData.position,
            phone: formData.phone,
            organization_id: formData.organizationId,
            organization_name: selectedOrg?.name,
            cidb_registration: formData.cidbRegistration || null,
            ssm_registration: formData.ssmRegistration || null
          })

        if (profileError) {
          console.error('Error creating profile:', profileError)
          throw new Error('Failed to create user profile. Please contact support.')
        }

        console.log('✅ User profile created successfully!')
      }

      alert('Account created successfully! You can now sign in.')
      navigate('/login')

    } catch (error) {
      console.error('Signup error:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getSelectedRole = () => {
    return roles.find(r => r.value === formData.role)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join Contract Diary Platform
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium hidden sm:inline">Account</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium hidden sm:inline">Personal Info</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium hidden sm:inline">Organization</span>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* STEP 1: Account */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Credentials</h3>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

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
                  value={formData.password}
                  onChange={handleChange}
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
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next: Personal Information →
              </button>
            </div>
          )}

          {/* STEP 2: Personal Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ahmad bin Ali"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Position / Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Project Manager, Site Engineer"
                  value={formData.position}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+60123456789"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cidbRegistration" className="block text-sm font-medium text-gray-700">
                    CIDB Registration (Optional)
                  </label>
                  <input
                    id="cidbRegistration"
                    name="cidbRegistration"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="CIDB Number"
                    value={formData.cidbRegistration}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="ssmRegistration" className="block text-sm font-medium text-gray-700">
                    SSM Registration (Optional)
                  </label>
                  <input
                    id="ssmRegistration"
                    name="ssmRegistration"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SSM Number"
                    value={formData.ssmRegistration}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next: Organization →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Organization & Role */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Organization & Role</h3>
              
              <div>
                <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Organization <span className="text-red-500">*</span>
                </label>
                {organizations.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                      No organizations available. Please contact your administrator to register your company first.
                    </p>
                  </div>
                ) : (
                  <select
                    id="organizationId"
                    name="organizationId"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.organizationId}
                    onChange={handleChange}
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.cidb_grade && `(${org.cidb_grade})`} - {org.organization_type.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="companyType" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="companyType"
                  name="companyType"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.companyType}
                  onChange={handleChange}
                >
                  <option value="main_contractor">Main Contractor</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="consultant">Consultant</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.map(role => (
                    <label
                      key={role.value}
                      className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                        formData.role === role.value
                          ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        className="sr-only"
                        checked={formData.role === role.value}
                        onChange={handleChange}
                      />
                      <div className="flex flex-1">
                        <div className="flex flex-col">
                          <span className="flex items-center text-sm font-medium text-gray-900">
                            <span className="text-xl mr-2">{role.icon}</span>
                            {role.label}
                          </span>
                          <span className="mt-1 flex items-center text-xs text-gray-500">
                            {role.description}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Role Permissions Info */}
              {formData.role && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    {getSelectedRole()?.icon} {getSelectedRole()?.label} Permissions:
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {formData.role === 'owner' && (
                      <>
                        <li>✓ Full system access</li>
                        <li>✓ Create and manage contracts</li>
                        <li>✓ Approve all submissions</li>
                        <li>✓ Manage organization settings</li>
                        <li>✓ Add/remove users</li>
                      </>
                    )}
                    {formData.role === 'admin' && (
                      <>
                        <li>✓ Full access within organization</li>
                        <li>✓ Create and manage contracts</li>
                        <li>✓ Approve submissions</li>
                        <li>✓ Manage team members</li>
                      </>
                    )}
                    {formData.role === 'editor' && (
                      <>
                        <li>✓ Create diary entries</li>
                        <li>✓ Update BOQ items</li>
                        <li>✓ Submit claims</li>
                        <li>✗ Cannot approve</li>
                      </>
                    )}
                    {formData.role === 'submitter' && (
                      <>
                        <li>✓ Submit diary entries</li>
                        <li>✓ Submit claims</li>
                        <li>✗ Cannot edit approved items</li>
                        <li>✗ Cannot approve</li>
                      </>
                    )}
                    {formData.role === 'reviewer' && (
                      <>
                        <li>✓ View all records</li>
                        <li>✓ Add comments</li>
                        <li>✓ Flag issues</li>
                        <li>✗ Cannot edit or approve</li>
                      </>
                    )}
                    {formData.role === 'approver' && (
                      <>
                        <li>✓ Approve diary entries</li>
                        <li>✓ Approve claims</li>
                        <li>✓ View all records</li>
                        <li>✗ Cannot create new records</li>
                      </>
                    )}
                    {formData.role === 'auditor' && (
                      <>
                        <li>✓ View all records</li>
                        <li>✓ Export reports</li>
                        <li>✗ Cannot edit anything</li>
                        <li>✗ Read-only access</li>
                      </>
                    )}
                    {formData.role === 'readonly' && (
                      <>
                        <li>✓ View assigned records only</li>
                        <li>✗ Cannot edit anything</li>
                        <li>✗ Cannot export</li>
                      </>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.organizationId}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          <div className="text-sm text-center pt-4 border-t border-gray-200">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
