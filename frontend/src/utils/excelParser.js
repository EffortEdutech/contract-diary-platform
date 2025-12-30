// frontend/src/utils/excelParser.js
import * as XLSX from 'xlsx';

/**
 * Parse Excel or CSV file to JSON
 * @param {File} file - Excel or CSV file
 * @returns {Promise<Array>} Array of parsed data
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Keep values as strings for better control
          defval: ''  // Default value for empty cells
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };
    
    reader.onerror = (error) => {
      reject(new Error(`Failed to read file: ${error}`));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate BOQ data from Excel
 * @param {Array} data - Parsed Excel data
 * @returns {Object} Validation result with errors
 */
export const validateBOQData = (data) => {
  const errors = [];
  const validatedData = [];
  
  // Required columns (case-insensitive mapping)
  const columnMapping = {
    'item_number': ['item_number', 'item no', 'item number', 'no', 'item'],
    'description': ['description', 'desc', 'particulars', 'work description'],
    'unit': ['unit', 'uom', 'unit of measurement'],
    'quantity': ['quantity', 'qty', 'amount'],
    'unit_rate': ['unit_rate', 'rate', 'unit rate', 'unit price', 'price'],
    'item_type': ['item_type', 'type', 'category'],
    'section': ['section', 'section_number', 'section no']
  };
  
  // Check if data is empty
  if (!data || data.length === 0) {
    errors.push('Excel file is empty');
    return { isValid: false, errors, data: [] };
  }
  
  // Normalize column names from first row
  const firstRow = data[0];
  const normalizedColumns = {};
  
  Object.keys(firstRow).forEach(col => {
    const normalized = col.toLowerCase().trim();
    Object.keys(columnMapping).forEach(stdCol => {
      if (columnMapping[stdCol].includes(normalized)) {
        normalizedColumns[col] = stdCol;
      }
    });
  });
  
  // Check for required columns
  const requiredFields = ['item_number', 'description', 'unit', 'quantity', 'unit_rate'];
  const missingFields = requiredFields.filter(field => 
    !Object.values(normalizedColumns).includes(field)
  );
  
  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(', ')}`);
    return { isValid: false, errors, data: [] };
  }
  
  // Validate each row
  data.forEach((row, index) => {
    const rowNumber = index + 2; // Excel row number (accounting for header)
    const rowErrors = [];
    
    // Map row data to standard fields
    const mappedRow = {};
    Object.keys(row).forEach(col => {
      if (normalizedColumns[col]) {
        mappedRow[normalizedColumns[col]] = row[col];
      }
    });
    
    // Validate item_number
    if (!mappedRow.item_number || mappedRow.item_number.toString().trim() === '') {
      rowErrors.push(`Row ${rowNumber}: Item number is required`);
    }
    
    // Validate description
    if (!mappedRow.description || mappedRow.description.toString().trim() === '') {
      rowErrors.push(`Row ${rowNumber}: Description is required`);
    }
    
    // Validate unit
    if (!mappedRow.unit || mappedRow.unit.toString().trim() === '') {
      rowErrors.push(`Row ${rowNumber}: Unit is required`);
    }
    
    // Validate quantity
    const quantity = parseFloat(mappedRow.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      rowErrors.push(`Row ${rowNumber}: Quantity must be a positive number`);
    }
    
    // Validate unit_rate
    const unitRate = parseFloat(mappedRow.unit_rate);
    if (isNaN(unitRate) || unitRate < 0) {
      rowErrors.push(`Row ${rowNumber}: Unit rate must be a number (0 or greater)`);
    }
    
    // Validate item_type if provided
    const validTypes = ['material', 'labor', 'equipment', 'subcontractor'];
    if (mappedRow.item_type) {
      const itemType = mappedRow.item_type.toString().toLowerCase().trim();
      if (!validTypes.includes(itemType)) {
        rowErrors.push(`Row ${rowNumber}: Item type must be one of: ${validTypes.join(', ')}`);
      }
      mappedRow.item_type = itemType;
    } else {
      // Default to material if not specified
      mappedRow.item_type = 'material';
    }
    
    // If no errors, add to validated data
    if (rowErrors.length === 0) {
      validatedData.push({
        item_number: mappedRow.item_number.toString().trim(),
        description: mappedRow.description.toString().trim(),
        unit: mappedRow.unit.toString().trim(),
        quantity: quantity,
        unit_rate: unitRate,
        item_type: mappedRow.item_type,
        section: mappedRow.section ? mappedRow.section.toString().trim() : null,
        specifications: null,
        notes: null
      });
    } else {
      errors.push(...rowErrors);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    data: validatedData
  };
};

/**
 * Format BOQ data for preview
 * @param {Array} data - Validated BOQ data
 * @returns {Object} Summary statistics
 */
export const getBOQSummary = (data) => {
  if (!data || data.length === 0) {
    return {
      totalItems: 0,
      totalValue: 0,
      byType: {
        material: 0,
        labor: 0,
        equipment: 0,
        subcontractor: 0
      },
      bySectionCount: {}
    };
  }
  
  const summary = {
    totalItems: data.length,
    totalValue: 0,
    byType: {
      material: 0,
      labor: 0,
      equipment: 0,
      subcontractor: 0
    },
    bySectionCount: {}
  };
  
  data.forEach(item => {
    const amount = item.quantity * item.unit_rate;
    summary.totalValue += amount;
    
    // Count by type
    if (summary.byType.hasOwnProperty(item.item_type)) {
      summary.byType[item.item_type] += amount;
    }
    
    // Count by section
    const section = item.section || 'Unsectioned';
    summary.bySectionCount[section] = (summary.bySectionCount[section] || 0) + 1;
  });
  
  return summary;
};

/**
 * Download sample Excel template
 */
export const downloadSampleTemplate = () => {
  // Create sample data
  const sampleData = [
    {
      'Item No': 'A.1.1',
      'Description': 'Excavation for foundation',
      'Unit': 'm³',
      'Quantity': 100.000,
      'Rate': 25.50,
      'Type': 'labor',
      'Section': 'A'
    },
    {
      'Item No': 'A.1.2',
      'Description': 'Concrete Grade 30',
      'Unit': 'm³',
      'Quantity': 50.000,
      'Rate': 450.00,
      'Type': 'material',
      'Section': 'A'
    },
    {
      'Item No': 'B.1.1',
      'Description': 'Formwork to columns',
      'Unit': 'm²',
      'Quantity': 120.000,
      'Rate': 45.00,
      'Type': 'material',
      'Section': 'B'
    }
  ];
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ Items');
  
  // Download file
  XLSX.writeFile(wb, 'BOQ_Template.xlsx');
};
