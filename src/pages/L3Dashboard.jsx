import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import AIChat from '../components/AIChat';
import { Eye, MapPin, Clock, MessageCircle } from 'lucide-react';
import { apiFetchJson } from '../lib/api';
import { auth } from '../lib/firebase';

export default function L3Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const userEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    setUser(auth.currentUser);
    
    const fetchProjects = async () => {
      try {
        const data = await apiFetchJson(`/api/projects?userEmail=${userEmail}`);
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchProjects();
    } else {
      setLoading(false);
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
        <h1 className="heading-primary mb-2">L3 Supervisor Dashboard</h1>
        <p className="text-body">
          View project progress with limited edit capabilities. Monitor KPIs and project status.
        </p>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-lodha-gold hover:shadow-lg transition-shadow"
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
              <p className="text-sm text-lodha-grey line-clamp-2 mb-4">
                {project.description}
              </p>

              {/* View Button */}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold/10 text-lodha-gold rounded-lg hover:bg-lodha-gold/20 transition-colors font-jost font-semibold">
                <Eye className="w-4 h-4" />
                View Details
              </button>
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
        <h2 className="heading-secondary mb-4">L3 Supervisor Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-garamond font-bold text-lodha-black mb-3">What You Can See</h3>
            <ul className="space-y-2 text-sm text-body">
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>All project details and progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Lifecycle stages and completion metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Floor-wise progress tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-gold font-bold">•</span>
                <span>Material and MEP status</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-garamond font-bold text-lodha-black mb-3">Limitations</h3>
            <ul className="space-y-2 text-sm text-body">
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Read-only access to all dashboards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Cannot modify project information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Cannot assign leads or archive projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lodha-grey font-bold">•</span>
                <span>Cannot approve MAS or RFI requests</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Help Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-lodha-gold to-yellow-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 z-40"
        title="AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="font-medium">AI Help</span>
      </button>

      {/* AI Chat Widget */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel="L3"
        projectId={null}
        user={user}
      />
    </Layout>
  );
}
