// ============================================
// LAYOUT COMPONENT - FIXED VERSION
// ============================================
// Purpose: Clean layout with user info header
// Created: 2025-12-31
// Changes:
// - Removed "Contract Diary" title and "Malaysian Construction Platform"
// - Removed Dashboard/Contracts navigation
// - Added user info on left (avatar + email + role)
// - Kept only Home + Settings icons on right
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [contractCount, setContractCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadUserInfo();
    }
  }, [user]);

  const loadUserInfo = async () => {
    try {
      // Get user role
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id);

      if (profiles && profiles.length > 0) {
        setUserRole(profiles[0].role);
      }

      // Get contract count
      const { data: memberships } = await supabase
        .from('contract_members')
        .select('contract_id')
        .eq('user_id', user.id);

      setContractCount(memberships?.length || 0);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - FIXED: Clean with user info */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Platform Title + User Info */}
            <div className="flex items-center space-x-8">

            {/* Platform Title */}
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-blue-600 leading-tight">
                Contract Diary
                </h1>
                <span className="text-xs text-gray-500">
                Malaysian Construction Platform
                </span>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">
                    {userRole?.replace('_', ' ').toUpperCase() || 'USER'} • {contractCount}{' '}
                    {contractCount === 1 ? 'Contract' : 'Contracts'}
                </p>
                </div>
            </div>

            </div>


            {/* Right: Home + Settings + Sign Out */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Home"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              
              {/* Simple Settings Button */}
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>         
              
              <button
                onClick={handleSignOut}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            © 2025 Contract Diary Platform - CIPAA Compliant
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
