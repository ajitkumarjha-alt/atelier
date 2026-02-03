import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, AlertCircle, FileText, Clock, MapPin, User } from 'lucide-react';
import Layout from '../components/Layout';
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

  const getStatusColor = (status) => {
    const colors = {
      'Concept': 'bg-blue-100 text-blue-700 border-blue-200',
      'DD': 'bg-purple-100 text-purple-700 border-purple-200',
      'Tender': 'bg-orange-100 text-orange-700 border-orange-200',
      'VFC': 'bg-green-100 text-green-700 border-green-200',
      'Construction': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-2">L0 Dashboard - VP/HoD MEP</h1>
        <p className="text-body">Overview of all projects and their current status</p>
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
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border border-gray-200"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              {/* Project Header */}
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 border-b border-gray-200">
                <h3 className="font-garamond text-xl font-bold text-lodha-black mb-1">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="font-jost">{project.description || 'No location'}</span>
                </div>
              </div>

              {/* Project Body */}
              <div className="p-4 space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-jost text-gray-600">Project Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-jost font-semibold border ${getStatusColor(project.project_status || 'Concept')}`}>
                    {project.project_status || 'Concept'}
                  </span>
                </div>

                {/* Site Status */}
                {project.site_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-jost text-gray-600">Site Status:</span>
                    <span className="text-sm font-jost font-semibold text-lodha-black">
                      {project.site_status}
                    </span>
                  </div>
                )}

                {/* Lead */}
                {project.lead_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-jost text-gray-600">Lead:</span>
                    <span className="text-sm font-jost font-semibold text-lodha-black">
                      {project.lead_name}
                    </span>
                  </div>
                )}

                {/* Buildings Count */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-jost text-gray-600">Buildings:</span>
                  <span className="text-sm font-jost font-semibold text-lodha-gold">
                    {project.building_count || 0}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/project/${project.id}`);
                    }}
                    className="flex-1 bg-lodha-gold hover:bg-lodha-deep text-white px-3 py-2 rounded text-xs font-jost font-semibold transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Navigate to schedule when implemented
                      alert('Schedule view coming soon!');
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-lodha-black px-3 py-2 rounded text-xs font-jost font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Schedule
                  </button>
                </div>
              </div>
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
