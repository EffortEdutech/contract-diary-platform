// frontend/src/components/boq/ImportBOQModal.js - ENHANCED WITH AUTO-SECTION ASSIGNMENT
import React, { useState } from 'react';
import { parseExcelFile, validateBOQData, getBOQSummary, downloadSampleTemplate } from '../../utils/excelParser';
import { createBOQItem, getBOQSections } from '../../services/boqService';

function ImportBOQModal({ isOpen, onClose, boqId, onItemsImported }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Importing
  const [sectionMatches, setSectionMatches] = useState(null); // NEW: Track section matches

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        alert('Please upload a valid Excel (.xlsx, .xls) or CSV file');
        return;
      }
      
      setFile(selectedFile);
      setParsedData(null);
      setValidationResult(null);
      setSummary(null);
      setSectionMatches(null);
      setStep(1);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    
    setParsing(true);
    
    try {
      // Parse file
      const data = await parseExcelFile(file);
      
      // Validate data
      const validation = validateBOQData(data);
      
      if (validation.isValid) {
        // Fetch existing sections
        const sectionsResult = await getBOQSections(boqId);
        const existingSections = sectionsResult.success ? sectionsResult.data : [];
        
        // Map section numbers to section IDs
        const sectionMap = {};
        existingSections.forEach(section => {
          // Match by section_number (case-insensitive, trimmed)
          const key = section.section_number.toLowerCase().trim();
          sectionMap[key] = section;
        });
        
        // Assign section_id to items based on section column
        let matchedCount = 0;
        let unmatchedCount = 0;
        
        const enhancedData = validation.data.map(item => {
          if (item.section) {
            const sectionKey = item.section.toLowerCase().trim();
            const matchedSection = sectionMap[sectionKey];
            
            if (matchedSection) {
              matchedCount++;
              return {
                ...item,
                section_id: matchedSection.id,
                matched_section_title: matchedSection.title // For display
              };
            } else {
              unmatchedCount++;
            }
          }
          return {
            ...item,
            section_id: null
          };
        });
        
        setParsedData(enhancedData);
        setValidationResult(validation);
        setSummary(getBOQSummary(enhancedData));
        setSectionMatches({
          total: validation.data.length,
          matched: matchedCount,
          unmatched: unmatchedCount,
          sectionMap: sectionMap
        });
        setStep(2); // Move to preview step
      } else {
        setValidationResult(validation);
        alert(`Validation failed:\n${validation.errors.join('\n')}`);
      }
    } catch (error) {
      alert(`Failed to parse file: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    
    setImporting(true);
    setStep(3); // Move to importing step
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Import items one by one
      for (const item of parsedData) {
        const result = await createBOQItem({
          boq_id: boqId,
          section_id: item.section_id || null, // Use matched section_id
          item_number: item.item_number,
          description: item.description,
          item_type: item.item_type,
          unit: item.unit,
          quantity: item.quantity,
          unit_rate: item.unit_rate,
          specifications: item.specifications,
          notes: item.notes
        });
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      // Show results with section matching info
      let message = `Import complete!\n✅ Success: ${successCount}\n❌ Failed: ${errorCount}`;
      
      if (sectionMatches && sectionMatches.matched > 0) {
        message += `\n\n📂 Section Matching:\n✅ Matched to sections: ${sectionMatches.matched}\n⚠️ No section match: ${sectionMatches.unmatched}`;
      }
      
      alert(message);
      
      // Reset and close
      handleReset();
      onItemsImported();
      onClose();
      
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setValidationResult(null);
    setSummary(null);
    setSectionMatches(null);
    setStep(1);
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Import BOQ Items</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload Excel or CSV file to bulk import BOQ items
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Step 1: Upload File */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Download Template Button */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Need a template?
                    </h4>
                    <p className="text-xs text-blue-700">
                      Download our sample Excel template to see the required format
                    </p>
                  </div>
                  <button
                    onClick={downloadSampleTemplate}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Download Template
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel/CSV File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
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
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Required Columns:
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Item No</strong> - Item number (e.g., A.1.1)</li>
                  <li>• <strong>Description</strong> - Work description</li>
                  <li>• <strong>Unit</strong> - Unit of measurement (m³, m², kg, etc.)</li>
                  <li>• <strong>Quantity</strong> - Quantity (must be positive number)</li>
                  <li>• <strong>Rate</strong> - Unit rate (RM)</li>
                </ul>
                <h4 className="text-sm font-medium text-gray-900 mt-3 mb-2">
                  Optional Columns:
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Type</strong> - material/labor/equipment/subcontractor (default: material)</li>
                  <li>• <strong>Section</strong> - Section number (e.g., A, B, C) <span className="text-green-600 font-semibold">← Auto-matched!</span></li>
                </ul>
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-800">
                    💡 <strong>Tip:</strong> If your Excel has a "Section" column and you've already created sections in this BOQ, 
                    items will be automatically assigned to matching sections!
                  </p>
                </div>
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
                  disabled={!file || parsing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {parsing ? 'Parsing...' : 'Parse & Validate'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview Data */}
          {step === 2 && parsedData && summary && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-900">{summary.totalItems}</div>
                  <div className="text-xs text-blue-700">Total Items</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-900">
                    {summary.totalValue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-green-700">Total Value (RM)</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-900">
                    {Object.keys(summary.bySectionCount).length}
                  </div>
                  <div className="text-xs text-purple-700">Sections Found</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-orange-900">
                    {Object.keys(summary.byType).filter(t => summary.byType[t] > 0).length}
                  </div>
                  <div className="text-xs text-orange-700">Item Types</div>
                </div>
              </div>

              {/* Section Matching Info */}
              {sectionMatches && sectionMatches.matched > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-1">
                        Section Auto-Matching Successful!
                      </h4>
                      <p className="text-xs text-green-800">
                        ✅ <strong>{sectionMatches.matched} items</strong> will be automatically assigned to matching sections<br/>
                        {sectionMatches.unmatched > 0 && (
                          <>⚠️ <strong>{sectionMatches.unmatched} items</strong> have no matching section and will be unsectioned</>
                        )}
                      </p>
                      {Object.keys(sectionMatches.sectionMap).length > 0 && (
                        <div className="mt-2 text-xs text-green-700">
                          <strong>Matched sections:</strong> {Object.values(sectionMatches.sectionMap).map(s => s.section_number).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item No</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Section</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{item.item_number}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{item.description}</td>
                        <td className="px-3 py-2 text-sm">
                          {item.section_id ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">
                              ✓ {item.section}
                            </span>
                          ) : item.section ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">
                              ? {item.section}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            item.item_type === 'material' ? 'bg-blue-100 text-blue-800' :
                            item.item_type === 'labor' ? 'bg-green-100 text-green-800' :
                            item.item_type === 'equipment' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {item.item_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{item.unit}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {parseFloat(item.quantity).toLocaleString('en-MY', { minimumFractionDigits: 3 })}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {parseFloat(item.unit_rate).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                          {(item.quantity * item.unit_rate).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend for Section Badges */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Section Badge Legend:</p>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">✓</span>
                    <span className="text-gray-600">Will be assigned to section</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">?</span>
                    <span className="text-gray-600">Section not found (will be unsectioned)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">None</span>
                    <span className="text-gray-600">No section specified</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
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
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Import {parsedData.length} Items
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 3 && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Importing items... Please wait.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportBOQModal;
