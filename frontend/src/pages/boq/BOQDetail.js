// frontend/src/pages/boq/BOQDetail.js - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getBOQById, 
  updateBOQStatus, 
  getBOQItems, 
  getBOQSections,
  deleteBOQSection,
  moveItemToSection,
  deleteBOQItem 
} from '../../services/boqService';
import AddBOQItemModal from '../../components/boq/AddBOQItemModal';
import EditBOQItemModal from '../../components/boq/EditBOQItemModal';
import AddSectionModal from '../../components/boq/AddSectionModal';
import EditSectionModal from '../../components/boq/EditSectionModal';
import ImportBOQModal from '../../components/boq/ImportBOQModal';
import ExportPDFButton from '../../components/boq/ExportPDFButton';

function BOQDetail() {
  const { contractId, boqId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [boq, setBoq] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  
  // UI states
  const [expandedSections, setExpandedSections] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState(null);

  // Fetch BOQ data
  useEffect(() => {
    loadBOQData();
  }, [boqId]);

  const loadBOQData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch BOQ details
      const boqResult = await getBOQById(boqId);
      if (!boqResult.success) {
        throw new Error(boqResult.error || 'Failed to fetch BOQ');
      }
      
      setBoq(boqResult.data);
      setContract(boqResult.data.contract);
      
      // Fetch items
      const itemsResult = await getBOQItems(boqId);
      if (itemsResult.success) {
        setItems(itemsResult.data || []);
      }
      
      // Fetch sections
      const sectionsResult = await getBOQSections(boqId);
      if (sectionsResult.success) {
        setSections(sectionsResult.data || []);
        
        // Auto-expand all sections by default
        const expanded = {};
        sectionsResult.data.forEach(section => {
          expanded[section.id] = true;
        });
        setExpandedSections(expanded);
      }
      
    } catch (err) {
      console.error('Error loading BOQ:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle approve BOQ
  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this BOQ? This action cannot be undone.')) {
      return;
    }
    
    const result = await updateBOQStatus(boqId, 'approved');
    if (result.success) {
      alert('BOQ approved successfully!');
      loadBOQData();
    } else {
      alert(`Failed to approve BOQ: ${result.error}`);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    const result = await deleteBOQItem(itemId);
    if (result.success) {
      loadBOQData();
      setDeleteConfirm(null);
    } else {
      alert(`Failed to delete item: ${result.error}`);
    }
  };

  // Handle delete section
  const handleDeleteSection = async (sectionId) => {
    const result = await deleteBOQSection(sectionId);
    if (result.success) {
      loadBOQData();
      setDeleteSectionConfirm(null);
    } else {
      alert(`Failed to delete section: ${result.error}`);
    }
  };

  // Handle move item to section
  const handleMoveItem = async (itemId, sectionId) => {
    const result = await moveItemToSection(itemId, sectionId);
    if (result.success) {
      loadBOQData();
    } else {
      alert(`Failed to move item: ${result.error}`);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-MY', {
      style: 'currency',
      currency: 'MYR'
    });
  };

  // Get item type badge color
  const getItemTypeBadge = (type) => {
    const badges = {
      material: 'bg-blue-100 text-blue-800',
      labor: 'bg-green-100 text-green-800',
      equipment: 'bg-yellow-100 text-yellow-800',
      subcontractor: 'bg-purple-100 text-purple-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  // Group items by section
  const getItemsBySection = (sectionId) => {
    return items.filter(item => item.section_id === sectionId);
  };

  const getUnsectionedItems = () => {
    return items.filter(item => !item.section_id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading BOQ...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => navigate(`/contracts/${contractId}/boq`)}
            className="mt-4 text-red-600 hover:text-red-800"
          >
            ← Back to BOQ List
          </button>
        </div>
      </div>
    );
  }

  if (!boq) {
    return null;
  }

  const isDraft = boq.status === 'draft';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <Link to={`/contracts/${contractId}/boq`} className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to BOQ List
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{boq.title}</h1>
            <p className="text-gray-600 mt-1">
              BOQ Number: {boq.boq_number} | Status:{' '}
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                boq.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                boq.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {boq.status}
              </span>
            </p>
          </div>
          
          <div className="flex space-x-3">
            <ExportPDFButton boq={boq} contract={contract} />
            {isDraft && (
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve BOQ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contract Info */}
      {contract && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Contract Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Project:</span>
              <span className="ml-2 font-medium">{contract.project_name}</span>
            </div>
            <div>
              <span className="text-gray-600">Contract Number:</span>
              <span className="ml-2 font-medium">{contract.contract_number}</span>
            </div>
            <div>
              <span className="text-gray-600">Client:</span>
              <span className="ml-2 font-medium">{contract.client_name}</span>
            </div>
            <div>
              <span className="text-gray-600">Contract Type:</span>
              <span className="ml-2 font-medium">{contract.contract_type}</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{items.length}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{sections.length}</div>
          <div className="text-sm text-gray-600">Sections</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(boq.subtotal || 0)}
          </div>
          <div className="text-sm text-gray-600">Subtotal</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(boq.total_amount || 0)}
          </div>
          <div className="text-sm text-gray-600">Grand Total (incl. SST)</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex space-x-3">
          {isDraft && (
            <>
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                + Add Section
              </button>
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Item
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                📁 Import from Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* BOQ Items - Grouped by Sections */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">BOQ Items</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Render Sections */}
          {sections.map(section => {
            const sectionItems = getItemsBySection(section.id);
            const isExpanded = expandedSections[section.id];
            
            return (
              <div key={section.id}>
                {/* Section Header */}
                <div className="px-6 py-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSection(section.id)}>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Section {section.section_number}: {section.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {sectionItems.length} items
                      </p>
                    </div>
                  </div>
                  
                  {isDraft && (
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedSection(section);
                          setShowEditSectionModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteSectionConfirm(section.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Section Items */}
                {isExpanded && (
                  <div className="px-6 py-2">
                    {sectionItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No items in this section
                      </div>
                    ) : (
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2">Item No</th>
                            <th className="pb-2">Description</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Unit</th>
                            <th className="pb-2 text-right">Quantity</th>
                            <th className="pb-2 text-right">Rate</th>
                            <th className="pb-2 text-right">Amount</th>
                            {isDraft && <th className="pb-2 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {sectionItems.map(item => (
                            <tr key={item.id} className="border-t border-gray-100">
                              <td className="py-3">{item.item_number}</td>
                              <td className="py-3">{item.description}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 text-xs rounded ${getItemTypeBadge(item.item_type)}`}>
                                  {item.item_type}
                                </span>
                              </td>
                              <td className="py-3">{item.unit}</td>
                              <td className="py-3 text-right">
                                {parseFloat(item.quantity).toLocaleString('en-MY', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3
                                })}
                              </td>
                              <td className="py-3 text-right">{formatCurrency(item.unit_rate)}</td>
                              <td className="py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                              {isDraft && (
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowEditItemModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unsectioned Items */}
          {getUnsectionedItems().length > 0 && (
            <div>
              <div className="px-6 py-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSection('unsectioned')}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">
                    {expandedSections.unsectioned ? '▼' : '▶'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Unsectioned Items</h3>
                    <p className="text-sm text-gray-600">
                      {getUnsectionedItems().length} items
                    </p>
                  </div>
                </div>
              </div>

              {expandedSections.unsectioned && (
                <div className="px-6 py-2">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="pb-2">Item No</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Unit</th>
                        <th className="pb-2 text-right">Quantity</th>
                        <th className="pb-2 text-right">Rate</th>
                        <th className="pb-2 text-right">Amount</th>
                        {isDraft && (
                          <>
                            <th className="pb-2">Move to Section</th>
                            <th className="pb-2 text-right">Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {getUnsectionedItems().map(item => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="py-3">{item.item_number}</td>
                          <td className="py-3">{item.description}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 text-xs rounded ${getItemTypeBadge(item.item_type)}`}>
                              {item.item_type}
                            </span>
                          </td>
                          <td className="py-3">{item.unit}</td>
                          <td className="py-3 text-right">
                            {parseFloat(item.quantity).toLocaleString('en-MY', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3
                            })}
                          </td>
                          <td className="py-3 text-right">{formatCurrency(item.unit_rate)}</td>
                          <td className="py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                          {isDraft && (
                            <>
                              <td className="py-3">
                                <select
                                  onChange={(e) => handleMoveItem(item.id, e.target.value || null)}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  defaultValue=""
                                >
                                  <option value="">Move to...</option>
                                  {sections.map(section => (
                                    <option key={section.id} value={section.id}>
                                      Section {section.section_number}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowEditItemModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 mr-3"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* No Items Message */}
          {items.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg mb-4">No items in this BOQ yet</p>
              {isDraft && (
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  + Add your first item
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddBOQItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        boqId={boqId}
        sections={sections}
        onItemAdded={loadBOQData}
      />

      <EditBOQItemModal
        isOpen={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        sections={sections}
        onItemUpdated={loadBOQData}
      />

      <AddSectionModal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        boqId={boqId}
        onSectionAdded={loadBOQData}
      />

      <EditSectionModal
        isOpen={showEditSectionModal}
        onClose={() => {
          setShowEditSectionModal(false);
          setSelectedSection(null);
        }}
        section={selectedSection}
        onSectionUpdated={loadBOQData}
      />

      <ImportBOQModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        boqId={boqId}
        onItemsImported={loadBOQData}
      />

      {/* Delete Item Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Confirmation */}
      {deleteSectionConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete Section</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this section? Items in this section will become unsectioned.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteSectionConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSection(deleteSectionConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BOQDetail;
