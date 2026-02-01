import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import DocumentUploadModal from './DocumentUploadModal';
import PdfViewerModal from './PdfViewerModal'; 
import { documentService } from '../../services/documentService';
/**
 * DocumentChecklistRegister
 * Renders contract-specific required doc list (contract_required_documents)
 * joined to template (contract_document_templates) and latest uploaded doc (contract_documents.template_id).
 *
 * Props:
 * - contractId (uuid)
 * - lifecycleStage: PRE_CONTRACT | CONTRACT_FORMATION | PROJECT_MANAGEMENT | CLOSE_OUT
 * - sectionCode: e.g. EMPLOYER_DOCS, TENDER_DOCS, FORMATION_DOCS, PC_STAGE
 * - contractSection: enum used by contract_documents.contract_section (e.g. PRE_CONTRACT, CONTRACT_FORMATION, CLOSE_OUT)
 * - isLocked: boolean (section-level lock)
 * - authority: contract authority object (role/status gating)
 */
const DocumentChecklistRegister = ({
  contractId,
  lifecycleStage,
  sectionCode,
  contractSection,
  isLocked = false,
  authority,
}) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');

  // const canUpload = !!authority?.canUploadDocument && !authority?.isReadOnly && !isLocked;
  const canUpload = !isLocked && !authority?.isReadOnly;

  const statusBadge = (kind) => {
    const base = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    if (kind === 'LOCKED') return <span className={`${base} bg-amber-100 text-amber-800`}>Locked</span>;
    if (kind === 'UPLOADED') return <span className={`${base} bg-green-100 text-green-800`}>Uploaded</span>;
    return <span className={`${base} bg-gray-100 text-gray-700`}>Pending</span>;
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) Load contract-specific checklist + template join
      const { data: required, error: reqErr } = await supabase
        .from('contract_required_documents')
        .select(`
          id,
          is_required,
          remarks,
          template:contract_document_templates (
            id,
            lifecycle_stage,
            section_code,
            section_title,
            item_code,
            item_title,
            description,
            data_type,
            sequence_no,
            is_mandatory
          )
        `)
        .eq('contract_id', contractId);

      if (reqErr) throw reqErr;

      const filtered = (required || [])
        .filter((r) => r.is_required)
        .filter((r) => r.template?.lifecycle_stage === lifecycleStage)
        .filter((r) => r.template?.section_code === sectionCode);

      const templateIds = filtered.map((r) => r.template?.id).filter(Boolean);

        console.log('CHECKLIST DEBUG', {
        lifecycleStage,
        sectionCode,
        requiredTotal: required?.length,
        filteredCount: filtered?.length,
        sample: filtered?.[0],
        });


      // 2) Load uploaded docs for these templates (latest current only)
      let docsByTemplate = new Map();
      if (templateIds.length > 0) {
        const { data: docs, error: docErr } = await supabase
          .from('contract_documents')
          .select('id, template_id, document_title, file_url, storage_path, file_name, status, is_locked, created_at')
          .eq('contract_id', contractId)
          .in('template_id', templateIds)
          .eq('is_current', true);

        if (docErr) throw docErr;

        // pick latest per template (by created_at)
        (docs || []).forEach((d) => {
          const key = d.template_id;
          const prev = docsByTemplate.get(key);
          if (!prev) docsByTemplate.set(key, d);
          else if (new Date(d.created_at) > new Date(prev.created_at)) docsByTemplate.set(key, d);
        });
      }

      // 3) Merge into rows (ordered)
      const merged = filtered
        .map((r) => {
          const t = r.template;
          const doc = t?.id ? docsByTemplate.get(t.id) : null;

          const isDocLocked = !!doc?.is_locked || (doc?.status === 'LOCKED');
          const state =
            doc ? (isDocLocked ? 'LOCKED' : 'UPLOADED') : 'PENDING';

          return {
            requiredId: r.id,
            template: t,
            doc,
            state,
          };
        })
        .sort((a, b) => (a.template?.sequence_no || 0) - (b.template?.sequence_no || 0));

      setRows(merged);
    } catch (e) {
      console.error('Checklist register load error:', e);
      setError(e?.message || 'Failed to load checklist');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!contractId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, lifecycleStage, sectionCode]);

  const openUpload = (template) => {
    setSelectedTemplate(template);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setSelectedTemplate(null);
  };

  const derivePathFromFileUrl = (fileUrl) => {
  if (!fileUrl) return null;
  const marker = '/storage/v1/object/public/contract-documents/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.substring(idx + marker.length).split('?')[0];
 };

const handleView = async (doc) => {
  try {
    const path = doc?.storage_path;
    if (!path) return alert('No storage path');

    const { data, error } = await supabase.storage
      .from('contract-documents')
      .createSignedUrl(path, 60 * 10);

    if (error) throw error;

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    
  } catch (err) {
    console.error(err);
    alert('Failed to open PDF');
  }
 };





  const sectionTitle = useMemo(() => {
    // derive from first row’s template.section_title if available
    return rows?.[0]?.template?.section_title || '';
  }, [rows]);

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-24" />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm font-medium text-red-900">Checklist load failed</p>
        <p className="text-xs text-red-800 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Optional heading */}
      {sectionTitle && <h4 className="text-sm font-semibold text-gray-900">{sectionTitle}</h4>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 text-xs font-semibold text-gray-600 px-4 py-2">
          <div className="col-span-6">Item</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-4 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-600">
            No required items selected for this section yet.
          </div>
        ) : (
          rows.map((r) => {
            const title = r.template?.item_title || '(Untitled)';
            const desc = r.template?.description;

            const doc = r.doc;
            const isRowLocked = isLocked || authority?.isReadOnly || r.state === 'LOCKED';

            return (
              <div key={r.template?.id} className="grid grid-cols-12 px-4 py-3 border-t items-center">
                <div className="col-span-6">
                  <div className="text-sm font-medium text-gray-900">{title}</div>
                  {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
                </div>

                <div className="col-span-2">
                  {statusBadge(r.state)}
                </div>

                <div className="col-span-4 flex justify-end gap-2">
                  {/* View */}
                  <button
                    onClick={() => handleView(doc)}
                    disabled={!doc}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={doc ? 'View uploaded document' : 'No document uploaded'}
                  >
                    View
                  </button>

                  {/* Upload */}
                  <button
                    onClick={() => openUpload(r.template)}
                    disabled={!canUpload || isRowLocked}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    title={
                      !canUpload ? 'No upload permission / read-only' :
                      isRowLocked ? 'Locked (baseline/section/doc)' :
                      'Upload PDF for this item'
                    }
                  >
                    Upload
                  </button>

                  {/* Versions placeholder (optional: later wire to your version UI) */}
                  <button
                    disabled={!doc}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Version history (coming next)"
                  >
                    Versions
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload modal */}
      <DocumentUploadModal
        isOpen={uploadOpen}
        onClose={closeUpload}
        contractId={contractId}
        contractSection={contractSection}
        onUploadSuccess={() => {
          closeUpload();
          load();
        }}
        authority={authority}
        isLocked={isLocked}

        // ✅ NEW props we will add to DocumentUploadModal (patch below)
        presetTemplate={selectedTemplate}
      />
    </div>
  );
};

export default DocumentChecklistRegister;
