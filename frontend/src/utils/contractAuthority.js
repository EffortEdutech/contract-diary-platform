const ROLE_CAPABILITIES = {
  owner: { upload: true, delete: true, update: true, lock: true, approve: true },
  admin: { upload: true, delete: true, update: true, lock: true, approve: false },
  editor: { upload: true, delete: false, update: true, lock: false, approve: false },
  submitter: { upload: true, delete: false, update: false, lock: false, approve: false },
  reviewer: { upload: false, delete: false, update: false, lock: false, approve: false },
  approver: { upload: false, delete: false, update: false, lock: false, approve: true },
  auditor: { upload: false, delete: false, update: false, lock: false, approve: false },
  viewer: { upload: false, delete: false, update: false, lock: false, approve: false },
  readonly: { upload: false, delete: false, update: false, lock: false, approve: false },
};

export function resolveContractAuthority({ contractStatus, memberRole }) {
  const role = (memberRole || 'readonly').toLowerCase();
  const capabilities = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.readonly;

  const status = (contractStatus || 'DRAFT').toString().toUpperCase();

  // 🔒 Lifecycle dominance (expand later if needed)
  const isSuspended = status === 'SUSPENDED';
  const isCompleted = status === 'COMPLETED';
  const isArchived = status === 'ARCHIVED';
  const isReadOnly = isSuspended || isCompleted || isArchived || role === 'viewer' || role === 'readonly';

  return {
    canView: true,
    isReadOnly,

    canUploadDocument: !isReadOnly && capabilities.upload,
    canUploadNewVersion: !isReadOnly && capabilities.update,
    canDeleteDocument: !isReadOnly && capabilities.delete,

    canLockSection: !isReadOnly && capabilities.lock,
    canApprove: !isReadOnly && capabilities.approve,

    showEditActions: !isReadOnly && (capabilities.upload || capabilities.update),
    showAdminActions: !isReadOnly && (capabilities.lock || capabilities.delete),

    _debug: { contractStatus: status, memberRole: role, lifecycleLocked: isReadOnly },
  };
}
