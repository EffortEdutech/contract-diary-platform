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

const PreContractTenderTab = ({ contractId, authority, isLocked }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">📝 Pre-Contract & Tender</h2>
        <p className="text-sm text-gray-600">
          Documents arranged in sequence. Actions are role- and status-gated. Rows remain visible even if pending.
        </p>
      </div>

      <Section title="Employer / Client Documents">
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="PRE_CONTRACT"
          sectionCode="EMPLOYER_DOCS"
          contractSection="PRE_CONTRACT"
          isLocked={isLocked}
          authority={authority}
        />
      </Section>

      <Section title="Tender Documents">
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="PRE_CONTRACT"
          sectionCode="TENDER_DOCS"
          contractSection="PRE_CONTRACT"
          isLocked={isLocked}
          authority={authority}
        />
      </Section>

      <Section title="Contractor Tender Submissions">
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="PRE_CONTRACT"
          sectionCode="TENDER_SUBMISSION"
          contractSection="PRE_CONTRACT"
          isLocked={isLocked}
          authority={authority}
        />
      </Section>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>Read-only:</strong> Pre-Contract becomes locked after contract is Active (or as per your policy).
          </p>
        </div>
      )}
    </div>
  );
};

export default PreContractTenderTab;
