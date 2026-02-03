import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Trash2, Edit2, Check, X, Upload, FileText, Download } from 'lucide-react';

export default function ProjectStandardsManagement() {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('application_type');
  const [editingId, setEditingId] = useState(null);
  const [newEntry, setNewEntry] = useState({ category: 'application_type', value: '', description: '' });
  const [editData, setEditData] = useState({});
  
  // Document management states
  const [activeTab, setActiveTab] = useState('standards'); // 'standards' or 'documents'
  const [documents, setDocuments] = useState([]);
  const [documentsByCategory, setDocumentsByCategory] = useState({});
  const [selectedDocCategory, setSelectedDocCategory] = useState('company_policies');
  const [documentCategories, setDocumentCategories] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('company_policies');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const categories = [
    { value: 'application_type', label: 'Application Types' },
    { value: 'residential_type', label: 'Residential Types' },
    { value: 'flat_type', label: 'Flat Types' },
    { value: 'building_type', label: 'Building Types' },
  ];

  // Fetch standards
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
      console.error('Error fetching standards:', err);
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
    } catch (err) {
      console.error('Error fetching document categories:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/project-standards-documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setDocumentsByCategory(data.documentsByCategory);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription);

      const response = await fetch('/api/project-standards-documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments();
        setUploadFile(null);
        setUploadDescription('');
        alert('Document uploaded successfully');
      } else {
        const error = await response.json();
        alert('Failed to upload document: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error uploading document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/project-standards-documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDocuments();
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      alert('Error deleting document: ' + err.message);
    }
  };

  // Add new standard
  const handleAddStandard = async () => {
    if (!newEntry.value.trim()) {
      alert('Please enter a value');
      return;
    }

    try {
      const response = await fetch('/api/project-standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newEntry.category,
          value: newEntry.value,
          description: newEntry.description,
        }),
      });

      if (response.ok) {
        await fetchAllStandards();
        setNewEntry({ category: 'application_type', value: '', description: '' });
      } else {
        alert('Failed to add standard');
      }
    } catch (err) {
      alert('Error adding standard: ' + err.message);
    }
  };

  // Update standard
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
        setEditData({});
      } else {
        alert('Failed to update standard');
      }
    } catch (err) {
      alert('Error updating standard: ' + err.message);
    }
  };

  // Delete standard
  const handleDeleteStandard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this standard?')) {
      return;
    }

    try {
      const response = await fetch(`/api/project-standards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAllStandards();
      } else {
        alert('Failed to delete standard');
      }
    } catch (err) {
      alert('Error deleting standard: ' + err.message);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/project-standards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        await fetchAllStandards();
      } else {
        alert('Failed to update standard');
      }
    } catch (err) {
      alert('Error updating standard: ' + err.message);
    }
  };

  const filteredStandards = standards.filter(s => s.category === selectedCategory);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="heading-primary mb-2">Project Standards Management</h1>
          <p className="text-lodha-grey">Manage dropdown options and reference documents</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-lodha-sand border border-lodha-gold rounded text-lodha-black">
            Error: {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-lodha-gold/30">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('standards')}
              className={`px-6 py-3 font-jost font-semibold transition border-b-2 ${
                activeTab === 'standards'
                  ? 'border-lodha-gold text-lodha-gold'
                  : 'border-transparent text-lodha-grey hover:text-lodha-black'
              }`}
            >
              Dropdown Standards
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 font-jost font-semibold transition border-b-2 ${
                activeTab === 'documents'
                  ? 'border-lodha-gold text-lodha-gold'
                  : 'border-transparent text-lodha-grey hover:text-lodha-black'
              }`}
            >
              Reference Documents
            </button>
          </div>
        </div>

        {/* Standards Tab */}
        {activeTab === 'standards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Categories */}
            <div className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h2 className="heading-secondary mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`w-full text-left px-4 py-2 rounded transition ${
                      selectedCategory === cat.value
                        ? 'bg-lodha-gold text-white'
                        : 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80 border border-lodha-gold/30'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Add New Standard */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="heading-secondary mb-4">Add New Standard</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-jost font-semibold mb-2">Category</label>
                  <select
                    value={newEntry.category}
                    onChange={e => setNewEntry({ ...newEntry, category: e.target.value })}
                    className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-jost font-semibold mb-2">Value</label>
                  <input
                    type="text"
                    value={newEntry.value}
                    onChange={e => setNewEntry({ ...newEntry, value: e.target.value })}
                    placeholder="e.g., Residential, Penthouse, etc."
                    className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-jost font-semibold mb-2">Description</label>
                  <textarea
                    value={newEntry.description}
                    onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="e.g., Residential buildings"
                    rows="3"
                    className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  />
                </div>

                <button
                  onClick={handleAddStandard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded hover:bg-lodha-gold/90 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Standard
                </button>
              </div>
            </div>

            {/* Standards List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="heading-secondary mb-4">
                {categories.find(c => c.value === selectedCategory)?.label}
              </h2>

              {loading ? (
                <p className="text-lodha-black/70">Loading standards...</p>
              ) : filteredStandards.length === 0 ? (
                <p className="text-lodha-black/70">No standards in this category. Add one above.</p>
              ) : (
                <div className="space-y-3">
                  {filteredStandards.map(standard => (
                    <div
                      key={standard.id}
                      className="p-4 border border-lodha-gold/30 rounded-lg hover:bg-lodha-sand/30 transition bg-lodha-sand/50"
                    >
                      {editingId === standard.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editData[standard.id]?.value || standard.value}
                            onChange={e =>
                              setEditData({
                                ...editData,
                                [standard.id]: { ...editData[standard.id], value: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                          />
                          <textarea
                            value={editData[standard.id]?.description || standard.description}
                            onChange={e =>
                              setEditData({
                                ...editData,
                                [standard.id]: { ...editData[standard.id], description: e.target.value },
                              })
                            }
                            rows="2"
                            className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStandard(standard.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-1 bg-lodha-gold text-white rounded hover:bg-lodha-deep transition text-sm"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-1 bg-lodha-sand text-lodha-black rounded hover:bg-lodha-sand/80 transition text-sm border border-lodha-gold/30"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-jost font-semibold text-lodha-black">
                                {standard.value}
                              </h3>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  standard.is_active
                                    ? 'bg-lodha-sand text-lodha-black border border-lodha-gold'
                                    : 'bg-lodha-sand/60 text-lodha-black/70 border border-lodha-gold/20'
                                }`}
                              >
                                {standard.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {standard.description && (
                              <p className="text-sm text-lodha-grey mt-1">{standard.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => {
                                setEditingId(standard.id);
                                setEditData({
                                  ...editData,
                                  [standard.id]: {
                                    value: standard.value,
                                    description: standard.description,
                                  },
                                });
                              }}
                              className="p-2 text-lodha-gold hover:bg-lodha-gold/10 rounded transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(standard.id, standard.is_active)}
                              className={`p-2 rounded transition ${
                                standard.is_active
                                  ? 'text-lodha-gold hover:bg-lodha-sand/80'
                                  : 'text-lodha-black/50 hover:bg-lodha-sand/30'
                              }`}
                              title={standard.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStandard(standard.id)}
                              className="p-2 text-lodha-gold hover:bg-lodha-sand/80 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Document Categories */}
            <div className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h2 className="heading-secondary mb-4">Document Categories</h2>
              <div className="space-y-2">
                {documentCategories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedDocCategory(cat.value)}
                    className={`w-full text-left px-4 py-2 rounded transition ${
                      selectedDocCategory === cat.value
                        ? 'bg-lodha-gold text-white'
                        : 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80 border border-lodha-gold/30'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Document */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="heading-secondary mb-4">Upload Document</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-jost font-semibold mb-2">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                    >
                      {documentCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-jost font-semibold mb-2">File (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => setUploadFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                    />
                    {uploadFile && (
                      <p className="text-sm text-lodha-grey mt-2">
                        Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-jost font-semibold mb-2">Description</label>
                    <textarea
                      value={uploadDescription}
                      onChange={e => setUploadDescription(e.target.value)}
                      placeholder="Brief description of the document"
                      rows="3"
                      className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                    />
                  </div>

                  <button
                    onClick={handleFileUpload}
                    disabled={uploading || !uploadFile}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded hover:bg-lodha-gold/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </div>

              {/* Documents List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="heading-secondary mb-4">
                  {documentCategories.find(c => c.value === selectedDocCategory)?.label || 'Documents'}
                </h2>

                {documentsByCategory[selectedDocCategory]?.length === 0 || !documentsByCategory[selectedDocCategory] ? (
                  <p className="text-lodha-black/70">No documents in this category. Upload one above.</p>
                ) : (
                  <div className="space-y-3">
                    {documentsByCategory[selectedDocCategory]?.map(doc => (
                      <div
                        key={doc.id}
                        className="p-4 border border-lodha-gold/30 rounded-lg hover:bg-lodha-sand/30 transition bg-lodha-sand/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-lodha-gold" />
                              <h3 className="font-jost font-semibold text-lodha-black">
                                {doc.document_name}
                              </h3>
                            </div>
                            {doc.description && (
                              <p className="text-sm text-lodha-grey mt-2">{doc.description}</p>
                            )}
                            <div className="text-xs text-lodha-grey mt-2">
                              <p>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                              {doc.uploaded_by_name && <p>By: {doc.uploaded_by_name}</p>}
                              <p>Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-lodha-gold hover:bg-lodha-gold/10 rounded transition"
                              title="View/Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 text-lodha-gold hover:bg-lodha-sand/80 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-lodha-sand/50 border border-lodha-gold/30 rounded-lg p-4">
                <h3 className="font-jost font-semibold text-lodha-black mb-2">📚 About Reference Documents</h3>
                <p className="text-sm text-lodha-grey">
                  Upload company policies, local bylaws, IS codes, NBC codes, and other reference documents. 
                  Atelier AI will read and analyze these documents to:
                </p>
                <ul className="text-sm text-lodha-grey mt-2 ml-4 space-y-1">
                  <li>• Guide design calculations according to standards</li>
                  <li>• Answer questions based on uploaded documents</li>
                  <li>• Ensure compliance with regulations and policies</li>
                  <li>• Provide context-aware recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
