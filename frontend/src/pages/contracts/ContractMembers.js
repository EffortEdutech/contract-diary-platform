// ContractMembers.js - COMPLETE WITH ALL ENHANCEMENTS
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import MemberCard from '../../components/members/MemberCard';
import AddMemberModal from '../../components/members/AddMemberModal';
import InviteMemberModal from '../../components/members/InviteMemberModal';
import EditMemberRoleModal from '../../components/members/EditMemberRoleModal';
import PendingInvitationsPanel from '../../components/members/PendingInvitationsPanel';
import {
  getContractMembers,
  addContractMemberById,
  removeContractMember,
  getMemberStats,
  isContractOwner,
  canManageMembers
} from '../../services/memberService';
import { supabase } from '../../lib/supabase';

const ContractMembers = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();

  // Basic state
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [contract, setContract] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  
  // Enhanced state
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [canManage, setCanManage] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [contractId]);

  // Load current user's role and permissions
  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        // Check if user can manage members
        const canManageValue = await canManageMembers(contractId);
        setCanManage(canManageValue);
        
        // Get current user's role
        const { data: { user } } = await supabase.auth.getUser();
        if (user && members.length > 0) {
          const myMember = members.find(m => m.user_id === user.id);
          setCurrentUserRole(myMember?.member_role);
        }
      } catch (err) {
        console.error('Error loading user permissions:', err);
      }
    };
    
    if (members.length > 0) {
      loadUserPermissions();
    }
  }, [contractId, members]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is owner
      const ownerStatus = await isContractOwner(contractId);
      setIsOwner(ownerStatus);

      // Load contract details
      const { data: contractData } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();
      setContract(contractData);

      // Load members (filter out removed)
      const membersData = await getContractMembers(contractId);
      setMembers(membersData.filter(m => m.invitation_status !== 'removed'));

      // Load statistics
      const statsData = await getMemberStats(contractId);
      setStats(statsData);

    } catch (err) {
      console.error('Error loading member data:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      await addContractMemberById(
        contractId,
        memberData.userId,
        memberData.role,
        memberData.tradeScope
      );

      await loadData();
      alert('✅ Member added successfully!');
    } catch (err) {
      console.error('Error adding member:', err);
      throw err;
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeContractMember(memberId);
      await loadData();
      alert('✅ Member removed successfully!');
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Failed to remove member. Please try again.');
    }
  };

  // NEW: Handle edit role
  const handleEditRole = (member) => {
    setSelectedMember(member);
    setShowEditRoleModal(true);
  };

  // NEW: Handle role update success
  const handleRoleUpdateSuccess = () => {
    loadData();
    setShowEditRoleModal(false);
    setSelectedMember(null);
  };

  // Build breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: `/contracts/${contractId}` },
    { label: 'Team Members', href: null }
  ];
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading members</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate(`/contracts/${contractId}`)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Contract
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
              {contract && (
                <p className="mt-1 text-sm text-gray-500">
                  {contract.contract_number} • {contract.project_name}
                </p>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite Member
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Total Members */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Removed */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Removed</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.removed}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Members ({members.length})
            </h2>
          </div>

          <div className="p-6">
            {members.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No members yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding the first member to this contract.</p>
                {isOwner && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Invite First Member
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {members.map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onRemove={handleRemoveMember}
                    onEditRole={handleEditRole}
                    isOwner={isOwner}
                    currentUserRole={currentUserRole}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Company Type Distribution */}
        {stats && stats.total > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Type Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{stats.byCompanyType.main_contractor}</p>
                <p className="text-sm text-gray-600 mt-1">Main Contractors</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats.byCompanyType.subcontractor}</p>
                <p className="text-sm text-gray-600 mt-1">Subcontractors</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{stats.byCompanyType.consultant}</p>
                <p className="text-sm text-gray-600 mt-1">Consultants</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{stats.byCompanyType.supplier}</p>
                <p className="text-sm text-gray-600 mt-1">Suppliers</p>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Pending Invitations Panel */}
        {canManage && (
          <div className="mt-8">
            <PendingInvitationsPanel 
              contractId={contractId}
              onRefresh={loadData}
            />
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        contractId={contractId}
        onSuccess={loadData}
      />

      {/* Add Member Modal (legacy - for manual User ID entry) */}
      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddMember={handleAddMember}
        contractId={contractId}
      />

      {/* NEW: Edit Member Role Modal */}
      <EditMemberRoleModal
        isOpen={showEditRoleModal}
        onClose={() => setShowEditRoleModal(false)}
        member={selectedMember}
        currentUserRole={currentUserRole}
        onSuccess={handleRoleUpdateSuccess}
      />
    </div>
  );
};

export default ContractMembers;
