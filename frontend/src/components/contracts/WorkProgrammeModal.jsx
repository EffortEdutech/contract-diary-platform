// src/components/contracts/WorkProgrammeModal.jsx
import React from 'react';
import WorkProgrammePanel from '../programme/WorkProgrammePanel';

// ------------------------------------------------------------
// Modal shell (scrollable body + fixed header)
// ------------------------------------------------------------
const ModalShell = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="text-base font-semibold text-gray-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default function WorkProgrammeModal({
  isOpen,
  onClose,
  contractId,
  authority,
  isLocked,
}) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="📅 Work Programme (Planning & Scheduling)"
    >
      <WorkProgrammePanel
        contractId={contractId}
        authority={authority}
        isLocked={isLocked}
      />
    </ModalShell>
  );
}
