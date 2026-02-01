import React, { useState } from 'react';
import DocumentChecklistRegister from '../../../../components/contracts/DocumentChecklistRegister';

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        type="button"
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
          Close-out is sequential: Completion Docs → PC/CPC → DLP → Final Account → Archive.
        </p>
      </div>

      {/* A) Project Completion Documents (seed templates next) */}
      <Section title="📦 Project Completion Documents" defaultOpen={true}>
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="CLOSE_OUT"
          sectionCode="CO_COMPLETION_DOCS"
          contractSection="CLOSE_OUT"
          isLocked={isLocked}
          authority={authority}
        />
        <div className="mt-2 text-xs text-gray-500">
          If empty: seed templates for section_code <code>CO_COMPLETION_DOCS</code>.
        </div>
      </Section>

      {/* B) Practical Completion / CPC (NEW correct code) */}
      <Section title="🏗️ Practical Completion (PC) / CPC" defaultOpen={true}>
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="CLOSE_OUT"
          sectionCode="CO_PC_CPC"
          contractSection="CLOSE_OUT"
          isLocked={isLocked}
          authority={authority}
        />
      </Section>

      {/* C) DLP */}
      <Section title="🔧 Defects Liability Period (DLP)" defaultOpen={false}>
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="CLOSE_OUT"
          sectionCode="CO_DLP"
          contractSection="CLOSE_OUT"
          isLocked={isLocked}
          authority={authority}
        />
      </Section>

      {/* D) Archive (seed templates next) */}
      <Section title="🗄️ Archive Contract" defaultOpen={false}>
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="CLOSE_OUT"
          sectionCode="CO_ARCHIVE"
          contractSection="CLOSE_OUT"
          isLocked={isLocked}
          authority={authority}
        />
        <div className="mt-2 text-xs text-gray-500">
          Coming soon: “Make Immutable Archive” action + summary generation.
        </div>
      </Section>
    </div>
  );
};

export default CloseOutArchiveTab;
