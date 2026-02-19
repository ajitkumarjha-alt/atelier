import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, CheckCircle2, Clock, Search,
  ChevronDown, ChevronRight, Layers, Zap, Droplets,
  Flame, Wind, Shield, Radio, PenTool, Clipboard,
  Building2, Download, X, Edit3, Filter
} from 'lucide-react';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

/* ─── Config ─── */
const TRADE_ICONS = {
  'Electrical': Zap, 'PHE': Droplets, 'Plumbing': Droplets, 'Fire Fighting': Flame,
  'HVAC': Wind, 'Security': Shield, 'Lighting': Zap, 'Small Power': Zap,
  'Lightning Protection': Shield, 'Containment': Layers, 'FA & PA': Radio,
  'FAVA': Radio, 'ELV': Radio, 'Earthing': Zap, 'Lifts': Layers,
  'Co-ordinate': Clipboard, 'Builders Work': PenTool, 'Architecture': Building2,
  'Structure': Building2, 'Interior Design': PenTool,
};

const TRADE_CLS = {
  'Electrical': 'text-amber-600', 'PHE': 'text-blue-600', 'Plumbing': 'text-blue-600',
  'Fire Fighting': 'text-red-600', 'HVAC': 'text-teal-600', 'Security': 'text-purple-600',
  'Lighting': 'text-yellow-600', 'Small Power': 'text-orange-600',
  'Lightning Protection': 'text-indigo-600', 'Containment': 'text-gray-600',
  'FA & PA': 'text-pink-600', 'FAVA': 'text-pink-600', 'ELV': 'text-cyan-600',
  'Earthing': 'text-amber-700', 'Co-ordinate': 'text-sky-600',
  'Builders Work': 'text-stone-600', 'Architecture': 'text-emerald-700',
  'Structure': 'text-slate-600', 'Interior Design': 'text-rose-600',
};

