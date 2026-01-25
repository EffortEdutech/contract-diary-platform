/**
 * Document Service
 * Handles contract document upload, versioning, and management
 * SESSION 19: PDF Document Handler
 */

import { supabase } from '../lib/supabase';

// Document Type Labels (human-readable)
export const DOCUMENT_TYPE_LABELS = {
  // Pre-Contract
  'PROJECT_BRIEF': 'Project Brief',
  'EMPLOYERS_REQUIREMENTS': "Employer's Requirements",
  'SCOPE_OF_WORK': 'Scope of Work',
  'CONCEPT_DRAWINGS': 'Concept Drawings',
  'PRELIMINARY_SPECIFICATIONS': 'Preliminary Specifications',
  'PROJECT_BUDGET': 'Project Budget / Cost Limit',
  'TENDER_INSTRUCTIONS': 'Tender Instructions',
  'INVITATION_TO_TENDER': 'Invitation to Tender (ITT)',
  'RFP_RFQ': 'RFP / RFQ',
  'CONDITIONS_OF_TENDER': 'Conditions of Tender',
  'TENDER_BOQ': 'Tender BOQ',
  'SCHEDULE_OF_RATES': 'Schedule of Rates (SOR)',
  'PRELIMINARIES': 'Preliminaries',
  'TENDER_DRAWINGS': 'Tender Drawings',
  'TENDER_SPECIFICATIONS': 'Technical Specifications (Tender)',
  'TENDER_CONDITIONS_DRAFT': 'Contract Conditions (Draft)',
  'TENDER_ADDENDA': 'Tender Addenda / Clarifications',
  'FORM_OF_TENDER': 'Form of Tender',
  'TENDER_BOND': 'Tender Bond',
  'COMPANY_PROFILE': 'Company Profile',
  'METHOD_STATEMENT_OUTLINE': 'Method Statement (Outline)',
  'PRELIMINARY_PROGRAMME': 'Preliminary Programme',
  'PRELIMINARY_HSE_PLAN': 'Preliminary HSE Plan',
  'FINANCIAL_STATEMENTS': 'Financial Statements',
  'CVS_EXPERIENCE': 'CVs / Experience',
  'PLANT_EQUIPMENT_LIST': 'Plant & Equipment List',
  
  // Contract Formation
  'LETTER_OF_AWARD': 'Letter of Award',
  'LETTER_OF_ACCEPTANCE': 'Letter of Acceptance',
  'CONTRACT_AGREEMENT': 'Contract Agreement',
  'CONDITIONS_OF_CONTRACT': 'Conditions of Contract',
  'APPENDIX_TO_CONDITIONS': 'Appendix to Conditions',
  'IFC_DRAWINGS': 'IFC Drawings',
  'CONTRACT_SPECIFICATIONS': 'Contract Specifications',
  'PRICED_BOQ': 'Priced BOQ / Contract Sum Analysis',
  'CONTRACT_PROGRAMME': 'Contract Programme',
  'PERFORMANCE_BOND': 'Performance Bond',
  'ADVANCE_PAYMENT_BOND': 'Advance Payment Bond',
  'INSURANCE_CAR': 'Insurance - CAR',
  'INSURANCE_PUBLIC_LIABILITY': 'Insurance - Public Liability',
  'INSURANCE_WORKMEN_COMPENSATION': 'Insurance - Workmen Compensation',
  'INSURANCE_PROFESSIONAL_INDEMNITY': 'Insurance - Professional Indemnity',
  'POWER_OF_ATTORNEY': 'Power of Attorney',
  
  // Close-Out
  'FINAL_COMPLETION_CERTIFICATE': 'Final Completion Certificate',
  'BOND_RELEASE': 'Bond Release',
  'RETENTION_RELEASE': 'Retention Release',
  'FINAL_ACCOUNT_AGREEMENT': 'Final Account Agreement',
  'AS_BUILT_DRAWINGS': 'As-Built Drawings',
  'OM_MANUALS': 'O&M Manuals',
  'WARRANTIES': 'Warranties',
  'COMPLETION_REPORT': 'Completion Report',
  'ARCHIVE_INDEX': 'Archive Index',
  
  // Other
  'OTHER': 'Other Document'
};

// Section Labels
export const SECTION_LABELS = {
  'PRE_CONTRACT': 'Pre-Contract',
  'CONTRACT_FORMATION': 'Contract Formation',
  'CLOSE_OUT': 'Close-Out'
};

// Status Labels
export const STATUS_LABELS = {
  'DRAFT': 'Draft',
  'ISSUED': 'Issued',
  'SUPERSEDED': 'Superseded',
  'LOCKED': 'Locked',
  'ARCHIVED': 'Archived'
};

// ===============================
// Signed URL helper (PRIVATE bucket)
// ===============================
const CONTRACT_BUCKET = 'contract-documents';

