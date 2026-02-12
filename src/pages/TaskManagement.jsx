import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, Calendar, Filter, Search,
  ChevronDown, ChevronUp, ListChecks, Flag, User, Building2,
  ArrowRight, BarChart3, Download
} from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetchJson } from '../lib/api';
import { useUser } from '../lib/UserContext';
import toast from 'react-hot-toast';

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  low: { label: 'Low', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-lodha-steel/20 text-lodha-grey', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: ArrowRight },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function TaskManagement() {
  const navigate = useNavigate();
  const { user, userLevel } = useUser();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '', description: '', assigned_to: '', project_id: '',
    priority: 'medium', due_date: '', dds_item_id: '',
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'my' ? '/api/tasks/my' : '/api/tasks';
      const data = await apiFetchJson(endpoint);
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch (err) {
      toast.error('Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetchJson('/api/tasks/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchTeamAndProjects = useCallback(async () => {
    try {
      const [usersRes, projRes] = await Promise.all([
        apiFetchJson('/api/users').catch(() => []),
        apiFetchJson('/api/projects').catch(() => []),
      ]);
      setTeamMembers(Array.isArray(usersRes) ? usersRes : usersRes.users || []);
      setProjects(Array.isArray(projRes) ? projRes : projRes.projects || []);
    } catch (err) {
      console.error('Failed to fetch team/projects:', err);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchStats(); fetchTeamAndProjects(); }, [fetchStats, fetchTeamAndProjects]);

  const handleCreate = async () => {
    if (!newTask.title || !newTask.assigned_to) {
      toast.error('Title and assignee are required');
      return;
    }
    try {
      await apiFetchJson('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });
      toast.success('Task created successfully');
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', assigned_to: '', project_id: '', priority: 'medium', due_date: '', dds_item_id: '' });
      fetchTasks();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleComplete = async (taskId, remarks) => {
    try {
      await apiFetchJson(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed', completion_remarks: remarks }),
      });
      toast.success('Task completed');
      setShowCompleteModal(null);
      fetchTasks();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to complete task');
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await apiFetchJson(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success('Status updated');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'All') {
      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
      const effectiveStatus = isOverdue ? 'overdue' : task.status;
      if (effectiveStatus !== filterStatus) return false;
    }
    if (filterPriority !== 'All' && task.priority !== filterPriority) return false;
    if (searchTerm && !task.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Group tasks
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const overdueTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="heading-primary">Task Management</h1>
            <p className="page-subtitle">Manage daily tasks and assignments</p>
          </div>
          {['L2', 'L1', 'SUPER_ADMIN'].includes(userLevel) && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-lodha-gold text-white rounded-lg text-sm font-jost font-semibold hover:bg-lodha-grey transition-colors">
              <ListChecks className="w-4 h-4" /> Assign Task
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-lodha-steel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lodha-gold/10 rounded-lg flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-lodha-gold" />
              </div>
              <div>
                <p className="text-2xl font-garamond font-bold text-lodha-grey">{stats.total || 0}</p>
                <p className="text-xs text-lodha-grey/60 font-jost">Total Tasks</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-lodha-steel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-garamond font-bold text-lodha-grey">{stats.pending || 0}</p>
                <p className="text-xs text-lodha-grey/60 font-jost">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-lodha-steel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-garamond font-bold text-lodha-grey">{stats.completed || 0}</p>
                <p className="text-xs text-lodha-grey/60 font-jost">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-lodha-steel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-garamond font-bold text-lodha-grey">{stats.overdue || 0}</p>
                <p className="text-xs text-lodha-grey/60 font-jost">Overdue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="bg-white border border-lodha-steel rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-lodha-sand rounded-lg p-1">
            <button onClick={() => setActiveTab('my')} className={`px-4 py-2 rounded-md text-sm font-jost font-semibold transition-all ${activeTab === 'my' ? 'bg-lodha-gold text-white shadow-sm' : 'text-lodha-grey hover:bg-white'}`}>My Tasks</button>
            {['L2', 'L1', 'SUPER_ADMIN'].includes(userLevel) && (
              <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-md text-sm font-jost font-semibold transition-all ${activeTab === 'all' ? 'bg-lodha-gold text-white shadow-sm' : 'text-lodha-grey hover:bg-white'}`}>All Tasks</button>
            )}
          </div>
          <div className="flex-1" />
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey/40" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
            <option value="All">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-lodha-gold border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Overdue Alert */}
          {overdueTasks.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-jost font-semibold text-red-800 text-sm">{overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between text-xs text-red-700 bg-red-100/50 rounded-lg px-3 py-2">
                    <span className="font-semibold">{task.title}</span>
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
                <ListChecks className="w-12 h-12 text-lodha-grey/30 mx-auto mb-3" />
                <p className="text-lodha-grey/60 font-jost">No tasks found</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['medium'];
                const statusCfg = STATUS_CONFIG[isOverdue ? 'overdue' : task.status] || STATUS_CONFIG['pending'];
                const StatusIcon = statusCfg.icon;

                return (
                  <div key={task.id} className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all ${isOverdue ? 'border-red-300' : 'border-lodha-steel'}`}>
                    <div className="flex items-start gap-4">
                      {/* Priority Dot */}
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${priority.dot}`} title={priority.label} />
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-jost font-semibold text-lodha-grey">{task.title}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-jost font-semibold ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-lodha-grey/60 font-jost mb-2 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-lodha-grey/60 font-jost">
                          {task.project_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {task.project_name}
                            </span>
                          )}
                          {task.assigned_to_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {task.assigned_to_name}
                            </span>
                          )}
                          {task.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                              <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full border ${priority.color} text-xs font-semibold`}>
                            {priority.label}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.status !== 'completed' && (
                          <>
                            {task.status === 'pending' && (
                              <button onClick={() => handleStatusChange(task.id, 'in_progress')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Start Task">
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setShowCompleteModal(task)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Complete Task">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-4">Assign New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Title *</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="Task title" />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} rows={3} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" placeholder="Task description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Assign To *</label>
                  <select value={newTask.assigned_to} onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                    <option value="">Select team member</option>
                    {teamMembers.filter(m => ['L3', 'L4'].includes(m.user_level)).map(m => (
                      <option key={m.id} value={m.email}>{m.full_name || m.email} ({m.user_level})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Project</label>
                  <select value={newTask.project_id} onChange={(e) => setNewTask({...newTask, project_id: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                    <option value="">Select project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Priority</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-grey mb-1">Due Date</label>
                  <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({...newTask, due_date: e.target.value})} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-lodha-gold text-white text-sm font-jost font-semibold rounded-lg hover:bg-lodha-grey transition-colors">Assign Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && (
        <CompleteTaskModal task={showCompleteModal} onClose={() => setShowCompleteModal(null)} onComplete={handleComplete} />
      )}
    </Layout>
  );
}

function CompleteTaskModal({ task, onClose, onComplete }) {
  const [remarks, setRemarks] = useState('');

  return (
    <div className="fixed inset-0 bg-lodha-grey/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-lodha-steel max-w-md w-full p-6">
        <h3 className="font-garamond text-xl font-bold text-lodha-grey mb-2">Complete Task</h3>
        <p className="text-sm text-lodha-grey/60 font-jost mb-4">{task.title}</p>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Completion remarks (optional)..." rows={3} className="w-full px-3 py-2 bg-lodha-sand border border-lodha-steel rounded-lg text-sm font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-jost font-semibold text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onComplete(task.id, remarks)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-jost font-semibold rounded-lg hover:bg-emerald-700 transition-colors">Mark Complete</button>
        </div>
      </div>
    </div>
  );
}
