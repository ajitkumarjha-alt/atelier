import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/firebase';

export default function ChangeRequestsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState('');
  const [changeRequests, setChangeRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Form state
  const [formData, setFormData] = useState({
    changeType: 'Scope Change',
    changeCategory: 'Building Modification',
    changeDescription: '',
    justification: '',
    impactAssessment: '',
    priority: 'Medium',
  });

  const changeTypes = [
    'Scope Change',
    'Design Change',
    'Schedule Change',
    'Resource Change',
    'Budget Change',
    'Technical Specification',
    'Safety/Compliance',
    'Other'
  ];

  const changeCategories = [
    'Building Modification',
    'Floor Plan Change',
    'MEP System Update',
    'Material Substitution',
    'Equipment Change',
    'Timeline Adjustment',
    'Team/Resource Change',
    'Documentation Update',
    'Other'
  ];

  const priorities = ['High', 'Medium', 'Low'];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      fetchUserLevel(currentUser.email);
    }
    if (projectId) {
      fetchProjectDetails();
      fetchChangeRequests();
      fetchStats();
    }
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [changeRequests, statusFilter, typeFilter]);

  const fetchUserLevel = async (email) => {
    try {
      const response = await apiFetch('/api/auth/user-info', {
        headers: {
          'x-dev-user-email': email,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserLevel(data.user_level);
      }
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/change-requests?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setChangeRequests(data);
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch(`/api/change-requests/stats/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...changeRequests];

    if (statusFilter !== 'All') {
      filtered = filtered.filter(cr => cr.final_status === statusFilter);
    }

    if (typeFilter !== 'All') {
      filtered = filtered.filter(cr => cr.change_type === typeFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleCreateChange = async (e) => {
    e.preventDefault();

    if (!formData.changeDescription) {
      alert('Change description is required');
      return;
    }

    try {
      const response = await apiFetch('/api/change-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          ...formData,
        }),
      });

      if (response.ok) {
        alert('Change request created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchChangeRequests();
        fetchStats();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to create change request'}`);
      }
    } catch (error) {
      console.error('Error creating change request:', error);
      alert('Error creating change request');
    }
  };

  const resetForm = () => {
    setFormData({
      changeType: 'Scope Change',
      changeCategory: 'Building Modification',
      changeDescription: '',
      justification: '',
      impactAssessment: '',
      priority: 'Medium',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-orange-100 text-orange-700 border-orange-200',
      'Approved': 'bg-green-100 text-green-700 border-green-200',
      'Rejected': 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || colors.Pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'High': 'bg-red-500',
      'Medium': 'bg-yellow-500',
      'Low': 'bg-green-500',
    };
    return colors[priority] || colors.Medium;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mx-auto mb-4"></div>
            <p className="text-lodha-grey">Loading change requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/l2-dashboard')}
          className="flex items-center text-lodha-grey hover:text-lodha-gold mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to L2 Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="heading-primary mb-2">Project Change Requests</h1>
            <p className="text-body">{project?.project_name || 'Project'}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-gold/90 transition-colors w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Request Change
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="section-card p-4">
            <p className="text-sm text-lodha-grey/70">Total Requests</p>
            <p className="text-2xl font-garamond font-bold text-lodha-black">{stats.total}</p>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-md border border-orange-200 p-4">
            <p className="text-sm text-orange-600">Pending</p>
            <p className="text-2xl font-garamond font-bold text-orange-700">{stats.pending}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-md border border-green-200 p-4">
            <p className="text-sm text-green-600">Approved</p>
            <p className="text-2xl font-garamond font-bold text-green-700">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-md border border-red-200 p-4">
            <p className="text-sm text-red-600">Rejected</p>
            <p className="text-2xl font-garamond font-bold text-red-700">{stats.rejected}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-md border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Implemented</p>
            <p className="text-2xl font-garamond font-bold text-blue-700">{stats.implemented}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-md border border-purple-200 p-4">
            <p className="text-sm text-purple-600">High Priority</p>
            <p className="text-2xl font-garamond font-bold text-purple-700">{stats.high_priority}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="section-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">Filter by Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="All">All Types</option>
              {changeTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Change Requests Table */}
      <div className="section-card overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-lodha-sand/40 border-b border-lodha-steel/30">
              <tr>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Ref No</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Description</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Requested By</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">L2 Status</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">L1 Status</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Final Status</th>
                <th className="py-2 md:py-3 px-[2%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Priority</th>
                <th className="py-2 md:py-3 px-[2%] pr-[3%] text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-lodha-steel/20">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-8 text-center text-lodha-grey/70">
                    No change requests found. Click "Request Change" to create one.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((cr) => (
                  <tr key={cr.id} className="hover:bg-lodha-sand/40">
                    <td className="px-4 py-3 text-sm font-medium text-lodha-black">{cr.change_ref_no}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey max-w-xs truncate">{cr.change_description}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{cr.change_type}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{cr.change_category}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{cr.requested_by}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{formatDate(cr.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(cr.l2_status)}`}>
                        {cr.l2_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(cr.l1_status)}`}>
                        {cr.l1_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(cr.final_status)}`}>
                        {cr.final_status}
                      </span>
                      {cr.implemented && (
                        <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" title="Implemented" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(cr.priority)}`}></div>
                        <span className="text-sm text-lodha-grey">{cr.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/change-request/${cr.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 modal-overlay">
          <div className="modal-card max-w-3xl">
            <div className="p-6">
              <h2 className="text-2xl font-garamond font-bold text-lodha-black mb-6">
                Create Change Request
              </h2>
              
              <form onSubmit={handleCreateChange}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Change Type *
                    </label>
                    <select
                      value={formData.changeType}
                      onChange={(e) => setFormData({ ...formData, changeType: e.target.value })}
                      className="input-field"
                      required
                    >
                      {changeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Change Category
                    </label>
                    <select
                      value={formData.changeCategory}
                      onChange={(e) => setFormData({ ...formData, changeCategory: e.target.value })}
                      className="input-field"
                    >
                      {changeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Change Description *
                    </label>
                    <textarea
                      value={formData.changeDescription}
                      onChange={(e) => setFormData({ ...formData, changeDescription: e.target.value })}
                      rows={4}
                      className="input-field"
                      placeholder="Describe the proposed change in detail..."
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Justification
                    </label>
                    <textarea
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      rows={3}
                      className="input-field"
                      placeholder="Why is this change necessary?"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Impact Assessment
                    </label>
                    <textarea
                      value={formData.impactAssessment}
                      onChange={(e) => setFormData({ ...formData, impactAssessment: e.target.value })}
                      rows={3}
                      className="input-field"
                      placeholder="What is the impact on schedule, cost, resources, etc.?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input-field"
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-lodha-gold text-white py-3 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors"
                  >
                    Submit Change Request
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
