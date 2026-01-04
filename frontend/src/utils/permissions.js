// ============================================
// NEW: permissions.js
// Session 13 - RBAC Migration
// ============================================
// Permission checking helpers for single-role system
// Uses: user_profiles.role + contract_members.member_role
// ============================================

import { COMPANY_TYPES, MEMBER_ROLES } from './constants';

// ============================================
// PERMISSION CHECKING FUNCTIONS
// ============================================

/**
 * Check if user can edit BOQ
 * Rule: Only Main Contractors with owner/admin/editor role
 */
export const canEditBOQ = (companyType, memberRole) => {
  return companyType === COMPANY_TYPES.MAIN_CONTRACTOR &&
         [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.EDITOR].includes(memberRole);
};

/**
 * Check if user can approve BOQ
 * Rule: Only Main Contractors with owner/admin/approver role
 */
export const canApproveBOQ = (companyType, memberRole) => {
  return companyType === COMPANY_TYPES.MAIN_CONTRACTOR &&
         [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.APPROVER].includes(memberRole);
};

/**
 * Check if user can create diary
 * Rule: Anyone with editor/submitter role or higher
 */
export const canCreateDiary = (memberRole) => {
  return [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.EDITOR,
    MEMBER_ROLES.SUBMITTER
  ].includes(memberRole);
};

/**
 * Check if user can submit diary
 * Rule: Anyone with submitter role or higher
 */
export const canSubmitDiary = (memberRole) => {
  return [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.EDITOR,
    MEMBER_ROLES.SUBMITTER
  ].includes(memberRole);
};

/**
 * Check if user can acknowledge diary
 * Rule: Only Main Contractors with owner/admin/approver role (CIPAA requirement)
 */
export const canAcknowledgeDiary = (companyType, memberRole) => {
  return companyType === COMPANY_TYPES.MAIN_CONTRACTOR &&
         [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.APPROVER].includes(memberRole);
};

/**
 * Check if user can create claim
 * Rule: Anyone with editor/submitter role or higher
 */
export const canCreateClaim = (memberRole) => {
  return [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.EDITOR,
    MEMBER_ROLES.SUBMITTER
  ].includes(memberRole);
};

/**
 * Check if user can submit claim
 * Rule: Anyone with submitter role or higher
 */
export const canSubmitClaim = (memberRole) => {
  return [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.EDITOR,
    MEMBER_ROLES.SUBMITTER
  ].includes(memberRole);
};

/**
 * Check if user can approve claim
 * Rule: Only Main Contractors or Consultants with approver role
 */
export const canApproveClaim = (companyType, memberRole) => {
  return [COMPANY_TYPES.MAIN_CONTRACTOR, COMPANY_TYPES.CONSULTANT].includes(companyType) &&
         [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.APPROVER].includes(memberRole);
};

/**
 * Check if user can certify claim (consultant/SO)
 * Rule: Only Consultants with approver role
 */
export const canCertifyClaim = (companyType, memberRole) => {
  return companyType === COMPANY_TYPES.CONSULTANT &&
         [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.APPROVER].includes(memberRole);
};

/**
 * Check if user can delete record
 * Rule: Only owner/admin of the contract
 */
export const canDeleteRecord = (memberRole) => {
  return [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN].includes(memberRole);
};

/**
 * Check if user can edit record
 * Rule: Owner/admin/editor, and record must be in draft status
 */
export const canEditRecord = (memberRole, recordStatus) => {
  const hasEditRole = [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.EDITOR
  ].includes(memberRole);
  
  const isDraft = recordStatus === 'draft';
  
  return hasEditRole && isDraft;
};

/**
 * Check if user can view record
 * Rule: Anyone in the contract can view (all roles)
 */
export const canViewRecord = (memberRole) => {
  return memberRole !== null && memberRole !== undefined;
};

/**
 * Check if user can export data
 * Rule: Anyone except readonly can export
 */
export const canExportData = (memberRole) => {
  return [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.EDITOR,
    MEMBER_ROLES.SUBMITTER,
    MEMBER_ROLES.REVIEWER,
    MEMBER_ROLES.APPROVER,
    MEMBER_ROLES.AUDITOR
  ].includes(memberRole);
};

/**
 * Check if user can manage members (invite/remove)
 * Rule: Only owner/admin
 */
export const canManageMembers = (memberRole) => {
  return [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN].includes(memberRole);
};

/**
 * Check if user can edit contract details
 * Rule: Only owner (contract creator)
 */
export const canEditContract = (memberRole) => {
  return memberRole === MEMBER_ROLES.OWNER;
};

/**
 * Check if user can review (comment/query)
 * Rule: Reviewer role and above
 */
export const canReview = (memberRole) => {
  return [
    MEMBER_ROLES.OWNER,
    MEMBER_ROLES.ADMIN,
    MEMBER_ROLES.REVIEWER,
    MEMBER_ROLES.APPROVER
  ].includes(memberRole);
};

