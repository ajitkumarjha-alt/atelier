import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, AlertCircle, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import AIReports from '../components/AIReports';

export default function L0Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingMAS: 0,
    pendingRFI: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
  }, []);

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-2">L0 Dashboard - VP/HoD MEP</h1>
        <p className="text-body">Overview of all projects and their current status. Click on a card to view details.</p>
      </div>

      {/* Create Project Button */}
      <div className="mb-6 flex flex-col sm:flex-row justify-end">
        <button
          onClick={() => navigate('/project-input')}
          className="bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-gold/90 transition-colors flex items-center justify-center gap-2 font-jost font-semibold shadow-lg w-full sm:w-auto"
        >
          <FolderKanban className="w-5 h-5" />
          Create New Project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-jost text-sm mb-1">Total Projects</p>
              <p className="text-lodha-black font-garamond text-3xl font-bold">{stats.totalProjects}</p>
            </div>
            <FolderKanban className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-jost text-sm mb-1">Pending RFIs</p>
              <p className="text-lodha-black font-garamond text-3xl font-bold">{stats.pendingRFI}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-jost text-sm mb-1">Pending MAS</p>
              <p className="text-lodha-black font-garamond text-3xl font-bold">{stats.pendingMAS}</p>
            </div>
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-500 font-jost">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-jost">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="cursor-pointer"
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}

      {/* AI Reports Section */}
      <div className="mt-8">
        <AIReports />
      </div>

      {/* Quick Links Section */}
      <div className="mt-8 bg-gradient-to-br from-yellow-50 to-gray-50 rounded-lg p-6 border border-gray-200">
        <h2 className="font-garamond text-xl font-bold text-lodha-black mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/cm-dashboard')}
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <AlertCircle className="w-8 h-8 text-lodha-gold mb-2" />
            <h3 className="font-jost font-semibold text-lodha-black mb-1">RFI Management</h3>
            <p className="text-xs text-gray-600">View and manage RFIs</p>
          </button>

          <button
            onClick={() => alert('MAS Management coming soon!')}
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <FileText className="w-8 h-8 text-lodha-gold mb-2" />
            <h3 className="font-jost font-semibold text-lodha-black mb-1">MAS Management</h3>
            <p className="text-xs text-gray-600">Material Approval Sheets</p>
          </button>

          <button
            onClick={() => navigate('/l1-dashboard')}
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <FolderKanban className="w-8 h-8 text-lodha-gold mb-2" />
            <h3 className="font-jost font-semibold text-lodha-black mb-1">Project Management</h3>
            <p className="text-xs text-gray-600">Create and edit projects (L1)</p>
          </button>
        </div>
      </div>
    </Layout>
  );
}
