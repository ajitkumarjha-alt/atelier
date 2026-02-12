import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Trash2, Edit2, Check, X, Upload, FileText, Download, Calculator, Settings } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ProjectStandardsManagement() {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('application_type');
  const [editingId, setEditingId] = useState(null);
  const [newEntry, setNewEntry] = useState({ category: 'application_type', value: '', description: '' });
  const [editData, setEditData] = useState({});
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('calculations'); 

  // Document management states
  const [documents, setDocuments] = useState([]);
  const [documentsByCategory, setDocumentsByCategory] = useState({});
  const [selectedDocCategory, setSelectedDocCategory] = useState('company_policies');
  const [documentCategories, setDocumentCategories] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('company_policies');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // --- UPDATED CALCULATION STANDARDS STATE ---
  const [selectedMainCategory, setSelectedMainCategory] = useState('Electrical');
  const [selectedSubModule, setSelectedSubModule] = useState('Electrical Load');
  
  // Electrical Load Factors state
  const [electricalFactors, setElectricalFactors] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [selectedGuideline, setSelectedGuideline] = useState('MSEDCL 2016');
  const [editingFactorId, setEditingFactorId] = useState(null);
  const [showAddFactorModal, setShowAddFactorModal] = useState(false);
  const [factorFormData, setFactorFormData] = useState({
    category: 'RESIDENTIAL',
    sub_category: 'FLAT',
    description: '',
    watt_per_sqm: '',
    mdf: '0.6',
    edf: '0.6',
    fdf: '0.0',
    guideline: 'MSEDCL 2016',
    notes: '',
    is_active: true
  });

  const calculationStructure = {
    'Electrical': ['Electrical Load', 'Cable Selection', 'Transformers', 'Earthing', 'LPS'],
    'PHE': ['Water Demand', 'Pump Head', 'Septic Tank', 'Rainwater Harvesting'],
    'Fire Fighting': ['Hydrant System', 'Sprinkler System', 'Fire Pump Room'],
    'LV': ['CCTV Storage', 'IT Rack Load', 'PA System'],
    'HVAC': ['Heat Load', 'Duct Sizing', 'Chiller Capacity']
  };

  const categories = [
    { value: 'application_type', label: 'Application Types' },
    { value: 'residential_type', label: 'Residential Types' },
    { value: 'flat_type', label: 'Flat Types' },
    { value: 'building_type', label: 'Building Types' },
  ];

  useEffect(() => {
    fetchAllStandards();
    fetchDocumentCategories();
    fetchDocuments();
    fetchElectricalFactors();
    fetchGuidelines();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'calculations' && selectedSubModule === 'Electrical Load') {
      fetchElectricalFactors();
    }
  }, [activeTab, selectedSubModule, selectedGuideline]);

  const fetchAllStandards = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/project-standards-all');
      if (response.ok) {
        const data = await response.json();
        setStandards(data);
      } else {
        setError('Failed to fetch standards');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentCategories = async () => {
    try {
      const response = await apiFetch('/api/project-standards-documents/categories');
      if (response.ok) {
        const data = await response.json();
        setDocumentCategories(data.categories);
      }
    } catch (err) { console.error(err); }
  };

  const fetchDocuments = async () => {
    try {
      const response = await apiFetch('/api/project-standards-documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setDocumentsByCategory(data.documentsByCategory);
      }
    } catch (err) { console.error(err); }
  };
  
  const fetchElectricalFactors = async () => {
    try {
      const url = selectedGuideline 
        ? `/api/electrical-load-factors?guideline=${encodeURIComponent(selectedGuideline)}`
        : '/api/electrical-load-factors';
      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        setElectricalFactors(data);
      }
    } catch (err) { console.error('Error fetching electrical factors:', err); }
  };
  
  const fetchGuidelines = async () => {
    try {
      const response = await apiFetch('/api/electrical-load-factors/guidelines/list');
      if (response.ok) {
        const data = await response.json();
        setGuidelines(data);
        if (data.length > 0 && !selectedGuideline) {
          setSelectedGuideline(data[0]);
        }
      }
    } catch (err) { console.error('Error fetching guidelines:', err); }
  };
  
  const handleSaveElectricalFactor = async () => {
    try {
      const method = editingFactorId ? 'PUT' : 'POST';
      const url = editingFactorId 
        ? `/api/electrical-load-factors/${editingFactorId}`
        : '/api/electrical-load-factors';
      
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(factorFormData)
      });
      
      if (response.ok) {
        await fetchElectricalFactors();
        await fetchGuidelines();
        setShowAddFactorModal(false);
        setEditingFactorId(null);
        resetFactorForm();
        alert('Factor saved successfully');
      }
    } catch (err) { 
      console.error('Error saving factor:', err);
      alert('Failed to save factor');
    }
  };
  
  const handleDeleteElectricalFactor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this factor?')) return;
    try {
      const response = await apiFetch(`/api/electrical-load-factors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...electricalFactors.find(f => f.id === id), is_active: false })
      });
      if (response.ok) {
        await fetchElectricalFactors();
        alert('Factor deleted successfully');
      }
    } catch (err) { 
      console.error('Error deleting factor:', err);
      alert('Failed to delete factor');
    }
  };
  
  const handleEditElectricalFactor = (factor) => {
    setFactorFormData({
      category: factor.category,
      sub_category: factor.sub_category || '',
      description: factor.description,
      watt_per_sqm: factor.watt_per_sqm || '',
      mdf: factor.mdf || '0.6',
      edf: factor.edf || '0.6',
      fdf: factor.fdf || '0.0',
      guideline: factor.guideline,
      notes: factor.notes || '',
      is_active: factor.is_active
    });
    setEditingFactorId(factor.id);
    setShowAddFactorModal(true);
  };
  
  const resetFactorForm = () => {
    setFactorFormData({
      category: 'RESIDENTIAL',
      sub_category: 'FLAT',
      description: '',
      watt_per_sqm: '',
      mdf: '0.6',
      edf: '0.6',
      fdf: '0.0',
      guideline: selectedGuideline || 'MSEDCL 2016',
      notes: '',
      is_active: true
    });
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return alert('Please select a file');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription);
      const response = await apiFetch('/api/project-standards-documents/upload', { method: 'POST', body: formData });
      if (response.ok) {
        await fetchDocuments();
        setUploadFile(null);
        setUploadDescription('');
        alert('Document uploaded successfully');
      }
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const response = await apiFetch(`/api/project-standards-documents/${docId}`, { method: 'DELETE' });
      if (response.ok) await fetchDocuments();
    } catch (err) { alert(err.message); }
  };

  const handleAddStandard = async () => {
    if (!newEntry.value.trim()) return alert('Please enter a value');
    try {
      const response = await apiFetch('/api/project-standards', {
        method: 'POST',
        body: JSON.stringify(newEntry),
      });
      if (response.ok) {
        await fetchAllStandards();
        setNewEntry({ ...newEntry, value: '', description: '' });
      }
    } catch (err) { alert(err.message); }
  };

  const handleUpdateStandard = async (id) => {
    try {
      const response = await apiFetch(`/api/project-standards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editData[id]),
      });
      if (response.ok) {
        await fetchAllStandards();
        setEditingId(null);
      }
    } catch (err) { alert(err.message); }
  };

  const handleDeleteStandard = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const response = await apiFetch(`/api/project-standards/${id}`, { method: 'DELETE' });
      if (response.ok) await fetchAllStandards();
    } catch (err) { alert(err.message); }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await apiFetch(`/api/project-standards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      await fetchAllStandards();
    } catch (err) { alert(err.message); }
  };

  const filteredStandards = standards.filter(s => s.category === selectedCategory);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="heading-primary mb-2">Project Standards Management</h1>
          <p className="text-lodha-grey">Manage dropdown options, calculation factors, and reference documents</p>
        </div>

        {error && <div className="mb-6 p-4 bg-lodha-sand border border-lodha-gold rounded">{error}</div>}

        {/* Tabs */}
        <div className="mb-6 border-b border-lodha-gold/30">
          <div className="flex gap-4">
            {['standards', 'calculations', 'documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-jost font-semibold transition border-b-2 capitalize ${
                  activeTab === tab ? 'border-lodha-gold text-lodha-gold' : 'border-transparent text-lodha-grey hover:text-lodha-black'
                }`}
              >
                {tab === 'standards' ? 'Dropdown Standards' : tab === 'calculations' ? 'Calculation Standards' : 'Reference Documents'}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Standards Tab */}
        {activeTab === 'standards' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Category Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-lodha-grey mr-1">Category</span>
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setSelectedCategory(cat.value);
                    setNewEntry({ ...newEntry, category: cat.value });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedCategory === cat.value
                      ? 'bg-lodha-gold text-white shadow-sm'
                      : 'bg-lodha-sand text-lodha-black hover:bg-lodha-gold/20 border border-lodha-gold/20'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow-md border border-lodha-gold/10">
              {/* Header with inline add form */}
              <div className="px-6 py-4 border-b border-lodha-gold/10 flex flex-wrap items-end gap-3">
                <h2 className="heading-secondary mr-auto">{categories.find(c => c.value === selectedCategory)?.label}</h2>
                <input
                  type="text"
                  value={newEntry.value}
                  onChange={e => setNewEntry({ ...newEntry, value: e.target.value })}
                  placeholder="New value"
                  className="px-3 py-1.5 border border-lodha-gold/30 rounded-md text-sm w-40"
                />
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                  placeholder="Description"
                  className="px-3 py-1.5 border border-lodha-gold/30 rounded-md text-sm w-48"
                />
                <button
                  onClick={handleAddStandard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-lodha-gold text-white rounded-md text-sm hover:bg-lodha-deep transition whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Standards List */}
              <div className="divide-y divide-lodha-gold/10">
                {filteredStandards.length === 0 && (
                  <div className="py-8 text-center text-lodha-grey text-sm">No standards in this category yet.</div>
                )}
                {filteredStandards.map((standard, idx) => (
                  <div key={standard.id} className={`px-6 py-3 flex items-center gap-4 hover:bg-lodha-sand/30 ${idx % 2 !== 0 ? 'bg-lodha-sand/10' : ''}`}>
                    {editingId === standard.id ? (
                      <>
                        <input
                          type="text"
                          value={editData[standard.id]?.value || standard.value}
                          onChange={e => setEditData({...editData, [standard.id]: {...editData[standard.id], value: e.target.value}})}
                          className="flex-1 px-3 py-1.5 border border-lodha-gold/30 rounded text-sm"
                        />
                        <button onClick={() => handleUpdateStandard(standard.id)} className="px-3 py-1 bg-lodha-gold text-white text-sm rounded">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-200 text-sm rounded">Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-lodha-black">{standard.value}</span>
                          {standard.description && <span className="text-sm text-lodha-grey ml-2">— {standard.description}</span>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setEditingId(standard.id)} className="p-1.5 text-lodha-gold hover:bg-lodha-gold/10 rounded" title="Edit"><Edit2 className="w-3.5 h-3.5"/></button>
                          <button onClick={() => handleToggleActive(standard.id, standard.is_active)} className="p-1.5 hover:bg-green-50 rounded" title={standard.is_active ? 'Active' : 'Inactive'}><Check className={`w-3.5 h-3.5 ${standard.is_active ? 'text-green-600' : 'text-gray-300'}`}/></button>
                          <button onClick={() => handleDeleteStandard(standard.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-lodha-sand/30 border-t border-lodha-gold/10 text-xs text-lodha-grey">
                {filteredStandards.length} item{filteredStandards.length !== 1 ? 's' : ''} · These values appear in dropdown fields across the application
              </div>
            </div>
          </div>
        )}

        {/* 2. Calculation Standards Tab (UPDATED) */}
        {activeTab === 'calculations' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Compact Navigation Row */}
            <div className="flex flex-wrap items-start gap-4">
              {/* Disciplines - horizontal pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-lodha-grey mr-1">Discipline</span>
                {Object.keys(calculationStructure).map(main => (
                  <button
                    key={main}
                    onClick={() => {
                      setSelectedMainCategory(main);
                      setSelectedSubModule(calculationStructure[main][0]);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      selectedMainCategory === main
                        ? 'bg-lodha-gold text-white shadow-sm'
                        : 'bg-lodha-sand text-lodha-black hover:bg-lodha-gold/20 border border-lodha-gold/20'
                    }`}
                  >
                    {main}
                  </button>
                ))}
              </div>

              <div className="w-px h-8 bg-lodha-gold/20 hidden sm:block" />

              {/* Modules - horizontal pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-lodha-grey mr-1">Module</span>
                {calculationStructure[selectedMainCategory].map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubModule(sub)}
                    className={`px-3 py-1.5 rounded-full text-sm transition ${
                      selectedSubModule === sub
                        ? 'bg-lodha-black text-white font-semibold'
                        : 'bg-white text-lodha-grey hover:text-lodha-black border border-lodha-gold/20'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Content - Full Width */}
            <div className="space-y-4">
              {selectedSubModule === 'Electrical Load' ? (
                <>
                  {/* Electrical Load Factors Management */}
                  <div className="bg-white rounded-lg shadow-md border border-lodha-gold/10">
                    <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-b border-lodha-gold/10">
                      <div>
                        <h2 className="heading-secondary">{selectedSubModule} Factors</h2>
                        <p className="text-sm text-lodha-grey mt-0.5">L0 configurable load calculation standards &nbsp;·&nbsp; <strong>MDF</strong> = Max Demand &nbsp;·&nbsp; <strong>EDF</strong> = Essential Demand &nbsp;·&nbsp; <strong>FDF</strong> = Fire Demand</p>
                      </div>
                      <div className="flex gap-3 items-center">
                        <select
                          value={selectedGuideline}
                          onChange={(e) => setSelectedGuideline(e.target.value)}
                          className="px-3 py-1.5 border border-lodha-gold/30 rounded-md text-sm"
                        >
                          {guidelines.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            resetFactorForm();
                            setShowAddFactorModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-lodha-gold text-white rounded-md text-sm hover:bg-lodha-deep transition whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" /> Add Factor
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-lodha-sand/40 text-lodha-grey text-xs uppercase">
                            <th className="py-2.5 px-4 font-bold">Category</th>
                            <th className="py-2.5 px-3 font-bold">Description</th>
                            <th className="py-2.5 px-3 font-bold text-right whitespace-nowrap">W/sq.m</th>
                            <th className="py-2.5 px-3 font-bold text-right">MDF</th>
                            <th className="py-2.5 px-3 font-bold text-right">EDF</th>
                            <th className="py-2.5 px-3 font-bold text-right">FDF</th>
                            <th className="py-2.5 px-3 font-bold">Reference</th>
                            <th className="py-2.5 px-3 text-center font-bold w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {electricalFactors.map((factor, idx) => (
                            <tr key={factor.id} className={`border-b border-lodha-gold/5 hover:bg-lodha-sand/30 ${idx % 2 === 0 ? '' : 'bg-lodha-sand/10'}`}>
                              <td className="py-2.5 px-4">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-lodha-sand text-lodha-black">{factor.category}</span>
                                {factor.sub_category && <span className="text-xs text-lodha-grey ml-1">/ {factor.sub_category}</span>}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-lodha-black">{factor.description}</td>
                              <td className="py-2.5 px-3 font-mono text-right text-lodha-gold font-semibold">{factor.watt_per_sqm || '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-right">{factor.mdf != null ? `${(factor.mdf * 100).toFixed(0)}%` : '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-right">{factor.edf != null ? `${(factor.edf * 100).toFixed(0)}%` : '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-right">{factor.fdf != null ? `${(factor.fdf * 100).toFixed(0)}%` : '—'}</td>
                              <td className="py-2.5 px-3 text-xs text-lodha-grey">{factor.notes || '—'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex gap-1 justify-center">
                                  <button 
                                    onClick={() => handleEditElectricalFactor(factor)}
                                    className="text-lodha-gold p-1.5 hover:bg-lodha-gold/10 rounded"
                                    title="Edit factor"
                                  >
                                    <Edit2 className="w-3.5 h-3.5"/>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteElectricalFactor(factor.id)}
                                    className="text-red-400 p-1.5 hover:bg-red-50 rounded"
                                    title="Delete factor"
                                  >
                                    <Trash2 className="w-3.5 h-3.5"/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {electricalFactors.length === 0 && (
                            <tr>
                              <td colSpan="8" className="py-8 text-center text-lodha-grey">
                                No factors found for {selectedGuideline}. Click "Add Factor" to create one.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-3 bg-lodha-sand/30 border-t border-lodha-gold/10 text-xs text-lodha-grey flex justify-between items-center">
                      <span>{electricalFactors.length} factor{electricalFactors.length !== 1 ? 's' : ''} · Guideline: <strong>{selectedGuideline}</strong></span>
                      <span>Changes apply to all new calculations</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Other modules - Generic placeholder */
                <div className="bg-white rounded-lg shadow-md border border-lodha-gold/10">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-lodha-gold/10">
                    <h2 className="heading-secondary">{selectedSubModule} Constants</h2>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-lodha-gold text-white rounded-md text-sm">
                      <Plus className="w-4 h-4" /> Add Factor
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-lodha-sand/40 text-lodha-grey text-xs uppercase">
                          <th className="py-2.5 px-4 font-bold">Factor</th>
                          <th className="py-2.5 px-3 font-bold">Value</th>
                          <th className="py-2.5 px-3 text-right font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr className="border-b border-lodha-gold/5 hover:bg-lodha-sand/20">
                          <td className="py-3 px-4 font-medium">Standard {selectedSubModule} Factor</td>
                          <td className="py-3 px-3 font-mono text-lodha-gold">0.85</td>
                          <td className="py-3 px-3 text-right">
                            <button className="text-lodha-gold p-1 hover:bg-lodha-gold/10 rounded"><Edit2 className="w-4 h-4"/></button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-3 bg-lodha-sand/30 border-t border-lodha-gold/10 text-xs text-lodha-grey">
                    Values updated here are used as default constants for <strong>{selectedSubModule}</strong> calculations.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Documents Tab (Preserved as is) */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h2 className="heading-secondary mb-4">Document Categories</h2>
              <div className="space-y-2">
                {documentCategories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedDocCategory(cat.value)}
                    className={`w-full text-left px-4 py-2 rounded transition ${
                      selectedDocCategory === cat.value ? 'bg-lodha-gold text-white' : 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80 border border-lodha-gold/30'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="heading-secondary mb-4">Upload Document</h2>
                <div className="space-y-4">
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  >
                    {documentCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                  <textarea
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    placeholder="Description"
                    rows="2"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={uploading || !uploadFile}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="heading-secondary mb-4">
                  {documentCategories.find(c => c.value === selectedDocCategory)?.label || 'Documents'}
                </h2>
                <div className="space-y-3">
                  {(documentsByCategory[selectedDocCategory] || []).map(doc => (
                    <div key={doc.id} className="p-4 border border-lodha-gold/30 rounded-lg flex justify-between items-start bg-lodha-sand/50">
                      <div className="flex gap-3">
                        <FileText className="w-5 h-5 text-lodha-gold" />
                        <div>
                          <h3 className="font-semibold text-sm">{doc.document_name}</h3>
                          <p className="text-xs text-lodha-grey mt-1">{doc.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-2 text-lodha-gold hover:bg-white rounded"><Download className="w-4 h-4"/></a>
                        <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-lodha-gold hover:bg-white rounded"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add/Edit Electrical Factor Modal */}
      {showAddFactorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-lodha-black mb-6">
                {editingFactorId ? 'Edit' : 'Add'} Electrical Load Factor
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">Category</label>
                  <select
                    value={factorFormData.category}
                    onChange={(e) => setFactorFormData({...factorFormData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  >
                    <option value="RESIDENTIAL">RESIDENTIAL</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                    <option value="LIGHTING">LIGHTING</option>
                    <option value="LIFTS">LIFTS</option>
                    <option value="HVAC">HVAC</option>
                    <option value="PRESSURIZATION">PRESSURIZATION</option>
                    <option value="PHE">PHE</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">Sub Category</label>
                  <input
                    type="text"
                    value={factorFormData.sub_category}
                    onChange={(e) => setFactorFormData({...factorFormData, sub_category: e.target.value})}
                    placeholder="e.g., FLAT, VILLA, LOBBY"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-lodha-grey mb-1">Description / Use Type *</label>
                  <input
                    type="text"
                    value={factorFormData.description}
                    onChange={(e) => setFactorFormData({...factorFormData, description: e.target.value})}
                    placeholder="e.g., Residential Flat, Commercial with AC"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">Watt per sq.m</label>
                  <input
                    type="number"
                    step="0.01"
                    value={factorFormData.watt_per_sqm}
                    onChange={(e) => setFactorFormData({...factorFormData, watt_per_sqm: e.target.value})}
                    placeholder="e.g., 25.00"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                  <p className="text-xs text-lodha-grey mt-1">Leave empty for equipment-based loads</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">Guideline Reference</label>
                  <input
                    type="text"
                    value={factorFormData.guideline}
                    onChange={(e) => setFactorFormData({...factorFormData, guideline: e.target.value})}
                    placeholder="e.g., MSEDCL 2016, NBC 2016"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">MDF (Max Demand Factor)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={factorFormData.mdf}
                    onChange={(e) => setFactorFormData({...factorFormData, mdf: e.target.value})}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">EDF (Essential Demand Factor)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={factorFormData.edf}
                    onChange={(e) => setFactorFormData({...factorFormData, edf: e.target.value})}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-1">FDF (Fire Demand Factor)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={factorFormData.fdf}
                    onChange={(e) => setFactorFormData({...factorFormData, fdf: e.target.value})}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-lodha-grey mb-1">Notes</label>
                  <textarea
                    value={factorFormData.notes}
                    onChange={(e) => setFactorFormData({...factorFormData, notes: e.target.value})}
                    rows="3"
                    placeholder="Additional notes or reference information"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddFactorModal(false);
                    setEditingFactorId(null);
                    resetFactorForm();
                  }}
                  className="px-4 py-2 border border-lodha-grey rounded hover:bg-lodha-sand transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveElectricalFactor}
                  className="px-4 py-2 bg-lodha-gold text-white rounded hover:bg-lodha-deep transition"
                >
                  {editingFactorId ? 'Update' : 'Create'} Factor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}