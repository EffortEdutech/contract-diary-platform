// frontend/src/components/contracts/ImportProgrammeModal.jsx
import React, { useState } from 'react';
import {
  parseCsvFile,
  adaptMsProjectRows,
  adaptPrimaveraRows,
  validateProgrammeRows,
  downloadMsProjectTemplate,
  downloadPrimaveraTemplate,
} from '../../utils/programmeCsvParser';

import { bulkImportProgrammeItems, ensureBaselineVersion } from '../../services/programmeService';

const SOURCE = {
  MSP: 'MS_PROJECT',
  P6: 'PRIMAVERA_P6',
};

export default function ImportProgrammeModal({
  isOpen,
  onClose,
  contractId,
  programmeVersionNumber,
  onImported,
  canEdit = true,
}) {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState(SOURCE.MSP);

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [step, setStep] = useState(1); // 1 upload, 2 preview, 3 importing
  const [parsedItems, setParsedItems] = useState(null);
  const [validation, setValidation] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const reset = () => {
    setFile(null);
    setParsedItems(null);
    setValidation(null);
    setStep(1);
    setParsing(false);
    setImporting(false);
    setSource(SOURCE.MSP);
    setReplaceExisting(false); 
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file (.csv)');
      return;
    }

    setFile(f);
    setParsedItems(null);
    setValidation(null);
    setStep(1);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);

    try {
      const { rows } = await parseCsvFile(file);

      const adapted =
        source === SOURCE.MSP ? adaptMsProjectRows(rows) : adaptPrimaveraRows(rows);

      const v = validateProgrammeRows(adapted);

      if (!v.isValid) {
        setValidation(v);
        alert(`Validation failed:\n${v.errors.join('\n')}`);
        return;
      }

      setParsedItems(adapted);
      setValidation(v);
      setStep(2);
    } catch (err) {
      console.error(err);
      alert(`Failed to parse CSV: ${err?.message || 'Unknown error'}`);
    } finally {
      setParsing(false);
    }
  };

    const handleImport = async () => {
    if (!parsedItems?.length) return;

    let versionNo = programmeVersionNumber;

    if (!versionNo) {
        // Auto-create v1 baseline
        const created = await ensureBaselineVersion(contractId);
        versionNo = created.version_number;
    }

    setImporting(true);
    setStep(3);

    try {
        const res = await bulkImportProgrammeItems({
        contractId,
        programmeVersionNumber: versionNo, // ✅ USE versionNo (NOT programmeVersionNumber)
        items: parsedItems,
        replaceExisting, // ✅ THIS is the checkbox value
        });

        alert(`Import complete!\n✅ Imported: ${res.inserted}`);
        reset();
        onImported?.();
        onClose();
    } catch (err) {
        console.error(err);
        alert(`Import failed: ${err?.message || 'Unknown error'}`);
        setImporting(false);
        setStep(2);
    }
    };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-[60] flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Import Programme Items</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload CSV exported from MS Project or Primavera P6
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Template Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Need a template?</h4>
                    <p className="text-xs text-blue-700">
                      Download a sample CSV template matching the selected adapter.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (source === SOURCE.MSP) downloadMsProjectTemplate();
                      else downloadPrimaveraTemplate();
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Download Template
                  </button>
                </div>
              </div>

              {/* Adapter selector */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Adapter
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSource(SOURCE.MSP)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      source === SOURCE.MSP
                        ? 'bg-white border-blue-400 text-blue-700'
                        : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}
                  >
                    MS Project (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource(SOURCE.P6)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      source === SOURCE.P6
                        ? 'bg-white border-blue-400 text-blue-700'
                        : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}
                  >
                    Primavera P6 (CSV)
                  </button>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  Import will map different headers into your internal programme_items format.
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Required Columns Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Required Columns:</h4>
                {source === SOURCE.MSP ? (
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>Outline Number</strong> (WBS)</li>
                    <li>• <strong>Name</strong> (Activity Name)</li>
                    <li>• <strong>Start</strong> (Planned Start)</li>
                    <li>• <strong>Finish</strong> (Planned Finish)</li>
                  </ul>
                ) : (
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>WBS Code</strong> or <strong>Activity ID</strong></li>
                    <li>• <strong>Activity Name</strong></li>
                    <li>• <strong>Start Date</strong></li>
                    <li>• <strong>Finish Date</strong></li>
                  </ul>
                )}

                <h4 className="text-sm font-medium text-gray-900 mt-3 mb-2">Optional Columns:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Duration / % Complete / Actual Start / Actual Finish</li>
                  <li>• Critical / Total Float / Resources</li>
                  <li>
                    • <strong>Parent WBS</strong> (Primavera) will be auto-linked to parent_id
                  </li>
                </ul>
              </div>

                {/* Replace existing checkbox */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="flex items-start gap-3">
                    <input
                    type="checkbox"
                    className="mt-1"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    disabled={!canEdit}
                    />
                    <div>
                    <div className="text-sm font-semibold text-amber-900">
                        Replace existing activities
                    </div>
                    <div className="text-xs text-amber-800 mt-1">
                        If checked, the system will delete existing programme items for this version before importing.
                        Use this when re-importing the same version (e.g., updated CSV).
                    </div>
                    </div>
                </label>
                </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParse}
                  disabled={!file || parsing || !canEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {parsing ? 'Parsing...' : 'Parse & Validate'}
                </button>
              </div>

              {!canEdit && (
                <div className="text-xs text-gray-500">
                  Import disabled (read-only / locked / no permission).
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && parsedItems && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-900">{parsedItems.length}</div>
                  <div className="text-xs text-blue-700">Rows Parsed</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-900">
                    {parsedItems.filter(i => (Number(i.percent_complete || 0) > 0)).length}
                  </div>
                  <div className="text-xs text-green-700">With Progress</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-900">
                    {parsedItems.filter(i => i.activity_type === 'Milestone').length}
                  </div>
                  <div className="text-xs text-purple-700">Milestones</div>
                </div>
              </div>

                {replaceExisting && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm font-semibold text-red-900">
                    Replace mode ON
                    </div>
                    <div className="text-xs text-red-800 mt-1">
                    Existing activities for this version will be deleted before import.
                    </div>
                </div>
                )}

              {/* Warnings */}
              {validation?.warnings?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-yellow-900">Warnings</div>
                  <ul className="mt-2 text-xs text-yellow-800 space-y-1 list-disc pl-4">
                    {validation.warnings.slice(0, 8).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                    {validation.warnings.length > 8 && (
                      <li>...and {validation.warnings.length - 8} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">WBS</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Planned</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedItems.slice(0, 50).map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{it.wbs_code}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{it.description}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {it.planned_start} → {it.planned_finish}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{it.activity_type}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {Number(it.percent_complete || 0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500">
                Preview shows first 50 rows only.
              </div>

              {/* Buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={reset}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ← Back to Upload
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!canEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Import {parsedItems.length} Rows
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 3 && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Importing programme items... Please wait.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
