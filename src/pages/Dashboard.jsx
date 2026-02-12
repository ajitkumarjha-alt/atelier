import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div 
            key={project.id}
            onClick={() => navigate(`/project/${project.id}`)}
            className="cursor-pointer"
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && !loading && !error && (
        <div className="empty-state">
          <p className="text-lodha-grey">No projects found.</p>
        </div>
      )}
    </Layout>
  );
}