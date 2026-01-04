// ============================================
// UPDATED: Signup.js  
// Session 13 - RBAC Migration
// ============================================
// CHANGES:
// - Removed user_role from user_profiles INSERT
// - Only uses 'role' (company type)
// - Member role will be assigned when joining contracts
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    position: '',
    phone: '',
    companyType: 'main_contractor', // This goes to user_profiles.role
    organizationId: '',
    cidbRegistration: '',
    ssmRegistration: ''
  });

  // Company types for selection
  const companyTypes = [
    {
      value: 'main_contractor',
      label: 'Main Contractor',
      icon: '🏗️',
      description: 'Manage projects and subcontractors'
    },
    {
      value: 'subcontractor',
      label: 'Subcontractor',
      icon: '👷',
      description: 'Submit work progress and claims'
    },
    {
      value: 'consultant',
      label: 'Consultant',
      icon: '📋',
      description: 'Review and certify work'
    },
    {
      value: 'supplier',
      label: 'Supplier',
      icon: '🚚',
      description: 'Supply materials and equipment'
    }
  ];

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setError('Failed to load organizations. Please refresh the page.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = () => {
    // Validation before moving to next step
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    if (step === 2) {
      if (!formData.fullName || !formData.position || !formData.phone) {
        setError('Please fill in all required fields');
        return;
      }
    }

    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Final validation
    if (!formData.organizationId) {
      setError('Please select your organization');
      return;
    }

    setLoading(true);

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
      });

      if (authError) throw authError;

      // Step 2: Get organization details
      const selectedOrg = organizations.find(org => org.id === formData.organizationId);

      // Step 3: Create user profile
      // ✅ FIXED: Only insert 'role' (company type), NOT 'user_role'
      // Member role will be assigned when user joins specific contracts
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            role: formData.companyType, // ✅ Company type only (MC/SC/Consultant/Supplier)
            // ❌ REMOVED: user_role field (no longer exists in database)
            position: formData.position,
            phone: formData.phone,
            organization_id: formData.organizationId,
            organization_name: selectedOrg?.name,
            cidb_registration: formData.cidbRegistration || null,
            ssm_registration: formData.ssmRegistration || null
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw new Error('Failed to create user profile. Please contact support.');
        }

        console.log('✅ User profile created successfully!');
      }

      alert('Account created successfully! You can now sign in.');
      navigate('/login');

    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCompanyType = () => {
    return companyTypes.find(ct => ct.value === formData.companyType);
  };

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
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* STEP 1: Account Credentials */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 6 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
              </button>
            </div>
          )}

          {/* STEP 2: Personal Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Position/Title *
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Project Manager, Site Engineer"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., +60123456789"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Organization & Company Type */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Company Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Company Type *
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {companyTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                        formData.companyType === type.value
                          ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="companyType"
                        value={type.value}
                        className="sr-only"
                        checked={formData.companyType === type.value}
                        onChange={handleChange}
                      />
                      <div className="flex flex-1">
                        <div className="flex flex-col">
                          <span className="flex items-center text-sm font-medium text-gray-900">
                            <span className="text-xl mr-2">{type.icon}</span>
                            {type.label}
                          </span>
                          <span className="mt-1 flex items-center text-xs text-gray-500">
                            {type.description}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Company Type Info */}
              {formData.companyType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    {getSelectedCompanyType()?.icon} {getSelectedCompanyType()?.label} Access:
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {formData.companyType === 'main_contractor' && (
                      <>
                        <li>✓ Create and manage contracts</li>
                        <li>✓ Invite subcontractors and team members</li>
                        <li>✓ Edit BOQ and approve claims</li>
                        <li>✓ Acknowledge work diaries (CIPAA)</li>
                        <li>✓ Full project control</li>
                      </>
                    )}
                    {formData.companyType === 'subcontractor' && (
                      <>
                        <li>✓ Submit daily work diaries</li>
                        <li>✓ Create progress claims</li>
                        <li>✓ Upload photos and documents</li>
                        <li>✓ Track payment status</li>
                        <li>✓ View BOQ (read-only)</li>
                      </>
                    )}
                    {formData.companyType === 'consultant' && (
                      <>
                        <li>✓ Review and certify work</li>
                        <li>✓ Approve progress claims</li>
                        <li>✓ Comment on diaries</li>
                        <li>✓ Generate reports</li>
                      </>
                    )}
                    {formData.companyType === 'supplier' && (
                      <>
                        <li>✓ Track material deliveries</li>
                        <li>✓ View BOQ requirements</li>
                        <li>✓ Submit invoices</li>
                        <li>✓ Track payments</li>
                      </>
                    )}
                  </ul>
                  <p className="mt-3 text-xs text-blue-700 italic">
                    💡 Your specific permissions on each contract will be assigned by the contract owner when you join.
                  </p>
                </div>
              )}

              {/* Organization Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Organization *
                </label>
                <select
                  name="organizationId"
                  value={formData.organizationId}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select your organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.cidb_grade && `(${org.cidb_grade})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Registration Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    CIDB Registration (Optional)
                  </label>
                  <input
                    type="text"
                    name="cidbRegistration"
                    value={formData.cidbRegistration}
                    onChange={handleChange}
                    placeholder="e.g., PKK12345678"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SSM Registration (Optional)
                  </label>
                  <input
                    type="text"
                    name="ssmRegistration"
                    value={formData.ssmRegistration}
                    onChange={handleChange}
                    placeholder="e.g., 123456-A"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
