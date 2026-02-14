import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Building2, Layers,
  Calculator, ClipboardList, FileText, RefreshCw, GitPullRequest, MessageSquare, Package
} from 'lucide-react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ProjectTeamManagement from '../components/ProjectTeamManagement';
import { auth } from '../lib/firebase';
import { createOrUpdateUser } from '../services/userService';
import { showError } from '../utils/toast';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [expandedSocieties, setExpandedSocieties] = useState({});
  const [expandedBuildings, setExpandedBuildings] = useState({});

  const toggleSociety = (societyId) => {
    setExpandedSocieties(prev => ({ ...prev, [societyId]: !prev[societyId] }));
  };

  const toggleBuilding = (buildingId) => {
    setExpandedBuildings(prev => ({ ...prev, [buildingId]: !prev[buildingId] }));
  };

  useEffect(() => {
    fetchProject();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userData = await createOrUpdateUser(user.email, user.displayName);
        setCurrentUser(userData);
        setUserLevel(userData.user_level);
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }
  };

  const fetchProject = async () => {
    try {
      // Fetch full project details including buildings/floors/flats
      const response = await fetch(`/api/projects/${id}/full`);
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
      showError('Failed to update project stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Spinner fullPage label="Loading project..." />
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => navigate(`/design-calculations/${id}`)}
          className="py-3 px-4 bg-lodha-gold hover:bg-lodha-gold/90 text-white rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          Design Calculations
        </button>
        <button
          onClick={() => navigate(`/dds/${id}`)}
          className="py-3 px-4 bg-lodha-gold hover:bg-lodha-gold/90 text-white rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <ClipboardList className="w-4 h-4" />
          DDS Management
        </button>
        <button
          onClick={() => navigate(`/drawing-schedule/${id}`)}
          className="py-3 px-4 border-2 border-lodha-gold text-lodha-gold hover:bg-lodha-gold hover:text-white rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Drawing Schedule
        </button>
        <button
          onClick={() => navigate(`/projects/${id}/rfc`)}
          className="py-3 px-4 border-2 border-lodha-gold text-lodha-gold hover:bg-lodha-gold hover:text-white rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          RFC Management
        </button>
        <button
          onClick={() => navigate(`/change-requests/${id}`)}
          className="py-3 px-4 text-lodha-gold hover:bg-lodha-gold/10 rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <GitPullRequest className="w-4 h-4" />
          Change Requests
        </button>
        <button
          onClick={() => navigate(`/projects/${id}/rfi`)}
          className="py-3 px-4 text-lodha-gold hover:bg-lodha-gold/10 rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          RFI
        </button>
        <button
          onClick={() => navigate(`/mas-list?project=${id}`)}
          className="py-3 px-4 text-lodha-gold hover:bg-lodha-gold/10 rounded-lg transition-colors font-jost font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Package className="w-4 h-4" />
          MAS
        </button>
      </div>

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Project Info Card */}
        <div className="card">
          <h2 className="heading-secondary mb-4">Project Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-lodha-grey font-jost">Location</p>
              <p className="text-body font-semibold">{project.location}</p>
            </div>
            <div>
              <p className="text-sm text-lodha-grey font-jost">Assigned Lead</p>
              <p className="text-body font-semibold">{project.assigned_lead_name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-lodha-grey font-jost">Progress</p>
              <div className="mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-lodha-grey font-jost">{project.completion_percentage}%</span>
                </div>
                <div className="h-3 bg-lodha-steel/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-lodha-gold transition-all duration-300"
                    style={{ width: `${project.completion_percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card">
          <h2 className="heading-secondary mb-4">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-lodha-grey">Total Buildings:</span>
              <span className="font-semibold">{project.buildings?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lodha-grey">Total Floors:</span>
              <span className="font-semibold">
                {project.buildings?.reduce((sum, b) => sum + (b.floors?.length || 0), 0) || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-lodha-grey">Total Flats:</span>
              <span className="font-semibold">
                {project.buildings?.reduce(
                  (sum, b) => sum + (b.floors?.reduce(
                    (fSum, f) => fSum + (f.flats?.reduce((flatSum, flat) => flatSum + (parseInt(flat.number_of_flats) || 0), 0) || 0), 0
                  ) || 0), 0
                ) || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floor-wise Details - Grouped by Society */}
      {project.buildings && project.buildings.length > 0 && (
        <div className="card mb-8">
          <h2 className="heading-secondary mb-4">Floor-wise Details (Grouped by Society)</h2>
          <div className="space-y-6">
            {(() => {
              // Always use societies from backend response
              const societies = Array.isArray(project.societies) ? project.societies : [];
              // Fallback: if no societies, create a dummy for 'No Society'
              const buildingsBySociety = {};
              project.buildings.forEach(b => {
                const sid = b.societyId || b.society_id || 'no-society';
                if (!buildingsBySociety[sid]) buildingsBySociety[sid] = [];
                buildingsBySociety[sid].push(b);
              });
              // Render each society group, always showing the correct name from DB
              return Object.entries(buildingsBySociety).map(([societyId, buildings], sIdx) => {
                // societyId may be int or string, so match loosely
                const society = societies.find(s => String(s.id) === String(societyId));
                // Find parent buildings (those that are not twins, or are the lowest id in their twin set)
                const shownBuildingIds = new Set();
                const parentBuildings = buildings.filter(b => {
                  if (b.twin_of_building_id) {
                    // This is a twin, only show if its parent is not present (all twins, no parent)
                    const parent = buildings.find(x => x.id === b.twin_of_building_id);
                    if (!parent) {
                      // Only show the lowest id in the twin set
                      const twinSet = buildings.filter(x => x.twin_of_building_id === b.twin_of_building_id || x.id === b.twin_of_building_id);
                      const minId = Math.min(...twinSet.map(x => x.id));
                      if (b.id === minId) {
                        twinSet.forEach(x => shownBuildingIds.add(x.id));
                        return true;
                      }
                      return false;
                    }
                    return false;
                  } else {
                    // This is a parent, show it and mark all its twins as shown
                    const twinSet = buildings.filter(x => x.twin_of_building_id === b.id || x.id === b.id);
                    twinSet.forEach(x => shownBuildingIds.add(x.id));
                    return true;
                  }
                });
                return (
                  <div key={societyId} className="border border-lodha-steel/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSociety(societyId)}
                      className="w-full flex items-center gap-3 px-5 py-4 bg-lodha-sand/60 hover:bg-lodha-sand transition-colors text-left"
                      aria-expanded={!!expandedSocieties[societyId]}
                    >
                      {expandedSocieties[societyId] ? (
                        <ChevronDown className="w-5 h-5 text-lodha-gold flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-lodha-gold flex-shrink-0" />
                      )}
                      <Layers className="w-5 h-5 text-lodha-gold flex-shrink-0" />
                      <h3 className="font-jost font-bold text-lg text-lodha-black">
                        {society ? society.name : 'No Society'}
                      </h3>
                      <span className="ml-auto text-sm text-lodha-grey font-jost">
                        {parentBuildings.length} building{parentBuildings.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    {expandedSocieties[societyId] && (
                    <div className="p-5 space-y-4">
                      {parentBuildings.map((building, idx) => {
                        // Find all buildings in the same twin group (including self)
                        let twinGroup = [];
                        if (building.twin_of_building_id) {
                          // This is a twin, find all buildings with same parent
                          twinGroup = buildings.filter(b => b.twin_of_building_id === building.twin_of_building_id || b.id === building.twin_of_building_id);
                        } else {
                          // This is a parent, find all twins and self
                          twinGroup = buildings.filter(b => b.twin_of_building_id === building.id || b.id === building.id);
                        }
                        const twinGroupNames = twinGroup.map(b => b.name).filter(Boolean).join(', ');
                        const floorCount = building.floors?.filter(f => !f.twin_of_floor_id)?.length || 0;
                        return (
                          <div key={building.id} className="border border-lodha-steel/20 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleBuilding(building.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-lodha-sand/30 transition-colors text-left"
                              aria-expanded={!!expandedBuildings[building.id]}
                            >
                              {expandedBuildings[building.id] ? (
                                <ChevronDown className="w-4 h-4 text-lodha-grey flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-lodha-grey flex-shrink-0" />
                              )}
                              <Building2 className="w-4 h-4 text-lodha-gold flex-shrink-0" />
                              <h4 className="font-jost font-bold text-base text-lodha-black">
                                {building.name || `Building ${idx + 1}`}
                              </h4>
                              {twinGroup.length > 1 && (
                                <span className="text-xs text-lodha-grey font-jost">
                                  (Identical: {twinGroupNames})
                                </span>
                              )}
                              <span className="text-xs text-lodha-grey font-jost px-2 py-0.5 bg-lodha-sand rounded-full">
                                {building.application_type}
                              </span>
                              <span className="ml-auto text-xs text-lodha-grey font-jost">
                                {floorCount} floor{floorCount !== 1 ? 's' : ''}
                              </span>
                            </button>
                            {expandedBuildings[building.id] && (
                            <div className="px-4 pb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-lodha-grey/30">
                                    <th className="text-left py-2 px-3 font-jost font-semibold">Floor</th>
                                    <th className="text-left py-2 px-3 font-jost font-semibold">Flat Type</th>
                                    <th className="text-right py-2 px-3 font-jost font-semibold">Area (sqm)</th>
                                    <th className="text-right py-2 px-3 font-jost font-semibold">Count</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {building.floors && building.floors.length > 0 ? (
                                    (() => {
                                      const parentFloors = building.floors.filter(f => !f.twin_of_floor_id);
                                      return parentFloors.length > 0 ? parentFloors.map((floor) => {
                                        const twinFloors = building.floors.filter(f => f.twin_of_floor_id === floor.id);
                                        const twinNames = twinFloors.map(t => t.floor_name || `Floor ${t.floor_number}`).join(', ');
                                        return floor.flats && floor.flats.length > 0 ? (
                                          floor.flats.map((flat, flatIdx) => (
                                            <tr key={`${floor.id}-${flat.id}`} className="border-b border-lodha-grey/10 hover:bg-lodha-sand/30">
                                              {flatIdx === 0 && (
                                                <td rowSpan={floor.flats.length} className="py-2 px-3 font-semibold align-top">
                                                  <div>
                                                    {floor.floor_name || `Floor ${floor.floor_number}`}
                                                    {twinNames && (
                                                      <div className="text-xs font-normal text-lodha-grey mt-1">
                                                        Twin: {twinNames}
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                              )}
                                              <td className="py-2 px-3">{flat.flat_type || '—'}</td>
                                              <td className="py-2 px-3 text-right">{flat.area_sqft || '—'}</td>
                                              <td className="py-2 px-3 text-right font-semibold">{flat.number_of_flats || 0}</td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr key={floor.id} className="border-b border-lodha-grey/10">
                                            <td className="py-2 px-3 font-semibold">
                                              <div>
                                                {floor.floor_name || `Floor ${floor.floor_number}`}
                                                {twinNames && (
                                                  <div className="text-xs font-normal text-lodha-grey mt-1">
                                                    Twin: {twinNames}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td colSpan="3" className="py-2 px-3 text-lodha-grey italic">No flats added</td>
                                          </tr>
                                        );
                                      }) : (
                                        <tr>
                                          <td colSpan="4" className="py-4 px-3 text-center text-lodha-grey italic">No floors added</td>
                                        </tr>
                                      );
                                    })()
                                  ) : (
                                    <tr>
                                      <td colSpan="4" className="py-4 px-3 text-center text-lodha-grey italic">No floors added</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

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

      {/* Project Team Management */}
      {currentUser && (
        <div className="mb-8">
          <ProjectTeamManagement 
            projectId={id} 
            currentUserLevel={userLevel}
            currentUserId={currentUser.id}
          />
        </div>
      )}

      {/* Lifecycle Stage Update */}
      <div className="card">
        <h3 className="heading-tertiary mb-6">Update Lifecycle Stage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
