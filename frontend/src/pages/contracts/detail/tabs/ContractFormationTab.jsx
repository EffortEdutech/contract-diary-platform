import React, { useEffect, useState } from 'react';
import DocumentChecklistRegister from '../../../../components/contracts/DocumentChecklistRegister';
import ContractFormationLockPanel from '../../../../components/contracts/ContractFormationLockPanel';
import { documentService } from '../../../../services/documentService';

const ContractFormationTab = ({ contractId, authority, onRefreshContract }) => {
  const [formationLocked, setFormationLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLock = async () => {
    setLoading(true);
    const { isLocked } = await documentService.isContractFormationLocked(contractId);
    setFormationLocked(!!isLocked);
    setLoading(false);
  };

  useEffect(() => {
    if (!contractId) return;
    loadLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-24" />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">📜 Contract Formation</h2>
        <p className="text-sm text-gray-600">
          Upload baseline contract documents here. When you lock the baseline, these documents become immutable and the contract becomes <strong>Active</strong>.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <DocumentChecklistRegister
          contractId={contractId}
          lifecycleStage="CONTRACT_FORMATION"
          sectionCode="FORMATION_DOCS"
          contractSection="CONTRACT_FORMATION"
          isLocked={formationLocked}
          authority={authority}
        />
      </div>

      <ContractFormationLockPanel
        contractId={contractId}
        onLockSuccess={async () => {
          await loadLock();
          // refresh contract header/status in ContractDetail
          if (onRefreshContract) await onRefreshContract();
        }}
      />
    </div>
  );
};

export default ContractFormationTab;
