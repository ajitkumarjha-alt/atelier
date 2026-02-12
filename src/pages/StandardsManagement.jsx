import { useState, useEffect, useCallback } from 'react';
import {
  Database, BookOpen, Zap, Droplets, Flame, Wind, Shield,
  Plus, Edit3, Trash2, Save, X, Search, ChevronDown, ChevronUp,
  Upload, FileText, Settings, Calculator, Download
} from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'calc-standards', label: 'Calculation Standards', icon: Calculator },
  { id: 'transformer', label: 'Transformer Ratings', icon: Zap },
  { id: 'phe', label: 'PHE Standards', icon: Droplets },
  { id: 'fire', label: 'Fire Standards', icon: Flame },
  { id: 'population', label: 'Population Standards', icon: Settings },
  { id: 'ev', label: 'EV Standards', icon: Shield },
  { id: 'dds-policies', label: 'DDS Policies', icon: BookOpen },
  { id: 'reference-docs', label: 'Reference Documents', icon: FileText },
];

function StandardsTable({ data, columns, onEdit, onDelete, canEdit }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
        <Database className="w-12 h-12 text-lodha-grey/30 mx-auto mb-3" />
        <p className="text-lodha-grey/60 font-jost">No standards found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-lodha-steel rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-lodha-cream border-b border-lodha-muted-gold/30">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
              {canEdit && <th className="px-4 py-3 text-right text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-lodha-steel/20">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-lodha-sand/30 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm font-jost text-lodha-grey">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(row)} className="p-1.5 text-lodha-gold hover:bg-lodha-gold/10 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(row.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StandardsManagement() {
  const { userLevel } = useUser();
  const canEdit = ['L1', 'SUPER_ADMIN'].includes(userLevel);

  const [activeTab, setActiveTab] = useState('calc-standards');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  const endpoints = {
    'calc-standards': '/api/standards/calculation-standards',
    'transformer': '/api/standards/transformer-ratings',
    'phe': '/api/standards/phe-standards',
    'fire': '/api/standards/fire-standards',
    'population': '/api/standards/population-standards',
    'ev': '/api/standards/ev-standards',
    'dds-policies': '/api/standards/dds-policies',
    'reference-docs': '/api/standards/reference-documents',
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiFetchJson(endpoints[activeTab]);
      setData(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const endpoint = endpoints[activeTab];
      if (editItem) {
        await apiFetchJson(`${endpoint}/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Updated successfully');
      } else {
        await apiFetchJson(endpoint, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Created successfully');
      }
      setShowForm(false);
      setEditItem(null);
      setFormData({});
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      await apiFetchJson(`${endpoints[activeTab]}/${id}`, { method: 'DELETE' });
      toast.success('Deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormData({});
    setShowForm(true);
  };

  // Column configs per tab
  const getColumns = () => {
    switch (activeTab) {
      case 'calc-standards':
        return [
          { key: 'name', label: 'Standard Name' },
          { key: 'category', label: 'Category' },
          { key: 'discipline', label: 'Discipline' },
          { key: 'value', label: 'Value' },
          { key: 'unit', label: 'Unit' },
          { key: 'is_active', label: 'Status', render: (v) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-lodha-steel/20 text-lodha-grey'}`}>
              {v ? 'Active' : 'Inactive'}
            </span>
          )},
        ];
      case 'transformer':
        return [
          { key: 'capacity_kva', label: 'Capacity (kVA)' },
          { key: 'type', label: 'Type' },
          { key: 'voltage_primary', label: 'Primary (V)' },
          { key: 'voltage_secondary', label: 'Secondary (V)' },
          { key: 'impedance_pct', label: 'Impedance (%)' },
          { key: 'is_active', label: 'Status', render: (v) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-lodha-steel/20 text-lodha-grey'}`}>
              {v ? 'Active' : 'Inactive'}
            </span>
          )},
        ];
      case 'phe':
        return [
          { key: 'fixture_type', label: 'Fixture Type' },
          { key: 'fixture_unit', label: 'Fixture Unit' },
          { key: 'flow_rate_lps', label: 'Flow Rate (LPS)' },
          { key: 'min_pressure_m', label: 'Min Pressure (m)' },
          { key: 'pipe_size_mm', label: 'Pipe Size (mm)' },
        ];
      case 'fire':
        return [
          { key: 'system_type', label: 'System Type' },
          { key: 'area_coverage_sqm', label: 'Coverage (sqm)' },
          { key: 'flow_rate_lpm', label: 'Flow Rate (LPM)' },
          { key: 'pressure_bar', label: 'Pressure (bar)' },
          { key: 'nozzle_factor', label: 'Nozzle Factor' },
        ];
      case 'population':
        return [
          { key: 'building_type', label: 'Building Type' },
          { key: 'area_per_person_sqm', label: 'Area/Person (sqm)' },
          { key: 'occupancy_factor', label: 'Occupancy Factor' },
          { key: 'diversity_factor', label: 'Diversity Factor' },
        ];
      case 'ev':
        return [
          { key: 'charger_type', label: 'Charger Type' },
          { key: 'power_kw', label: 'Power (kW)' },
          { key: 'voltage', label: 'Voltage (V)' },
          { key: 'connector_type', label: 'Connector' },
          { key: 'min_parking_pct', label: 'Min Parking (%)' },
        ];
      case 'dds-policies':
        return [
          { key: 'policy_name', label: 'Policy Name' },
          { key: 'discipline', label: 'Discipline' },
          { key: 'stage', label: 'Stage' },
          { key: 'is_active', label: 'Status', render: (v) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-lodha-steel/20 text-lodha-grey'}`}>
              {v ? 'Active' : 'Inactive'}
            </span>
          )},
        ];
      case 'reference-docs':
        return [
          { key: 'title', label: 'Document Title' },
          { key: 'document_type', label: 'Type' },
          { key: 'discipline', label: 'Discipline' },
          { key: 'version', label: 'Version' },
          { key: 'uploaded_at', label: 'Uploaded', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
        ];
      default:
        return [];
    }
  };

  // Form fields per tab
  const getFormFields = () => {
    switch (activeTab) {
      case 'calc-standards':
        return [
          { key: 'name', label: 'Standard Name', type: 'text', required: true },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'discipline', label: 'Discipline', type: 'select', options: ['Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security'] },
          { key: 'value', label: 'Value', type: 'text' },
          { key: 'unit', label: 'Unit', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'is_active', label: 'Active', type: 'checkbox' },
        ];
      case 'transformer':
        return [
          { key: 'capacity_kva', label: 'Capacity (kVA)', type: 'number', required: true },
          { key: 'type', label: 'Type', type: 'select', options: ['Oil Type', 'Dry Type', 'Cast Resin'] },
          { key: 'voltage_primary', label: 'Primary Voltage (V)', type: 'number' },
          { key: 'voltage_secondary', label: 'Secondary Voltage (V)', type: 'number' },
          { key: 'impedance_pct', label: 'Impedance (%)', type: 'number' },
          { key: 'is_active', label: 'Active', type: 'checkbox' },
        ];
      case 'phe':
        return [
          { key: 'fixture_type', label: 'Fixture Type', type: 'text', required: true },
          { key: 'fixture_unit', label: 'Fixture Unit', type: 'number' },
          { key: 'flow_rate_lps', label: 'Flow Rate (LPS)', type: 'number' },
          { key: 'min_pressure_m', label: 'Min Pressure (m)', type: 'number' },
          { key: 'pipe_size_mm', label: 'Pipe Size (mm)', type: 'number' },
        ];
      case 'fire':
        return [
          { key: 'system_type', label: 'System Type', type: 'text', required: true },
          { key: 'area_coverage_sqm', label: 'Area Coverage (sqm)', type: 'number' },
          { key: 'flow_rate_lpm', label: 'Flow Rate (LPM)', type: 'number' },
          { key: 'pressure_bar', label: 'Pressure (bar)', type: 'number' },
          { key: 'nozzle_factor', label: 'Nozzle Factor', type: 'number' },
        ];
      case 'population':
        return [
          { key: 'building_type', label: 'Building Type', type: 'text', required: true },
          { key: 'area_per_person_sqm', label: 'Area/Person (sqm)', type: 'number' },
          { key: 'occupancy_factor', label: 'Occupancy Factor', type: 'number' },
          { key: 'diversity_factor', label: 'Diversity Factor', type: 'number' },
        ];
      case 'ev':
        return [
          { key: 'charger_type', label: 'Charger Type', type: 'text', required: true },
          { key: 'power_kw', label: 'Power (kW)', type: 'number' },
          { key: 'voltage', label: 'Voltage (V)', type: 'number' },
          { key: 'connector_type', label: 'Connector Type', type: 'text' },
          { key: 'min_parking_pct', label: 'Min Parking (%)', type: 'number' },
        ];
      case 'dds-policies':
        return [
          { key: 'policy_name', label: 'Policy Name', type: 'text', required: true },
          { key: 'discipline', label: 'Discipline', type: 'select', options: ['Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security', 'All'] },
          { key: 'stage', label: 'Stage', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'is_active', label: 'Active', type: 'checkbox' },
        ];
      case 'reference-docs':
        return [
          { key: 'title', label: 'Document Title', type: 'text', required: true },
          { key: 'document_type', label: 'Type', type: 'select', options: ['IS Code', 'NBC', 'MSEDCL', 'ASHRAE', 'NFPA', 'Internal', 'Other'] },
          { key: 'discipline', label: 'Discipline', type: 'select', options: ['Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security', 'General'] },
          { key: 'version', label: 'Version', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ];
      default:
        return [];
    }
  };

  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(v =>
      String(v).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="heading-primary">Standards Management</h1>
            <p className="page-subtitle">Manage calculation standards, ratings, and reference documents</p>
          </div>
          {canEdit && (
            <button onClick={handleAdd} className="flex items-center gap-2 px-5 py-2.5 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors">
              <Plus className="w-4 h-4" /> Add Standard
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex bg-white border border-lodha-steel rounded-xl p-1 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-jost font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-lodha-gold text-white shadow-sm'
                    : 'text-lodha-grey hover:bg-lodha-sand'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey/40" />
          <input
            type="text"
            placeholder="Search standards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
          />
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-lodha-gold border-t-transparent rounded-full" />
        </div>
      ) : (
        <StandardsTable
          data={filteredData}
          columns={getColumns()}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
        />
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-4">
              {editItem ? 'Edit Standard' : 'Add Standard'}
            </h3>
            <div className="space-y-4">
              {getFormFields().map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
                    >
                      <option value="">Select</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData[field.key] || false}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                        className="w-4 h-4 text-lodha-gold border-lodha-steel rounded focus:ring-lodha-gold"
                      />
                      <span className="text-sm font-jost text-lodha-grey">Enabled</span>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value })}
                      className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditItem(null); setFormData({}); }} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-lodha-gold text-white text-sm font-jost font-semibold rounded-lg hover:bg-lodha-grey transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" /> {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
