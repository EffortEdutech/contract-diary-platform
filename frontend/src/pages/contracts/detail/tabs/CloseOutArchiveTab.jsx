import React, { useState } from 'react';
import DocumentChecklistRegister from '../../../../components/contracts/DocumentChecklistRegister';

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
      >
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">{open ? '▾' : '▸'}</div>
      </button>

      {open && <div className="p-4">{children}</div>}
    </div>
  );
};

const CloseOutArchiveTab = ({ contractId, authority, isLocked }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">🔒 Close-Out & Archive</h2>
        <p className="text-sm text-gray-600">
          Close-out is sequential. Start with Practical Completion documents, then DLP, Final Account, and Archive.
        </p>
      </div>

      <Section title="🏗️ Practical Completion (PC) / CPC">
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="CLOSE_OUT"
          sectionCode="PC_STAGE"
          contractSection="CLOSE_OUT"
          isLocked={isLocked}
          authority={authority}
        />
      </Section>

      {/* Next sections will be added after we seed templates:
          - DLP_STAGE
          - FINAL_ACCOUNT
          - FINAL_CERT
          - RETENTION_RELEASE
          - BOND_RELEASE
          - DISPUTE_RECORDS
          - ARCHIVE_STAGE
      */}
      <Section title="🔧 Defects Liability Period (DLP) (Next)">
        <div className="text-sm text-gray-600">
          Coming next: checklist + defects tracker module.
        </div>
      </Section>

      <Section title="🗄️ Archive Contract (Next)">
        <div className="text-sm text-gray-600">
          Coming next: “Make Immutable Archive” action + summary.
        </div>
      </Section>
    </div>
  );
};

export default CloseOutArchiveTab;
