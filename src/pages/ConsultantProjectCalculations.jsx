import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, ArrowLeft, FileText, Calculator } from 'lucide-react';

export default function ConsultantProjectCalculations() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

  const calculationTypes = [
    { id: 'electrical-load', name: 'Electrical Load Calculation', path: `/consultant/project/${projectId}/calc/electrical-load` },
    { id: 'water-demand', name: 'Water Demand Calculation', path: `/consultant/project/${projectId}/calc/water-demand` },
    { id: 'cable-selection', name: 'Cable Selection Sheet', path: `/consultant/project/${projectId}/calc/cable-selection` },
    { id: 'rising-main', name: 'Rising Main Design', path: `/consultant/project/${projectId}/calc/rising-main` },
    { id: 'down-take', name: 'Down Take Design', path: `/consultant/project/${projectId}/calc/down-take` },
    { id: 'bus-riser', name: 'Bus Riser Design', path: `/consultant/project/${projectId}/calc/bus-riser` },
    { id: 'lighting-load', name: 'Lighting Load Calculation', path: `/consultant/project/${projectId}/calc/lighting-load` },
    { id: 'hvac-load', name: 'HVAC Load Calculation', path: `/consultant/project/${projectId}/calc/hvac-load` },
    { id: 'fire-pump', name: 'Fire Pump Calculation', path: `/consultant/project/${projectId}/calc/fire-pump` },
    { id: 'plumbing-fixture', name: 'Plumbing Fixture Calculation', path: `/consultant/project/${projectId}/calc/plumbing-fixture` },
    { id: 'earthing-lightning', name: 'Earthing & Lightning Calculation', path: `/consultant/project/${projectId}/calc/earthing-lightning` },
    { id: 'panel-schedule', name: 'Panel Schedule', path: `/consultant/project/${projectId}/calc/panel-schedule` },
  ];

  useEffect(() => {
    const consultantToken = localStorage.getItem('consultantToken');
    const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');
    
    if (!consultantToken && !isSuperAdmin) {
      navigate('/consultant-login');
      return;
    }

    fetchProjectDetails();
  }, [projectId, navigate]);

  async function fetchProjectDetails() {
    try {
      setLoading(true);
      const consultantEmail = localStorage.getItem('consultantEmail');
      const consultantToken = localStorage.getItem('consultantToken');
      const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');

      const headers = isSuperAdmin && !consultantEmail ? {
        'x-dev-user-email': localStorage.getItem('devUserEmail'),
      } : {
        'Authorization': `Bearer ${consultantToken}`,
        'x-consultant-email': consultantEmail,
      };

      const projectRes = await fetch(`/api/consultants/project/${projectId}`, {
        headers,
      });

      if (!projectRes.ok) {
        throw new Error('Failed to fetch project details');
      }

      const projectData = await projectRes.json();
      setProject(projectData);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
        <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lodha-sand">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/consultant-dashboard')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-garamond font-bold text-lodha-gold">
                {project?.name || 'Project'} - Design Calculations
              </h1>
              <p className="text-sm text-gray-600">View project design calculations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calculationTypes.map(calc => (
            <button
              key={calc.id}
              onClick={() => navigate(calc.path)}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-lodha-sand rounded-lg">
                  <Calculator className="w-6 h-6 text-lodha-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{calc.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">View calculations</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
