import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Eye, MapPin, Clock } from 'lucide-react';

export default function L4Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`/api/projects?userEmail=${userEmail}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchProjects();
    }
  }, [userEmail]);

  const getStageColor = (stage) => {
    const colors = {
      'Concept': 'bg-purple-100 text-purple-800',
      'DD': 'bg-blue-100 text-blue-800',
      'Tender': 'bg-yellow-100 text-yellow-800',
      'VFC': 'bg-green-100 text-green-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-body text-lodha-grey">Loading projects...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="heading-primary mb-2">L4 Team Member Dashboard</h1>
        <p className="text-body">
          View assigned projects and basic information. No editing capabilities.
        </p>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-lodha-gold"
            >
              <h3 className="heading-tertiary mb-3 text-lodha-black line-clamp-2">
                {project.name}
              </h3>

              {/* Lifecycle Stage */}
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-jost font-semibold ${getStageColor(project.lifecycle_stage)}`}>
                  {project.lifecycle_stage || 'N/A'}
                </span>
              </div>

              {/* Project Info */}
              <div className="space-y-2 mb-4 text-sm text-body">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-lodha-grey" />
                  <span>Completion: {project.completion_percentage || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-lodha-grey" />
                  <span>Floors: {project.floors_completed}/{project.total_floors}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-lodha-sand rounded-full h-2">
                  <div
                    className="bg-lodha-gold h-2 rounded-full transition-all"
                    style={{ width: `${project.completion_percentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-lodha-grey line-clamp-2">
                {project.description}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Eye className="w-12 h-12 text-lodha-grey/30 mx-auto mb-4" />
            <p className="text-body text-lodha-grey">
              No projects assigned to your account
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-lodha-gold">
        <h2 className="heading-secondary mb-4">L4 Team Member Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-garamond font-bold text-lodha-black mb-3">What You Can See</h3>
            <ul className="space-y-2 text-sm text-body">
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Assigned projects only</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Project names and descriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Current lifecycle stage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Basic progress information</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-garamond font-bold text-lodha-black mb-3">Limitations</h3>
            <ul className="space-y-2 text-sm text-body">
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>View-only access (no modifications)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Cannot access other team's projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Cannot approve or reject requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Cannot access detailed analytics</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
