import { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle2, Clock, Filter, Search,
  ChevronDown, ChevronUp, Layers, Zap, Droplets,
  Flame, Wind, Shield, Radio, PenTool, Clipboard,
  Building2, AlertTriangle, Download
} from 'lucide-react';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

// Trade icons (matching DDSManagement)
const TRADE_ICONS = {
  'Electrical': Zap, 'PHE': Droplets, 'Plumbing': Droplets, 'Fire Fighting': Flame,
  'HVAC': Wind, 'Security': Shield, 'Lighting': Zap, 'Small Power': Zap,
  'Lightning Protection': Shield, 'Containment': Layers, 'FA & PA': Radio,
  'FAVA': Radio, 'ELV': Radio, 'Earthing': Zap, 'Lifts': Layers,
  'Co-ordinate': Clipboard, 'Builders Work': PenTool,
};

const TRADE_COLORS = {
  'Electrical': 'text-amber-600 bg-amber-50', 'PHE': 'text-blue-600 bg-blue-50',
  'Plumbing': 'text-blue-600 bg-blue-50', 'Fire Fighting': 'text-red-600 bg-red-50',
  'HVAC': 'text-teal-600 bg-teal-50', 'Security': 'text-purple-600 bg-purple-50',
  'Lighting': 'text-yellow-600 bg-yellow-50', 'Small Power': 'text-orange-600 bg-orange-50',
  'Lightning Protection': 'text-indigo-600 bg-indigo-50', 'Containment': 'text-gray-600 bg-gray-50',
  'FA & PA': 'text-pink-600 bg-pink-50', 'FAVA': 'text-pink-600 bg-pink-50',
  'ELV': 'text-cyan-600 bg-cyan-50', 'Earthing': 'text-amber-700 bg-amber-50',
  'Co-ordinate': 'text-sky-600 bg-sky-50', 'Builders Work': 'text-stone-600 bg-stone-50',
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-lodha-steel/20 text-lodha-grey', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-jost font-semibold ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function DDSDrawingList({ ddsId }) {
  const { userLevel } = useUser();
  const canEdit = ['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel);

  const [drawings, setDrawings] = useState([]);
  const [grouped, setGrouped] = useState({ VFC: {}, DD: {} });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeList, setActiveList] = useState('VFC');
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterTower, setFilterTower] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchDrawings = useCallback(async () => {
    if (!ddsId) return;
    try {
      setLoading(true);
      const data = await apiFetchJson(`/api/dds/${ddsId}/drawings`);
      setDrawings(data.drawings || []);
      setGrouped(data.grouped || { VFC: {}, DD: {} });
      setSummary(data.summary || null);
      // Auto-expand first category
      const cats = Object.keys(data.grouped?.[activeList] || {});
      if (cats.length > 0 && expandedCategories.size === 0) {
        setExpandedCategories(new Set(cats));
      }
    } catch (err) {
      toast.error('Failed to load drawing lists');
    } finally {
      setLoading(false);
    }
  }, [ddsId]);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  // When switching list type, expand all categories for that type
  useEffect(() => {
    const cats = Object.keys(grouped[activeList] || {});
    setExpandedCategories(new Set(cats));
  }, [activeList, grouped]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
  };

  // Filter drawings
  const currentGrouped = grouped[activeList] || {};
  const filteredGrouped = {};
  for (const [cat, items] of Object.entries(currentGrouped)) {
    const filtered = items.filter(d => {
      if (filterTrade !== 'All' && d.trade !== filterTrade) return false;
      if (filterTower !== 'All' && d.tower !== filterTower) return false;
      if (filterStatus !== 'All' && d.status !== filterStatus) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!d.description?.toLowerCase().includes(q) && !d.trade?.toLowerCase().includes(q) &&
            !d.level?.toLowerCase().includes(q) && !d.tower?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (filtered.length > 0) filteredGrouped[cat] = filtered;
  }

  const allFiltered = Object.values(filteredGrouped).flat();
  const trades = [...new Set(drawings.filter(d => d.list_type === activeList).map(d => d.trade))].sort();
  const towers = [...new Set(drawings.filter(d => d.list_type === activeList).map(d => d.tower).filter(Boolean))].sort();

  const vfcCount = drawings.filter(d => d.list_type === 'VFC').length;
  const ddCount = drawings.filter(d => d.list_type === 'DD').length;
  const vfcCompleted = drawings.filter(d => d.list_type === 'VFC' && d.status === 'completed').length;
  const ddCompleted = drawings.filter(d => d.list_type === 'DD' && d.status === 'completed').length;

  const handleComplete = async (id) => {
    try {
      await apiFetchJson(`/api/dds/drawings/${id}/complete`, { method: 'PUT' });
      toast.success('Drawing marked as completed');
      fetchDrawings();
    } catch (err) {
      toast.error('Failed to complete drawing');
    }
  };

  const handleEdit = (drawing) => {
    setEditingId(drawing.id);
    setEditForm({
      document_number: drawing.document_number || '',
      revision: drawing.revision || 'R0',
      paper_size: drawing.paper_size || '',
      drawing_scale: drawing.drawing_scale || '',
      remarks: drawing.remarks || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await apiFetchJson(`/api/dds/drawings/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      toast.success('Drawing updated');
      setEditingId(null);
      fetchDrawings();
    } catch (err) {
      toast.error('Failed to update drawing');
    }
  };

  const handleExportCSV = () => {
    const items = drawings.filter(d => d.list_type === activeList);
    if (items.length === 0) return;
    const headers = ['Sr.No', 'Trade', 'Doc Type', 'Tower', 'Level', 'Description', 'Document Number', 'Rev', 'Paper Size', 'Scale', 'DDS Date', 'Status', 'Remarks'];
    const rows = items.map(d => [
      d.sr_no, d.trade, d.doc_type, d.tower, d.level, d.description,
      d.document_number || '', d.revision || '', d.paper_size || '', d.drawing_scale || '',
      d.dds_date ? new Date(d.dds_date).toLocaleDateString() : '', d.status, d.remarks || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeList}_Drawing_List.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-lodha-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (drawings.length === 0) {
    return (
      <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
        <div className="w-14 h-14 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-lodha-gold" />
        </div>
        <h3 className="text-lg font-garamond font-bold text-lodha-grey mb-2">No Drawing Lists Generated</h3>
        <p className="text-sm text-lodha-grey/60 font-jost">
          Drawing lists are auto-generated when the DDS is created. Regenerate the DDS to create VFC and DD drawing lists.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* List type tabs + summary */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveList('VFC')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-jost font-semibold transition-colors ${
                activeList === 'VFC' ? 'bg-lodha-gold text-white' : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-steel/30'
              }`}
            >
              <Layers className="w-4 h-4" />
              VFC Drawing List
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${activeList === 'VFC' ? 'bg-white/20' : 'bg-lodha-steel/30'}`}>
                {vfcCompleted}/{vfcCount}
              </span>
            </button>
            <button
              onClick={() => setActiveList('DD')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-jost font-semibold transition-colors ${
                activeList === 'DD' ? 'bg-lodha-gold text-white' : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-steel/30'
              }`}
            >
              <FileText className="w-4 h-4" />
              DD Drawing List
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${activeList === 'DD' ? 'bg-white/20' : 'bg-lodha-steel/30'}`}>
                {ddCompleted}/{ddCount}
              </span>
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Summary bar */}
        <div className="mt-3 flex items-center gap-4 text-xs font-jost text-lodha-grey/60">
          <span>Total: <strong className="text-lodha-grey">{allFiltered.length}</strong></span>
          <span>Completed: <strong className="text-emerald-600">{allFiltered.filter(d => d.status === 'completed').length}</strong></span>
          <span>Pending: <strong className="text-amber-600">{allFiltered.filter(d => d.status !== 'completed').length}</strong></span>
          {towers.length > 1 && <span>Towers: <strong className="text-lodha-grey">{towers.length}</strong></span>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey" />
            <input type="text" placeholder="Search drawings..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-lodha-grey/60 hidden sm:block" />
            {towers.length > 1 && (
              <select value={filterTower} onChange={(e) => setFilterTower(e.target.value)}
                className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                <option value="All">All Towers</option>
                {towers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)}
              className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
              <option value="All">All Trades</option>
              {trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drawing list grouped by category */}
      <div className="space-y-4">
        {Object.entries(filteredGrouped).sort().map(([category, items]) => {
          const isExpanded = expandedCategories.has(category);
          const completed = items.filter(d => d.status === 'completed').length;
          return (
            <div key={category} className="bg-white border border-lodha-steel rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-5 py-3 flex items-center justify-between bg-lodha-cream border-b border-lodha-muted-gold/30 hover:bg-lodha-sand transition-colors"
              >
                <h3 className="font-garamond text-base font-bold text-lodha-grey flex items-center gap-2">
                  <FileText className="w-4 h-4 text-lodha-gold" />
                  {category}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-jost text-lodha-grey/60">
                    {completed}/{items.length} completed
                  </span>
                  <div className="w-16 h-1.5 bg-lodha-steel/20 rounded-full overflow-hidden">
                    <div className="h-full bg-lodha-gold rounded-full" style={{ width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%` }} />
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-lodha-grey/40" /> : <ChevronDown className="w-4 h-4 text-lodha-grey/40" />}
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-lodha-sand/50 text-xs font-jost text-lodha-grey/70">
                        <th className="px-4 py-2 text-left w-12">Sr.</th>
                        <th className="px-4 py-2 text-left w-28">Trade</th>
                        <th className="px-4 py-2 text-left w-20">Type</th>
                        <th className="px-4 py-2 text-left w-24">Tower</th>
                        <th className="px-4 py-2 text-left w-36">Level</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-left w-32">Doc Number</th>
                        <th className="px-4 py-2 text-left w-14">Rev</th>
                        <th className="px-4 py-2 text-left w-24">DDS Date</th>
                        <th className="px-4 py-2 text-center w-24">Status</th>
                        {canEdit && <th className="px-4 py-2 text-center w-20">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lodha-steel/20">
                      {items.map((d) => {
                        const TIcon = TRADE_ICONS[d.trade] || FileText;
                        const tradeColor = TRADE_COLORS[d.trade] || 'text-lodha-grey bg-lodha-sand';
                        const isEditing = editingId === d.id;

                        return (
                          <tr key={d.id} className="hover:bg-lodha-sand/30 transition-colors">
                            <td className="px-4 py-2 text-lodha-grey/60 font-jost">{d.sr_no}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${tradeColor}`}>
                                <TIcon className="w-3 h-3" />
                                {d.trade}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-lodha-grey/60 font-jost text-xs">{d.doc_type}</td>
                            <td className="px-4 py-2 font-jost text-xs text-lodha-grey">{d.tower || '—'}</td>
                            <td className="px-4 py-2 font-jost text-xs text-lodha-grey">{d.level || '—'}</td>
                            <td className="px-4 py-2 font-jost text-sm text-lodha-grey">{d.description}</td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <input value={editForm.document_number} onChange={(e) => setEditForm(prev => ({ ...prev, document_number: e.target.value }))}
                                  className="w-full px-2 py-1 border border-lodha-steel rounded text-xs font-jost" placeholder="Doc #" />
                              ) : (
                                <span className="font-jost text-xs text-lodha-grey/70">{d.document_number || '—'}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-jost text-xs text-lodha-grey/60">
                              {isEditing ? (
                                <input value={editForm.revision} onChange={(e) => setEditForm(prev => ({ ...prev, revision: e.target.value }))}
                                  className="w-14 px-1 py-1 border border-lodha-steel rounded text-xs font-jost" />
                              ) : (
                                d.revision || 'R0'
                              )}
                            </td>
                            <td className="px-4 py-2 font-jost text-xs text-lodha-grey/60">
                              {d.dds_date ? new Date(d.dds_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <StatusBadge status={d.status} />
                            </td>
                            {canEdit && (
                              <td className="px-4 py-2 text-center">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <button onClick={handleSaveEdit}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Save">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                      className="p-1 text-lodha-grey/50 hover:bg-lodha-sand rounded transition-colors text-xs font-semibold">
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 justify-center">
                                    {d.status !== 'completed' && (
                                      <button onClick={() => handleComplete(d.id)}
                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Mark Complete">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button onClick={() => handleEdit(d)}
                                      className="p-1 text-lodha-grey/50 hover:bg-lodha-sand rounded transition-colors" title="Edit">
                                      <PenTool className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(filteredGrouped).length === 0 && (
          <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
            <p className="text-lodha-grey/60 font-jost">
              {searchTerm || filterTrade !== 'All' || filterTower !== 'All' || filterStatus !== 'All'
                ? 'No drawings match your filters'
                : `No ${activeList} drawings found`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
