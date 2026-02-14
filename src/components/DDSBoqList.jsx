import { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle2, Clock, Filter, Search,
  ChevronDown, ChevronUp, Download, Edit3, Save, X,
  Package, DollarSign, AlertTriangle, RefreshCw,
  Zap, Droplets, Flame, Wind, Shield, Radio, Layers,
  PenTool, Clipboard, Building2
} from 'lucide-react';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

const TRADE_ICONS = {
  'Electrical': Zap, 'PHE': Droplets, 'Plumbing': Droplets, 'Fire Fighting': Flame,
  'HVAC': Wind, 'Security': Shield, 'Lighting': Zap, 'Small Power': Zap,
  'Earthing': Zap, 'FAVA': Radio, 'ELV': Radio, 'Lifts': Layers,
  'DG': Zap, 'STP': Droplets, 'OWC': Package, 'Solar Hot Water': Flame,
};

const TRADE_COLORS = {
  'Electrical': 'text-amber-600 bg-amber-50 border-amber-200',
  'PHE': 'text-blue-600 bg-blue-50 border-blue-200',
  'Fire Fighting': 'text-red-600 bg-red-50 border-red-200',
  'HVAC': 'text-teal-600 bg-teal-50 border-teal-200',
  'Security': 'text-purple-600 bg-purple-50 border-purple-200',
  'FAVA': 'text-pink-600 bg-pink-50 border-pink-200',
  'ELV': 'text-cyan-600 bg-cyan-50 border-cyan-200',
  'Earthing': 'text-amber-700 bg-amber-50 border-amber-200',
  'Lifts': 'text-violet-600 bg-violet-50 border-violet-200',
  'DG': 'text-orange-600 bg-orange-50 border-orange-200',
  'STP': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'OWC': 'text-lime-600 bg-lime-50 border-lime-200',
  'Solar Hot Water': 'text-yellow-600 bg-yellow-50 border-yellow-200',
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-lodha-steel/20 text-lodha-grey', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: FileText },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-jost font-semibold ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function DDSBoqList({ ddsId }) {
  const { userLevel } = useUser();
  const canEdit = ['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel);

  const [items, setItems] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterBuilding, setFilterBuilding] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTrades, setExpandedTrades] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchBoq = useCallback(async () => {
    if (!ddsId) return;
    try {
      setLoading(true);
      const data = await apiFetchJson(`/api/dds/${ddsId}/boq`);
      setItems(data.items || []);
      setGrouped(data.grouped || {});
      setSummary(data.summary || null);
      if (Object.keys(data.grouped || {}).length > 0 && expandedTrades.size === 0) {
        setExpandedTrades(new Set(Object.keys(data.grouped)));
      }
    } catch (err) {
      toast.error('Failed to load BOQ');
    } finally {
      setLoading(false);
    }
  }, [ddsId]);

  useEffect(() => { fetchBoq(); }, [fetchBoq]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await apiFetchJson(`/api/dds/${ddsId}/boq/generate`, { method: 'POST' });
      toast.success('BOQ generated from tender trades');
      fetchBoq();
    } catch (err) {
      toast.error(err.message || 'Failed to generate BOQ');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Delete existing BOQ and regenerate? All quantities and rates will be lost.')) return;
    try {
      setGenerating(true);
      await apiFetchJson(`/api/dds/${ddsId}/boq`, { method: 'DELETE' });
      await apiFetchJson(`/api/dds/${ddsId}/boq/generate`, { method: 'POST' });
      toast.success('BOQ regenerated');
      setExpandedTrades(new Set());
      fetchBoq();
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate BOQ');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTrade = (trade) => {
    setExpandedTrades(prev => {
      const n = new Set(prev);
      n.has(trade) ? n.delete(trade) : n.add(trade);
      return n;
    });
  };

  // Filter items
  const filteredGrouped = {};
  for (const [trade, tradeItems] of Object.entries(grouped)) {
    if (filterTrade !== 'All' && trade !== filterTrade) continue;
    const filtered = tradeItems.filter(item => {
      if (filterBuilding !== 'All' && item.building_name !== filterBuilding) return false;
      if (filterStatus !== 'All' && item.status !== filterStatus) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!item.description?.toLowerCase().includes(q) && !item.trade?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (filtered.length > 0) filteredGrouped[trade] = filtered;
  }

  const allFiltered = Object.values(filteredGrouped).flat();
  const trades = summary?.trades || [];
  const buildings = summary?.buildings || [];

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity || '',
      rate: item.rate || '',
      unit: item.unit || '',
      specification: item.specification || '',
      status: item.status || 'draft',
      remarks: item.remarks || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await apiFetchJson(`/api/dds/boq/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      toast.success('BOQ item updated');
      setEditingId(null);
      fetchBoq();
    } catch (err) {
      toast.error('Failed to update BOQ item');
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['Sr.No', 'Trade', 'Description', 'Building', 'Unit', 'Quantity', 'Rate', 'Amount', 'Status', 'Specification', 'Remarks'];
    const rows = items.map(b => [
      b.sr_no, b.trade, b.description, b.building_name || '',
      b.unit || '', b.quantity || '', b.rate || '', b.amount || '',
      b.status, b.specification || '', b.remarks || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOQ_List.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val) => {
    if (!val) return '—';
    return '₹' + parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-lodha-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
        <div className="w-14 h-14 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7 text-lodha-gold" />
        </div>
        <h3 className="text-lg font-garamond font-bold text-lodha-grey mb-2">No BOQ Generated</h3>
        <p className="text-sm text-lodha-grey/60 font-jost mb-6">
          Generate a Bill of Quantities based on MEP tender trades — Electrical, PHE, Fire Fighting, HVAC, Security, FAVA, ELV, and more.
        </p>
        {canEdit && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</span>
            ) : (
              <span className="flex items-center gap-2"><Package className="w-4 h-4" /> Generate BOQ</span>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm font-jost">
            <span className="font-garamond text-lg font-bold text-lodha-grey flex items-center gap-2">
              <Package className="w-5 h-5 text-lodha-gold" /> Bill of Quantities
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Regenerate
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-lodha-sand rounded-lg p-2.5 text-center">
            <p className="text-lg font-garamond font-bold text-lodha-grey">{summary?.total || 0}</p>
            <p className="text-xs text-lodha-grey/60 font-jost">Total Items</p>
          </div>
          <div className="bg-lodha-sand rounded-lg p-2.5 text-center">
            <p className="text-lg font-garamond font-bold text-lodha-grey">{summary?.draft || 0}</p>
            <p className="text-xs text-lodha-grey/60 font-jost">Draft</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-garamond font-bold text-blue-700">{summary?.submitted || 0}</p>
            <p className="text-xs text-blue-600/60 font-jost">Submitted</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-garamond font-bold text-emerald-700">{summary?.approved || 0}</p>
            <p className="text-xs text-emerald-600/60 font-jost">Approved</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-garamond font-bold text-amber-700">{formatCurrency(summary?.totalAmount)}</p>
            <p className="text-xs text-amber-600/60 font-jost">Total Amount</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey" />
            <input type="text" placeholder="Search BOQ items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-lodha-grey/60 hidden sm:block" />
            <select value={filterTrade} onChange={e => setFilterTrade(e.target.value)}
              className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
              <option value="All">All Trades</option>
              {trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
              className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
              <option value="All">All Buildings</option>
              {buildings.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
              <option value="All">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* BOQ items grouped by trade */}
      <div className="space-y-3">
        {Object.entries(filteredGrouped).sort().map(([trade, tradeItems]) => {
          const TIcon = TRADE_ICONS[trade] || FileText;
          const colors = TRADE_COLORS[trade] || 'text-lodha-grey bg-lodha-sand border-lodha-steel';
          const isExpanded = expandedTrades.has(trade);
          const tradeTotal = tradeItems.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

          return (
            <div key={trade} className="bg-white border border-lodha-steel rounded-xl overflow-hidden">
              <button
                onClick={() => toggleTrade(trade)}
                className={`w-full border-b px-5 py-3 flex items-center justify-between ${colors}`}
              >
                <h3 className="font-jost font-semibold text-sm flex items-center gap-2">
                  <TIcon className="w-4 h-4" /> {trade}
                  <span className="text-xs font-normal opacity-60">({tradeItems.length} items)</span>
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-jost font-semibold">{formatCurrency(tradeTotal)}</span>
                  <span className="text-xs font-jost">
                    {tradeItems.filter(i => i.status === 'approved').length}/{tradeItems.length} approved
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-lodha-sand/50 border-b border-lodha-steel/20">
                        <th className="px-4 py-2 text-left font-jost font-semibold text-lodha-grey/70 text-xs w-12">#</th>
                        <th className="px-4 py-2 text-left font-jost font-semibold text-lodha-grey/70 text-xs">Description</th>
                        <th className="px-4 py-2 text-left font-jost font-semibold text-lodha-grey/70 text-xs w-20">Building</th>
                        <th className="px-4 py-2 text-center font-jost font-semibold text-lodha-grey/70 text-xs w-16">Unit</th>
                        <th className="px-4 py-2 text-right font-jost font-semibold text-lodha-grey/70 text-xs w-20">Qty</th>
                        <th className="px-4 py-2 text-right font-jost font-semibold text-lodha-grey/70 text-xs w-24">Rate (₹)</th>
                        <th className="px-4 py-2 text-right font-jost font-semibold text-lodha-grey/70 text-xs w-28">Amount (₹)</th>
                        <th className="px-4 py-2 text-center font-jost font-semibold text-lodha-grey/70 text-xs w-24">Status</th>
                        <th className="px-4 py-2 text-center font-jost font-semibold text-lodha-grey/70 text-xs w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lodha-steel/10">
                      {tradeItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-lodha-sand/20 transition-colors">
                          {editingId === item.id ? (
                            <>
                              <td className="px-4 py-2 text-xs text-lodha-grey/50">{idx + 1}</td>
                              <td className="px-4 py-2 text-xs text-lodha-grey">{item.description}</td>
                              <td className="px-4 py-2 text-xs text-lodha-grey/60">{item.building_name || '—'}</td>
                              <td className="px-2 py-1">
                                <input type="text" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})}
                                  className="w-full px-2 py-1 text-xs border border-lodha-steel rounded text-center" />
                              </td>
                              <td className="px-2 py-1">
                                <input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                                  className="w-full px-2 py-1 text-xs border border-lodha-steel rounded text-right" />
                              </td>
                              <td className="px-2 py-1">
                                <input type="number" value={editForm.rate} onChange={e => setEditForm({...editForm, rate: e.target.value})}
                                  className="w-full px-2 py-1 text-xs border border-lodha-steel rounded text-right" />
                              </td>
                              <td className="px-4 py-2 text-right text-xs font-semibold text-lodha-grey">
                                {editForm.quantity && editForm.rate
                                  ? formatCurrency(parseFloat(editForm.quantity) * parseFloat(editForm.rate))
                                  : '—'}
                              </td>
                              <td className="px-2 py-1">
                                <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                                  className="w-full px-1 py-1 text-xs border border-lodha-steel rounded">
                                  <option value="draft">Draft</option>
                                  <option value="submitted">Submitted</option>
                                  <option value="approved">Approved</option>
                                </select>
                              </td>
                              <td className="px-2 py-1">
                                <div className="flex items-center gap-1 justify-center">
                                  <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2 text-xs text-lodha-grey/50">{idx + 1}</td>
                              <td className="px-4 py-2 text-xs text-lodha-grey font-medium">{item.description}</td>
                              <td className="px-4 py-2 text-xs text-lodha-grey/60">{item.building_name || '—'}</td>
                              <td className="px-4 py-2 text-xs text-center text-lodha-grey/60">{item.unit || '—'}</td>
                              <td className="px-4 py-2 text-xs text-right text-lodha-grey">{item.quantity || '—'}</td>
                              <td className="px-4 py-2 text-xs text-right text-lodha-grey">{item.rate ? formatCurrency(item.rate) : '—'}</td>
                              <td className="px-4 py-2 text-xs text-right font-semibold text-lodha-grey">{item.amount ? formatCurrency(item.amount) : '—'}</td>
                              <td className="px-4 py-2 text-center"><StatusBadge status={item.status} /></td>
                              <td className="px-4 py-2 text-center">
                                {canEdit && (
                                  <button onClick={() => handleEdit(item)} className="p-1 text-lodha-grey/40 hover:text-lodha-gold hover:bg-lodha-sand rounded transition-colors">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    {tradeItems.length > 0 && (
                      <tfoot>
                        <tr className="bg-lodha-sand/30 border-t border-lodha-steel/30">
                          <td colSpan="6" className="px-4 py-2 text-xs font-jost font-semibold text-lodha-grey text-right">Trade Total:</td>
                          <td className="px-4 py-2 text-xs text-right font-garamond font-bold text-lodha-grey">{formatCurrency(tradeTotal)}</td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(filteredGrouped).length === 0 && (
          <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
            <p className="text-lodha-grey/60 font-jost">No BOQ items match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