function extractStoragePath(fileUrlOrPath) {
  if (!fileUrlOrPath) return null;

  // If already a path
  if (!fileUrlOrPath.startsWith('http')) return fileUrlOrPath;

  const patterns = [
    `/storage/v1/object/public/${CONTRACT_BUCKET}/`,
    `/storage/v1/object/sign/${CONTRACT_BUCKET}/`,
  ];

  for (const marker of patterns) {
    const idx = fileUrlOrPath.indexOf(marker);
    if (idx !== -1) {
      const tail = fileUrlOrPath.substring(idx + marker.length);
      return tail.split('?')[0];
    }
  }
  return null;
}


async function getSignedViewUrl(storagePath, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from('contract-documents')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error('SIGNED URL ERROR:', error);
    throw error;
  }

  return data.signedUrl;
}

export const documentService = {
  /**
   * Upload a new document
   */
  async uploadDocument({
    contractId,
    documentType,
    contractSection,
    customDocumentType,
    documentTitle,
    documentNumber,
    issueDate,
    issuer,
    recipient,
    expiryDate,
    description,
    remarks,
    tags,
    templateId,
    file
  }) {
    try {
      console.log('📤 Starting document upload...', { documentTitle, documentType });

      if (!file) throw new Error('No file selected');
      if (!(file instanceof File)) throw new Error('Invalid file object (not a browser File)');
      if (file.type !== 'application/pdf') {
        throw new Error(`Invalid file type: ${file.type || '(empty)'} (PDF required)`);
      }

      // 1. Upload file to Supabase Storage
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${contractId}/${contractSection}/${timestamp}_${sanitizedFileName}`;

      console.log('FILE DEBUG', {
        name: file?.name,
        type: file?.type,
        size: file?.size,
        isFile: file instanceof File,
      });     
      console.log('📁 Uploading to storage path:', storagePath);

      console.log('UPLOAD CHECK:', {
        isFile: file instanceof File,
        type: file?.type,
        name: file?.name,
        size: file?.size
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(storagePath, file, {
          contentType: 'application/pdf', // ✅ force correct MIME
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ File uploaded to storage:', uploadData);

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(storagePath);

      console.log('🔗 Public URL:', publicUrl);

      // 3. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 3.5 Supersede previous current doc for same template (if any)
      if (templateId) {
        await supabase
          .from('contract_documents')
          .update({ is_current: false })
          .eq('contract_id', contractId)
          .eq('template_id', templateId)
          .eq('is_current', true);
      }
      
      // 4. Create document record
      const documentData = {
        contract_id: contractId,
        template_id: templateId || null,
        document_type: documentType,
        contract_section: contractSection,
        custom_document_type: documentType === 'OTHER' ? customDocumentType : null,
        document_title: documentTitle,
        document_number: documentNumber || null,
        issue_date: issueDate,
        issuer: issuer,
        issuer_user_id: user.id,
        recipient: recipient || null,
        file_url: publicUrl,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        status: 'ISSUED',
        expiry_date: expiryDate || null,
        description: description || null,
        remarks: remarks || null,
        tags: tags || null,
        uploaded_by: user.id,
        version: '1.0',
        revision_number: 1,
        is_current: true
      };

      console.log('💾 Creating document record:', documentData);

      const { data: document, error: docError } = await supabase
        .from('contract_documents')
        .insert(documentData)
        .select()
        .single();

      if (docError) {
        console.error('❌ Document record error:', docError);
        // Clean up uploaded file
        await supabase.storage
          .from('contract-documents')
          .remove([storagePath]);
        throw docError;
      }

      console.log('✅ Document record created:', document);

      // 5. Create initial version record (non-fatal if blocked)
      const versionData = {
        document_id: document.id,
        version: '1.0',
        revision_number: 1,
        file_url: publicUrl,
        storage_path: storagePath, // keep only if your table has this column
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        change_reason: 'Initial upload',
        change_summary: 'First version of document'
      };

      const { error: versionError } = await supabase
        .from('document_versions')
        .insert(versionData);

      if (versionError) {
        // IMPORTANT: do NOT throw
        console.warn('⚠️ Version row not created (upload still OK):', versionError);
      };

      console.log('✅ Document upload complete!');
      return { data: document, error: null };   // ✅ MUST RETURN
      
    } catch (error) {
      console.error('❌ Upload document error:', error);
      return { data: null, error };
    }
  },

  /**
   * Upload new version of existing document
   */
  async uploadNewVersion({ documentId, file, changeReason, changeSummary }) {
    try {
      console.log('📤 Uploading new version for document:', documentId);

      // Validate file
      if (!file) throw new Error('No file selected');
      if (!(file instanceof File)) throw new Error('Invalid file object');
      if (file.type !== 'application/pdf') throw new Error('PDF required');

      // 1) Get current document
      const { data: currentDoc, error: fetchError } = await supabase
        .from('contract_documents')
        .select('id, contract_id, contract_section, version, revision_number, is_locked')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentDoc) throw new Error('Document not found');

      // 2) Check lock
      if (currentDoc.is_locked) {
        throw new Error('Cannot upload new version: Document is locked');
      }

      // 3) Compute new version
      const newRevision = (currentDoc.revision_number || 1) + 1;
      const newVersion = `1.${newRevision}`;
      console.log(`📊 New version: ${newVersion} (was ${currentDoc.version})`);

      // 4) Upload file to storage
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${currentDoc.contract_id}/${currentDoc.contract_section}/${timestamp}_v${newRevision}_${sanitizedFileName}`;

      console.log('📁 Uploading new version to storage path:', storagePath);

      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 5) Get public URL (or keep file_url as signed later)
      const { data: pub } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(storagePath);

      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error('Failed to generate public URL');

      // 6) Current user
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('User not authenticated');

      // 7) Update contract_documents (NO .single())
      const { data: updatedRows, error: updateError } = await supabase
        .from('contract_documents')
        .update({
          version: newVersion,
          revision_number: newRevision,
          file_url: publicUrl,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select();

      if (updateError) throw updateError;

      const updatedDoc = updatedRows?.[0];
      if (!updatedDoc) {
        throw new Error('Update returned 0 rows (RLS blocked UPDATE or documentId mismatch)');
      }

      // 8) Insert document_versions row (this is where your 403 happens if policy is wrong)
      const versionRow = {
        document_id: documentId,
        version: newVersion,
        revision_number: newRevision,
        file_url: publicUrl,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        change_reason: changeReason || null,
        change_summary: changeSummary || null,
        changed_from_version: currentDoc.version || null,
        uploaded_by: user.id
      };

      const { error: versionError } = await supabase
        .from('document_versions')
        .insert(versionRow);

      if (versionError) throw versionError;

      console.log('✅ New version uploaded successfully!');
      return { data: updatedDoc, error: null };
    } catch (error) {
      console.error('❌ Upload new version error:', error);
      return { data: null, error };
    }
  },


  /**
   * Get all documents for a contract section
   */
  async getDocumentsBySection(contractId, contractSection) {
    try {
      const { data, error } = await supabase
        .from('contract_documents')
        .select(`
          *
        `)
        .eq('contract_id', contractId)
        .eq('contract_section', contractSection)
        .eq('is_current', true)
        .order('document_type', { ascending: true });

      if (error) throw error;

      console.log(`📋 Found ${data?.length || 0} documents for ${contractSection}`);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Get documents by section error:', error);
      return { data: null, error };
    }
  },

  /**
   * Get single document by ID
   */
  async getDocumentById(documentId) {
    try {
      const { data, error } = await supabase
        .from('contract_documents')
        .select(`
          *,
          uploaded_by_user:uploaded_by(id),
          locked_by_user:locked_by(id)
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return { data, error: null };

    } catch (error) {
      console.error('❌ Get document by ID error:', error);
      return { data: null, error };
    }
  },

  /**
   * Get version history for a document
   */
  async getDocumentVersions(documentId) {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`*`)        
        .eq('document_id', documentId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Get document versions error:', error);
      return { data: [], error };
    }
  },



  /**
   * Check if Contract Formation is locked
   */
  async isContractFormationLocked(contractId) {
    try {
      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .eq('contract_section', 'CONTRACT_FORMATION')
        .eq('is_locked', true)
        .limit(1);

      if (error) throw error;

      const isLocked = data && data.length > 0;
      console.log(`🔒 Contract Formation locked status:`, isLocked);
      return { isLocked, error: null };

    } catch (error) {
      console.error('❌ Check lock status error:', error);
      return { isLocked: false, error };
    }
  },

  /**
   * Update document metadata (only if not locked)
   */
  async updateDocument(documentId, updates) {
    try {
      // Check if document is locked
      const { data: doc } = await supabase
        .from('contract_documents')
        .select('is_locked')
        .eq('id', documentId)
        .single();

      if (doc?.is_locked) {
        throw new Error('Cannot update locked document');
      }

      const { data, error } = await supabase
        .from('contract_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Document updated:', documentId);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Update document error:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete document (only if draft and not locked)
   */
  async deleteDocument(documentId) {
    try {
      // 1. Get document details
      const { data: doc, error: fetchError } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Check permissions
      if (doc.is_locked) {
        throw new Error('Cannot delete locked document');
      }

      if (doc.status !== 'DRAFT') {
        throw new Error('Can only delete draft documents');
      }

      // 3. Extract storage path from URL
      const urlParts = doc.file_url.split('/');
      const storagePath = urlParts.slice(-3).join('/'); // contract_id/section/filename

      // 4. Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contract-documents')
        .remove([storagePath]);

      if (storageError) {
        console.warn('⚠️ Storage deletion warning:', storageError);
        // Continue anyway
      }

      // 5. Delete database record (versions cascade delete)
      const { error: deleteError } = await supabase
        .from('contract_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      console.log('✅ Document deleted:', documentId);
      return { success: true, error: null };

    } catch (error) {
      console.error('❌ Delete document error:', error);
      return { success: false, error };
    }
  },

  /**
   * Get documents expiring soon
   */
  async getExpiringDocuments(contractId, daysAhead = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      console.log(`⚠️ Found ${data?.length || 0} expiring documents`);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Get expiring documents error:', error);
      return { data: null, error };
    }
  },


  getSignedViewUrl,


  /**
   * Download document (returns blob)
   */
  async downloadDocument(fileUrl) {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      return { data: blob, error: null };

    } catch (error) {
      console.error('❌ Download document error:', error);
      return { data: null, error };
    }
  }



  



};
