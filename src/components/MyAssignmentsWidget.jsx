import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, AlertTriangle, Clock, Calendar, User,
  FileText, Package, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiFetchJson } from '../lib/api';

const TYPE_CONFIG = {
  task: { label: 'Task', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: ClipboardList },
  dds:  { label: 'DDS',  color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileText },
  rfc:  { label: 'RFC',  color: 'bg-teal-100 text-teal-700 border-teal-200', icon: FileText },
  rfi:  { label: 'RFI',  color: 'bg-amber-100 text-amber-700 border-amber-200', icon: FileText },
  mas:  { label: 'MAS',  color: 'bg-pink-100 text-pink-700 border-pink-200', icon: Package },
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

const PREVIEW_COUNT = 5;

export default function MyAssignmentsWidget() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    apiFetchJson('/api/my-assignments')
      .then(data => {
        setAssignments(data.assignments || []);
        setSummary(data.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const navigateToItem = (item) => {
    const projectPrefix = item.project_id ? `/projects/${item.project_id}` : '';
    switch (item.item_type) {
      case 'task': navigate(`${projectPrefix}/tasks`); break;
      case 'dds':  navigate(`${projectPrefix}/design-development`); break;
      case 'rfc':  navigate(`${projectPrefix}/rfc`); break;
      case 'rfi':  navigate(item.id ? `${projectPrefix}/rfi/${item.id}` : `${projectPrefix}/rfi`); break;
      case 'mas':  navigate(item.id ? `/mas/${item.id}` : '/mas'); break;
      default: break;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short'
    });
  };

  // Filter by type
  const filtered = assignments.filter(a =>
    typeFilter === 'all' || a.item_type === typeFilter
  );

  const overdueCount = filtered.filter(a => a.is_overdue).length;
  const visibleItems = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hasMore = filtered.length > PREVIEW_COUNT;

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-lodha-steel rounded-xl p-5 mb-8 animate-pulse">
        <div className="h-5 w-44 bg-lodha-sand rounded mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-lodha-sand rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-lodha-sand rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Nothing assigned — show minimal state
  if (!summary || summary.total === 0) {
    return (
      <div className="bg-white border border-lodha-steel rounded-xl p-5 mb-8">
        <div className="flex items-center gap-3 text-lodha-grey/60">
          <ClipboardList className="w-5 h-5" />
          <span className="font-jost text-sm">No assignments — you're all caught up!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-lodha-steel rounded-xl mb-8 overflow-hidden">
      {/* Header row */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-garamond text-lg font-bold text-lodha-black flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-lodha-gold" />
          My Assignments
          <span className="ml-1 text-sm font-jost font-semibold text-lodha-grey/60">
            ({summary.total})
          </span>
        </h2>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-jost font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Type chips — summary counts with filter */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-jost font-semibold transition-colors ${
            typeFilter === 'all'
              ? 'bg-lodha-gold text-white'
              : 'bg-lodha-sand text-lodha-grey hover:bg-lodha-gold/20'
          }`}
        >
          All ({summary.total})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = summary.by_type?.[key] || 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
              className={`px-3 py-1.5 rounded-full text-xs font-jost font-semibold transition-colors ${
                typeFilter === key
                  ? 'bg-lodha-gold text-white'
                  : `${cfg.color} hover:shadow-sm`
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Assignment rows */}
      <div className="divide-y divide-lodha-steel/20">
        {visibleItems.map((item, idx) => {
          const cfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.task;
          const Icon = cfg.icon;
          return (
            <div
              key={`${item.item_type}-${item.id}-${idx}`}
              onClick={() => navigateToItem(item)}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-lodha-sand/40 transition-colors cursor-pointer group ${
                item.is_overdue ? 'border-l-3 border-l-red-400' : ''
              }`}
            >
              {/* Type icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Title + project */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-jost font-semibold text-lodha-grey truncate">
                  {item.title || 'Untitled'}
                </p>
                <div className="flex items-center gap-2 text-xs text-lodha-grey/50 font-jost">
                  {item.project_name && <span>{item.project_name}</span>}
                  {item.assigned_by_name && (
                    <span className="flex items-center gap-0.5">
                      <User className="w-3 h-3" /> {item.assigned_by_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Due date / overdue */}
              {item.due_date && (
                <span className={`hidden sm:flex items-center gap-1 text-xs font-jost whitespace-nowrap ${
                  item.is_overdue ? 'text-red-600 font-semibold' : 'text-lodha-grey/50'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(item.due_date)}
                  {item.is_overdue && <AlertTriangle className="w-3 h-3" />}
                </span>
              )}

              {/* Status */}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-700'
              }`}>
                {item.status}
              </span>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-lodha-grey/20 group-hover:text-lodha-gold transition-colors flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Footer: expand/collapse + view all */}
      {(hasMore || filtered.length > 0) && (
        <div className="px-5 py-3 bg-lodha-sand/30 border-t border-lodha-steel/20 flex items-center justify-between">
          {hasMore ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-jost font-semibold text-lodha-gold hover:text-lodha-grey transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> Show all {filtered.length} items</>
              )}
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => navigate('/my-assignments')}
            className="flex items-center gap-1 text-xs font-jost font-semibold text-lodha-gold hover:text-lodha-grey transition-colors"
          >
            View full page <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
