import { useState, useEffect } from 'react';
import { Loader, Archive, Building2, AlertTriangle } from 'lucide-react';
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
    const getStatusColor = (status) => {
      switch (status) {
        case 'on_track':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'delayed':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'at_risk':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-lodha-sand text-lodha-black border-lodha-steel/30';
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 border border-lodha-steel/30 overflow-hidden">
        {/* Header with Status */}
        <div 
          className="p-5 pb-4 border-b border-lodha-steel/15 cursor-pointer"
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <div className="flex justify-between items-start mb-3 gap-3">
            <h3 className="text-xl font-garamond font-bold text-lodha-deep flex-1 leading-tight hover:text-lodha-gold transition-colors">
              {project.name}
            </h3>
            {project.status && ['on_track', 'delayed', 'at_risk'].includes(project.status) && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap border ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            )}
          </div>
          
          {/* Project Summary */}
          {project.description && (
            <p className="text-sm text-lodha-grey line-clamp-2 mb-3">{project.description}</p>
          )}

          {/* Lifecycle Stage */}
          {project.lifecycle_stage && (
            <div className="text-xs text-lodha-grey/70">
              <span className="font-medium">Stage:</span> {project.lifecycle_stage}
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="p-5 pt-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-lodha-grey">Overall Progress</span>
              <span className="text-sm font-bold text-lodha-gold">{project.completion_percentage}%</span>
            </div>
            <div className="h-2.5 bg-lodha-sand rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-lodha-gold to-yellow-500 transition-all duration-500 ease-out"
                style={{ width: `${project.completion_percentage}%` }}
              />
            </div>
          </div>

          {/* Floor Progress */}
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-lodha-deep" />
            <span className="text-lodha-grey">Floors:</span>
            <span className="font-semibold text-lodha-black">{project.floors_completed}/{project.total_floors} completed</span>
          </div>

          {/* Critical Flags Section - Placeholder for future implementation */}
          {project.critical_flags && project.critical_flags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-lodha-steel/15">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-600 font-medium">
                  {project.critical_flags.length} critical {project.critical_flags.length === 1 ? 'point' : 'points'} flagged
                </div>
              </div>
            </div>
          )}
        </div>
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
                <div key={project.id} className="bg-lodha-sand rounded-lg p-6">
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