// ============================================
// ROLE HIERARCHY HELPERS
// ============================================

/**
 * Get role hierarchy level (higher = more permissions)
 */
const ROLE_HIERARCHY = {
  [MEMBER_ROLES.OWNER]: 9,
  [MEMBER_ROLES.ADMIN]: 8,
  [MEMBER_ROLES.APPROVER]: 7,
  [MEMBER_ROLES.EDITOR]: 6,
  [MEMBER_ROLES.SUBMITTER]: 5,
  [MEMBER_ROLES.REVIEWER]: 4,
  [MEMBER_ROLES.AUDITOR]: 3,
  [MEMBER_ROLES.VIEWER]: 2,
  [MEMBER_ROLES.READONLY]: 1
};

/**
 * Check if user has at least the specified role level
 */
export const hasRoleLevel = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Get available roles for selection (for inviting members)
 * Owner can assign any role except owner
 * Admin can assign editor and below
 */
export const getAvailableRoles = (currentUserRole) => {
  if (currentUserRole === MEMBER_ROLES.OWNER) {
    return [
      MEMBER_ROLES.ADMIN,
      MEMBER_ROLES.EDITOR,
      MEMBER_ROLES.VIEWER,
      MEMBER_ROLES.SUBMITTER,
      MEMBER_ROLES.REVIEWER,
      MEMBER_ROLES.APPROVER,
      MEMBER_ROLES.AUDITOR,
      MEMBER_ROLES.READONLY
    ];
  } else if (currentUserRole === MEMBER_ROLES.ADMIN) {
    return [
      MEMBER_ROLES.EDITOR,
      MEMBER_ROLES.VIEWER,
      MEMBER_ROLES.SUBMITTER,
      MEMBER_ROLES.REVIEWER,
      MEMBER_ROLES.READONLY
    ];
  } else {
    return []; // Others cannot assign roles
  }
};

// ============================================
// MODULE-SPECIFIC PERMISSIONS
// ============================================

/**
 * Get all permissions for a user on a contract
 */
export const getUserPermissions = (companyType, memberRole) => {
  return {
    // BOQ permissions
    canEditBOQ: canEditBOQ(companyType, memberRole),
    canApproveBOQ: canApproveBOQ(companyType, memberRole),
    
    // Diary permissions
    canCreateDiary: canCreateDiary(memberRole),
    canSubmitDiary: canSubmitDiary(memberRole),
    canAcknowledgeDiary: canAcknowledgeDiary(companyType, memberRole),
    
    // Claim permissions
    canCreateClaim: canCreateClaim(memberRole),
    canSubmitClaim: canSubmitClaim(memberRole),
    canApproveClaim: canApproveClaim(companyType, memberRole),
    canCertifyClaim: canCertifyClaim(companyType, memberRole),
    
    // General permissions
    canDeleteRecord: canDeleteRecord(memberRole),
    canExportData: canExportData(memberRole),
    canManageMembers: canManageMembers(memberRole),
    canEditContract: canEditContract(memberRole),
    canReview: canReview(memberRole),
    
    // Meta
    companyType,
    memberRole,
    roleLevel: ROLE_HIERARCHY[memberRole] || 0
  };
};

// ============================================
// PERMISSION DESCRIPTION HELPERS
// ============================================

/**
 * Get human-readable permission descriptions for a role
 */
export const getRolePermissionDescription = (companyType, memberRole) => {
  const permissions = [];
  
  if (canEditBOQ(companyType, memberRole)) {
    permissions.push('Edit BOQ');
  }
  if (canApproveBOQ(companyType, memberRole)) {
    permissions.push('Approve BOQ');
  }
  if (canCreateDiary(memberRole)) {
    permissions.push('Create diaries');
  }
  if (canAcknowledgeDiary(companyType, memberRole)) {
    permissions.push('Acknowledge diaries');
  }
  if (canCreateClaim(memberRole)) {
    permissions.push('Create claims');
  }
  if (canApproveClaim(companyType, memberRole)) {
    permissions.push('Approve claims');
  }
  if (canManageMembers(memberRole)) {
    permissions.push('Manage members');
  }
  
  return permissions.length > 0 ? permissions.join(', ') : 'View only';
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  canEditBOQ,
  canApproveBOQ,
  canCreateDiary,
  canSubmitDiary,
  canAcknowledgeDiary,
  canCreateClaim,
  canSubmitClaim,
  canApproveClaim,
  canCertifyClaim,
  canDeleteRecord,
  canEditRecord,
  canViewRecord,
  canExportData,
  canManageMembers,
  canEditContract,
  canReview,
  hasRoleLevel,
  getAvailableRoles,
  getUserPermissions,
  getRolePermissionDescription
};
