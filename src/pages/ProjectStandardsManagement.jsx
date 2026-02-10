import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Trash2, Edit2, Check, X, Upload, FileText, Download, Calculator, Settings, ChevronRight } from 'lucide-react';

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
  }, []);

  const fetchAllStandards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/project-standards-all');
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
      const response = await fetch('/api/project-standards-documents/categories');
      if (response.ok) {
        const data = await response.json();
        setDocumentCategories(data.categories);
      }
    } catch (err) { console.error(err); }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/project-standards-documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setDocumentsByCategory(data.documentsByCategory);
      }
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return alert('Please select a file');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription);
      const response = await fetch('/api/project-standards-documents/upload', { method: 'POST', body: formData });
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
      const response = await fetch(`/api/project-standards-documents/${docId}`, { method: 'DELETE' });
      if (response.ok) await fetchDocuments();
    } catch (err) { alert(err.message); }
  };

  const handleAddStandard = async () => {
    if (!newEntry.value.trim()) return alert('Please enter a value');
    try {
      const response = await fetch('/api/project-standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/project-standards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/project-standards/${id}`, { method: 'DELETE' });
      if (response.ok) await fetchAllStandards();
    } catch (err) { alert(err.message); }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await fetch(`/api/project-standards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

        {/* 1. Standards Tab (Preserved as is) */}
        {activeTab === 'standards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h2 className="heading-secondary mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`w-full text-left px-4 py-2 rounded transition ${
                      selectedCategory === cat.value ? 'bg-lodha-gold text-white' : 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80 border border-lodha-gold/30'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="heading-secondary mb-4">Add New Standard</h2>
                <div className="space-y-4">
                  <select
                    value={newEntry.category}
                    onChange={e => setNewEntry({ ...newEntry, category: e.target.value })}
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  >
                    {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                  <input
                    type="text"
                    value={newEntry.value}
                    onChange={e => setNewEntry({ ...newEntry, value: e.target.value })}
                    placeholder="Value (e.g. Residential)"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                  <textarea
                    value={newEntry.description}
                    onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="Description"
                    rows="2"
                    className="w-full px-3 py-2 border border-lodha-grey rounded"
                  />
                  <button onClick={handleAddStandard} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded">
                    <Plus className="w-4 h-4" /> Add Standard
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="heading-secondary mb-4">{categories.find(c => c.value === selectedCategory)?.label}</h2>
                <div className="space-y-3">
                  {filteredStandards.map(standard => (
                    <div key={standard.id} className="p-4 border border-lodha-gold/30 rounded-lg bg-lodha-sand/50">
                      {editingId === standard.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editData[standard.id]?.value || standard.value}
                            onChange={e => setEditData({...editData, [standard.id]: {...editData[standard.id], value: e.target.value}})}
                            className="w-full px-3 py-2 border rounded"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateStandard(standard.id)} className="flex-1 bg-lodha-gold text-white py-1 rounded">Save</button>
                            <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-200 py-1 rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{standard.value}</h3>
                            <p className="text-sm text-lodha-grey">{standard.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(standard.id)} className="p-2 text-lodha-gold"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => handleToggleActive(standard.id, standard.is_active)} className="p-2"><Check className={`w-4 h-4 ${standard.is_active ? 'text-green-600' : 'text-gray-400'}`}/></button>
                            <button onClick={() => handleDeleteStandard(standard.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Calculation Standards Tab (UPDATED) */}
        {activeTab === 'calculations' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
            {/* Disciplines Column */}
            <div className="bg-white rounded-lg shadow-md p-5 border border-lodha-gold/10 h-fit">
              <h2 className="text-xs font-bold uppercase tracking-wider text-lodha-grey mb-4">Disciplines</h2>
              <div className="space-y-1">
                {Object.keys(calculationStructure).map(main => (
                  <button
                    key={main}
                    onClick={() => {
                      setSelectedMainCategory(main);
                      setSelectedSubModule(calculationStructure[main][0]);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-md transition flex justify-between items-center ${
                      selectedMainCategory === main ? 'bg-lodha-gold text-white shadow-sm' : 'text-lodha-black hover:bg-lodha-sand'
                    }`}
                  >
                    <span className="font-medium">{main}</span>
                    {selectedMainCategory === main && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Column */}
            <div className="bg-white rounded-lg shadow-md p-5 border border-lodha-gold/10 h-fit">
              <h2 className="text-xs font-bold uppercase tracking-wider text-lodha-grey mb-4">{selectedMainCategory} Modules</h2>
              <div className="space-y-1">
                {calculationStructure[selectedMainCategory].map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubModule(sub)}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition ${
                      selectedSubModule === sub ? 'bg-lodha-sand text-lodha-gold font-bold border-l-4 border-lodha-gold' : 'text-lodha-grey hover:text-lodha-black'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6 border border-lodha-gold/10">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="heading-secondary">{selectedSubModule} Constants</h2>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-lodha-gold text-white rounded-md text-sm">
                    <Plus className="w-4 h-4" /> Add Factor
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-lodha-gold/20 text-lodha-grey text-xs uppercase">
                        <th className="pb-3 font-bold">Factor</th>
                        <th className="pb-3 font-bold">Value</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-lodha-gold/5 hover:bg-lodha-sand/20">
                        <td className="py-4 font-medium">Standard {selectedSubModule} Factor</td>
                        <td className="py-4 font-mono text-lodha-gold">0.85</td>
                        <td className="py-4 text-right">
                          <button className="text-lodha-gold p-1 hover:bg-lodha-gold/10 rounded"><Edit2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-lodha-sand/50 border border-lodha-gold/30 rounded-lg p-5">
                <div className="flex gap-3 items-start">
                  <Settings className="w-5 h-5 text-lodha-gold mt-1" />
                  <div>
                    <h3 className="font-jost font-semibold text-lodha-black">Engine Integration</h3>
                    <p className="text-sm text-lodha-grey mt-1">
                      Values updated here are used as default constants for <strong>{selectedSubModule}</strong> calculations.
                    </p>
                  </div>
                </div>
              </div>
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
    </Layout>
  );
}