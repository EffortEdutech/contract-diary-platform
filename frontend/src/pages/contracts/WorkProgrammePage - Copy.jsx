// src/pages/contracts/WorkProgrammePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { supabase } from '../../lib/supabase';
import WorkProgrammePanel from '../../components/programme/WorkProgrammePanel';
import { useAuth } from '../../contexts/AuthContext';
import { resolveContractAuthority } from '../../utils/contractAuthority';

export default function WorkProgrammePage() {
  const { id: contractId } = useParams();
  const { user, profile } = useAuth();

  const [contract, setContract] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!contractId) return;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // 1) Load contract (NO is_locked column in contracts)
        const { data: c, error: cErr } = await supabase
          .from('contracts')
          .select('id, contract_number')
          .eq('id', contractId)
          .single();

        if (cErr) throw cErr;
        setContract(c);

        // 2) Load baseline lock row (may not exist yet)
        const { data: lockRow, error: lockErr } = await supabase
          .from('contract_baseline_locks')
          .select('is_locked')
          .eq('contract_id', contractId)
          .maybeSingle();

        if (lockErr) throw lockErr;

        // If no row, treat as unlocked
        setIsLocked(!!lockRow?.is_locked);
      } catch (e) {
        console.error(e);
        setLoadError(e?.message || 'Failed to load contract');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [contractId]);

  // Authority – reuse your existing resolver pattern
  const authority = useMemo(() => {
    try {
      return resolveContractAuthority({ user, profile, contract });
    } catch {
      return null;
    }
  }, [user, profile, contract]);

  const breadcrumbItems = useMemo(
    () => [
      { label: 'Contracts', href: '/contracts', icon: '📄' },
      {
        label: contract?.contract_number || (loading ? 'Loading...' : 'Contract'),
        href: contractId ? `/contracts/${contractId}` : '/contracts',
      },
      {
        label: 'Work Programme',
        href: contractId ? `/contracts/${contractId}/programme` : null,
      },
    ],
    [contractId, contract, loading]
  );

  if (loading) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-4 animate-pulse bg-gray-100 rounded-lg h-24" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-red-900">Failed to load</div>
          <div className="text-xs text-red-800 mt-1">{loadError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold text-gray-900">📅 Work Programme</div>
          <div className="text-sm text-gray-600">
            Planning &amp; Scheduling • Tree view • CSV import
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLocked ? (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
              Locked
            </span>
          ) : (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">
              Unlocked
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <WorkProgrammePanel contractId={contractId} authority={authority} isLocked={isLocked} />
      </div>
    </div>
  );
}
