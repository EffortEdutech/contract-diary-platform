export function resolveContractAuthority({
  contractStatus,
  memberRole,
}) {
  const role = memberRole?.toLowerCase() || 'readonly'
  const capabilities = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.readonly

  // 🔒 Lifecycle dominance
  const status = (contractStatus || '').toUpperCase();
  const isSuspended = contractStatus === 'SUSPENDED'
  const isCompleted = contractStatus === 'COMPLETED'
  const isReadOnly = isSuspended || isCompleted

  return {
    /* =========================
       GLOBAL
    ========================= */
    canView: true,
    isReadOnly,

    /* =========================
       DOCUMENTS
    ========================= */
    canUploadDocument:
      !isReadOnly && capabilities.upload,

    canUploadNewVersion:
      !isReadOnly && capabilities.update,

    canDeleteDocument:
      !isReadOnly && capabilities.delete,

    /* =========================
       CONTRACT CONTROLS
    ========================= */
    canLockSection:
      !isReadOnly && capabilities.lock,

    canApprove:
      !isReadOnly && capabilities.approve,

    /* =========================
       UI / SAFETY FLAGS
    ========================= */
    showEditActions:
      !isReadOnly && (capabilities.upload || capabilities.update),

    showAdminActions:
      !isReadOnly && (capabilities.lock || capabilities.delete),

    /* =========================
       DEBUG (optional, remove later)
    ========================= */
    _debug: {
      contractStatus,
      memberRole: role,
      lifecycleLocked: isReadOnly,
    },
  }
}

const ROLE_CAPABILITIES = {
  owner: {
    upload: true,
    delete: true,
    update: true,
    lock: true,
    approve: true,
  },
  admin: {
    upload: true,
    delete: true,
    update: true,
    lock: true,
    approve: false,
  },
  editor: {
    upload: true,
    delete: false,
    update: true,
    lock: false,
    approve: false,
  },
  submitter: {
    upload: true,
    delete: false,
    update: false,
    lock: false,
    approve: false,
  },
  reviewer: {
    upload: false,
    delete: false,
    update: false,
    lock: false,
    approve: false,
  },
  approver: {
    upload: false,
    delete: false,
    update: false,
    lock: false,
    approve: true,
  },
  auditor: {
    upload: false,
    delete: false,
    update: false,
    lock: false,
    approve: false,
  },
  viewer: {
    upload: false,
    delete: false,
    update: false,
    lock: false,
    approve: false,
  },
  readonly: {
    upload: false,
    delete: false,
    update: false,
    lock: false,
    approve: false,
  },
}
