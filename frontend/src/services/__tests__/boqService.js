// src/services/__tests__/boqService.test.js
import { validateBOQItem } from '../boqService';

// Test validation function
console.log('Testing BOQ Item Validation...\n');

// Test 1: Valid item
const validItem = {
  item_number: 'A01',
  description: 'Concrete M30',
  item_type: 'material',
  unit: 'm³',
  quantity: 50,
  unit_rate: 450.00
};

const result1 = validateBOQItem(validItem);
console.log('Test 1 - Valid Item:', result1);

// Test 2: Invalid item (missing fields)
const invalidItem = {
  item_number: '',
  description: 'Test',
  item_type: 'invalid_type',
  unit: '',
  quantity: -5,
  unit_rate: -10
};

const result2 = validateBOQItem(invalidItem);
console.log('\nTest 2 - Invalid Item:', result2);

console.log('\n✅ Validation tests complete!');