import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentChecklistRegister from '../../../../components/contracts/DocumentChecklistRegister';

/**
 * ProjectManagementAdminTab
 * GUI pattern: dropdown sections ▾ + item list (same concept as Pre-Contract)
 */
const PM_SECTIONS = [
  { sectionCode: 'PM_GENERAL_ADMIN', title: 'General Administration' },
  { sectionCode: 'PM_CORRESP_RECORDS', title: 'Correspondence & Records' },
  { sectionCode: 'PM_PLANNING', title: 'Planning & Scheduling' },
  { sectionCode: 'PM_DIARY', title: 'Site Diary & Daily Records' },
  { sectionCode: 'PM_HSE', title: 'HSE' },
  { sectionCode: 'PM_QAQC', title: 'QA/QC' },
  { sectionCode: 'PM_TECHNICAL_DOCS', title: 'Technical Docs' },
  { sectionCode: 'PM_COMMERCIAL', title: 'Commercial & Contractual' },
  { sectionCode: 'PM_SUBCON', title: 'Subcontract & Supplier' },
  { sectionCode: 'PM_STATUTORY_MY', title: 'Statutory & Authority (MY)' },
  { sectionCode: 'PM_TESTING_HANDOVER', title: 'Testing & Handover' },
];

export default function ProjectManagementAdminTab({
  contractId,
  authority,
  onOpenWorkProgramme,
  isLocked = false, // PM generally remains open; you can gate later
}) {
  const [openSection, setOpenSection] = useState('PM_GENERAL_ADMIN');
  const sections = useMemo(() => PM_SECTIONS, []);
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Header note (optional) */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-700">
          Project Management & Admin (structure visible; actions are role/status gated).
        </div>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {sections.map((s) => {
          const isOpen = openSection === s.sectionCode;

          return (
            <div key={s.sectionCode} className="bg-white border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : s.sectionCode)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
              >
                <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                <div className="text-gray-600">{isOpen ? '▾' : '▸'}</div>
              </button>

              {isOpen && (
                <div className="p-4">
                  <DocumentChecklistRegister
                    contractId={contractId}
                    lifecycleStage="PROJECT_MANAGEMENT"
                    sectionCode={s.sectionCode}           
                    contractSection="PROJECT_MANAGEMENT"
                    isLocked={isLocked}
                    authority={authority}
                    onOpenModule={(template) => {
                      // 1) Planning & Scheduling → Work Programme modal
                      if (template?.section_code === 'PM_PLANNING') {
                        onOpenWorkProgramme?.();             // ✅ call function, no boolean param
                        return true;
                      }

                      // 2) Diary → navigate to diary list
                      if (template?.section_code === 'PM_DIARY') {
                        navigate(`/contracts/${contractId}/diaries`);
                        return true;
                      }

                      // return false so DocumentChecklistRegister can fallback to its internal routing map
                      return false;
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
