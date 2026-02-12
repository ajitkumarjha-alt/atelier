import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle, Download,
  RefreshCw, ChevronDown, ChevronUp, Filter, Search,
  FileText, ArrowLeft, BarChart3, Eye, Edit3, Send,
  Layers, Building2, Zap, Droplets, Flame, Wind, Shield
} from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetchJson, apiFetch } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

const DISCIPLINE_ICONS = {
  'Electrical': Zap,
  'PHE': Droplets,
  'Fire Fighting': Flame,
  'HVAC': Wind,
  'Security': Shield,
};

const DISCIPLINE_COLORS = {
  'Electrical': 'text-amber-600 bg-amber-50 border-amber-200',
  'PHE': 'text-blue-600 bg-blue-50 border-blue-200',
  'Fire Fighting': 'text-red-600 bg-red-50 border-red-200',
  'HVAC': 'text-teal-600 bg-teal-50 border-teal-200',
  'Security': 'text-purple-600 bg-purple-50 border-purple-200',
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
        <div
          className="h-full bg-gradient-to-r from-lodha-gold to-lodha-muted-gold rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-jost font-semibold text-lodha-grey whitespace-nowrap">{pct}%</span>
    </div>
  );
}

function RevisionTimeline({ revisions }) {
  if (!revisions || revisions.length === 0) return null;

  return (
    <div className="mt-3 pl-4 border-l-2 border-lodha-gold/30 space-y-2">
      {revisions.map((rev, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-lodha-gold border-2 border-white" />
          <div className="bg-lodha-sand/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-jost font-semibold text-lodha-gold">{rev.revision_number}</span>
              <span className="text-xs text-lodha-grey/60">{new Date(rev.created_at).toLocaleDateString()}</span>
            </div>
            {rev.remarks && <p className="text-xs text-lodha-grey/80">{rev.remarks}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DDSManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { userLevel } = useUser();

  const [dds, setDDS] = useState(null);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(null);
  const [pendingInputs, setPendingInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterDiscipline, setFilterDiscipline] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [completeModal, setCompleteModal] = useState(null);
  const [reviseModal, setReviseModal] = useState(null);
  const [remarks, setRemarks] = useState('');

  const fetchDDS = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchJson(`/api/dds/project/${projectId}`);
      setDDS(data.dds);
      setItems(data.items || []);
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('No DDS')) {
        setDDS(null);
        setItems([]);
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
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  }, [dds]);

  const fetchPendingInputs = useCallback(async () => {
    if (!dds) return;
    try {
      const data = await apiFetchJson(`/api/dds/${dds.id}/pending-inputs`);
      setPendingInputs(data);
    } catch (err) {
      console.error('Failed to fetch pending inputs:', err);
    }
  }, [dds]);

  useEffect(() => { fetchDDS(); }, [fetchDDS]);
  useEffect(() => { fetchProgress(); fetchPendingInputs(); }, [fetchProgress, fetchPendingInputs]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await apiFetchJson(`/api/dds/generate/${projectId}`, { method: 'POST' });
      toast.success('DDS generated successfully');
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
        method: 'PUT',
        body: JSON.stringify({ remarks }),
      });
      toast.success('Item marked as completed');
      setCompleteModal(null);
      setRemarks('');
      fetchDDS();
    } catch (err) {
      toast.error(err.message || 'Failed to complete item');
    }
  };

  const handleRevise = async (itemId) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/revise`, {
        method: 'PUT',
        body: JSON.stringify({ remarks }),
      });
      toast.success('Revision submitted');
      setReviseModal(null);
      setRemarks('');
      fetchDDS();
    } catch (err) {
      toast.error(err.message || 'Failed to submit revision');
    }
  };

  const handleMarkInput = async (itemId, inputType) => {
    try {
      await apiFetchJson(`/api/dds/items/${itemId}/mark-input`, {
        method: 'PUT',
        body: JSON.stringify({ input_type: inputType }),
      });
      toast.success(`${inputType} input marked as received`);
      fetchDDS();
      fetchPendingInputs();
    } catch (err) {
      toast.error(err.message || 'Failed to mark input');
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiFetch(`/api/dds/${dds.id}/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DDS_${projectId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DDS exported successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filter items
  const disciplines = [...new Set(items.map(i => i.discipline))];
  const filteredItems = items.filter(item => {
    if (filterDiscipline !== 'All' && item.discipline !== filterDiscipline) return false;
    if (filterStatus !== 'All') {
      const isOverdue = item.target_date && new Date(item.target_date) < new Date() && item.status !== 'completed';
      const effectiveStatus = isOverdue ? 'overdue' : item.status;
      if (effectiveStatus !== filterStatus) return false;
    }
    if (searchTerm && !item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.scope?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Group by stage
  const groupedByStage = filteredItems.reduce((acc, item) => {
    const stage = item.stage || 'General';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(item);
    return acc;
  }, {});

  // Stats
  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const overdueItems = items.filter(i => i.target_date && new Date(i.target_date) < new Date() && i.status !== 'completed').length;
  const revisedItems = items.filter(i => i.current_revision && i.current_revision !== 'R0').length;

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
            <h1 className="heading-primary">
              Design Delivery Schedule
            </h1>
            <p className="page-subtitle">
              Track design deliverables across all disciplines
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dds && ['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-lodha-steel rounded-lg text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
            )}
            {!dds && ['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
              <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors disabled:opacity-50">
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate DDS'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pending Inputs Banner */}
      {pendingInputs.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-jost font-semibold text-amber-800 text-sm">Pending Inputs Required</h3>
              <div className="mt-2 space-y-1">
                {pendingInputs.slice(0, 5).map((input, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-amber-700">
                    <span>{input.item_name} — awaiting {!input.architect_input_received && 'Architect'}{!input.architect_input_received && !input.structure_input_received && ' & '}{!input.structure_input_received && 'Structure'} input</span>
                    {['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
                      <div className="flex gap-2">
                        {!input.architect_input_received && (
                          <button onClick={() => handleMarkInput(input.id, 'architect')} className="text-amber-600 hover:text-amber-800 font-semibold underline">Mark Architect</button>
                        )}
                        {!input.structure_input_received && (
                          <button onClick={() => handleMarkInput(input.id, 'structure')} className="text-amber-600 hover:text-amber-800 font-semibold underline">Mark Structure</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {pendingInputs.length > 5 && <p className="text-xs text-amber-600">+ {pendingInputs.length - 5} more items</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!dds ? (
        /* No DDS State */
        <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-lodha-gold" />
          </div>
          <h2 className="text-xl font-garamond font-bold text-lodha-grey mb-2">No DDS Found</h2>
          <p className="text-lodha-grey/60 font-jost mb-6 max-w-md mx-auto">
            Generate a Design Delivery Schedule to track all design deliverables for this project across Electrical, PHE, Fire Fighting, HVAC, and Security disciplines.
          </p>
          {['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
            <button onClick={handleGenerate} disabled={generating} className="px-6 py-3 bg-lodha-gold text-white rounded-lg font-jost font-semibold hover:bg-lodha-grey transition-colors disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate DDS Now'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-lodha-steel rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-lodha-gold/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-lodha-gold" />
                </div>
                <div>
                  <p className="text-2xl font-garamond font-bold text-lodha-grey">{totalItems}</p>
                  <p className="text-xs text-lodha-grey/60 font-jost">Total Items</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-lodha-steel rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-garamond font-bold text-lodha-grey">{completedItems}</p>
                  <p className="text-xs text-lodha-grey/60 font-jost">Completed</p>
                </div>
              </div>
              <ProgressBar completed={completedItems} total={totalItems} />
            </div>
            <div className="bg-white border border-lodha-steel rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-garamond font-bold text-lodha-grey">{overdueItems}</p>
                  <p className="text-xs text-lodha-grey/60 font-jost">Overdue</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-lodha-steel rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-garamond font-bold text-lodha-grey">{revisedItems}</p>
                  <p className="text-xs text-lodha-grey/60 font-jost">Revised</p>
                </div>
              </div>
            </div>
          </div>

          {/* Discipline Progress */}
          {progress && progress.length > 0 && (
            <div className="bg-white border border-lodha-steel rounded-xl p-6 mb-6">
              <h3 className="font-garamond text-lg font-bold text-lodha-grey mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-lodha-gold" /> Discipline Progress
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {progress.map((p, i) => {
                  const DIcon = DISCIPLINE_ICONS[p.discipline] || FileText;
                  const colors = DISCIPLINE_COLORS[p.discipline] || 'text-lodha-grey bg-lodha-sand border-lodha-steel';
                  return (
                    <div key={i} className={`border rounded-lg p-4 ${colors}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <DIcon className="w-5 h-5" />
                        <span className="font-jost font-semibold text-sm">{p.discipline}</span>
                        <span className="ml-auto text-xs font-jost">{p.stage}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span>{p.completed_count || 0} / {p.total_count || 0}</span>
                        <span>{p.total_count > 0 ? Math.round((p.completed_count / p.total_count) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current rounded-full opacity-60"
                          style={{ width: `${p.total_count > 0 ? (p.completed_count / p.total_count) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border border-lodha-steel rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey/40" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-lodha-grey/60" />
                <select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
                >
                  <option value="All">All Disciplines</option>
                  {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
                >
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="revised">Revised</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* DDS Items by Stage */}
          <div className="space-y-6">
            {Object.entries(groupedByStage).map(([stage, stageItems]) => (
              <div key={stage} className="bg-white border border-lodha-steel rounded-xl overflow-hidden">
                <div className="bg-lodha-cream border-b border-lodha-muted-gold/30 px-6 py-3 flex items-center justify-between">
                  <h3 className="font-garamond text-lg font-bold text-lodha-grey flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-lodha-gold" />
                    {stage}
                  </h3>
                  <span className="text-xs font-jost text-lodha-grey/60">
                    {stageItems.filter(i => i.status === 'completed').length}/{stageItems.length} completed
                  </span>
                </div>
                <div className="divide-y divide-lodha-steel/30">
                  {stageItems.map(item => {
                    const DIcon = DISCIPLINE_ICONS[item.discipline] || FileText;
                    const isExpanded = expandedItems.has(item.id);
                    return (
                      <div key={item.id} className="px-6 py-4 hover:bg-lodha-sand/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <DIcon className="w-5 h-5 text-lodha-grey/60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-jost font-semibold text-sm text-lodha-grey truncate">{item.item_name}</span>
                              {item.current_revision && item.current_revision !== 'R0' && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-jost font-semibold">{item.current_revision}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-lodha-grey/60 font-jost">
                              <span>{item.discipline}</span>
                              <span>•</span>
                              <span>{item.scope}</span>
                              {item.target_date && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(item.target_date).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={item.status} dueDate={item.target_date} />
                          <div className="flex items-center gap-2">
                            {item.status !== 'completed' && ['L2', 'L3', 'L4', 'SUPER_ADMIN'].includes(userLevel) && (
                              <button
                                onClick={() => setCompleteModal(item)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Mark Complete"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {item.status === 'completed' && ['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && (
                              <button
                                onClick={() => setReviseModal(item)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Request Revision"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="p-1.5 text-lodha-grey/40 hover:text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 ml-9 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-lodha-sand/50 rounded-lg p-3">
                              <h4 className="font-jost font-semibold text-lodha-grey text-xs mb-2">Details</h4>
                              <div className="space-y-1 text-xs text-lodha-grey/70">
                                <p>Consultant Due: {item.consultant_target_date ? new Date(item.consultant_target_date).toLocaleDateString() : '—'}</p>
                                <p>Architect Input: {item.architect_input_received ? '✓ Received' : '✗ Pending'}</p>
                                <p>Structure Input: {item.structure_input_received ? '✓ Received' : '✗ Pending'}</p>
                                {item.completed_date && <p>Completed: {new Date(item.completed_date).toLocaleDateString()}</p>}
                              </div>
                            </div>
                            {item.revisions && item.revisions.length > 0 && (
                              <div>
                                <h4 className="font-jost font-semibold text-lodha-grey text-xs mb-2">Revision History</h4>
                                <RevisionTimeline revisions={item.revisions} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
                <p className="text-lodha-grey/60 font-jost">No items match your filters</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Complete Modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-md w-full p-6">
            <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-2">Mark as Completed</h3>
            <p className="text-sm text-lodha-grey/60 font-jost mb-4">{completeModal.item_name}</p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add completion remarks (optional)..."
              rows={3}
              className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-4"
            />
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
            <p className="text-xs text-amber-600 font-jost mb-4">Current: {reviseModal.current_revision || 'R0'} → Next: R{parseInt((reviseModal.current_revision || 'R0').replace('R', '')) + 1}</p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Reason for revision (required)..."
              rows={3}
              className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setReviseModal(null); setRemarks(''); }} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleRevise(reviseModal.id)} disabled={!remarks.trim()} className="px-4 py-2 bg-amber-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50">Submit Revision</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
