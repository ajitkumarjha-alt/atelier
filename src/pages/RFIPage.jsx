import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Search, AlertCircle, CheckCircle, Clock, Filter, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import { auth } from '../lib/firebase';
import { apiFetchJson } from '../lib/api';

export default function RFIPage() {
  const { projectId: urlProjectId } = useParams();
  const navigate = useNavigate();
  const isProjectScoped = Boolean(urlProjectId);

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  useEffect(() => {
    if (user) {
      fetchRFI();
    }
  }, [user]);

  // Fetch project name when project-scoped
  useEffect(() => {
    if (isProjectScoped) {
      apiFetchJson('/api/projects').then(data => {
        const list = Array.isArray(data) ? data : data.projects || [];
        const p = list.find(pr => String(pr.id) === String(urlProjectId));
        if (p) setProjectName(p.name);
      }).catch(() => {});
    }
  }, [isProjectScoped, urlProjectId]);

  const fetchRFI = async () => {
    try {
      setLoading(true);
      const url = isProjectScoped
        ? `/api/rfi/project/${urlProjectId}`
        : '/api/rfi';
      const data = await apiFetchJson(url);
      setItems(Array.isArray(data) ? data : []);
      setFilteredItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching RFI:', err);
      setError('Failed to load Requests for Information');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let result = [...items];

    // Apply status filter
    if (filter !== 'All') {
      result = result.filter(item => {
        if (filter === 'Pending') return item.status === 'pending' || item.status === 'Pending';
        if (filter === 'In Progress') return item.status === 'in_progress' || item.status === 'In Progress';
        if (filter === 'Resolved') return item.status === 'resolved' || item.status === 'Resolved';
        return true;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(item =>
        (item.title?.toLowerCase().includes(search)) ||
        (item.description?.toLowerCase().includes(search)) ||
        (item.raised_by_name?.toLowerCase().includes(search))
      );
    }

    setFilteredItems(result);
  }, [items, filter, searchTerm]);

  const getStatusCounts = () => {
    return {
      all: items.length,
      pending: items.filter(i => i.status === 'pending' || i.status === 'Pending').length,
      inProgress: items.filter(i => i.status === 'in_progress' || i.status === 'In Progress').length,
      resolved: items.filter(i => i.status === 'resolved' || i.status === 'Resolved').length
    };
  };

  const getStatusStyle = (status) => {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === 'pending') {
      return 'bg-red-50 border border-red-200';
    } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'in progress') {
      return 'bg-amber-50 border border-amber-200';
    } else if (normalizedStatus === 'resolved') {
      return 'bg-green-50 border border-green-200';
    }
    return 'bg-white border border-lodha-steel';
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === 'pending') {
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Pending
      </span>;
    } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'in progress') {
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        In Progress
      </span>;
    } else if (normalizedStatus === 'resolved') {
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Resolved
      </span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-lodha-sand text-lodha-grey">{status}</span>;
  };

  const counts = getStatusCounts();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        {isProjectScoped && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-lodha-grey/60 hover:text-lodha-grey mb-3 font-jost transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to project
          </button>
        )}
        <h1 className="heading-primary mb-2">Requests for Information (RFI)</h1>
        <p className="text-body">
          {isProjectScoped && projectName
            ? `RFIs for ${projectName}`
            : 'Track and manage information requests across all projects'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-red-700 mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Filter Chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-jost font-semibold text-lodha-grey">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'All'
                ? 'bg-lodha-gold text-white shadow-md'
                : 'bg-white border border-lodha-steel text-lodha-grey hover:bg-lodha-sand'
            }`}
          >
            All <span className="ml-1 opacity-70">({counts.all})</span>
          </button>
          <button
            onClick={() => setFilter('Pending')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'Pending'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            Pending <span className="ml-1 opacity-70">({counts.pending})</span>
          </button>
          <button
            onClick={() => setFilter('In Progress')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'In Progress'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            In Progress <span className="ml-1 opacity-70">({counts.inProgress})</span>
          </button>
          <button
            onClick={() => setFilter('Resolved')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'Resolved'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-white border border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            Resolved <span className="ml-1 opacity-70">({counts.resolved})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-lodha-grey" />
          <input
            type="text"
            placeholder="Search RFIs by title, description, or requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-lodha-gold transition-all font-jost"
          />
        </div>
      </div>

      {/* RFI List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-lodha-steel rounded-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-lodha-muted-gold mx-auto mb-4" />
            <p className="text-lodha-grey font-garamond text-xl font-semibold mb-2">
              {searchTerm || filter !== 'All' ? 'No RFIs match your filters' : 'No RFIs found'}
            </p>
            <p className="text-lodha-grey/60 font-jost">
              {searchTerm || filter !== 'All' 
                ? 'Try adjusting your search or filter criteria' 
                : 'RFI requests will appear here once created'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => navigate(isProjectScoped ? `/projects/${urlProjectId}/rfi/${item.id}` : `/rfi/${item.id}`)}
              className={`group relative rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer ${getStatusStyle(item.status)}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-lg font-garamond font-bold text-lodha-grey flex-1">
                  {item.title || 'Untitled RFI'}
                </h3>
                {getStatusBadge(item.status)}
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-lodha-grey/80 font-jost mb-4 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-lodha-grey/60 font-jost">
                <span className="flex items-center gap-1">
                  <span className="font-semibold">Raised by:</span> {item.raised_by_name || 'Unknown'}
                </span>
                {item.assigned_to_name && (
                  <span className="flex items-center gap-1 text-lodha-gold">
                    <span className="font-semibold">Assigned to:</span> {item.assigned_to_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(item.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                {item.project_name && (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">Project:</span> {item.project_name}
                  </span>
                )}
              </div>

              {/* Hover Actions */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-lodha-gold text-white px-4 py-2 rounded-lg font-jost font-semibold text-sm shadow-lg">
                  View Details →
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
