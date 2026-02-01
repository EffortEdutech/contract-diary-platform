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
  const { user, profile, loading: authLoading } = useAuth();

  const [contract, setContract] = useState(null);
  const [member, setMember] = useState(null); // full member row
  const [isLocked, setIsLocked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!contractId) return;
    if (authLoading) return;
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // 1) Contract basics (NO is_locked column in contracts)
        const { data: c, error: cErr } = await supabase
          .from('contracts')
          .select('id, contract_number, status')
          .eq('id', contractId)
          .single();

        if (cErr) throw cErr;

        // 2) Member row (schema: member_role, user_role, invitation_status, etc.)
        const { data: m, error: mErr } = await supabase
          .from('contract_members')
          .select('id, contract_id, user_id, member_role, member_role, invitation_status, created_at')
          .eq('contract_id', contractId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (mErr) throw mErr;

        // 3) Lock row (schema: contract_baseline_locks.is_locked)
        // If no row exists => unlocked
        const { data: lockRow, error: lockErr } = await supabase
          .from('contract_baseline_locks')
          .select('is_locked')
          .eq('contract_id', contractId)
          .maybeSingle();

        if (lockErr) throw lockErr;

        setContract(c);
        setMember(m || null);
        setIsLocked(!!lockRow?.is_locked);
      } catch (e) {
        console.error(e);
        setLoadError(e?.message || 'Failed to load work programme context');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [contractId, user?.id, authLoading]);

  const memberRole = member?.member_role || member?.user_role || null;

  // Authority – make sure resolver sees: contract.status + memberRole
  const authority = useMemo(() => {
    try {
      return resolveContractAuthority({
        user,
        profile,
        contract,
        memberRole, // ✅ important for edit permission
      });
    } catch (e) {
      console.error('Authority resolve failed:', e);
      return null;
    }
  }, [user, profile, contract, memberRole]);

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

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-4 animate-pulse bg-gray-100 rounded-lg h-24" />
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-yellow-900">Not logged in</div>
          <div className="text-xs text-yellow-800 mt-1">
            Please sign in to view the Work Programme.
          </div>
        </div>
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
            Planning & Scheduling • Tree view • CSV import
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isLocked ? 'Locked' : 'Unlocked'} • Contract status:{' '}
            <span className="font-semibold text-gray-700">{contract?.status || 'unknown'}</span> •
            Member role:{' '}
            <span className="font-semibold text-gray-700">{memberRole || 'unknown'}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <WorkProgrammePanel contractId={contractId} authority={authority} isLocked={isLocked} />
      </div>
    </div>
  );
}
