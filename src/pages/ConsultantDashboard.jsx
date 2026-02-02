import { useEffect, useState } from 'react';
import { Loader, FileText, MessageSquare, Download, Eye, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ConsultantDashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [referredItems, setReferredItems] = useState({ mas: [], rfi: [] });
  const [error, setError] = useState(null);
  const [consultant, setConsultant] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Allow super admin access without consultant credentials
    const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com') || 
                         document.cookie.includes('userLevel=SUPER_ADMIN');
    
    const consultantEmail = localStorage.getItem('consultantEmail');
    const consultantToken = localStorage.getItem('consultantToken');

    if (!consultantEmail && !consultantToken && !isSuperAdmin) {
      navigate('/consultant-login');
      return;
    }

    fetchConsultantData();
  }, [navigate]);

  async function fetchConsultantData() {
    try {
      setLoading(true);
      const consultantEmail = localStorage.getItem('consultantEmail');
      const consultantToken = localStorage.getItem('consultantToken');
      const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');

      // For super admin, fetch all consultants and projects
      if (isSuperAdmin && !consultantEmail) {
        const projectsRes = await fetch('/api/projects', {
          headers: {
            'x-dev-user-email': localStorage.getItem('devUserEmail'),
          },
        });
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
          setConsultant({ name: 'Super Admin', email: localStorage.getItem('devUserEmail') });
        }
        
        const allReferredRes = await fetch('/api/consultants/all-referred-items', {
          headers: {
            'x-dev-user-email': localStorage.getItem('devUserEmail'),
          },
        });
        if (allReferredRes.ok) {
          const referredData = await allReferredRes.json();
          setReferredItems(referredData);
        }
        return;
      }

      // Fetch consultant details and projects
      const consultantRes = await fetch(`/api/consultants/profile`, {
        headers: {
          'Authorization': `Bearer ${consultantToken}`,
          'x-consultant-email': consultantEmail,
        },
      });

      if (!consultantRes.ok) {
        throw new Error('Failed to fetch consultant data');
      }

      const consultantData = await consultantRes.json();
      setConsultant(consultantData.consultant);
      setProjects(consultantData.projects);

      // Fetch referred MAS and RFI items
      const referredRes = await fetch(`/api/consultants/referred-items`, {
        headers: {
          'Authorization': `Bearer ${consultantToken}`,
          'x-consultant-email': consultantEmail,
        },
      });

      if (referredRes.ok) {
        const referredData = await referredRes.json();
        setReferredItems(referredData);
      }
    } catch (err) {
      console.error('Error fetching consultant data:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('consultantEmail');
    localStorage.removeItem('consultantToken');
    localStorage.removeItem('consultantId');
    navigate('/consultant-login');
  };

  const handleViewDrawings = (projectId) => {
    navigate(`/consultant/project/${projectId}/drawings`);
  };

  const handleViewCalculations = (projectId) => {
    navigate(`/consultant/project/${projectId}/calculations`);
  };

  const handleViewMAS = (masId) => {
    navigate(`/consultant/mas/${masId}`);
  };

  const handleViewRFI = (rfiId) => {
    navigate(`/consultant/rfi/${rfiId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
          <div className="text-lodha-black text-xl font-garamond font-bold">
            Loading Dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lodha-sand">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-garamond font-bold text-lodha-gold">
                Atelier - MEP Consultant Portal
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {consultant?.name || 'Consultant'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Referred Items Section */}
        {(referredItems.mas.length > 0 || referredItems.rfi.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-garamond font-bold text-lodha-gold mb-4">
              Items Requiring Your Attention
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Referred MAS */}
              {referredItems.mas.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-lodha-gold" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Material Approval Sheets ({referredItems.mas.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {referredItems.mas.map(mas => (
                      <div
                        key={mas.id}
                        className={`p-3 border rounded-md cursor-pointer hover:bg-lodha-sand ${
                          !mas.consultant_replied_at ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                        }`}
                        onClick={() => handleViewMAS(mas.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{mas.material_name}</p>
                            <p className="text-sm text-gray-500">{mas.project_name}</p>
                          </div>
                          {!mas.consultant_replied_at && (
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referred RFI */}
              {referredItems.rfi.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-lodha-gold" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Requests for Information ({referredItems.rfi.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {referredItems.rfi.map(rfi => (
                      <div
                        key={rfi.id}
                        className={`p-3 border rounded-md cursor-pointer hover:bg-lodha-sand ${
                          !rfi.consultant_replied_at ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                        }`}
                        onClick={() => handleViewRFI(rfi.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{rfi.title}</p>
                            <p className="text-sm text-gray-500">{rfi.project_name}</p>
                          </div>
                          {!rfi.consultant_replied_at && (
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projects Section */}
        <div>
          <h2 className="text-2xl font-garamond font-bold text-lodha-gold mb-4">
            Your Projects
          </h2>
          
          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No projects assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div key={project.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <h3 className="text-xl font-garamond font-bold text-lodha-gold mb-2">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <span className="px-2 py-1 bg-lodha-sand rounded">
                        {project.lifecycle_stage}
                      </span>
                      <span className="px-2 py-1 bg-lodha-sand rounded">
                        {project.completion_percentage}% Complete
                      </span>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleViewDrawings(project.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                        View Drawings
                      </button>
                      <button
                        onClick={() => handleViewCalculations(project.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded-md hover:bg-lodha-deep"
                      >
                        <FileText className="w-4 h-4" />
                        Design Calculations
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
