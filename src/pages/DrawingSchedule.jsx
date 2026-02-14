import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, FileText, AlertCircle, Filter, Download, Upload } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/firebase';
import { useConfirm } from '../hooks/useDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { showSuccess, showError, showWarning } from '../utils/toast';

export default function DrawingSchedule() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [filteredDrawings, setFilteredDrawings] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [disciplineFilter, setDisciplineFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Form state
  const [formData, setFormData] = useState({
    drawingRefNo: '',
    discipline: 'Electrical',
    drawingTitle: '',
    drawingType: 'Layout Plan',
    revision: 'R0',
    plannedSubmissionDate: '',
    actualSubmissionDate: '',
    status: 'Planned',
    priority: 'Medium',
    assignedTo: '',
    remarks: '',
  });

  const { confirm, dialogProps } = useConfirm();

  const disciplines = ['Electrical', 'Mechanical', 'Plumbing', 'Fire Fighting', 'BMS', 'HVAC', 'ELV', 'Other'];
  const drawingTypes = ['Layout Plan', 'Schematic Diagram', 'Detail Drawing', 'Shop Drawing', 'As-Built', 'GAD', 'SLD', 'Riser Diagram', 'Other'];
  const statuses = ['Planned', 'In Progress', 'Submitted', 'Approved', 'Rejected', 'Delayed'];
  const priorities = ['High', 'Medium', 'Low'];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
    if (projectId) {
      fetchProjectDetails();
      fetchDrawings();
      fetchStats();
    }
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [drawings, disciplineFilter, statusFilter, priorityFilter]);

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

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/drawing-schedules?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setDrawings(data);
      }
    } catch (error) {
      console.error('Error fetching drawings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch(`/api/drawing-schedules/stats/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...drawings];

    if (disciplineFilter !== 'All') {
      filtered = filtered.filter(d => d.discipline === disciplineFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    if (priorityFilter !== 'All') {
      filtered = filtered.filter(d => d.priority === priorityFilter);
    }

    setFilteredDrawings(filtered);
  };

  const handleCreateDrawing = async (e) => {
    e.preventDefault();

    if (!formData.drawingRefNo || !formData.drawingTitle) {
      showWarning('Drawing Ref No and Title are required');
      return;
    }

    try {
      const response = await apiFetch('/api/drawing-schedules', {
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
        showSuccess('Drawing schedule created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchDrawings();
        fetchStats();
      } else {
        const errorData = await response.json();
        showError(`Error: ${errorData.error || 'Failed to create drawing schedule'}`);
      }
    } catch (error) {
      console.error('Error creating drawing:', error);
      showError('Error creating drawing schedule');
    }
  };

  const handleUpdateDrawing = async (e) => {
    e.preventDefault();

    if (!editingDrawing) return;

    try {
      const response = await apiFetch(`/api/drawing-schedules/${editingDrawing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showSuccess('Drawing schedule updated successfully');
        setEditingDrawing(null);
        resetForm();
        fetchDrawings();
        fetchStats();
      } else {
        const errorData = await response.json();
        showError(`Error: ${errorData.error || 'Failed to update drawing schedule'}`);
      }
    } catch (error) {
      console.error('Error updating drawing:', error);
      showError('Error updating drawing schedule');
    }
  };

  const handleDeleteDrawing = async (id) => {
    const confirmed = await confirm({ title: 'Delete Drawing', message: 'Are you sure you want to delete this drawing schedule?', variant: 'danger', confirmLabel: 'Delete' });
    if (!confirmed) return;

    try {
      const response = await apiFetch(`/api/drawing-schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'x-dev-user-email': user?.email,
        },
      });

      if (response.ok) {
        showSuccess('Drawing schedule deleted successfully');
        fetchDrawings();
        fetchStats();
      } else {
        showError('Failed to delete drawing schedule');
      }
    } catch (error) {
      console.error('Error deleting drawing:', error);
      showError('Error deleting drawing schedule');
    }
  };

  const handleEditClick = (drawing) => {
    setEditingDrawing(drawing);
    setFormData({
      drawingRefNo: drawing.drawing_ref_no,
      discipline: drawing.discipline,
      drawingTitle: drawing.drawing_title,
      drawingType: drawing.drawing_type,
      revision: drawing.revision,
      plannedSubmissionDate: drawing.planned_submission_date ? drawing.planned_submission_date.split('T')[0] : '',
      actualSubmissionDate: drawing.actual_submission_date ? drawing.actual_submission_date.split('T')[0] : '',
      status: drawing.status,
      priority: drawing.priority,
      assignedTo: drawing.assigned_to || '',
      remarks: drawing.remarks || '',
    });
  };

  const resetForm = () => {
    setFormData({
      drawingRefNo: '',
      discipline: 'Electrical',
      drawingTitle: '',
      drawingType: 'Layout Plan',
      revision: 'R0',
      plannedSubmissionDate: '',
      actualSubmissionDate: '',
      status: 'Planned',
      priority: 'Medium',
      assignedTo: '',
      remarks: '',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Planned': 'bg-lodha-sand text-lodha-grey border-lodha-steel/30',
      'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'Submitted': 'bg-purple-100 text-purple-700 border-purple-200',
      'Approved': 'bg-green-100 text-green-700 border-green-200',
      'Rejected': 'bg-red-100 text-red-700 border-red-200',
      'Delayed': 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || colors.Planned;
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
            <p className="text-lodha-grey">Loading drawing schedules...</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-primary mb-2">Drawing Schedule</h1>
            <p className="text-body">{project?.project_name || 'Project'}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-gold/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Drawing
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="section-card p-4">
            <p className="text-sm text-lodha-grey/70">Total</p>
            <p className="text-2xl font-garamond font-bold text-lodha-black">{stats.total}</p>
          </div>
          <div className="bg-lodha-sand/40 rounded-lg shadow-md border border-lodha-steel/30 p-4">
            <p className="text-sm text-lodha-grey/70">Planned</p>
            <p className="text-2xl font-garamond font-bold text-lodha-grey">{stats.planned}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-md border border-blue-200 p-4">
            <p className="text-sm text-blue-600">In Progress</p>
            <p className="text-2xl font-garamond font-bold text-blue-700">{stats.in_progress}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-md border border-purple-200 p-4">
            <p className="text-sm text-purple-600">Submitted</p>
            <p className="text-2xl font-garamond font-bold text-purple-700">{stats.submitted}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-md border border-green-200 p-4">
            <p className="text-sm text-green-600">Approved</p>
            <p className="text-2xl font-garamond font-bold text-green-700">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-md border border-red-200 p-4">
            <p className="text-sm text-red-600">Rejected</p>
            <p className="text-2xl font-garamond font-bold text-red-700">{stats.rejected}</p>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-md border border-orange-200 p-4">
            <p className="text-sm text-orange-600">Delayed</p>
            <p className="text-2xl font-garamond font-bold text-orange-700">{stats.delayed}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="section-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-lodha-gold" />
          <h2 className="text-lg font-garamond font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">Discipline</label>
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="input-field"
            >
              <option value="All">All Disciplines</option>
              {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="All">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field"
            >
              <option value="All">All Priorities</option>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Drawings Table */}
      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-lodha-sand/40 border-b border-lodha-steel/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Ref No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Drawing Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Discipline</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Rev</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Planned Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Actual Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lodha-grey/70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-lodha-steel/20">
              {filteredDrawings.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-lodha-grey/70">
                    No drawings found. Click "Add Drawing" to create one.
                  </td>
                </tr>
              ) : (
                filteredDrawings.map((drawing) => (
                  <tr key={drawing.id} className="hover:bg-lodha-sand/40">
                    <td className="px-4 py-3 text-sm font-medium text-lodha-black">{drawing.drawing_ref_no}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{drawing.drawing_title}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{drawing.discipline}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{drawing.drawing_type}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{drawing.revision}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{formatDate(drawing.planned_submission_date)}</td>
                    <td className="px-4 py-3 text-sm text-lodha-grey">{formatDate(drawing.actual_submission_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(drawing.status)}`}>
                        {drawing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(drawing.priority)}`}></div>
                        <span className="text-sm text-lodha-grey">{drawing.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(drawing)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDrawing(drawing.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDrawing) && (
        <div className="fixed inset-0 modal-overlay">
          <div className="modal-card max-w-3xl">
            <div className="p-6">
              <h2 className="text-2xl font-garamond font-bold text-lodha-black mb-6">
                {editingDrawing ? 'Edit Drawing Schedule' : 'Add New Drawing'}
              </h2>
              
              <form onSubmit={editingDrawing ? handleUpdateDrawing : handleCreateDrawing}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Drawing Ref No *
                    </label>
                    <input
                      type="text"
                      value={formData.drawingRefNo}
                      onChange={(e) => setFormData({ ...formData, drawingRefNo: e.target.value })}
                      disabled={!!editingDrawing}
                      className="input-field disabled:bg-lodha-sand"
                      placeholder="e.g., EL-LP-01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Discipline *
                    </label>
                    <select
                      value={formData.discipline}
                      onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                      className="input-field"
                      required
                    >
                      {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Drawing Title *
                    </label>
                    <input
                      type="text"
                      value={formData.drawingTitle}
                      onChange={(e) => setFormData({ ...formData, drawingTitle: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Ground Floor Electrical Layout"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Drawing Type
                    </label>
                    <select
                      value={formData.drawingType}
                      onChange={(e) => setFormData({ ...formData, drawingType: e.target.value })}
                      className="input-field"
                    >
                      {drawingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Revision
                    </label>
                    <input
                      type="text"
                      value={formData.revision}
                      onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                      className="input-field"
                      placeholder="R0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Planned Submission Date
                    </label>
                    <input
                      type="date"
                      value={formData.plannedSubmissionDate}
                      onChange={(e) => setFormData({ ...formData, plannedSubmissionDate: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Actual Submission Date
                    </label>
                    <input
                      type="date"
                      value={formData.actualSubmissionDate}
                      onChange={(e) => setFormData({ ...formData, actualSubmissionDate: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="input-field"
                      placeholder="Team member or consultant name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows={3}
                      className="input-field"
                      placeholder="Additional notes or comments..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-lodha-gold text-white py-3 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors"
                  >
                    {editingDrawing ? 'Update Drawing' : 'Create Drawing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingDrawing(null);
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
      <ConfirmDialog {...dialogProps} />
    </Layout>
  );
}
