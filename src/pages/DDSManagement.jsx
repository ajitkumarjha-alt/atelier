import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle, Download,
  RefreshCw, ChevronDown, ChevronUp, Filter, Search,
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

// ──── Trade/Discipline icons & colors ────
const TRADE_ICONS = {
  'Electrical': Zap,
  'PHE': Droplets,
  'Fire Fighting': Flame,
  'HVAC': Wind,
  'Security': Shield,
  'Lighting': Lightbulb,
  'Small Power': Zap,
  'Lightning Protection': Zap,
  'Containment': Layers,
  'FA & PA': Radio,
  'FAVA': Radio,
  'ELV': Radio,
  'Lifts': Layers,
  'Co-ordinate': Clipboard,
  'Builders Work': PenTool,
  'MEP': Layers,
  'Architecture': Building2,
  'Structure': Building2,
  'Workshop': Clipboard,
  'Interior Design': PenTool,
};

const TRADE_COLORS = {
  'Electrical': 'text-amber-600 bg-amber-50 border-amber-200',
  'PHE': 'text-blue-600 bg-blue-50 border-blue-200',
  'Fire Fighting': 'text-red-600 bg-red-50 border-red-200',
  'HVAC': 'text-teal-600 bg-teal-50 border-teal-200',
  'Security': 'text-purple-600 bg-purple-50 border-purple-200',
  'Lighting': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  'Small Power': 'text-orange-600 bg-orange-50 border-orange-200',
  'Lightning Protection': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  'Containment': 'text-gray-600 bg-gray-50 border-gray-200',
  'FA & PA': 'text-pink-600 bg-pink-50 border-pink-200',
  'FAVA': 'text-pink-600 bg-pink-50 border-pink-200',
  'ELV': 'text-cyan-600 bg-cyan-50 border-cyan-200',
  'Lifts': 'text-violet-600 bg-violet-50 border-violet-200',
  'MEP': 'text-lodha-gold bg-lodha-sand border-lodha-muted-gold',
  'Architecture': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Structure': 'text-stone-600 bg-stone-50 border-stone-200',
  'Workshop': 'text-rose-600 bg-rose-50 border-rose-200',
  'Co-ordinate': 'text-sky-600 bg-sky-50 border-sky-200',
  'Builders Work': 'text-amber-700 bg-amber-50 border-amber-200',
  'Interior Design': 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200',
};

// ──── MEP hierarchy ────
const MEP_SUB_TRADES = new Set([
  'Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security', 'FAVA', 'FA & PA',
  'ELV', 'Lifts', 'Lighting', 'Small Power', 'Lightning Protection',
  'Containment', 'Earthing', 'DG', 'STP', 'OWC', 'Solar Hot Water',
]);

function getSegment(trade) {
  if (!trade || trade === 'MEP' || MEP_SUB_TRADES.has(trade)) return 'MEP';
  return trade;
}

