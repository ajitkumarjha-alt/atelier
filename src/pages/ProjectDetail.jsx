import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      setProject(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      setUpdatingStage(true);
      const response = await fetch(`/api/projects/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) throw new Error('Failed to update stage');
      
      const updated = await response.json();
      setProject(updated);
    } catch (err) {
      console.error('Error updating stage:', err);
      alert('Failed to update project stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-lodha-gold hover:text-lodha-black transition-colors font-jost"
        >
          ← Go Back
        </button>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <p className="text-center text-lodha-grey font-jost">Project not found</p>
      </Layout>
    );
  }

  const stageColors = {
    'Concept': 'bg-purple-100 text-purple-800',
    'DD': 'bg-blue-100 text-blue-800',
    'Tender': 'bg-yellow-100 text-yellow-800',
    'VFC': 'bg-green-100 text-green-800',
  };

  return (
    <Layout>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-lodha-gold hover:text-lodha-black transition-colors mb-6 font-jost font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Project Header */}
      <div className="card mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="heading-primary mb-2">{project.name}</h1>
            <p className="text-body">{project.description}</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-jost font-semibold ${stageColors[project.lifecycle_stage]}`}>
            {project.lifecycle_stage}
          </span>
        </div>
      </div>

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Timeline */}
        <div className="card">
          <h3 className="heading-tertiary mb-4">Timeline</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-lodha-grey font-jost mb-1">Start Date</p>
              <p className="text-lg font-jost font-semibold text-lodha-black">
                {new Date(project.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-lodha-grey font-jost mb-1">Target Completion</p>
              <p className="text-lg font-jost font-semibold text-lodha-black">
                {new Date(project.target_completion_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="card">
          <h3 className="heading-tertiary mb-4">Assigned Lead</h3>
          <p className="text-lg font-jost font-semibold text-lodha-black">
            {project.assigned_lead_name || 'Not Assigned'}
          </p>
        </div>
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-sm text-lodha-grey font-jost mb-2">Overall Progress</p>
          <p className="heading-tertiary text-lodha-gold">{project.completion_percentage}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-lodha-grey font-jost mb-2">Floors Completed</p>
          <p className="heading-tertiary text-lodha-gold">{project.floors_completed}/{project.total_floors}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-lodha-grey font-jost mb-2">Material Stock</p>
          <p className="heading-tertiary text-lodha-gold">{project.material_stock_percentage}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-lodha-grey font-jost mb-2">MEP Status</p>
          <p className="heading-tertiary text-lodha-gold capitalize">{project.mep_status}</p>
        </div>
      </div>

      {/* Lifecycle Stage Update */}
      <div className="card">
        <h3 className="heading-tertiary mb-6">Update Lifecycle Stage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Concept', 'DD', 'Tender', 'VFC'].map(stage => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              disabled={updatingStage || project.lifecycle_stage === stage}
              className={`py-3 px-4 rounded-lg font-jost font-semibold transition-all ${
                project.lifecycle_stage === stage
                  ? 'bg-lodha-gold text-white cursor-default'
                  : 'bg-lodha-sand text-lodha-black hover:bg-lodha-gold hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
