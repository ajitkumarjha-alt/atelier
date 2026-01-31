import { useState, useEffect } from 'react';
import { Loader, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetchJson } from '../lib/api';

export default function ProjectStatusBoard({ userEmail }) {
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archivingProjectId, setArchivingProjectId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
    fetchArchivedProjects();
  }, [userEmail]);

  const fetchProjects = async () => {
    try {
      const data = await apiFetchJson(`/api/projects?userEmail=${userEmail}`);
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedProjects = async () => {
    try {
      const data = await apiFetchJson('/api/projects/archive/list');
      setArchivedProjects(data);
    } catch (err) {
      console.error('Error fetching archived projects:', err);
    }
  };

  const handleArchiveProject = async (projectId) => {
    try {
      setArchivingProjectId(projectId);
      const response = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      if (!response.ok) throw new Error('Failed to archive project');

      // Move project to archived list
      const archivedProject = projects.find(p => p.id === projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      setArchivedProjects([archivedProject, ...archivedProjects]);
    } catch (err) {
      console.error('Error archiving project:', err);
      alert('Failed to archive project');
    } finally {
      setArchivingProjectId(null);
    }
  };

  const StageCard = ({ project }) => {
    const stageColors = {
      'Concept': 'from-yellow-100 to-yellow-200',
      'DD': 'from-gray-100 to-gray-200',
      'Tender': 'from-yellow-100 to-yellow-200',
      'VFC': 'from-gray-100 to-gray-200',
    };

    const stageColor = stageColors[project.lifecycle_stage] || 'from-yellow-100 to-yellow-200';

    return (
      <div className={`bg-gradient-to-br ${stageColor} rounded-lg p-6 shadow-lg transform hover:scale-105 transition-transform duration-200 border border-gray-200`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-gray-600 font-jost text-xs uppercase tracking-wide mb-1">Project</p>
            <h3 
              className="text-xl font-garamond font-bold text-lodha-black cursor-pointer hover:underline"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              {project.name}
            </h3>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600 font-jost text-sm">Progress</span>
              <span className="text-lodha-black font-jost font-semibold text-sm">{project.completion_percentage}%</span>
            </div>
            <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
              <div 
                className="h-full bg-lodha-gold transition-all duration-300"
                style={{ width: `${project.completion_percentage}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm font-jost">
            <span className="text-gray-600">Floors: {project.floors_completed}/{project.total_floors}</span>
            <span className="text-gray-600">Materials: {project.material_stock_percentage}%</span>
          </div>
        </div>

        <button
          onClick={() => handleArchiveProject(project.id)}
          disabled={archivingProjectId === project.id}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-lodha-black/10 hover:bg-lodha-black/20 text-lodha-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-jost font-semibold text-sm"
        >
          {archivingProjectId === project.id ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Archive className="w-4 h-4" />
              Hand Over
            </>
          )}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Projects */}
      <div>
        <h2 className="heading-secondary mb-6">Active Projects</h2>
        {projects.length === 0 ? (
          <p className="text-center text-lodha-grey font-jost py-8">No active projects assigned</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <StageCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Archive Section */}
      {archivedProjects.length > 0 && (
        <div className="border-t-2 border-lodha-gold pt-8">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="mb-6 text-lodha-gold font-garamond text-lg font-bold hover:text-lodha-black transition-colors"
          >
            {showArchive ? '▼' : '▶'} Handed Over Projects ({archivedProjects.length})
          </button>

          {showArchive && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
              {archivedProjects.map(project => (
                <div key={project.id} className="bg-gray-100 rounded-lg p-6">
                  <h3 className="text-lg font-garamond font-bold text-lodha-black mb-2">
                    {project.name}
                  </h3>
                  <p className="text-sm text-lodha-grey font-jost mb-2">
                    Handed Over: {new Date(project.archived_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-jost text-lodha-grey">
                    Completion: {project.completion_percentage}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