const SEGMENT_CONFIG = {
  'Architecture': { icon: Building2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', order: 1 },
  'Structure': { icon: Building2, color: 'text-stone-700 bg-stone-50 border-stone-200', order: 2 },
  'MEP': { icon: Layers, color: 'text-lodha-gold bg-lodha-sand border-lodha-muted-gold', order: 3 },
  'Workshop': { icon: Clipboard, color: 'text-rose-700 bg-rose-50 border-rose-200', order: 4 },
  'Interior Design': { icon: PenTool, color: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200', order: 5 },
};

// ──── Phase config ────
const PHASE_CONFIG = {
  'A - Design Stage': { icon: PenTool, color: 'text-emerald-700 bg-emerald-50 border-emerald-300', label: 'Design Stage' },
  'B - Tender': { icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-300', label: 'Tender' },
  'C - VFC (Vendor Final Confirmation)': { icon: CheckCircle2, color: 'text-amber-700 bg-amber-50 border-amber-300', label: 'VFC' },
  'D - DD (Design Development)': { icon: Clipboard, color: 'text-purple-700 bg-purple-50 border-purple-300', label: 'DD' },
  'E - Schematic': { icon: Layers, color: 'text-teal-700 bg-teal-50 border-teal-300', label: 'Schematic' },
};

const STATUS_CONFIG = {
  'pending': { label: 'Pending', color: 'bg-lodha-steel/20 text-lodha-grey', icon: Clock },
  'in_progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Edit3 },
  'completed': { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'revised': { label: 'Revised', color: 'bg-amber-100 text-amber-700', icon: RefreshCw },
  'overdue': { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

function StatusBadge({ status, dueDate }) {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'completed';
  const effectiveStatus = isOverdue ? 'overdue' : status;
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG['pending'];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-jost font-semibold ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function ProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-lodha-steel/20 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-lodha-gold to-lodha-muted-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-jost font-semibold text-lodha-grey whitespace-nowrap">{pct}%</span>
    </div>
  );
}

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
  const [filterBuilding, setFilterBuilding] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [completeModal, setCompleteModal] = useState(null);
  const [reviseModal, setReviseModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [showPolicyInfo, setShowPolicyInfo] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('schedule');
  const { confirm, dialogProps } = useConfirm();

  // ──── Data fetching ────
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
    try {
      const data = await apiFetchJson(`/api/dds/${dds.id}/progress`);
      setProgress(data);
    } catch { /* ignore */ }
  }, [dds]);

  const fetchPendingInputs = useCallback(async () => {
    if (!dds) return;
    try {
      const data = await apiFetchJson(`/api/dds/${dds.id}/pending-inputs`);
      setPendingInputs(data);
    } catch { /* ignore */ }
  }, [dds]);

  useEffect(() => { fetchDDS(); }, [fetchDDS]);
  useEffect(() => { fetchProgress(); fetchPendingInputs(); }, [fetchProgress, fetchPendingInputs]);

  // Expand all phase sections by default when data loads
  useEffect(() => {
    if (Object.keys(phases).length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(Object.keys(phases)));
    }
  }, [phases]);

  // ──── Actions ────
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await apiFetchJson(`/api/dds/generate/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ dds_type: 'internal', tower_stagger_weeks: 4 }),
      });
      toast.success('DDS generated using Policy 130');
      fetchDDS();
    } catch (err) {
      toast.error(err.message || 'Failed to generate DDS');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (itemId) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/complete`, {
        method: 'PUT', body: JSON.stringify({ remarks }),
      });
      toast.success('Item marked as completed');
      setCompleteModal(null); setRemarks('');
      fetchDDS();
    } catch (err) {
      toast.error(err.message || 'Failed to complete item');
    }
  };

  const handleRevise = async (itemId) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/revise`, {
        method: 'PUT', body: JSON.stringify({ remarks }),
      });
      toast.success('Revision submitted');
      setReviseModal(null); setRemarks('');
      fetchDDS();
    } catch (err) {
      toast.error(err.message || 'Failed to submit revision');
    }
  };

  const handleMarkInput = async (itemId, inputType) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/mark-input`, {
        method: 'PUT', body: JSON.stringify({ input_type: inputType }),
      });
      toast.success(`${inputType} input marked as received`);
      fetchDDS(); fetchPendingInputs();
    } catch (err) {
      toast.error(err.message || 'Failed to mark input');
    }
  };

  const handleRegenerate = async () => {
    if (!dds) return;
    const confirmed = await confirm({ title: 'Regenerate DDS', message: 'Regenerate DDS? Non-completed items will be replaced with updated policy dates.', variant: 'warning', confirmLabel: 'Regenerate' });
    if (!confirmed) return;
    try {
      setGenerating(true);
      await apiFetchJson(`/api/dds/${dds.id}/regenerate`, { method: 'POST' });
      toast.success('DDS regenerated');
      fetchDDS();
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiFetchJson(`/api/dds/${dds.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DDS_${projectId}_v${dds.version}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DDS exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSection = (key) => {
    setExpandedSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  // ──── Derived data ────
  const buildingNames = [...new Set(items.map(i => i.building_name).filter(Boolean))].sort();
  const phaseKeys = Object.keys(phases).sort();

  const filteredItems = items.filter(item => {
    if (activePhase !== 'all' && item.phase !== activePhase) return false;
    if (filterTrade !== 'All') {
      const t = item.trade || item.discipline;
      if (filterTrade === 'MEP') {
        if (getSegment(t) !== 'MEP') return false;
      } else if (t !== filterTrade) return false;
    }
    if (filterBuilding !== 'All' && item.building_name !== filterBuilding) return false;
    if (filterStatus !== 'All') {
      const isOverdue = item.expected_completion_date && new Date(item.expected_completion_date) < new Date() && item.status !== 'completed';
      const eff = isOverdue ? 'overdue' : item.status;
      if (eff !== filterStatus) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!item.item_name?.toLowerCase().includes(q) &&
          !(item.trade || '').toLowerCase().includes(q) &&
          !(item.section || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Group by phase → segment → trade
  const groupedByPhase = {};
  for (const item of filteredItems) {
    const phase = item.phase || 'General';
    const trade = item.trade || item.discipline || 'General';
    const segment = getSegment(trade);
    const subTrade = segment === 'MEP' ? (trade === 'MEP' ? 'MEP Coordination' : trade) : '_all';
    if (!groupedByPhase[phase]) groupedByPhase[phase] = {};
    if (!groupedByPhase[phase][segment]) groupedByPhase[phase][segment] = {};
    if (!groupedByPhase[phase][segment][subTrade]) groupedByPhase[phase][segment][subTrade] = [];
    groupedByPhase[phase][segment][subTrade].push(item);
  }

  // Derived: unique MEP sub-trades and non-MEP trades in data
  const mepTrades = [...new Set(items.map(i => i.trade || i.discipline).filter(t => MEP_SUB_TRADES.has(t)))].sort();
  const nonMepTrades = [...new Set(items.map(i => i.trade || i.discipline).filter(t => t && !MEP_SUB_TRADES.has(t) && t !== 'MEP'))].sort();

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const overdueItems = items.filter(i => i.expected_completion_date && new Date(i.expected_completion_date) < new Date() && i.status !== 'completed').length;
  const revisedItems = items.filter(i => i.revision && i.revision !== 'R0').length;

  // ──── Render helper for a single DDS item ────
  const renderItem = (item, TIcon, isExpanded) => (
    <div key={item.id} className="px-6 py-3 hover:bg-lodha-sand/30 transition-colors">
      <div className="flex items-center gap-3">
        <TIcon className="w-4 h-4 text-lodha-grey/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-jost font-semibold text-sm text-lodha-grey truncate">{item.item_name}</span>
            {item.revision && item.revision !== 'R0' && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-jost font-semibold">{item.revision}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-lodha-grey/50 font-jost flex-wrap">
            {item.building_name && <span>{item.building_name}</span>}
            {item.building_name && <span>&middot;</span>}
            <span>{item.trade || item.discipline}</span>
            {item.section && <><span>&middot;</span><span className="opacity-60">{item.section}</span></>}
            {item.level_type && <><span>&middot;</span><span>{item.level_type}</span></>}
            {item.doc_type && <><span>&middot;</span><span className="opacity-60">{item.doc_type}</span></>}
            {item.expected_completion_date && (
              <><span>&middot;</span><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.expected_completion_date).toLocaleDateString()}</span></>
            )}
          </div>
        </div>
        <StatusBadge status={item.status} dueDate={item.expected_completion_date} />
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.status !== 'completed' && ['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
            <button onClick={() => setCompleteModal(item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark Complete" aria-label="Mark Complete">
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {item.status === 'completed' && ['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
            <button onClick={() => setReviseModal(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Request Revision" aria-label="Request Revision">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => toggleExpand(item.id)} className="p-1.5 text-lodha-grey/40 hover:text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-3 ml-7 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-lodha-sand/50 rounded-lg p-3">
            <h4 className="font-jost font-semibold text-lodha-grey text-xs mb-2">Schedule</h4>
            <div className="space-y-1 text-xs text-lodha-grey/70">
              <p>Start: {item.expected_start_date ? new Date(item.expected_start_date).toLocaleDateString() : '—'}</p>
              <p>Due: {item.expected_completion_date ? new Date(item.expected_completion_date).toLocaleDateString() : '—'}</p>
              {item.actual_completion_date && <p>Completed: {new Date(item.actual_completion_date).toLocaleDateString()}</p>}
              {item.policy_week_offset != null && <p>Policy Week: W{item.policy_week_offset}</p>}
              {item.assigned_to_name && <p>Assigned: {item.assigned_to_name}</p>}
            </div>
          </div>
          <div className="bg-lodha-sand/50 rounded-lg p-3">
            <h4 className="font-jost font-semibold text-lodha-grey text-xs mb-2">Input Status</h4>
            <div className="space-y-1 text-xs text-lodha-grey/70">
              <p>Architect: {item.architect_input_date
                ? (item.architect_input_received ? '✓ Received' : `✗ Due ${new Date(item.architect_input_date).toLocaleDateString()}`)
                : '—'}</p>
              <p>Structure: {item.structure_input_date
                ? (item.structure_input_received ? '✓ Received' : `✗ Due ${new Date(item.structure_input_date).toLocaleDateString()}`)
                : '—'}</p>
              {item.description && <p className="mt-1 italic">{item.description}</p>}
            </div>
            {['L0', 'L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
              <div className="flex gap-2 mt-2">
                {item.architect_input_date && !item.architect_input_received && (
                  <button onClick={() => handleMarkInput(item.id, 'architect')} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded font-jost font-semibold hover:bg-emerald-200">✓ Architect</button>
                )}
                {item.structure_input_date && !item.structure_input_received && (
                  <button onClick={() => handleMarkInput(item.id, 'structure')} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded font-jost font-semibold hover:bg-emerald-200">✓ Structure</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-lodha-gold border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-lodha-gold hover:text-lodha-grey text-sm font-jost mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="heading-primary">Design Delivery Schedule</h1>
            <p className="page-subtitle">
              {dds?.policy_name
                ? `${dds.policy_name} • v${dds.version} • ${totalItems} items`
                : 'Policy 130 — Track design deliverables across all trades'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {dds && (
              <>
                <button onClick={() => setShowPolicyInfo(!showPolicyInfo)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors">
                  <Info className="w-3.5 h-3.5" /> Policy Info
                </button>
                {['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
                  <button onClick={handleRegenerate} disabled={generating} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Regenerate
                  </button>
                )}
                {['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
                  <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                )}
              </>
            )}
            {!dds && ['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
              <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors disabled:opacity-50">
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate DDS (Policy 130)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      {dds && (
        <div className="bg-white border border-lodha-steel rounded-xl p-1.5 mb-6 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {[
              { key: 'schedule', label: 'DDS Schedule', icon: Calendar },
              { key: 'drawings', label: 'Drawing Lists', icon: FileText },
              { key: 'boq', label: 'BOQ', icon: Clipboard },
              { key: 'progress', label: 'Progress Chart', icon: BarChart3 },
            ].map(tab => {
              const TIcon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveMainTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-jost font-semibold transition-colors ${
                    activeMainTab === tab.key
                      ? 'bg-lodha-gold text-white shadow-sm'
                      : 'text-lodha-grey hover:bg-lodha-sand'
                  }`}>
                  <TIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Policy Info Panel */}
      {showPolicyInfo && metadata && (
        <div className="mb-6 bg-white border border-lodha-gold/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-garamond text-lg font-bold text-lodha-grey flex items-center gap-2">
              <Info className="w-5 h-5 text-lodha-gold" /> Generation Details — Policy 130
            </h3>
            <button onClick={() => setShowPolicyInfo(false)} className="text-lodha-grey/40 hover:text-lodha-grey">
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-jost">
            <div><p className="text-lodha-grey/60 text-xs">Height Tier</p><p className="font-semibold text-lodha-grey">{metadata.tier?.label || '—'}</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Max Height</p><p className="font-semibold text-lodha-grey">{metadata.maxHeight || 0}m</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Tower Count</p><p className="font-semibold text-lodha-grey">{metadata.towerCount || 0}</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Tower Stagger</p><p className="font-semibold text-lodha-grey">{metadata.towerStaggerWeeks || 4} weeks</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Height Modifier</p><p className="font-semibold text-lodha-grey">+{metadata.heightModifierDays || 0} days</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Basement Modifier</p><p className="font-semibold text-lodha-grey">+{metadata.basementModifierDays || 0} days</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Total Items</p><p className="font-semibold text-lodha-grey">{metadata.totalItems || totalItems}</p></div>
            <div><p className="text-lodha-grey/60 text-xs">Design Duration</p><p className="font-semibold text-lodha-grey">{metadata.tier?.designMonths || '—'} months</p></div>
          </div>
          {metadata.phases && (
            <div className="mt-4 pt-3 border-t border-lodha-steel/30">
              <p className="text-xs text-lodha-grey/60 mb-2">Items by Phase</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(metadata.phases).map(([phase, count]) => (
                  <span key={phase} className="px-3 py-1 bg-lodha-sand rounded-full text-xs font-jost font-semibold text-lodha-grey capitalize">{phase}: {count}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Inputs Banner */}
      {pendingInputs.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-jost font-semibold text-amber-800 text-sm">Pending Inputs Required</h3>
              <div className="mt-2 space-y-1">
                {pendingInputs.slice(0, 5).map((input, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs text-amber-700">
                    <span className="truncate">{input.item_name} — awaiting {!input.architect_input_received && 'Architect'}{!input.architect_input_received && !input.structure_input_received && ' & '}{!input.structure_input_received && 'Structure'} input</span>
                    {['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
                      <div className="flex gap-2 flex-shrink-0">
                        {!input.architect_input_received && (
                          <button onClick={() => handleMarkInput(input.id, 'architect')} className="text-amber-600 hover:text-amber-800 font-semibold underline whitespace-nowrap">Mark Architect</button>
                        )}
                        {!input.structure_input_received && (
                          <button onClick={() => handleMarkInput(input.id, 'structure')} className="text-amber-600 hover:text-amber-800 font-semibold underline whitespace-nowrap">Mark Structure</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {pendingInputs.length > 5 && <p className="text-xs text-amber-600 mt-1">+ {pendingInputs.length - 5} more</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!dds ? (
        <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-lodha-gold" />
          </div>
          <h2 className="text-xl font-garamond font-bold text-lodha-grey mb-2">No DDS Found</h2>
          <p className="text-lodha-grey/60 font-jost mb-2 max-w-lg mx-auto">
            Generate a Design Delivery Schedule based on <strong>Policy 130</strong> (3 Yr 10 M Project Completion Guideline).
          </p>
          <p className="text-lodha-grey/50 font-jost text-xs mb-6 max-w-lg mx-auto">
            Auto-generates items across 5 phases: Design Stage, Tender, VFC, DD, Schematic — with dates calculated from project start, building height, and tower stagger.
          </p>
          {['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
            <button onClick={handleGenerate} disabled={generating} className="px-6 py-3 bg-lodha-gold text-white rounded-lg font-jost font-semibold hover:bg-lodha-grey transition-colors disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate DDS Now'}
            </button>
          )}
        </div>
      ) : activeMainTab === 'drawings' ? (
        <DDSDrawingList ddsId={dds.id} />
      ) : activeMainTab === 'boq' ? (
        <DDSBoqList ddsId={dds.id} />
      ) : activeMainTab === 'progress' ? (
        <DDSProgressChart ddsId={dds.id} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Items', value: totalItems, icon: FileText, bg: 'bg-lodha-gold/10', iconColor: 'text-lodha-gold' },
              { label: 'Completed', value: completedItems, icon: CheckCircle2, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', showProgress: true },
              { label: 'Overdue', value: overdueItems, icon: AlertTriangle, bg: 'bg-red-50', iconColor: 'text-red-600' },
              { label: 'Revised', value: revisedItems, icon: RefreshCw, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-lodha-steel rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-garamond font-bold text-lodha-grey">{s.value}</p>
                    <p className="text-xs text-lodha-grey/60 font-jost">{s.label}</p>
                  </div>
                </div>
                {s.showProgress && <ProgressBar completed={completedItems} total={totalItems} />}
              </div>
            ))}
          </div>

          {/* Phase Progress */}
          {progress && progress.length > 0 && (
            <div className="bg-white border border-lodha-steel rounded-xl p-6 mb-6">
              <h3 className="font-garamond text-lg font-bold text-lodha-grey mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-lodha-gold" /> Progress by Phase & Segment
              </h3>
              {(() => {
                // Group progress by phase → segment
                const phaseGroups = {};
                for (const p of progress) {
                  const phase = p.phase || 'General';
                  const segment = getSegment(p.discipline);
                  if (!phaseGroups[phase]) phaseGroups[phase] = {};
                  if (!phaseGroups[phase][segment]) phaseGroups[phase][segment] = { items: [], total: 0, completed: 0, overdue: 0 };
                  phaseGroups[phase][segment].items.push(p);
                  phaseGroups[phase][segment].total += parseInt(p.total_count || 0);
                  phaseGroups[phase][segment].completed += parseInt(p.completed_count || 0);
                  phaseGroups[phase][segment].overdue += parseInt(p.overdue_count || 0);
                }

                return Object.entries(phaseGroups).sort().map(([phase, segments]) => {
                  const phaseCfg = PHASE_CONFIG[phase] || {};
                  return (
                    <div key={phase} className="mb-4 last:mb-0">
                      <p className="text-xs font-jost font-semibold text-lodha-grey/50 uppercase tracking-wider mb-2">{phaseCfg.label || phase}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(segments)
                          .sort(([a], [b]) => (SEGMENT_CONFIG[a]?.order || 99) - (SEGMENT_CONFIG[b]?.order || 99))
                          .map(([segment, data]) => {
                            const segCfg = SEGMENT_CONFIG[segment] || {};
                            const SegIcon = segCfg.icon || FileText;
                            const segColors = segment === 'MEP'
                              ? 'text-lodha-gold bg-lodha-sand border-lodha-muted-gold'
                              : TRADE_COLORS[segment] || 'text-lodha-grey bg-lodha-sand border-lodha-steel';
                            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                            const isMEP = segment === 'MEP';

                            return (
                              <div key={segment} className={`border rounded-lg overflow-hidden ${segColors}`}>
                                {/* Segment header */}
                                <div className="p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <SegIcon className="w-4 h-4" />
                                    <span className="font-jost font-semibold text-sm">{segment}</span>
                                    <span className="ml-auto text-xs font-jost opacity-60">{phaseCfg.label || phase}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span>{data.completed}/{data.total}</span>
                                    {data.overdue > 0 && <span className="text-red-600 font-semibold">{data.overdue} overdue</span>}
                                    <span>{pct}%</span>
                                  </div>
                                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-current rounded-full opacity-60" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>

                                {/* MEP sub-trades breakdown */}
                                {isMEP && data.items.length > 1 && (
                                  <div className="border-t border-current/10 bg-white/30 px-3 py-2 space-y-1.5">
                                    {data.items.map((sub, si) => {
                                      const SubIcon = TRADE_ICONS[sub.discipline] || FileText;
                                      const subPct = sub.total_count > 0 ? Math.round(((sub.completed_count || 0) / sub.total_count) * 100) : 0;
                                      return (
                                        <div key={si} className="flex items-center gap-2 text-xs">
                                          <SubIcon className="w-3 h-3 opacity-60" />
                                          <span className="font-jost truncate flex-1">{sub.discipline}</span>
                                          <span className="text-xs opacity-60">{sub.completed_count || 0}/{sub.total_count}</span>
                                          <div className="w-12 h-1 bg-white/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-current rounded-full opacity-50" style={{ width: `${subPct}%` }} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Phase Tabs */}
          <div className="bg-white border border-lodha-steel rounded-xl p-3 mb-4 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button onClick={() => setActivePhase('all')} className={`px-4 py-2 rounded-lg text-xs font-jost font-semibold transition-colors ${activePhase === 'all' ? 'bg-lodha-gold text-white' : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-steel/30'}`}>
                All Phases ({totalItems})
              </button>
              {phaseKeys.map(phase => {
                const cfg = PHASE_CONFIG[phase] || {};
                const PhIcon = cfg.icon || FileText;
                const count = phases[phase]?.total || 0;
                return (
                  <button key={phase} onClick={() => setActivePhase(phase)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-jost font-semibold transition-colors ${activePhase === phase ? 'bg-lodha-gold text-white' : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-steel/30'}`}>
                    <PhIcon className="w-3.5 h-3.5" />
                    {cfg.label || phase} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border border-lodha-steel rounded-xl p-4 mb-6">
            {/* Search + mobile filter toggle */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey" />
                <input type="text" placeholder="Search items, trades, sections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
              </div>
              <button
                onClick={() => setShowMobileFilters(v => !v)}
                className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost font-semibold text-lodha-grey"
              >
                <Filter className="w-4 h-4" />
                Filters
                {showMobileFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            {/* Filter dropdowns — always visible on md+, collapsible on mobile */}
            <div className={`${showMobileFilters ? 'flex' : 'hidden'} md:flex items-center gap-2 flex-wrap mt-3`}>
              <Filter className="w-4 h-4 text-lodha-grey/60 hidden sm:block" />
              <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                <option value="All">All Buildings</option>
                {buildingNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                <option value="All">All Trades</option>
                {nonMepTrades.map(t => <option key={t} value={t}>{t}</option>)}
                <optgroup label="MEP">
                  <option value="MEP">All MEP Trades</option>
                  {mepTrades.map(t => <option key={t} value={t}>  {t}</option>)}
                </optgroup>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                <option value="All">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="revised">Revised</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Items grouped by Phase → Segment → Trade */}
          <div className="space-y-6">
            {Object.entries(groupedByPhase).sort().map(([phase, segments]) => {
              const phaseCfg = PHASE_CONFIG[phase] || {};
              const PhIcon = phaseCfg.icon || FileText;
              const phaseAllItems = Object.values(segments).flatMap(seg => Object.values(seg).flat());
              const phaseItemCount = phaseAllItems.length;
              const phaseCompletedCount = phaseAllItems.filter(i => i.status === 'completed').length;
              const isPhaseExpanded = expandedSections.has(phase);

              return (
                <div key={phase} className="bg-white border border-lodha-steel rounded-xl overflow-hidden">
                  {/* Phase Header */}
                  <button onClick={() => toggleSection(phase)} className={`w-full border-b px-6 py-4 flex items-center justify-between ${phaseCfg.color || 'bg-lodha-cream border-lodha-muted-gold/30 text-lodha-grey'}`}>
                    <h3 className="font-garamond text-lg font-bold flex items-center gap-2">
                      <PhIcon className="w-5 h-5" /> {phase}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-jost">{phaseCompletedCount}/{phaseItemCount} completed</span>
                      <div className="w-20"><ProgressBar completed={phaseCompletedCount} total={phaseItemCount} /></div>
                      {isPhaseExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isPhaseExpanded && (
                    <div>
                      {Object.entries(segments)
                        .sort(([a], [b]) => (SEGMENT_CONFIG[a]?.order || 99) - (SEGMENT_CONFIG[b]?.order || 99))
                        .map(([segment, trades]) => {
                          const segCfg = SEGMENT_CONFIG[segment] || {};
                          const SegIcon = segCfg.icon || FileText;
                          const segAllItems = Object.values(trades).flat();
                          const segCompleted = segAllItems.filter(i => i.status === 'completed').length;
                          const tradeEntries = Object.entries(trades).sort(([a], [b]) => a.localeCompare(b));
                          const isMEP = segment === 'MEP';

                          return (
                            <div key={segment}>
                              {/* Segment Header */}
                              <div className={`border-b border-lodha-steel/20 px-6 py-2.5 flex items-center justify-between ${segCfg.color || 'bg-lodha-sand/50'}`}>
                                <span className="flex items-center gap-2 font-garamond font-bold text-sm">
                                  <SegIcon className="w-4 h-4" /> {segment}
                                </span>
                                <span className="text-xs font-jost opacity-70">{segCompleted}/{segAllItems.length}</span>
                              </div>

                              {isMEP ? (
                                /* MEP: Show sub-trade groups */
                                tradeEntries.map(([trade, tradeItems]) => {
                                  const TIcon = TRADE_ICONS[trade === 'MEP Coordination' ? 'MEP' : trade] || FileText;
                                  const tradeColor = TRADE_COLORS[trade === 'MEP Coordination' ? 'MEP' : trade] || '';
                                  const tradeCompleted = tradeItems.filter(i => i.status === 'completed').length;
                                  return (
                                    <div key={trade}>
                                      <div className="bg-lodha-sand/30 border-b border-lodha-steel/10 px-8 py-1.5 flex items-center justify-between">
                                        <span className="flex items-center gap-2 font-jost font-semibold text-xs text-lodha-grey/70">
                                          <TIcon className="w-3.5 h-3.5" /> {trade}
                                        </span>
                                        <span className="text-xs font-jost text-lodha-grey/40">{tradeCompleted}/{tradeItems.length}</span>
                                      </div>
                                      <div className="divide-y divide-lodha-steel/20">
                                        {tradeItems.map(item => {
                                          const ItemIcon = TRADE_ICONS[item.trade || item.discipline] || FileText;
                                          const isExpanded = expandedItems.has(item.id);
                                          return renderItem(item, ItemIcon, isExpanded);
                                        })}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                /* Non-MEP: Show items directly */
                                <div className="divide-y divide-lodha-steel/20">
                                  {tradeEntries.flatMap(([, tradeItems]) => tradeItems).map(item => {
                                    const TIcon = TRADE_ICONS[item.trade || item.discipline] || FileText;
                                    const isExpanded = expandedItems.has(item.id);
                                    return renderItem(item, TIcon, isExpanded);
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
                <p className="text-lodha-grey/60 font-jost">No items match your filters</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Complete Modal */}
      {/* Complete Modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-md w-full p-6">
            <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-2">Mark as Completed</h3>
            <p className="text-sm text-lodha-grey/60 font-jost mb-4">{completeModal.item_name}</p>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Completion remarks (optional)..." rows={3}
              className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCompleteModal(null); setRemarks(''); }} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleComplete(completeModal.id)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-emerald-700 transition-colors">Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Modal */}
      {reviseModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-md w-full p-6">
            <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-2">Request Revision</h3>
            <p className="text-sm text-lodha-grey/60 font-jost mb-1">{reviseModal.item_name}</p>
            <p className="text-xs text-amber-600 font-jost mb-4">Current: {reviseModal.revision || 'R0'} → Next: R{(reviseModal.revision_count || 0) + 1}</p>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for revision (required)..." rows={3}
              className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setReviseModal(null); setRemarks(''); }} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleRevise(reviseModal.id)} disabled={!remarks.trim()} className="px-4 py-2 bg-amber-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50">Submit Revision</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </Layout>
  );
}
