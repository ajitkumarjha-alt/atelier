import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, AlertCircle, FileText, Trash2, Calendar, RefreshCw, ListChecks, Send, BarChart3 } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import AIReports from '../components/AIReports';
import MyAssignmentsWidget from '../components/MyAssignmentsWidget';
import MeetingPointWidget from '../components/MeetingPointWidget';
import { apiFetchJson } from '../lib/api';
import { showError } from '../utils/toast';
import { useConfirm } from '../hooks/useDialog';
import ConfirmDialog from '../components/ConfirmDialog';

export default function L0Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingMAS: 0,
    pendingRFI: 0,
  });
  const [rfcStats, setRfcStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all projects
        const projectsResponse = await fetch('/api/projects-public', {
          headers: {
            'x-dev-user-email': localStorage.getItem('devUserEmail') || 'l0@lodhagroup.com',
          },
        });

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData);

          // Fetch MAS and RFI stats
          let totalPendingMAS = 0;
          let totalPendingRFI = 0;

          // Fetch RFIs
          const rfiResponse = await fetch('/api/rfi', {
            headers: {
              'x-dev-user-email': localStorage.getItem('devUserEmail') || 'l0@lodhagroup.com',
            },
          });

          if (rfiResponse.ok) {
            const rfiData = await rfiResponse.json();
            totalPendingRFI = rfiData.filter(r => r.status === 'Pending').length;
          }

          // Fetch MAS (when endpoint is ready)
          // const masResponse = await fetch('/api/mas');
          // if (masResponse.ok) {
          //   const masData = await masResponse.json();
          //   totalPendingMAS = masData.filter(m => m.status === 'Pending').length;
          // }

          setStats({
            totalProjects: projectsData.length,
            pendingMAS: totalPendingMAS,
            pendingRFI: totalPendingRFI,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Fetch RFC and Task stats
    apiFetchJson('/api/rfc/stats').then(setRfcStats).catch(() => {});
    apiFetchJson('/api/tasks/stats').then(setTaskStats).catch(() => {});
  }, []);

  const handleDeleteProject = async (event, project) => {
    event.stopPropagation();

    const confirmed = await confirm({
      title: 'Delete Project',
      message: 'This will permanently delete this project and all associated data. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete Project'
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'x-dev-user-email': localStorage.getItem('devUserEmail') || 'l0@lodhagroup.com'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete project');
      }

      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (error) {
      console.error('Error deleting project:', error);
      showError(error.message || 'Failed to delete project');
    }
  };

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-primary mb-2">Executive Overview</h1>
            <p className="text-body">VP/HoD MEP Dashboard - Monitor all MEP projects and critical metrics</p>
          </div>
          <button
            onClick={() => navigate('/project-input')}
            className="hidden md:flex bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-grey transition-colors items-center gap-2 font-jost font-semibold shadow-lg"
          >
            <FolderKanban className="w-5 h-5" />
            Create New Project
          </button>
        </div>
      </div>

      {/* Meeting Point */}
      <MeetingPointWidget />

      {/* My Assignments Widget */}
      <MyAssignmentsWidget />

      {/* Executive Stats - Priority Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Primary KPI - Pending RFIs */}
        <div className="bg-white border-2 border-lodha-gold rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-lodha-gold/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-lodha-gold" />
            </div>
            <span className="text-xs font-jost font-semibold text-lodha-gold uppercase tracking-wide">Critical</span>
          </div>
          <p className="text-lodha-grey/70 font-jost text-sm mb-1">Pending RFIs</p>
          <p className="text-lodha-gold font-garamond text-4xl font-bold mb-2">{stats.pendingRFI}</p>
          <button 
            onClick={() => navigate('/cm-dashboard')}
            className="text-xs text-lodha-gold hover:text-lodha-grey font-jost font-semibold"
          >
            Review Now →
          </button>
        </div>

        {/* Secondary KPI - Pending MAS */}
        <div className="bg-lodha-cream border border-lodha-steel rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-lodha-grey" />
            </div>
            <span className="text-xs font-jost font-semibold text-lodha-grey/60 uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-lodha-grey/70 font-jost text-sm mb-1">Material Approvals</p>
          <p className="text-lodha-grey font-garamond text-4xl font-bold mb-2">{stats.pendingMAS}</p>
          <button 
            onClick={() => navigate('/mas-list')}
            className="text-xs text-lodha-grey hover:text-lodha-gold font-jost font-semibold"
          >
            View Details →
          </button>
        </div>

        {/* Tertiary KPI - Total Projects */}
        <div className="bg-lodha-sand border border-lodha-muted-gold/30 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-lodha-muted-gold" />
            </div>
            <span className="text-xs font-jost font-semibold text-lodha-grey/40 uppercase tracking-wide">Active</span>
          </div>
          <p className="text-lodha-grey/70 font-jost text-sm mb-1">Total Projects</p>
          <p className="text-lodha-grey font-garamond text-4xl font-bold mb-2">{stats.totalProjects}</p>
          <button 
            onClick={() => navigate('/l1-dashboard')}
            className="text-xs text-lodha-grey hover:text-lodha-gold font-jost font-semibold"
          >
            Manage All →
          </button>
        </div>
      </div>

      {/* Mobile Create Button */}
      <div className="md:hidden mb-6">
        <button
          onClick={() => navigate('/project-input')}
          className="w-full bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-grey transition-colors flex items-center justify-center gap-2 font-jost font-semibold shadow-lg"
        >
          <FolderKanban className="w-5 h-5" />
          Create New Project
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 bg-white border border-lodha-steel rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/cm-dashboard')}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-lodha-sand transition-colors text-left"
          >
            <div className="w-10 h-10 bg-lodha-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-lodha-gold" />
            </div>
            <div>
              <h3 className="font-jost font-semibold text-lodha-grey text-sm">Review RFIs</h3>
              <p className="text-xs text-lodha-grey/60">Urgent responses needed</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/mas-list')}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-lodha-sand transition-colors text-left"
          >
            <div className="w-10 h-10 bg-lodha-grey/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-lodha-grey" />
            </div>
            <div>
              <h3 className="font-jost font-semibold text-lodha-grey text-sm">Material Approvals</h3>
              <p className="text-xs text-lodha-grey/60">Review submissions</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/l1-dashboard')}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-lodha-sand transition-colors text-left"
          >
            <div className="w-10 h-10 bg-lodha-muted-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-5 h-5 text-lodha-muted-gold" />
            </div>
            <div>
              <h3 className="font-jost font-semibold text-lodha-grey text-sm">Project Management</h3>
              <p className="text-xs text-lodha-grey/60">Assignments & tracking</p>
            </div>
          </button>
        </div>
      </div>

      {/* DDS, RFC & Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-lodha-steel rounded-xl p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/rfc-management')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-jost font-semibold text-lodha-grey">Changes (RFC)</p>
              <p className="text-xs text-lodha-grey/60 font-jost">{rfcStats?.pending || 0} pending review</p>
            </div>
          </div>
          {rfcStats?.critical > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs font-jost text-red-700">
              <AlertCircle className="w-3 h-3 inline mr-1" />{rfcStats.critical} critical RFCs require attention
            </div>
          )}
        </div>
        <div className="bg-white border border-lodha-steel rounded-xl p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/task-management')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-jost font-semibold text-lodha-grey">Task Overview</p>
              <p className="text-xs text-lodha-grey/60 font-jost">{taskStats?.pending || 0} pending, {taskStats?.overdue || 0} overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-lodha-steel rounded-xl p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/standards')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-lodha-gold/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-lodha-gold" />
            </div>
            <div>
              <p className="text-sm font-jost font-semibold text-lodha-grey">Standards & Policies</p>
              <p className="text-xs text-lodha-grey/60 font-jost">Manage calculation standards</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="mb-8">
        <AIReports />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="bg-white rounded-lg border border-lodha-steel shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mb-4"></div>
          <p className="text-lodha-grey font-jost">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-lodha-steel shadow-md p-12 text-center">
          <FolderKanban className="w-16 h-16 text-lodha-muted-gold mx-auto mb-4" />
          <p className="text-lodha-grey font-garamond text-xl font-semibold mb-2">No Projects Found</p>
          <p className="text-lodha-grey/60 font-jost mb-6">Get started by creating your first MEP project</p>
          <button
            onClick={() => navigate('/project-input')}
            className="bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-grey transition-colors font-jost font-semibold"
          >
            Create Project
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-garamond text-2xl font-bold text-lodha-grey">All Projects</h2>
            <p className="text-sm text-lodha-grey/60 font-jost">{projects.length} total</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="relative cursor-pointer transition-transform hover:scale-105"
              >
                <button
                  type="button"
                  onClick={(event) => handleDeleteProject(event, project)}
                  className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-red-600 shadow hover:bg-red-50"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </>
      )}
      <ConfirmDialog {...dialogProps} />
    </Layout>
  );
}
