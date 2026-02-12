import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Send,
  Filter, Search, ArrowLeft, MessageSquare, User, Calendar,
  Building2, ChevronDown, ChevronUp, BarChart3, Eye
} from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  l2_reviewed: { label: 'L2 Reviewed', color: 'bg-blue-100 text-blue-700', icon: Eye },
  l1_approved: { label: 'L1 Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  l1_rejected: { label: 'L1 Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  implemented: { label: 'Implemented', color: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
};

const IMPACT_CONFIG = {
  low: { label: 'Low Impact', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  medium: { label: 'Medium Impact', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'High Impact', color: 'bg-red-50 text-red-700 border-red-200' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300' },
};

export default function RFCManagement() {
  const navigate = useNavigate();
  const { userLevel } = useUser();

  const [rfcs, setRFCs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterImpact, setFilterImpact] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [projects, setProjects] = useState([]);
  const [newRFC, setNewRFC] = useState({
    project_id: '', title: '', description: '', impact_level: 'medium',
    discipline: '', cost_impact: '', schedule_impact: '',
  });

  const fetchRFCs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchJson('/api/rfc');
      setRFCs(Array.isArray(data) ? data : data.rfcs || []);
    } catch (err) {
      toast.error('Failed to load RFCs');
      setRFCs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetchJson('/api/rfc/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch RFC stats:', err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiFetchJson('/api/projects');
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, []);

  useEffect(() => { fetchRFCs(); fetchStats(); fetchProjects(); }, [fetchRFCs, fetchStats, fetchProjects]);

  const handleCreate = async () => {
    if (!newRFC.title || !newRFC.project_id) {
      toast.error('Title and project are required');
      return;
    }
    try {
      await apiFetchJson('/api/rfc', {
        method: 'POST',
        body: JSON.stringify(newRFC),
      });
      toast.success('RFC submitted successfully');
      setShowCreateModal(false);
      setNewRFC({ project_id: '', title: '', description: '', impact_level: 'medium', discipline: '', cost_impact: '', schedule_impact: '' });
      fetchRFCs();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to submit RFC');
    }
  };

  const handleL2Review = async (rfcId) => {
    try {
      await apiFetchJson(`/api/rfc/${rfcId}/l2-review`, {
        method: 'PUT',
        body: JSON.stringify({ l2_remarks: reviewRemarks }),
      });
      toast.success('L2 review submitted');
      setShowDetailModal(null);
      setReviewRemarks('');
      fetchRFCs();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    }
  };

  const handleL1Decision = async (rfcId, decision) => {
    try {
      await apiFetchJson(`/api/rfc/${rfcId}/l1-review`, {
        method: 'PUT',
        body: JSON.stringify({ decision, l1_remarks: reviewRemarks }),
      });
      toast.success(`RFC ${decision === 'approve' ? 'approved' : 'rejected'}`);
      setShowDetailModal(null);
      setReviewRemarks('');
      fetchRFCs();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to submit decision');
    }
  };

  // Filter
  const filteredRFCs = rfcs.filter(rfc => {
    if (filterStatus !== 'All' && rfc.status !== filterStatus) return false;
    if (filterImpact !== 'All' && rfc.impact_level !== filterImpact) return false;
    if (searchTerm && !rfc.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-garamond font-bold text-lodha-grey">Request for Change</h1>
            <p className="text-sm text-lodha-grey/60 font-jost mt-1">Track and manage design change requests</p>
          </div>
          {['L2', 'L3', 'SUPER_ADMIN'].includes(userLevel) && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors">
              <Send className="w-4 h-4" /> Submit RFC
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total || 0, icon: FileText, bg: 'bg-lodha-gold/10', iconColor: 'text-lodha-gold' },
            { label: 'Pending', value: stats.pending || 0, icon: Clock, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
            { label: 'L2 Reviewed', value: stats.l2_reviewed || 0, icon: Eye, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
            { label: 'Approved', value: stats.approved || 0, icon: CheckCircle2, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: 'Critical', value: stats.critical || 0, icon: AlertTriangle, bg: 'bg-red-50', iconColor: 'text-red-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-lodha-steel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-garamond font-bold text-lodha-grey">{s.value}</p>
                  <p className="text-xs text-lodha-grey/60 font-jost">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey/40" />
            <input type="text" placeholder="Search RFCs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="l2_reviewed">L2 Reviewed</option>
            <option value="l1_approved">L1 Approved</option>
            <option value="l1_rejected">L1 Rejected</option>
            <option value="implemented">Implemented</option>
          </select>
          <select value={filterImpact} onChange={(e) => setFilterImpact(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
            <option value="All">All Impact</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* RFC List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-lodha-gold border-t-transparent rounded-full" />
        </div>
      ) : filteredRFCs.length === 0 ? (
        <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-lodha-grey/30 mx-auto mb-3" />
          <p className="text-lodha-grey/60 font-jost">No RFCs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRFCs.map(rfc => {
            const statusCfg = STATUS_CONFIG[rfc.status] || STATUS_CONFIG['pending'];
            const impactCfg = IMPACT_CONFIG[rfc.impact_level] || IMPACT_CONFIG['medium'];
            const StatusIcon = statusCfg.icon;
            const isCritical = rfc.impact_level === 'critical' || rfc.impact_level === 'high';

            return (
              <div key={rfc.id} className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer ${isCritical ? 'border-red-200' : 'border-lodha-steel'}`} onClick={() => setShowDetailModal(rfc)}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCritical ? 'bg-red-50' : 'bg-lodha-gold/10'}`}>
                    <FileText className={`w-5 h-5 ${isCritical ? 'text-red-600' : 'text-lodha-gold'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-jost font-semibold text-lodha-grey">{rfc.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-jost font-semibold ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-jost font-semibold border ${impactCfg.color}`}>
                        {impactCfg.label}
                      </span>
                    </div>
                    {rfc.description && (
                      <p className="text-sm text-lodha-grey/60 font-jost mb-2 line-clamp-2">{rfc.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-lodha-grey/60 font-jost">
                      {rfc.project_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {rfc.project_name}
                        </span>
                      )}
                      {rfc.discipline && <span>{rfc.discipline}</span>}
                      {rfc.created_by_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {rfc.created_by_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(rfc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create RFC Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-4">Submit Request for Change</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Project *</label>
                <select value={newRFC.project_id} onChange={(e) => setNewRFC({...newRFC, project_id: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Title *</label>
                <input type="text" value={newRFC.title} onChange={(e) => setNewRFC({...newRFC, title: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="Change request title" />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Description</label>
                <textarea value={newRFC.description} onChange={(e) => setNewRFC({...newRFC, description: e.target.value})} rows={4} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="Describe the change request in detail" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Impact Level</label>
                  <select value={newRFC.impact_level} onChange={(e) => setNewRFC({...newRFC, impact_level: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Discipline</label>
                  <select value={newRFC.discipline} onChange={(e) => setNewRFC({...newRFC, discipline: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                    <option value="">Select</option>
                    <option value="Electrical">Electrical</option>
                    <option value="PHE">PHE</option>
                    <option value="Fire Fighting">Fire Fighting</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Cost Impact</label>
                  <input type="text" value={newRFC.cost_impact} onChange={(e) => setNewRFC({...newRFC, cost_impact: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="e.g., ₹50,000" />
                </div>
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Schedule Impact</label>
                  <input type="text" value={newRFC.schedule_impact} onChange={(e) => setNewRFC({...newRFC, schedule_impact: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="e.g., 2 weeks delay" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-lodha-gold text-white text-sm font-jost font-semibold rounded-lg hover:bg-lodha-grey transition-colors">Submit RFC</button>
            </div>
          </div>
        </div>
      )}

      {/* RFC Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-garamond text-xl font-bold text-lodha-grey">{showDetailModal.title}</h3>
                <p className="text-xs text-lodha-grey/60 font-jost mt-1">
                  {showDetailModal.project_name} • {showDetailModal.discipline || 'General'} • {new Date(showDetailModal.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const s = STATUS_CONFIG[showDetailModal.status] || STATUS_CONFIG['pending'];
                  const I = s.icon;
                  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-jost font-semibold ${s.color}`}><I className="w-3.5 h-3.5" /> {s.label}</span>;
                })()}
                {(() => {
                  const imp = IMPACT_CONFIG[showDetailModal.impact_level] || IMPACT_CONFIG['medium'];
                  return <span className={`px-2.5 py-1 rounded-full text-xs font-jost font-semibold border ${imp.color}`}>{imp.label}</span>;
                })()}
              </div>
            </div>

            {showDetailModal.description && (
              <div className="bg-lodha-sand/50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-jost font-semibold text-lodha-grey mb-1">Description</h4>
                <p className="text-sm text-lodha-grey/70 font-jost whitespace-pre-wrap">{showDetailModal.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              {showDetailModal.cost_impact && (
                <div className="bg-lodha-sand/50 rounded-lg p-3">
                  <p className="text-xs text-lodha-grey/60 font-jost">Cost Impact</p>
                  <p className="text-sm font-jost font-semibold text-lodha-grey">{showDetailModal.cost_impact}</p>
                </div>
              )}
              {showDetailModal.schedule_impact && (
                <div className="bg-lodha-sand/50 rounded-lg p-3">
                  <p className="text-xs text-lodha-grey/60 font-jost">Schedule Impact</p>
                  <p className="text-sm font-jost font-semibold text-lodha-grey">{showDetailModal.schedule_impact}</p>
                </div>
              )}
            </div>

            {/* Review History */}
            {(showDetailModal.l2_remarks || showDetailModal.l1_remarks) && (
              <div className="border-t border-lodha-steel/30 pt-4 mb-4">
                <h4 className="text-sm font-jost font-semibold text-lodha-grey mb-3">Review History</h4>
                <div className="space-y-3 pl-4 border-l-2 border-lodha-gold/30">
                  {showDetailModal.l2_remarks && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-jost font-semibold text-blue-700 mb-1">L2 Review</p>
                      <p className="text-sm text-blue-800/70">{showDetailModal.l2_remarks}</p>
                    </div>
                  )}
                  {showDetailModal.l1_remarks && (
                    <div className={`rounded-lg p-3 ${showDetailModal.status === 'l1_approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <p className={`text-xs font-jost font-semibold mb-1 ${showDetailModal.status === 'l1_approved' ? 'text-emerald-700' : 'text-red-700'}`}>L1 Decision</p>
                      <p className={`text-sm ${showDetailModal.status === 'l1_approved' ? 'text-emerald-800/70' : 'text-red-800/70'}`}>{showDetailModal.l1_remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review Actions */}
            {showDetailModal.status === 'pending' && ['L2', 'SUPER_ADMIN'].includes(userLevel) && (
              <div className="border-t border-lodha-steel/30 pt-4">
                <h4 className="text-sm font-jost font-semibold text-lodha-grey mb-2">L2 Review</h4>
                <textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} placeholder="Review remarks..." rows={2} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-3" />
                <button onClick={() => handleL2Review(showDetailModal.id)} className="px-4 py-2 bg-blue-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-blue-700 transition-colors">Submit L2 Review</button>
              </div>
            )}

            {showDetailModal.status === 'l2_reviewed' && ['L1', 'SUPER_ADMIN'].includes(userLevel) && (
              <div className="border-t border-lodha-steel/30 pt-4">
                <h4 className="text-sm font-jost font-semibold text-lodha-grey mb-2">L1 Decision</h4>
                <textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} placeholder="Decision remarks..." rows={2} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-3" />
                <div className="flex items-center gap-3">
                  <button onClick={() => handleL1Decision(showDetailModal.id, 'approve')} className="px-4 py-2 bg-emerald-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => handleL1Decision(showDetailModal.id, 'reject')} className="px-4 py-2 bg-red-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => { setShowDetailModal(null); setReviewRemarks(''); }} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
