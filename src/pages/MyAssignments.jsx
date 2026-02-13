import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Search, Filter, Clock, AlertTriangle, CheckCircle,
  FileText, Package, ArrowRight, Calendar, User
} from 'lucide-react';
import Layout from '../components/Layout';
import { auth } from '../lib/firebase';
import { apiFetchJson } from '../lib/api';

const TYPE_CONFIG = {
  task: { label: 'Task', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: ClipboardList },
  dds: { label: 'DDS', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileText },
  rfc: { label: 'RFC', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: FileText },
  rfi: { label: 'RFI', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: FileText },
  mas: { label: 'MAS', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: Package },
};

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  Approved: 'bg-green-100 text-green-700',
  resolved: 'bg-green-100 text-green-700',
  Resolved: 'bg-green-100 text-green-700',
  closed: 'bg-green-100 text-green-700',
  Closed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  Rejected: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  Pending: 'bg-amber-100 text-amber-700',
  open: 'bg-blue-100 text-blue-700',
  Open: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-indigo-100 text-indigo-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  draft: 'bg-gray-100 text-gray-700',
  Draft: 'bg-gray-100 text-gray-700',
};

export default function MyAssignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  useEffect(() => {
    if (user) fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await apiFetchJson('/api/my-assignments');
      setAssignments(data.assignments || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = assignments.filter(a => {
    if (typeFilter !== 'all' && a.item_type !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (a.title || '').toLowerCase().includes(term) ||
        (a.project_name || '').toLowerCase().includes(term) ||
        (a.assigned_by_name || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const overdueCount = filtered.filter(a => a.is_overdue).length;

  const navigateToItem = (item) => {
    const projectPrefix = item.project_id ? `/projects/${item.project_id}` : '';
    switch (item.item_type) {
      case 'task':
        navigate(`${projectPrefix}/tasks`);
        break;
      case 'dds':
        navigate(`${projectPrefix}/design-development`);
        break;
      case 'rfc':
        navigate(`${projectPrefix}/rfc`);
        break;
      case 'rfi':
        navigate(item.id ? `${projectPrefix}/rfi/${item.id}` : `${projectPrefix}/rfi`);
        break;
      case 'mas':
        navigate(item.id ? `/mas/${item.id}` : '/mas');
        break;
      default:
        break;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mx-auto mb-4"></div>
            <p className="text-lodha-grey">Loading your assignments...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-2">My Assignments</h1>
        <p className="text-body">All tasks, designs, RFCs, RFIs, and MAS assigned to you</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          <div className="section-card p-4 text-center">
            <p className="text-2xl font-bold text-lodha-black">{summary.total}</p>
            <p className="text-xs text-lodha-grey/70 font-jost mt-1">Total</p>
          </div>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
              className={`section-card p-4 text-center cursor-pointer transition-all hover:shadow-md ${
                typeFilter === key ? 'ring-2 ring-lodha-gold' : ''
              }`}
            >
              <p className="text-2xl font-bold text-lodha-black">{summary.by_type?.[key] || 0}</p>
              <p className="text-xs text-lodha-grey/70 font-jost mt-1">{cfg.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overdue Warning */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 font-jost font-medium">
            {overdueCount} assignment{overdueCount !== 1 ? 's are' : ' is'} overdue
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-lodha-grey/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assignments..."
            className="input-field pl-10"
          />
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-colors ${
              typeFilter === 'all'
                ? 'bg-lodha-gold text-white'
                : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-gold/20'
            }`}
          >
            All
          </button>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
              className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-colors ${
                typeFilter === key
                  ? 'bg-lodha-gold text-white'
                  : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-gold/20'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 font-jost">
          {error}
        </div>
      )}

      {/* Assignment List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-16 h-16 text-lodha-grey/30 mx-auto mb-4" />
          <h3 className="heading-tertiary text-lodha-grey/60 mb-2">No assignments found</h3>
          <p className="text-body text-lodha-grey/50">
            {searchTerm || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Nothing assigned to you yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const cfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.task;
            const Icon = cfg.icon;
            return (
              <div
                key={`${item.item_type}-${item.id}-${idx}`}
                onClick={() => navigateToItem(item)}
                className={`group section-card p-5 hover:shadow-lg transition-all cursor-pointer ${
                  item.is_overdue ? 'border-l-4 border-l-red-400' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="text-base font-garamond font-bold text-lodha-grey truncate">
                        {item.title || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Type Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-lodha-grey/60 font-jost">
                      {item.project_name && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold">Project:</span> {item.project_name}
                        </span>
                      )}
                      {item.assigned_by_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          By: {item.assigned_by_name}
                        </span>
                      )}
                      {item.due_date && (
                        <span className={`flex items-center gap-1 ${
                          item.is_overdue ? 'text-red-600 font-semibold' : ''
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          Due: {formatDate(item.due_date)}
                          {item.is_overdue && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-5 h-5 text-lodha-grey/30 group-hover:text-lodha-gold transition-colors flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
