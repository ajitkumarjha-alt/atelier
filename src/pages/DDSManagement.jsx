import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle, Download,
  RefreshCw, ChevronDown, ChevronRight, Filter, Search,
  FileText, ArrowLeft, BarChart3, Edit3,
  Layers, Building2, Zap, Droplets, Flame, Wind, Shield,
  Lightbulb, Radio, Clipboard, PenTool, Info
} from 'lucide-react';
import Layout from '../components/Layout';
import DDSDrawingList from '../components/DDSDrawingList';
import DDSBoqList from '../components/DDSBoqList';
import DDSProgressChart from '../components/DDSProgressChart';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useDialog';
import ConfirmDialog from '../components/ConfirmDialog';

/* ═══════════ Config ═══════════ */
const TRADE_ICONS = {
  'Electrical': Zap, 'PHE': Droplets, 'Fire Fighting': Flame, 'HVAC': Wind,
  'Security': Shield, 'Lighting': Lightbulb, 'Small Power': Zap,
  'Lightning Protection': Zap, 'Containment': Layers, 'FA & PA': Radio,
  'FAVA': Radio, 'ELV': Radio, 'Lifts': Layers, 'Co-ordinate': Clipboard,
  'Builders Work': PenTool, 'MEP': Layers, 'Architecture': Building2,
  'Structure': Building2, 'Workshop': Clipboard, 'Interior Design': PenTool,
};

const MEP_SUB_TRADES = new Set([
  'Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security', 'FAVA', 'FA & PA',
  'ELV', 'Lifts', 'Lighting', 'Small Power', 'Lightning Protection',
  'Containment', 'Earthing', 'DG', 'STP', 'OWC', 'Solar Hot Water',
]);

function getSegment(trade) {
  if (!trade || trade === 'MEP' || MEP_SUB_TRADES.has(trade)) return 'MEP';
  return trade;
}

const SEGMENT_ORDER = { 'Architecture': 1, 'Structure': 2, 'MEP': 3, 'Workshop': 4, 'Interior Design': 5 };

const PHASE_CONFIG = {
  'A - Concept':                { icon: PenTool,      label: 'Concept',        bar: 'bg-emerald-500', iconCls: 'text-emerald-600' },
  'B - Liaison':                { icon: FileText,     label: 'Liaison',        bar: 'bg-cyan-500',    iconCls: 'text-cyan-600' },
  'C - SLDs':                   { icon: Layers,       label: 'SLDs',           bar: 'bg-teal-500',    iconCls: 'text-teal-600' },
  'D - SD (Schematic Design)':  { icon: Clipboard,    label: 'SD',             bar: 'bg-indigo-500',  iconCls: 'text-indigo-600' },
  'E - DD (Design Development)':{ icon: Clipboard,    label: 'DD',             bar: 'bg-purple-500',  iconCls: 'text-purple-600' },
  'F - Detailed Calculations':  { icon: BarChart3,    label: 'Calcs',          bar: 'bg-orange-500',  iconCls: 'text-orange-600' },
  "G - Builder's Work":         { icon: Building2,    label: "Builder's Work", bar: 'bg-stone-500',   iconCls: 'text-stone-600' },
  'H - Tender':                 { icon: FileText,     label: 'Tender',         bar: 'bg-blue-500',    iconCls: 'text-blue-600' },
  'I - VFCs':                   { icon: CheckCircle2, label: 'VFCs',           bar: 'bg-amber-500',   iconCls: 'text-amber-600' },
  // Legacy phase names
  'A - Design Stage':           { icon: PenTool,      label: 'Design',         bar: 'bg-emerald-500', iconCls: 'text-emerald-600' },
  'B - Tender':                 { icon: FileText,     label: 'Tender',         bar: 'bg-blue-500',    iconCls: 'text-blue-600' },
  'C - VFC (Vendor Final Confirmation)': { icon: CheckCircle2, label: 'VFC',   bar: 'bg-amber-500',   iconCls: 'text-amber-600' },
  'D - DD (Design Development)':{ icon: Clipboard,    label: 'DD',             bar: 'bg-purple-500',  iconCls: 'text-purple-600' },
  'E - Schematic':              { icon: Clipboard,    label: 'Schematic',      bar: 'bg-indigo-500',  iconCls: 'text-indigo-600' },
};