const STATUS_DOT = {
  pending:   { dot: 'bg-slate-300', ring: 'ring-slate-200', label: 'Pending' },
  completed: { dot: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Completed' },
};

const dateFmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

/** Strip tower suffix from description: "Fire Fighting Layout - GROUND floor - T1" → "Fire Fighting Layout - GROUND floor" */
function baseDesc(description, towerName) {
  if (!towerName || !description) return description || '';
  const suffix = new RegExp('\\s*[-–]\\s*' + towerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
  return description.replace(suffix, '');
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 md:w-20 h-1.5 bg-lodha-steel/15 rounded-full overflow-hidden">
        <div className="h-full bg-lodha-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-jost font-semibold text-lodha-grey/40 w-7 text-right">{pct}%</span>
    </div>
  );
}

/* ─── Component ─── */
export default function DDSDrawingList({ ddsId }) {
  const { userLevel } = useUser();
  const canEdit = ['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel);

  const [drawings, setDrawings] = useState([]);
  const [grouped, setGrouped] = useState({ VFC: {}, DD: {} });
  const [loading, setLoading] = useState(true);

  const [activeList, setActiveList] = useState('VFC');
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterTower, setFilterTower] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  /* ─── Fetch ─── */
  const fetchDrawings = useCallback(async () => {
    if (!ddsId) return;
    try {
      setLoading(true);
      const data = await apiFetchJson(`/api/dds/${ddsId}/drawings`);
      setDrawings(data.drawings || []);
      setGrouped(data.grouped || { VFC: {}, DD: {} });
      const cats = Object.keys(data.grouped?.[activeList] || {});
      if (cats.length > 0) setExpandedCats(new Set([cats[0]]));
    } catch { toast.error('Failed to load drawing lists'); }
    finally { setLoading(false); }
  }, [ddsId]);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  useEffect(() => {
    const cats = Object.keys(grouped[activeList] || {});
    if (cats.length > 0) setExpandedCats(new Set([cats[0]]));
  }, [activeList, grouped]);

  const toggleCat = (c) => setExpandedCats(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleRow = (k) => setExpandedRows(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  /* ─── Derived ─── */
  const towers = useMemo(() => [...new Set(drawings.filter(d => d.list_type === activeList).map(d => d.tower).filter(Boolean))].sort(), [drawings, activeList]);
  const isMultiTower = towers.length > 1;
  const trades = useMemo(() => [...new Set(drawings.filter(d => d.list_type === activeList).map(d => d.trade).filter(Boolean))].sort(), [drawings, activeList]);

  const currentGrouped = grouped[activeList] || {};

  const filteredGrouped = useMemo(() => {
    const result = {};
    for (const [cat, items] of Object.entries(currentGrouped)) {
      const filtered = items.filter(d => {
        if (filterTrade !== 'All' && d.trade !== filterTrade) return false;
        if (filterTower !== 'All' && d.tower !== filterTower) return false;
        if (filterStatus !== 'All' && d.status !== filterStatus) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          if (!d.description?.toLowerCase().includes(q) && !(d.trade || '').toLowerCase().includes(q) &&
              !(d.level || '').toLowerCase().includes(q) && !(d.tower || '').toLowerCase().includes(q)) return false;
        }
        return true;
      });
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [currentGrouped, filterTrade, filterTower, filterStatus, searchTerm]);

  /** Matrix grouping for multi-tower: rows = base description (tower suffix stripped) + level + trade, columns = towers */
  const matrixGrouped = useMemo(() => {
    if (!isMultiTower) return null;
    const result = {};
    for (const [cat, items] of Object.entries(filteredGrouped)) {
      const rowMap = {};
      for (const d of items) {
        const base = baseDesc(d.description, d.tower);
        const key = `${base}||${d.level || ''}||${d.trade || ''}`;
        if (!rowMap[key]) rowMap[key] = { description: base, level: d.level, trade: d.trade, doc_type: d.doc_type, towers: {} };
        rowMap[key].towers[d.tower || '_proj'] = d;
      }
      result[cat] = Object.values(rowMap);
    }
    return result;
  }, [filteredGrouped, isMultiTower]);

  const allFiltered = Object.values(filteredGrouped).flat();
  const vfcAll = drawings.filter(d => d.list_type === 'VFC');
  const ddAll = drawings.filter(d => d.list_type === 'DD');
  const vfcDone = vfcAll.filter(d => d.status === 'completed').length;
  const ddDone = ddAll.filter(d => d.status === 'completed').length;
  const filtDone = allFiltered.filter(d => d.status === 'completed').length;
  const filtTotal = allFiltered.length;
  const overallPct = filtTotal > 0 ? Math.round((filtDone / filtTotal) * 100) : 0;

  /* ─── Actions ─── */
  const handleComplete = async (id) => {
    try {
      await apiFetchJson(`/api/dds/drawings/${id}/complete`, { method: 'PUT' });
      toast.success('Marked complete'); fetchDrawings();
    } catch { toast.error('Failed'); }
  };

  const openEdit = (d) => {
    setEditModal(d);
    setEditForm({ document_number: d.document_number || '', revision: d.revision || 'R0', paper_size: d.paper_size || '', drawing_scale: d.drawing_scale || '', remarks: d.remarks || '' });
  };

  const saveEdit = async () => {
    try {
      await apiFetchJson(`/api/dds/drawings/${editModal.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      toast.success('Updated'); setEditModal(null); fetchDrawings();
    } catch { toast.error('Failed to update'); }
  };

  const exportCSV = () => {
    const items = drawings.filter(d => d.list_type === activeList);
    if (!items.length) return;
    const hdr = ['Sr.No','Trade','Type','Tower','Level','Description','Doc Number','Rev','Paper','Scale','DDS Date','Status','Remarks'];
    const rows = items.map(d => [d.sr_no, d.trade, d.doc_type, d.tower, d.level, d.description, d.document_number||'', d.revision||'', d.paper_size||'', d.drawing_scale||'', d.dds_date ? new Date(d.dds_date).toLocaleDateString() : '', d.status, d.remarks||'']);
    const csv = [hdr.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeList}_Drawing_List.csv`; a.click(); URL.revokeObjectURL(url);
  };

  /* ─── Loading / Empty ─── */
  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-lodha-gold border-t-transparent rounded-full" /></div>;

  if (drawings.length === 0) {
    return (
      <div className="bg-white border border-lodha-steel rounded-lg p-10 text-center">
        <div className="w-12 h-12 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-3"><FileText className="w-6 h-6 text-lodha-gold" /></div>
        <h3 className="text-base font-garamond font-bold text-lodha-grey mb-1">No Drawing Lists</h3>
        <p className="text-xs text-lodha-grey/50 font-jost">Regenerate the DDS to create VFC and DD drawing lists.</p>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-2">
      {/* Stats bar */}
      <div className="bg-white border border-lodha-steel rounded-lg px-4 py-3">
        <div className="flex items-center gap-4 md:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-garamond font-bold text-lodha-grey">{filtTotal}</span>
            <span className="text-[11px] font-jost text-lodha-grey/40">Drawings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-garamond font-bold text-emerald-600">{filtDone}</span>
            <span className="text-[11px] font-jost text-emerald-600/60">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-garamond font-bold text-slate-400">{filtTotal - filtDone}</span>
            <span className="text-[11px] font-jost text-slate-400/60">Pending</span>
          </div>
          <div className="flex-1 flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-2 bg-lodha-steel/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-lodha-gold to-lodha-muted-gold rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
            </div>
            <span className="text-xs font-jost font-bold text-lodha-grey/50">{overallPct}%</span>
          </div>
        </div>
      </div>

      {/* Unified toolbar */}
      <div className="bg-white border border-lodha-steel rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* VFC / DD toggle */}
          <div className="flex items-center bg-lodha-sand rounded-md p-0.5">
            <button onClick={() => setActiveList('VFC')}
              className={`px-3 py-1.5 rounded text-[11px] font-jost font-bold transition-colors ${activeList === 'VFC' ? 'bg-lodha-gold text-white shadow-sm' : 'text-lodha-grey/50 hover:text-lodha-grey'}`}>
              VFC <span className="font-normal ml-0.5">{vfcDone}/{vfcAll.length}</span>
            </button>
            <button onClick={() => setActiveList('DD')}
              className={`px-3 py-1.5 rounded text-[11px] font-jost font-bold transition-colors ${activeList === 'DD' ? 'bg-lodha-gold text-white shadow-sm' : 'text-lodha-grey/50 hover:text-lodha-grey'}`}>
              DD <span className="font-normal ml-0.5">{ddDone}/{ddAll.length}</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lodha-grey/30" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
          </div>

          {/* Desktop filters */}
          <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)}
            className="hidden md:block px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
            <option value="All">All Trades</option>
            {trades.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {towers.length > 1 && (
            <select value={filterTower} onChange={(e) => setFilterTower(e.target.value)}
              className="hidden md:block px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
              <option value="All">All Towers</option>
              {towers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="hidden md:block px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <button onClick={exportCSV} className="flex items-center gap-1 px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-[11px] font-jost font-semibold text-lodha-grey hover:bg-lodha-steel/30 transition-colors" title="Export CSV">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span>
          </button>

          {/* Mobile filter toggle */}
          <button onClick={() => setShowMobileFilters(v => !v)} className="md:hidden flex items-center gap-1 px-2 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-[11px] font-jost font-semibold text-lodha-grey">
            <Filter className="w-3.5 h-3.5" />{showMobileFilters ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
        {showMobileFilters && (
          <div className="flex flex-wrap gap-2 mt-2 md:hidden">
            <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)} className="px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none">
              <option value="All">All Trades</option>{trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {towers.length > 1 && (
              <select value={filterTower} onChange={(e) => setFilterTower(e.target.value)} className="px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none">
                <option value="All">All Towers</option>{towers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none">
              <option value="All">All Status</option><option value="pending">Pending</option><option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Status legend (multi-tower) */}
      {isMultiTower && (
        <div className="flex items-center gap-3 px-1">
          {Object.entries(STATUS_DOT).map(([k, cfg]) => (
            <span key={k} className="flex items-center gap-1 text-[10px] font-jost text-lodha-grey/40">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
          ))}
        </div>
      )}

      {/* ═══ Category Accordions ═══ */}
      <div className="space-y-1.5">
        {Object.entries(filteredGrouped).sort().map(([category, items]) => {
          const isOpen = expandedCats.has(category);
          const catDone = items.filter(d => d.status === 'completed').length;
          const catTotal = items.length;
          const matrixRows = matrixGrouped?.[category] || null;

          return (
            <div key={category} className="bg-white border border-lodha-steel/60 rounded-lg overflow-hidden">
              {/* Category header */}
              <button onClick={() => toggleCat(category)}
                className="w-full px-3 md:px-4 py-2.5 flex items-center gap-2.5 hover:bg-lodha-sand/30 transition-colors">
                {isOpen ? <ChevronDown className="w-4 h-4 text-lodha-grey/30 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-lodha-grey/30 flex-shrink-0" />}
                <span className="w-1.5 h-6 rounded-full bg-lodha-gold flex-shrink-0" />
                <FileText className="w-4 h-4 text-lodha-gold flex-shrink-0" />
                <span className="font-jost font-semibold text-sm text-lodha-grey truncate">{category}</span>
                <div className="ml-auto flex items-center gap-2 md:gap-3 flex-shrink-0">
                  <span className="text-[11px] font-jost text-lodha-grey/40">{catDone}/{catTotal}</span>
                  <MiniBar value={catDone} max={catTotal} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-lodha-steel/30 overflow-x-auto">
                  {/* ═══ MULTI-TOWER: Matrix View ═══ */}
                  {isMultiTower && matrixRows ? (
                    <>
                      {/* Header */}
                      <div className="sticky top-0 z-10 bg-lodha-sand/60 border-b border-lodha-steel/20 backdrop-blur-sm">
                        <div className="flex items-center">
                          <div className="w-8 flex-shrink-0 px-2 py-1.5">
                            <span className="text-[9px] font-jost font-bold text-lodha-grey/20 uppercase">#</span>
                          </div>
                          <div className="flex-1 min-w-[200px] px-2 py-1.5">
                            <span className="text-[10px] font-jost font-bold text-lodha-grey/30 uppercase tracking-widest">Drawing</span>
                          </div>
                          <div className="w-16 flex-shrink-0 px-2 py-1.5 hidden sm:block">
                            <span className="text-[10px] font-jost font-bold text-lodha-grey/30 uppercase">Trade</span>
                          </div>
                          <div className="w-20 flex-shrink-0 px-2 py-1.5 hidden lg:block">
                            <span className="text-[10px] font-jost font-bold text-lodha-grey/30 uppercase">Level</span>
                          </div>
                          {towers.map(t => (
                            <div key={t} className="w-16 md:w-20 flex-shrink-0 text-center py-1.5">
                              <span className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Rows */}
                      <div className="divide-y divide-lodha-steel/8">
                        {matrixRows.map((row, idx) => {
                          const rowKey = `${category}||${row.description}||${row.level}||${row.trade}`;
                          const isExp = expandedRows.has(rowKey);
                          const TIcon = TRADE_ICONS[row.trade] || FileText;
                          const tCls = TRADE_CLS[row.trade] || 'text-lodha-grey/50';
                          const allDone = Object.values(row.towers).every(d => d.status === 'completed');

                          return (
                            <div key={rowKey} className={isExp ? 'bg-lodha-sand/20' : ''}>
                              <div className="flex items-center cursor-pointer hover:bg-lodha-sand/20 transition-colors" onClick={() => toggleRow(rowKey)}>
                                <div className="w-8 flex-shrink-0 px-2 py-2">
                                  <span className="text-[10px] font-jost text-lodha-grey/25">{idx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-[200px] flex items-center gap-1.5 px-2 py-2">
                                  <TIcon className={`w-3.5 h-3.5 ${tCls} flex-shrink-0 hidden sm:block`} />
                                  <span className={`font-jost text-[13px] truncate ${allDone ? 'text-lodha-grey/40 line-through' : 'text-lodha-grey'}`}>{row.description}</span>
                                  {isExp ? <ChevronDown className="w-3 h-3 text-lodha-grey/20 flex-shrink-0 ml-auto" /> : <ChevronRight className="w-3 h-3 text-lodha-grey/20 flex-shrink-0 ml-auto" />}
                                </div>
                                <div className="w-16 flex-shrink-0 px-2 py-2 hidden sm:block">
                                  <span className={`text-[11px] font-jost font-semibold ${tCls}`}>{row.trade}</span>
                                </div>
                                <div className="w-20 flex-shrink-0 px-2 py-2 hidden lg:block">
                                  <span className="text-[11px] font-jost text-lodha-grey/35 truncate">{row.level || '—'}</span>
                                </div>
                                {towers.map(tower => {
                                  const d = row.towers[tower];
                                  if (!d) return <div key={tower} className="w-16 md:w-20 flex-shrink-0 flex items-center justify-center py-2"><span className="text-lodha-grey/10">—</span></div>;
                                  const cfg = STATUS_DOT[d.status] || STATUS_DOT.pending;
                                  return (
                                    <div key={tower} className="w-16 md:w-20 flex-shrink-0 flex items-center justify-center py-2" onClick={e => e.stopPropagation()}>
                                      <button
                                        onClick={() => { if (d.status !== 'completed' && canEdit) handleComplete(d.id); }}
                                        className={`w-5 h-5 rounded-full ${cfg.dot} ring-2 ${cfg.ring} hover:ring-4 transition-all flex items-center justify-center ${d.status !== 'completed' && canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                        title={`${cfg.label}${d.dds_date ? ' · Due ' + dateFmt(d.dds_date) : ''}${d.document_number ? ' · ' + d.document_number : ''}`}
                                      >
                                        {d.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Expanded: per-tower details */}
                              {isExp && (
                                <div className="bg-white border border-lodha-steel/15 rounded-lg p-3 mx-3 md:mx-4 mb-2 text-xs font-jost text-lodha-grey/70">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                      <p className="font-bold text-lodha-grey/40 uppercase text-[10px] tracking-wider mb-1.5">Per Tower</p>
                                      <div className="space-y-1.5">
                                        {towers.map(tower => {
                                          const d = row.towers[tower];
                                          if (!d) return null;
                                          const cfg = STATUS_DOT[d.status] || STATUS_DOT.pending;
                                          return (
                                            <div key={tower} className="flex items-center gap-2 flex-wrap">
                                              <span className="font-semibold text-lodha-grey/50 w-8">{tower}</span>
                                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                              <span className="text-lodha-grey/40">{cfg.label}</span>
                                              {d.document_number && <span className="text-lodha-grey/40 ml-1">{d.document_number}</span>}
                                              <span className="text-lodha-grey/25 ml-auto">{d.revision || 'R0'}</span>
                                              {d.dds_date && <span className="text-lodha-grey/30">{dateFmt(d.dds_date)}</span>}
                                              {canEdit && (
                                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                                  {d.status !== 'completed' && (
                                                    <button onClick={() => handleComplete(d.id)} className="p-0.5 text-emerald-500 hover:bg-emerald-50 rounded" title="Complete"><CheckCircle2 className="w-3 h-3" /></button>
                                                  )}
                                                  <button onClick={() => openEdit(d)} className="p-0.5 text-lodha-grey/30 hover:bg-lodha-sand rounded" title="Edit"><Edit3 className="w-3 h-3" /></button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-bold text-lodha-grey/40 uppercase text-[10px] tracking-wider mb-1.5">Details</p>
                                      {row.doc_type && <p>Type: {row.doc_type}</p>}
                                      {row.level && <p>Level: {row.level}</p>}
                                      {Object.values(row.towers)[0]?.paper_size && <p>Paper: {Object.values(row.towers)[0].paper_size}</p>}
                                      {Object.values(row.towers)[0]?.drawing_scale && <p>Scale: {Object.values(row.towers)[0].drawing_scale}</p>}
                                      {Object.values(row.towers)[0]?.remarks && <p className="italic">{Object.values(row.towers)[0].remarks}</p>}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    /* ═══ SINGLE-TOWER: Compact Table ═══ */
                    <>
                      {/* Table header */}
                      <div className="sticky top-0 z-10 bg-lodha-sand/60 border-b border-lodha-steel/20 backdrop-blur-sm">
                        <div className="flex items-center text-[10px] font-jost font-bold text-lodha-grey/30 uppercase tracking-widest">
                          <div className="w-8 flex-shrink-0 px-2 py-1.5">#</div>
                          <div className="flex-1 min-w-[160px] px-2 py-1.5">Description</div>
                          <div className="w-20 flex-shrink-0 px-2 py-1.5 hidden sm:block">Trade</div>
                          <div className="w-20 flex-shrink-0 px-2 py-1.5 hidden md:block">Level</div>
                          <div className="w-24 flex-shrink-0 px-2 py-1.5 hidden lg:block">Doc No.</div>
                          <div className="w-14 flex-shrink-0 px-2 py-1.5 hidden lg:block">Rev</div>
                          <div className="w-16 flex-shrink-0 px-2 py-1.5 hidden md:block">Date</div>
                          <div className="w-14 flex-shrink-0 text-center px-2 py-1.5">Status</div>
                          {canEdit && <div className="w-16 flex-shrink-0 text-center px-2 py-1.5">Action</div>}
                        </div>
                      </div>
                      {/* Rows */}
                      <div className="divide-y divide-lodha-steel/8">
                        {items.map(d => {
                          const TIcon = TRADE_ICONS[d.trade] || FileText;
                          const tCls = TRADE_CLS[d.trade] || 'text-lodha-grey/50';
                          const cfg = STATUS_DOT[d.status] || STATUS_DOT.pending;
                          const isCompleted = d.status === 'completed';

                          return (
                            <div key={d.id} className="flex items-center hover:bg-lodha-sand/20 transition-colors">
                              <div className="w-8 flex-shrink-0 px-2 py-2">
                                <span className="text-[10px] font-jost text-lodha-grey/25">{d.sr_no}</span>
                              </div>
                              <div className="flex-1 min-w-[160px] flex items-center gap-1.5 px-2 py-2">
                                <TIcon className={`w-3.5 h-3.5 ${tCls} flex-shrink-0 hidden sm:block`} />
                                <span className={`font-jost text-[13px] truncate ${isCompleted ? 'text-lodha-grey/40 line-through' : 'text-lodha-grey'}`}>{d.description}</span>
                              </div>
                              <div className="w-20 flex-shrink-0 px-2 py-2 hidden sm:block">
                                <span className={`text-[11px] font-jost font-semibold ${tCls}`}>{d.trade}</span>
                              </div>
                              <div className="w-20 flex-shrink-0 px-2 py-2 hidden md:block">
                                <span className="text-[11px] font-jost text-lodha-grey/35 truncate">{d.level || '—'}</span>
                              </div>
                              <div className="w-24 flex-shrink-0 px-2 py-2 hidden lg:block">
                                <span className="text-[11px] font-jost text-lodha-grey/40 truncate">{d.document_number || '—'}</span>
                              </div>
                              <div className="w-14 flex-shrink-0 px-2 py-2 hidden lg:block">
                                <span className="text-[11px] font-jost text-lodha-grey/30">{d.revision || 'R0'}</span>
                              </div>
                              <div className="w-16 flex-shrink-0 px-2 py-2 hidden md:block">
                                <span className="text-[11px] font-jost text-lodha-grey/30">{dateFmt(d.dds_date) || '—'}</span>
                              </div>
                              <div className="w-14 flex-shrink-0 flex items-center justify-center py-2">
                                <span className={`w-5 h-5 rounded-full ${cfg.dot} ring-2 ${cfg.ring} flex items-center justify-center`} title={cfg.label}>
                                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </span>
                              </div>
                              {canEdit && (
                                <div className="w-16 flex-shrink-0 flex items-center justify-center gap-0.5 py-2">
                                  {!isCompleted && (
                                    <button onClick={() => handleComplete(d.id)} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors" title="Complete">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button onClick={() => openEdit(d)} className="p-1 text-lodha-grey/30 hover:bg-lodha-sand rounded transition-colors" title="Edit">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(filteredGrouped).length === 0 && (
          <div className="bg-white border border-lodha-steel rounded-lg p-8 text-center">
            <p className="text-lodha-grey/40 font-jost text-sm">No drawings match your filters</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-sm w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-garamond text-lg font-bold text-lodha-grey">Edit Drawing</h3>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-lodha-sand rounded"><X className="w-4 h-4 text-lodha-grey/40" /></button>
            </div>
            <p className="text-xs text-lodha-grey/50 font-jost mb-3 truncate">{editModal.description}{editModal.tower ? ` · ${editModal.tower}` : ''}</p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase tracking-wide">Document Number</label>
                <input value={editForm.document_number} onChange={(e) => setEditForm(p => ({ ...p, document_number: e.target.value }))}
                  className="w-full mt-0.5 px-3 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="e.g. MEP-E-001" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase tracking-wide">Revision</label>
                  <input value={editForm.revision} onChange={(e) => setEditForm(p => ({ ...p, revision: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
                </div>
                <div>
                  <label className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase tracking-wide">Paper Size</label>
                  <input value={editForm.paper_size} onChange={(e) => setEditForm(p => ({ ...p, paper_size: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="A1" />
                </div>
                <div>
                  <label className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase tracking-wide">Scale</label>
                  <input value={editForm.drawing_scale} onChange={(e) => setEditForm(p => ({ ...p, drawing_scale: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="1:100" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase tracking-wide">Remarks</label>
                <textarea value={editForm.remarks} onChange={(e) => setEditForm(p => ({ ...p, remarks: e.target.value }))} rows={2}
                  className="w-full mt-0.5 px-3 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="Optional..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditModal(null)} className="px-3 py-1.5 text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-1.5 bg-lodha-gold text-white text-xs font-jost font-semibold rounded-lg hover:bg-lodha-grey transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
