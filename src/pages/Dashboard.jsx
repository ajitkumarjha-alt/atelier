import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import ProjectCard from '../components/ProjectCard';
import MyAssignmentsWidget from '../components/MyAssignmentsWidget';
import { CardGridSkeleton } from '../components/SkeletonLoader';
import { apiFetchJson } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await apiFetchJson('/api/projects');
        setProjects(data);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="mb-8">
          <h1 className="heading-primary mb-1">
            Project Overview
          </h1>
          <p className="text-lodha-grey font-jost">Loading projects...</p>
        </div>
        <CardGridSkeleton count={6} columns={3} />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => { setError(null); setLoading(true); apiFetchJson('/api/projects').then(setProjects).catch(() => setError('Failed to load projects. Please try again later.')).finally(() => setLoading(false)); }}
            className="ml-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-jost font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-1">
          Project Overview
        </h1>
        <p className="text-lodha-grey font-jost">
          Monitoring {projects.length} active {projects.length === 1 ? 'project' : 'projects'}. Click on a card to view details.
        </p>
      </div>

      {/* My Assignments Widget */}
      <MyAssignmentsWidget />

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div 
            key={project.id}
            onClick={() => navigate(`/project/${project.id}`)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/project/${project.id}`)}
            role="button"
            tabIndex={0}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 rounded-xl"
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && !loading && !error && (
        <EmptyState
          icon={Building2}
          title="No projects found"
          description="Create your first project to get started with Atelier."
          actionLabel="Create Project"
          onAction={() => navigate('/projects/new')}
        />
      )}
    </Layout>
  );
}