/* ═══════════ Tiny UI bits ═══════════ */
const STATUS_MAP = {
  pending:     { dot: 'bg-slate-300',   ring: 'ring-slate-200',   label: 'Pending' },
  in_progress: { dot: 'bg-blue-500',    ring: 'ring-blue-200',    label: 'In Progress' },
  completed:   { dot: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Done' },
  revised:     { dot: 'bg-amber-500',   ring: 'ring-amber-200',   label: 'Revised' },
  overdue:     { dot: 'bg-red-500',     ring: 'ring-red-200',     label: 'Overdue' },
};

function effectiveStatus(item) {
  if (item.expected_completion_date && new Date(item.expected_completion_date) < new Date() && item.status !== 'completed')
    return 'overdue';
  return item.status || 'pending';
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

const dateFmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

/** Strip tower prefix to get base deliverable name: "T1 - Concept - Architecture" → "Concept - Architecture" */
function baseName(itemName, buildingName) {
  if (!buildingName || !itemName) return itemName || '';
  const prefix = new RegExp('^' + buildingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–]\\s*');
  return itemName.replace(prefix, '');
}

/* ═══════════ Component ═══════════ */
export default function DDSManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { userLevel } = useUser();

  const [dds, setDDS] = useState(null);
  const [items, setItems] = useState([]);
  const [phases, setPhases] = useState({});
  const [metadata, setMetadata] = useState(null);
  const [progress, setProgress] = useState(null);
  const [pendingInputs, setPendingInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activePhase, setActivePhase] = useState('all');
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [completeModal, setCompleteModal] = useState(null);
  const [reviseModal, setReviseModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [showPolicyInfo, setShowPolicyInfo] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('schedule');
  const { confirm, dialogProps } = useConfirm();

  /* ─── Fetching ─── */
  const fetchDDS = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchJson(`/api/dds/project/${projectId}`);
      setDDS(data.dds);
      setItems(data.items || []);
      setPhases(data.phases || {});
      setMetadata(data.metadata || data.dds?.generation_metadata);
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('No DDS')) {
        setDDS(null); setItems([]);
      } else {
        toast.error('Failed to load DDS');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchProgress = useCallback(async () => {
    if (!dds) return;
    try { setProgress(await apiFetchJson(`/api/dds/${dds.id}/progress`)); } catch {}
  }, [dds]);

  const fetchPendingInputs = useCallback(async () => {
    if (!dds) return;
    try { setPendingInputs(await apiFetchJson(`/api/dds/${dds.id}/pending-inputs`)); } catch {}
  }, [dds]);

  useEffect(() => { fetchDDS(); }, [fetchDDS]);
  useEffect(() => { fetchProgress(); fetchPendingInputs(); }, [fetchProgress, fetchPendingInputs]);

  // Expand only the first phase on load
  useEffect(() => {
    if (Object.keys(phases).length > 0 && expandedSections.size === 0) {
      const first = Object.keys(phases).sort()[0];
      if (first) setExpandedSections(new Set([first]));
    }
  }, [phases]);

  /* ─── Actions ─── */
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await apiFetchJson(`/api/dds/generate/${projectId}`, {
        method: 'POST', body: JSON.stringify({ dds_type: 'internal', tower_stagger_weeks: 4 }),
      });
      toast.success('DDS generated'); fetchDDS();
    } catch (err) { toast.error(err.message || 'Failed'); } finally { setGenerating(false); }
  };

  const handleComplete = async (itemId) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/complete`, { method: 'PUT', body: JSON.stringify({ remarks }) });
      toast.success('Completed'); setCompleteModal(null); setRemarks(''); fetchDDS();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleRevise = async (itemId) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/revise`, { method: 'PUT', body: JSON.stringify({ remarks }) });
      toast.success('Revision submitted'); setReviseModal(null); setRemarks(''); fetchDDS();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleMarkInput = async (itemId, inputType) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/mark-input`, { method: 'PUT', body: JSON.stringify({ input_type: inputType }) });
      toast.success(`${inputType} input received`); fetchDDS(); fetchPendingInputs();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleRegenerate = async () => {
    if (!dds) return;
    const ok = await confirm({ title: 'Regenerate DDS', message: 'Non-completed items will be replaced.', variant: 'warning', confirmLabel: 'Regenerate' });
    if (!ok) return;
    try { setGenerating(true); await apiFetchJson(`/api/dds/${dds.id}/regenerate`, { method: 'POST' }); toast.success('Regenerated'); fetchDDS(); }
    catch (err) { toast.error(err.message || 'Failed'); } finally { setGenerating(false); }
  };

  const handleExport = async () => {
    try {
      const data = await apiFetchJson(`/api/dds/${dds.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `DDS_${projectId}_v${dds.version}_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url); toast.success('Exported');
    } catch { toast.error('Export failed'); }
  };

  const toggleRow = (key) => setExpandedRows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleSection = (key) => setExpandedSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  /* ─── Derived data ─── */
  const towers = useMemo(() => [...new Set(items.map(i => i.building_name).filter(Boolean))].sort(), [items]);
  const isMultiTower = towers.length > 1;
  const phaseKeys = Object.keys(phases).sort();

  const filteredItems = useMemo(() => items.filter(item => {
    if (activePhase !== 'all' && item.phase !== activePhase) return false;
    if (filterTrade !== 'All') {
      const t = item.trade || item.discipline;
      if (filterTrade === 'MEP') { if (getSegment(t) !== 'MEP') return false; }
      else if (t !== filterTrade) return false;
    }
    if (filterStatus !== 'All') {
      if (effectiveStatus(item) !== filterStatus) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!item.item_name?.toLowerCase().includes(q) &&
          !(item.trade || '').toLowerCase().includes(q) &&
          !(item.section || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, activePhase, filterTrade, filterStatus, searchTerm]);

  /**
   * MATRIX DATA: Group items into rows.
   * Each row = { base, trade, section, phase, items: { [tower]: item } }
   * For single-tower projects, items map has just one entry.
   */
  const matrixByPhase = useMemo(() => {
    const phaseMap = {};
    for (const item of filteredItems) {
      const phase = item.phase || 'General';
      const trade = item.trade || item.discipline || 'General';
      const segment = getSegment(trade);
      const base = baseName(item.item_name, item.building_name);
      const tower = item.building_name || '_proj';

      if (!phaseMap[phase]) phaseMap[phase] = {};
      if (!phaseMap[phase][segment]) phaseMap[phase][segment] = {};

      // Group by trade within segment
      const tradeKey = segment === 'MEP' ? (trade === 'MEP' ? 'MEP Coordination' : trade) : '_all';
      if (!phaseMap[phase][segment][tradeKey]) phaseMap[phase][segment][tradeKey] = {};

      // Key for the row: base + trade to keep uniqueness
      const rowKey = `${base}||${trade}`;
      if (!phaseMap[phase][segment][tradeKey][rowKey]) {
        phaseMap[phase][segment][tradeKey][rowKey] = { base, trade, section: item.section, phase, items: {} };
      }
      phaseMap[phase][segment][tradeKey][rowKey].items[tower] = item;
    }
    return phaseMap;
  }, [filteredItems]);

  const mepTrades = useMemo(() => [...new Set(items.map(i => i.trade || i.discipline).filter(t => MEP_SUB_TRADES.has(t)))].sort(), [items]);
  const nonMepTrades = useMemo(() => [...new Set(items.map(i => i.trade || i.discipline).filter(t => t && !MEP_SUB_TRADES.has(t) && t !== 'MEP'))].sort(), [items]);

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const overdueItems = items.filter(i => effectiveStatus(i) === 'overdue').length;
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const canEdit = ['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel);
  const canAdmin = ['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel);

  /* ─── Status cell for matrix ─── */
  const StatusCell = ({ item }) => {
    if (!item) return <span className="text-lodha-grey/10">—</span>;
    const st = effectiveStatus(item);
    const cfg = STATUS_MAP[st] || STATUS_MAP.pending;
    return (
      <div className="flex items-center justify-center gap-1 group/cell">
        <button
          onClick={(e) => { e.stopPropagation(); if (item.status !== 'completed' && canEdit) setCompleteModal(item); else if (item.status === 'completed' && canEdit) setReviseModal(item); }}
          className={`w-5 h-5 rounded-full ${cfg.dot} ring-2 ${cfg.ring} hover:ring-4 transition-all cursor-pointer flex items-center justify-center`}
          title={`${cfg.label}${item.expected_completion_date ? ' · Due ' + dateFmt(item.expected_completion_date) : ''}`}
        >
          {st === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
          {st === 'overdue' && <AlertTriangle className="w-2.5 h-2.5 text-white" />}
        </button>
        {item.expected_completion_date && (
          <span className="text-[9px] font-jost text-lodha-grey/30 hidden lg:block">{dateFmt(item.expected_completion_date)}</span>
        )}
      </div>
    );
  };

  /* ─── Expanded row detail (shows per-tower schedule info) ─── */
  const RowDetail = ({ row }) => {
    const allItems = Object.values(row.items);
    const sampleItem = allItems[0];
    return (
      <div className="bg-white border border-lodha-steel/15 rounded-lg p-3 mx-3 md:mx-4 mb-2 text-xs font-jost text-lodha-grey/70">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Per-tower details */}
          <div>
            <p className="font-bold text-lodha-grey/40 uppercase text-[10px] tracking-wider mb-1.5">Tower Status</p>
            <div className="space-y-1">
              {towers.map(tower => {
                const item = row.items[tower];
                if (!item) return null;
                const st = effectiveStatus(item);
                const cfg = STATUS_MAP[st];
                return (
                  <div key={tower} className="flex items-center gap-2">
                    <span className="font-semibold text-lodha-grey/50 w-8">{tower}</span>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-lodha-grey/40">{cfg.label}</span>
                    <span className="ml-auto text-lodha-grey/30">{dateFmt(item.expected_start_date)} → {dateFmt(item.expected_completion_date)}</span>
                    {item.actual_completion_date && <span className="text-emerald-600 ml-1">✓ {dateFmt(item.actual_completion_date)}</span>}
                    {canEdit && item.status !== 'completed' && (
                      <button onClick={() => setCompleteModal(item)} className="ml-1 p-0.5 text-emerald-500 hover:bg-emerald-50 rounded" title="Complete"><CheckCircle2 className="w-3 h-3" /></button>
                    )}
                    {canEdit && item.status === 'completed' && (
                      <button onClick={() => setReviseModal(item)} className="ml-1 p-0.5 text-amber-500 hover:bg-amber-50 rounded" title="Revise"><RefreshCw className="w-3 h-3" /></button>
                    )}
                  </div>
                );
              })}
              {/* Single-tower / project-level items */}
              {(!isMultiTower || !!row.items['_proj']) && allItems.map((item, i) => {
                const st = effectiveStatus(item);
                const cfg = STATUS_MAP[st];
                return (
                  <div key={i} className="flex items-center gap-2">
                    {item.building_name && <span className="font-semibold text-lodha-grey/50 w-8">{item.building_name}</span>}
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-lodha-grey/40">{cfg.label}</span>
                    <span className="ml-auto text-lodha-grey/30">{dateFmt(item.expected_start_date)} → {dateFmt(item.expected_completion_date)}</span>
                    {item.actual_completion_date && <span className="text-emerald-600 ml-1">✓ {dateFmt(item.actual_completion_date)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Metadata from sample item */}
          <div className="space-y-1">
            <p className="font-bold text-lodha-grey/40 uppercase text-[10px] tracking-wider mb-1.5">Details</p>
            {sampleItem.section && <p>Section: {sampleItem.section}</p>}
            {sampleItem.doc_type && sampleItem.doc_type !== 'Deliverable' && <p>Type: {sampleItem.doc_type}</p>}
            {sampleItem.scope && <p>Scope: <span className={sampleItem.scope === 'Project' ? 'text-blue-600 font-semibold' : 'text-emerald-600 font-semibold'}>{sampleItem.scope}</span></p>}
            {sampleItem.dependency_text && <p>Dependency: {sampleItem.dependency_text}</p>}
            {sampleItem.dependent_stakeholders && <p>Stakeholders: {sampleItem.dependent_stakeholders}</p>}
            {sampleItem.description && <p className="italic">{sampleItem.description}</p>}
            {sampleItem.remarks && <p className="italic text-lodha-grey/50">{sampleItem.remarks}</p>}
            {/* Input status */}
            {(sampleItem.architect_input_date || sampleItem.structure_input_date) && (
              <div className="mt-1.5 pt-1.5 border-t border-lodha-steel/10">
                <p className="font-bold text-lodha-grey/40 uppercase text-[10px] tracking-wider mb-1">Inputs</p>
                {sampleItem.architect_input_date && <p>Architect: {sampleItem.architect_input_received ? '✓ Received' : `✗ Due ${dateFmt(sampleItem.architect_input_date)}`}</p>}
                {sampleItem.structure_input_date && <p>Structure: {sampleItem.structure_input_received ? '✓ Received' : `✗ Due ${dateFmt(sampleItem.structure_input_date)}`}</p>}
              </div>
            )}
            {!sampleItem.dependency_text && !sampleItem.description && !sampleItem.remarks && !sampleItem.section && <p className="text-lodha-grey/20">No additional details</p>}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════ LOADING ═══════════ */
  if (loading) {
    return <Layout><div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-lodha-gold border-t-transparent rounded-full" /></div></Layout>;
  }

  /* ═══════════ MAIN RENDER ═══════════ */
  return (
    <Layout>
      {/* Header */}
      <div className="mb-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-lodha-gold hover:text-lodha-grey text-xs font-jost mb-2 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="heading-primary">Design Delivery Schedule</h1>
            <p className="page-subtitle">
              {dds?.policy_name
                ? `${dds.policy_name} · v${dds.version} · ${totalItems} items${isMultiTower ? ` · ${towers.length} towers` : ''}`
                : 'Policy 130 — Track design deliverables across all trades'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {dds && (
              <>
                <button onClick={() => setShowPolicyInfo(!showPolicyInfo)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-lodha-steel rounded-lg text-[11px] font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors">
                  <Info className="w-3 h-3" /> Policy
                </button>
                {canAdmin && <button onClick={handleRegenerate} disabled={generating} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-lodha-steel rounded-lg text-[11px] font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors disabled:opacity-50"><RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} /> Regen</button>}
                {canAdmin && <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-lodha-steel rounded-lg text-[11px] font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors"><Download className="w-3 h-3" /> Export</button>}
              </>
            )}
            {!dds && canAdmin && (
              <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-5 py-2 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors disabled:opacity-50">
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate DDS'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      {dds && (
        <div className="bg-white border border-lodha-steel rounded-lg p-1 mb-4 overflow-x-auto">
          <div className="flex items-center gap-0.5 min-w-max">
            {[
              { key: 'schedule', label: 'Schedule', icon: Calendar },
              { key: 'drawings', label: 'Drawings', icon: FileText },
              { key: 'boq', label: 'BOQ', icon: Clipboard },
              { key: 'progress', label: 'Progress', icon: BarChart3 },
            ].map(tab => {
              const TIcon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveMainTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-jost font-semibold transition-colors ${activeMainTab === tab.key ? 'bg-lodha-gold text-white shadow-sm' : 'text-lodha-grey/60 hover:bg-lodha-sand hover:text-lodha-grey'}`}>
                  <TIcon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Policy Info */}
      {showPolicyInfo && metadata && (
        <div className="mb-4 bg-white border border-lodha-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-garamond text-base font-bold text-lodha-grey flex items-center gap-2"><Info className="w-4 h-4 text-lodha-gold" /> Generation Details</h3>
            <button onClick={() => setShowPolicyInfo(false)} className="text-lodha-grey/30 hover:text-lodha-grey p-1"><ChevronDown className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-jost">
            <div><p className="text-lodha-grey/40">Height Tier</p><p className="font-semibold text-lodha-grey">{metadata.tier?.label || '—'}</p></div>
            <div><p className="text-lodha-grey/40">Max Height</p><p className="font-semibold text-lodha-grey">{metadata.maxHeight || 0}m</p></div>
            <div><p className="text-lodha-grey/40">Towers</p><p className="font-semibold text-lodha-grey">{metadata.towerCount || 0}</p></div>
            <div><p className="text-lodha-grey/40">Stagger</p><p className="font-semibold text-lodha-grey">{metadata.towerStaggerWeeks || 4}w</p></div>
            <div><p className="text-lodha-grey/40">Height Mod</p><p className="font-semibold text-lodha-grey">+{metadata.heightModifierDays || 0}d</p></div>
            <div><p className="text-lodha-grey/40">Basement Mod</p><p className="font-semibold text-lodha-grey">+{metadata.basementModifierDays || 0}d</p></div>
            <div><p className="text-lodha-grey/40">Total Items</p><p className="font-semibold text-lodha-grey">{metadata.totalItems || totalItems}</p></div>
            <div><p className="text-lodha-grey/40">Duration</p><p className="font-semibold text-lodha-grey">{metadata.tier?.designMonths || '—'}mo</p></div>
          </div>
        </div>
      )}

      {/* Pending Inputs */}
      {pendingInputs.length > 0 && activeMainTab === 'schedule' && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-jost font-semibold text-amber-800 text-[11px]">Pending Inputs ({pendingInputs.length})</span>
              <div className="mt-0.5 space-y-0.5">
                {pendingInputs.slice(0, 3).map((inp, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-amber-700">
                    <span className="truncate">{inp.item_name}</span>
                    {canEdit && <div className="flex gap-1 flex-shrink-0">
                      {!inp.architect_input_received && <button onClick={() => handleMarkInput(inp.id, 'architect')} className="underline font-semibold hover:text-amber-900">Arch</button>}
                      {!inp.structure_input_received && <button onClick={() => handleMarkInput(inp.id, 'structure')} className="underline font-semibold hover:text-amber-900">Struct</button>}
                    </div>}
                  </div>
                ))}
                {pendingInputs.length > 3 && <p className="text-[10px] text-amber-400">+ {pendingInputs.length - 3} more</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Content ═══ */}
      {!dds ? (
        <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-3"><Calendar className="w-7 h-7 text-lodha-gold" /></div>
          <h2 className="text-lg font-garamond font-bold text-lodha-grey mb-1">No DDS Found</h2>
          <p className="text-lodha-grey/50 font-jost text-sm mb-1 max-w-md mx-auto">Generate a schedule based on <strong>Policy 130</strong>.</p>
          <p className="text-lodha-grey/35 font-jost text-xs mb-5 max-w-md mx-auto">Concept → Liaison → SLDs → SD → DD → Calcs → Builder&apos;s Work → Tender → VFCs</p>
          {canAdmin && <button onClick={handleGenerate} disabled={generating} className="px-5 py-2.5 bg-lodha-gold text-white rounded-lg font-jost font-semibold text-sm hover:bg-lodha-grey transition-colors disabled:opacity-50">{generating ? 'Generating...' : 'Generate DDS'}</button>}
        </div>
      ) : activeMainTab === 'drawings' ? <DDSDrawingList ddsId={dds.id} />
        : activeMainTab === 'boq' ? <DDSBoqList ddsId={dds.id} />
        : activeMainTab === 'progress' ? <DDSProgressChart ddsId={dds.id} />
        : (
        /* ═══ SCHEDULE TAB ═══ */
        <>
          {/* Stats bar */}
          <div className="bg-white border border-lodha-steel rounded-lg px-4 py-3 mb-3">
            <div className="flex items-center gap-4 md:gap-6 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-garamond font-bold text-lodha-grey">{totalItems}</span>
                <span className="text-[11px] font-jost text-lodha-grey/40">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-garamond font-bold text-emerald-600">{completedItems}</span>
                <span className="text-[11px] font-jost text-emerald-600/60">Done</span>
              </div>
              {overdueItems > 0 && <div className="flex items-center gap-1.5">
                <span className="text-xl font-garamond font-bold text-red-600">{overdueItems}</span>
                <span className="text-[11px] font-jost text-red-600/60">Overdue</span>
              </div>}
              <div className="flex-1 flex items-center gap-2 min-w-[100px]">
                <div className="flex-1 h-2 bg-lodha-steel/15 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-lodha-gold to-lodha-muted-gold rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
                </div>
                <span className="text-xs font-jost font-bold text-lodha-grey/50">{overallPct}%</span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white border border-lodha-steel rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <select value={activePhase} onChange={(e) => setActivePhase(e.target.value)}
                className="px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost font-semibold focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 text-lodha-grey">
                <option value="all">All Phases ({totalItems})</option>
                {phaseKeys.map(p => <option key={p} value={p}>{(PHASE_CONFIG[p]?.label || p)} ({phases[p]?.total || 0})</option>)}
              </select>
              <div className="relative flex-1 min-w-[120px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lodha-grey/30" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
              </div>
              <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)}
                className="hidden md:block px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                <option value="All">All Trades</option>
                {nonMepTrades.map(t => <option key={t} value={t}>{t}</option>)}
                <optgroup label="MEP"><option value="MEP">All MEP</option>{mepTrades.map(t => <option key={t} value={t}>  {t}</option>)}</optgroup>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="hidden md:block px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                <option value="All">All Status</option>
                <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                <option value="completed">Completed</option><option value="overdue">Overdue</option>
              </select>
              <button onClick={() => setShowMobileFilters(v => !v)} className="md:hidden flex items-center gap-1 px-2 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-[11px] font-jost font-semibold text-lodha-grey">
                <Filter className="w-3.5 h-3.5" />{showMobileFilters ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
            {showMobileFilters && (
              <div className="flex flex-wrap gap-2 mt-2 md:hidden">
                <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)} className="px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none">
                  <option value="All">All Trades</option>{nonMepTrades.map(t => <option key={t} value={t}>{t}</option>)}
                  <optgroup label="MEP"><option value="MEP">All MEP</option>{mepTrades.map(t => <option key={t} value={t}>  {t}</option>)}</optgroup>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-2.5 py-1.5 bg-lodha-sand border border-lodha-steel rounded-md text-xs font-jost focus:outline-none">
                  <option value="All">All Status</option><option value="pending">Pending</option><option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option><option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>

          {/* Status Legend */}
          {isMultiTower && (
            <div className="flex items-center gap-3 mb-2 px-1">
              {Object.entries(STATUS_MAP).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1 text-[10px] font-jost text-lodha-grey/40">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
                </span>
              ))}
            </div>
          )}

          {/* ═══ Phase Accordion with Matrix ═══ */}
          <div className="space-y-1.5">
            {Object.entries(matrixByPhase).sort().map(([phase, segments]) => {
              const phaseCfg = PHASE_CONFIG[phase] || {};
              const PhIcon = phaseCfg.icon || FileText;
              const barCls = phaseCfg.bar || 'bg-gray-400';
              const iconCls = phaseCfg.iconCls || 'text-gray-500';

              // Count items across all segments
              const allRows = Object.values(segments).flatMap(seg => Object.values(seg).flatMap(trade => Object.values(trade)));
              const allItems = allRows.flatMap(r => Object.values(r.items));
              const phaseTotal = allItems.length;
              const phaseDone = allItems.filter(i => i.status === 'completed').length;
              const phaseOverdue = allItems.filter(i => effectiveStatus(i) === 'overdue').length;
              const isOpen = expandedSections.has(phase);

              return (
                <div key={phase} className="bg-white border border-lodha-steel/60 rounded-lg overflow-hidden">
                  {/* Phase header */}
                  <button onClick={() => toggleSection(phase)}
                    className="w-full px-3 md:px-4 py-2.5 flex items-center gap-2.5 hover:bg-lodha-sand/30 transition-colors group">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-lodha-grey/30 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-lodha-grey/30 flex-shrink-0" />}
                    <span className={`w-1.5 h-6 rounded-full ${barCls} flex-shrink-0`} />
                    <PhIcon className={`w-4 h-4 ${iconCls} flex-shrink-0`} />
                    <span className="font-jost font-semibold text-sm text-lodha-grey truncate">{phaseCfg.label || phase}</span>
                    <div className="ml-auto flex items-center gap-2 md:gap-3 flex-shrink-0">
                      {phaseOverdue > 0 && <span className="text-[10px] font-jost font-bold text-red-500 hidden sm:inline">{phaseOverdue} late</span>}
                      <span className="text-[11px] font-jost text-lodha-grey/40">{phaseDone}/{phaseTotal}</span>
                      <MiniBar value={phaseDone} max={phaseTotal} />
                    </div>
                  </button>

                  {/* Phase content — Matrix table */}
                  {isOpen && (
                    <div className="border-t border-lodha-steel/30 overflow-x-auto">
                      {/* Tower column headers (multi-tower only) */}
                      {isMultiTower && (
                        <div className="sticky top-0 z-10 bg-lodha-sand/60 border-b border-lodha-steel/20 backdrop-blur-sm">
                          <div className="flex items-center">
                            <div className="flex-1 min-w-[200px] px-3 md:px-4 py-1.5">
                              <span className="text-[10px] font-jost font-bold text-lodha-grey/30 uppercase tracking-widest">Deliverable</span>
                            </div>
                            {towers.map(t => (
                              <div key={t} className="w-20 md:w-24 flex-shrink-0 text-center py-1.5">
                                <span className="text-[10px] font-jost font-bold text-lodha-grey/40 uppercase">{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Segments */}
                      {Object.entries(segments)
                        .sort(([a], [b]) => (SEGMENT_ORDER[a] || 99) - (SEGMENT_ORDER[b] || 99))
                        .map(([segment, tradeGroups]) => {
                          const isMEP = segment === 'MEP';
                          const multiSegment = Object.keys(segments).length > 1;

                          return (
                            <div key={segment}>
                              {multiSegment && (
                                <div className="px-3 md:px-4 py-1 bg-lodha-sand/30 border-b border-lodha-steel/15">
                                  <span className="text-[10px] font-jost font-bold text-lodha-grey/30 uppercase tracking-widest">{segment}</span>
                                </div>
                              )}

                              {Object.entries(tradeGroups).sort(([a], [b]) => a.localeCompare(b)).map(([tradeKey, rows]) => {
                                const showTradeLabel = isMEP && tradeKey !== '_all';
                                return (
                                  <div key={tradeKey}>
                                    {showTradeLabel && (
                                      <div className="px-4 md:px-5 py-0.5 bg-lodha-sand/15 border-b border-lodha-steel/10">
                                        <span className="text-[10px] font-jost font-semibold text-lodha-grey/35 uppercase tracking-wide">{tradeKey}</span>
                                      </div>
                                    )}

                                    <div className="divide-y divide-lodha-steel/8">
                                      {Object.entries(rows).map(([rowKey, row]) => {
                                        const isExpanded = expandedRows.has(rowKey);
                                        const allRowItems = Object.values(row.items);
                                        const rowDone = allRowItems.filter(i => i.status === 'completed').length;
                                        const rowTotal = allRowItems.length;
                                        const TIcon = TRADE_ICONS[row.trade] || FileText;
                                        const isProjectLevel = !!row.items['_proj'] && !towers.some(t => row.items[t]);

                                        return (
                                          <div key={rowKey} className={isExpanded ? 'bg-lodha-sand/20' : ''}>
                                            <div className="flex items-center cursor-pointer hover:bg-lodha-sand/20 transition-colors" onClick={() => toggleRow(rowKey)}>
                                              {/* Deliverable name */}
                                              <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 md:px-4 py-2">
                                                <TIcon className="w-3.5 h-3.5 text-lodha-grey/25 flex-shrink-0 hidden sm:block" />
                                                <span className="font-jost text-[13px] text-lodha-grey truncate">{row.base}</span>
                                                {isProjectLevel && <span className="text-[9px] font-jost text-lodha-grey/25 bg-lodha-sand/50 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">Project</span>}
                                                {isMultiTower && !isProjectLevel && <span className="text-[10px] font-jost text-lodha-grey/20 flex-shrink-0">{rowDone}/{rowTotal}</span>}
                                                {(!isMultiTower || isProjectLevel) && (
                                                  <>
                                                    {allRowItems[0]?.expected_completion_date && (
                                                      <span className="text-[11px] text-lodha-grey/30 font-jost flex-shrink-0 hidden md:flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />{dateFmt(allRowItems[0].expected_completion_date)}
                                                      </span>
                                                    )}
                                                    {/* Single-tower or project-level: show status dot inline */}
                                                    <span className="ml-auto flex-shrink-0">
                                                      <StatusCell item={allRowItems[0]} />
                                                    </span>
                                                  </>
                                                )}
                                                {isExpanded ? <ChevronDown className="w-3 h-3 text-lodha-grey/20 flex-shrink-0 ml-auto" /> : <ChevronRight className="w-3 h-3 text-lodha-grey/20 flex-shrink-0 ml-auto" />}
                                              </div>

                                              {/* Tower status cells (multi-tower, per-tower items only) */}
                                              {isMultiTower && !isProjectLevel && towers.map(tower => (
                                                <div key={tower} className="w-20 md:w-24 flex-shrink-0 flex items-center justify-center py-2"
                                                  onClick={e => e.stopPropagation()}>
                                                  <StatusCell item={row.items[tower]} />
                                                </div>
                                              ))}
                                              {/* Project-level: span the tower columns area */}
                                              {isMultiTower && isProjectLevel && (
                                                <div style={{ width: `${towers.length * 96}px` }} className="flex-shrink-0" />
                                              )}
                                            </div>

                                            {/* Expanded detail */}
                                            {isExpanded && <RowDetail row={row} />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="bg-white border border-lodha-steel rounded-lg p-8 text-center">
                <p className="text-lodha-grey/40 font-jost text-sm">No items match your filters</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Complete Modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-sm w-full p-5">
            <h3 className="font-garamond text-lg font-bold text-lodha-grey mb-1">Mark Complete</h3>
            <p className="text-xs text-lodha-grey/50 font-jost mb-3">{completeModal.item_name}</p>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)..." rows={2}
              className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCompleteModal(null); setRemarks(''); }} className="px-3 py-1.5 text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleComplete(completeModal.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-jost font-semibold rounded-lg hover:bg-emerald-700 transition-colors">Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Modal */}
      {reviseModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-sm w-full p-5">
            <h3 className="font-garamond text-lg font-bold text-lodha-grey mb-1">Request Revision</h3>
            <p className="text-xs text-lodha-grey/50 font-jost mb-0.5">{reviseModal.item_name}</p>
            <p className="text-[10px] text-amber-600 font-jost mb-3">{reviseModal.revision || 'R0'} → R{(reviseModal.revision_count || 0) + 1}</p>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for revision (required)..." rows={2}
              className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setReviseModal(null); setRemarks(''); }} className="px-3 py-1.5 text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleRevise(reviseModal.id)} disabled={!remarks.trim()} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-jost font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </Layout>
  );
}
