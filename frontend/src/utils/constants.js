// ============================================
// UPDATED: constants.js
// Session 13 - RBAC Migration
// ============================================
// CHANGES:
// - Removed USER_ROLES (deleted from database)
// - Kept COMPANY_TYPES (user_profiles.role)
// - Added MEMBER_ROLES (contract_members.member_role - expanded)
// ============================================

// ============================================
// COMPANY TYPES (user_profiles.role)
// This defines WHO the user is (business identity)
// ============================================
export const COMPANY_TYPES = {
  MAIN_CONTRACTOR: 'main_contractor',
  SUBCONTRACTOR: 'subcontractor',
  CONSULTANT: 'consultant',
  SUPPLIER: 'supplier'
};

export const COMPANY_TYPE_LABELS = {
  [COMPANY_TYPES.MAIN_CONTRACTOR]: 'Main Contractor',
  [COMPANY_TYPES.SUBCONTRACTOR]: 'Subcontractor',
  [COMPANY_TYPES.CONSULTANT]: 'Consultant',
  [COMPANY_TYPES.SUPPLIER]: 'Supplier'
};

// ============================================
// MEMBER ROLES (contract_members.member_role)
// This defines WHAT they can do on a contract
// ============================================
export const MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  SUBMITTER: 'submitter',
  REVIEWER: 'reviewer',
  APPROVER: 'approver',
  AUDITOR: 'auditor',
  READONLY: 'readonly'
};

export const MEMBER_ROLE_LABELS = {
  [MEMBER_ROLES.OWNER]: 'Owner',
  [MEMBER_ROLES.ADMIN]: 'Admin',
  [MEMBER_ROLES.EDITOR]: 'Editor',
  [MEMBER_ROLES.VIEWER]: 'Viewer',
  [MEMBER_ROLES.SUBMITTER]: 'Submitter',
  [MEMBER_ROLES.REVIEWER]: 'Reviewer',
  [MEMBER_ROLES.APPROVER]: 'Approver',
  [MEMBER_ROLES.AUDITOR]: 'Auditor',
  [MEMBER_ROLES.READONLY]: 'Read-only'
};

export const MEMBER_ROLE_DESCRIPTIONS = {
  [MEMBER_ROLES.OWNER]: 'Full control of contract and all features',
  [MEMBER_ROLES.ADMIN]: 'Almost full control, can manage members',
  [MEMBER_ROLES.EDITOR]: 'Can create and edit records',
  [MEMBER_ROLES.VIEWER]: 'Can view all records',
  [MEMBER_ROLES.SUBMITTER]: 'Can submit but not approve',
  [MEMBER_ROLES.REVIEWER]: 'Can review and comment',
  [MEMBER_ROLES.APPROVER]: 'Can approve submissions',
  [MEMBER_ROLES.AUDITOR]: 'Read and export only',
  [MEMBER_ROLES.READONLY]: 'View-only access (strictest)'
};

// ============================================
// CONTRACT TYPES
// ============================================
export const CONTRACT_TYPES = {
  PWD_203A: 'PWD_203A',
  PAM_2018: 'PAM_2018',
  IEM: 'IEM',
  CIDB: 'CIDB',
  JKR_DB: 'JKR_DB'
};

export const CONTRACT_TYPE_LABELS = {
  [CONTRACT_TYPES.PWD_203A]: 'PWD Form 203A (2010)',
  [CONTRACT_TYPES.PAM_2018]: 'PAM Contract 2018',
  [CONTRACT_TYPES.IEM]: 'IEM Form',
  [CONTRACT_TYPES.CIDB]: 'CIDB Standard Form',
  [CONTRACT_TYPES.JKR_DB]: 'JKR Design & Build'
};

// ============================================
// CONTRACT STATUS
// ============================================
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  SUSPENDED: 'suspended'
};

export const CONTRACT_STATUS_LABELS = {
  [CONTRACT_STATUS.DRAFT]: 'Draft',
  [CONTRACT_STATUS.ACTIVE]: 'Active',
  [CONTRACT_STATUS.COMPLETED]: 'Completed',
  [CONTRACT_STATUS.SUSPENDED]: 'Suspended'
};

// ============================================
// BOQ ITEM TYPES
// ============================================
export const BOQ_ITEM_TYPES = {
  MATERIAL: 'material',
  LABOR: 'labor',
  EQUIPMENT: 'equipment',
  SUBCONTRACTOR: 'subcontractor'
};

export const BOQ_ITEM_TYPE_LABELS = {
  [BOQ_ITEM_TYPES.MATERIAL]: 'Material',
  [BOQ_ITEM_TYPES.LABOR]: 'Labor',
  [BOQ_ITEM_TYPES.EQUIPMENT]: 'Equipment',
  [BOQ_ITEM_TYPES.SUBCONTRACTOR]: 'Subcontractor'
};

// ============================================
// DIARY STATUS
// ============================================
export const DIARY_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged'
};

export const DIARY_STATUS_LABELS = {
  [DIARY_STATUS.DRAFT]: 'Draft',
  [DIARY_STATUS.SUBMITTED]: 'Submitted',
  [DIARY_STATUS.ACKNOWLEDGED]: 'Acknowledged'
};

// ============================================
// WEATHER CONDITIONS
// ============================================
export const WEATHER_CONDITIONS = {
  SUNNY: 'Sunny',
  CLOUDY: 'Cloudy',
  RAINY: 'Rainy',
  HEAVY_RAIN: 'Heavy Rain',
  STORMY: 'Stormy'
};

// ============================================
// CLAIM STATUS
// ============================================
export const CLAIM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid'
};

export const CLAIM_STATUS_LABELS = {
  [CLAIM_STATUS.DRAFT]: 'Draft',
  [CLAIM_STATUS.SUBMITTED]: 'Submitted',
  [CLAIM_STATUS.APPROVED]: 'Approved',
  [CLAIM_STATUS.REJECTED]: 'Rejected',
  [CLAIM_STATUS.PAID]: 'Paid'
};

// ============================================
// INVITATION STATUS
// ============================================
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

export const INVITATION_STATUS_LABELS = {
  [INVITATION_STATUS.PENDING]: 'Pending',
  [INVITATION_STATUS.ACCEPTED]: 'Accepted',
  [INVITATION_STATUS.EXPIRED]: 'Expired',
  [INVITATION_STATUS.CANCELLED]: 'Cancelled'
};

// ============================================
// CIDB GRADES
// ============================================
export const CIDB_GRADES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];

// ============================================
// CURRENCY
// ============================================
export const CURRENCY = {
  MYR: 'MYR',
  SGD: 'SGD',
  USD: 'USD'
};

// ============================================
// SST RATE (Malaysia)
// ============================================
export const SST_RATE = 0.06; // 6% on materials

// ============================================
// RETENTION PERCENTAGE (Malaysia - PWD)
// ============================================
export const DEFAULT_RETENTION_PERCENTAGE = 5.0; // 5% standard

// ============================================
// DATE FORMATS
// ============================================
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATE_FORMAT_API = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// ============================================
// PAGINATION
// ============================================
export const ITEMS_PER_PAGE = 20;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
