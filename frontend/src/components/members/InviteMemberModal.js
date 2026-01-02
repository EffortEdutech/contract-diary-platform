import { useState, useEffect } from 'react'
import { createInvitation } from '../../services/invitationService'
import { supabase } from '../../lib/supabase'

export default function InviteMemberModal({ isOpen, onClose, contractId = null }) {
  const [organizations, setOrganizations] = useState([])
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    position: '',
    phone: '',
    organizationId: '',
    organizationName: '',
    companyType: 'subcontractor',
    userRole: 'editor',
    cidbRegistration: '',
    ssmRegistration: '',
    contractId: contractId
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invitationLink, setInvitationLink] = useState(null)

  // Role definitions
  const roles = [
    { value: 'owner', label: 'Owner', icon: '👑', description: 'Super admin' },
    { value: 'admin', label: 'Admin', icon: '⚡', description: 'Full control' },
    { value: 'editor', label: 'Editor', icon: '✏️', description: 'Create & update' },
    { value: 'submitter', label: 'Submitter', icon: '📝', description: 'Submit only' },
    { value: 'reviewer', label: 'Reviewer', icon: '👁️', description: 'Review & comment' },
    { value: 'approver', label: 'Approver', icon: '✓', description: 'Can approve' },
    { value: 'auditor', label: 'Auditor', icon: '📊', description: 'Read + export' },
    { value: 'readonly', label: 'Read-Only', icon: '👀', description: 'View only' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadOrganizations()
    }
  }, [isOpen])

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, organization_type, cidb_grade')
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (err) {
      console.error('Error loading organizations:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // If organization changes, update organization name
    if (name === 'organizationId') {
      const selectedOrg = organizations.find(org => org.id === value)
      setFormData({
        ...formData,
        organizationId: value,
        organizationName: selectedOrg?.name || ''
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const invitation = await createInvitation(formData)
      setInvitationLink(invitation.invitationLink)
      
      // Don't close modal yet - show the invitation link
    } catch (err) {
      setError(err.message || 'Failed to create invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink)
    alert('Invitation link copied to clipboard!')
  }

  const handleClose = () => {
    setFormData({
      email: '',
      fullName: '',
      position: '',
      phone: '',
      organizationId: '',
      organizationName: '',
      companyType: 'subcontractor',
      userRole: 'editor',
      cidbRegistration: '',
      ssmRegistration: '',
      contractId: contractId
    })
    setInvitationLink(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  // Show success screen with invitation link
  if (invitationLink) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Invitation Created Successfully!
            </h3>
            
            <p className="text-sm text-gray-500 mb-4">
              Send this link to <strong>{formData.email}</strong>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-xs text-blue-800 mb-2">Invitation Link:</p>
              <p className="text-sm text-blue-900 font-mono break-all bg-white p-2 rounded border border-blue-300">
                {invitationLink}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Done
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              💡 Note: This link expires in 7 days. The invited user will set their password when they accept.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show invitation form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="member@company.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ahmad bin Ali"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            {/* Position & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="position"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Site Engineer"
                  value={formData.position}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+60123456789"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization <span className="text-red-500">*</span>
              </label>
              <select
                name="organizationId"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={formData.organizationId}
                onChange={handleChange}
              >
                <option value="">-- Select Organization --</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} {org.cidb_grade && `(${org.cidb_grade})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Type <span className="text-red-500">*</span>
              </label>
              <select
                name="companyType"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={formData.companyType}
                onChange={handleChange}
              >
                <option value="main_contractor">Main Contractor</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="consultant">Consultant</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>

            {/* Permission Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(role => (
                  <label
                    key={role.value}
                    className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                      formData.userRole === role.value
                        ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value={role.value}
                      className="sr-only"
                      checked={formData.userRole === role.value}
                      onChange={handleChange}
                    />
                    <div className="flex flex-1 items-center">
                      <span className="text-xl mr-2">{role.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{role.label}</span>
                        <span className="text-xs text-gray-500">{role.description}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional: CIDB & SSM */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CIDB Registration (Optional)
                </label>
                <input
                  type="text"
                  name="cidbRegistration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CIDB Number"
                  value={formData.cidbRegistration}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SSM Registration (Optional)
                </label>
                <input
                  type="text"
                  name="ssmRegistration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="SSM Number"
                  value={formData.ssmRegistration}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating Invitation...' : 'Create Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
