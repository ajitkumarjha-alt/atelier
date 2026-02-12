import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import GoogleMapComponent from '../../components/GoogleMapComponent';
import { 
  Plus, Trash2, Edit2, MapPin, Copy, AlertCircle, CheckCircle, 
  Building2, Layers, Home, ChevronDown, ChevronRight, Save,
  Car, Trees, Droplets, Zap, Shield, Waves, Landmark,
  DoorOpen, ArrowUpDown, SlidersHorizontal, Users
} from 'lucide-react';

export default function ProjectInputEnhanced() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!projectId;

  // ===== PROJECT STATE =====
  const [projectData, setProjectData] = useState({
    name: '', address: '', latitude: '', longitude: '', google_place_id: '',
    projectCategory: '', assignedLeadId: null, start_date: '', target_completion_date: '',
    buildings: [], societies: [],
  });

  // ===== AMENITIES STATE =====
  const [amenities, setAmenities] = useState({
    swimmingPools: [], landscapes: [], surfaceParking: [], infrastructure: [],
  });

  // ===== UI STATE =====
  const [standards, setStandards] = useState({
    applicationTypes: [], residentialTypes: [], flatTypes: [], buildingStatuses: [],
  });
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('buildings'); // buildings, societies, amenities, staircases, lifts
  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [l1Users, setL1Users] = useState([]);

  // ===== FETCH STANDARDS AND DATA =====
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stdRes, l1Res] = await Promise.all([
          fetch('/api/project-standards'),
          fetch('/api/users/level/L1'),
        ]);
        
        if (stdRes.ok) {
          const data = await stdRes.json();
          setStandards({
            applicationTypes: data.applicationTypes || [],
            residentialTypes: data.residentialTypes || [],
            flatTypes: data.flatTypes || [],
            buildingStatuses: ['CD', 'DD', 'Tender', 'VFC'],
          });
        }
        if (l1Res.ok) setL1Users(await l1Res.json());

        if (isEditing) {
          const [projRes, amenRes] = await Promise.all([
            fetch(`/api/projects/${projectId}/full`),
            Promise.all([
              fetch(`/api/projects/${projectId}/swimming-pools`),
              fetch(`/api/projects/${projectId}/landscapes`),
              fetch(`/api/projects/${projectId}/societies`),
              fetch(`/api/projects/${projectId}/infrastructure`),
            ]),
          ]);

          if (projRes.ok) {
            const proj = await projRes.json();
            setProjectData({
              name: proj.name || '', address: proj.address || proj.description || '',
              latitude: proj.latitude || '', longitude: proj.longitude || '',
              google_place_id: proj.google_place_id || '',
              projectCategory: proj.lifecycle_stage || '',
              assignedLeadId: proj.assigned_lead_id,
              start_date: proj.start_date?.split('T')[0] || '',
              target_completion_date: proj.target_completion_date?.split('T')[0] || '',
              buildings: proj.buildings || [],
              societies: [],
            });
          }

          const [poolsRes, landscapesRes, societiesRes, infraRes] = amenRes;
          setAmenities({
            swimmingPools: poolsRes.ok ? await poolsRes.json() : [],
            landscapes: landscapesRes.ok ? await landscapesRes.json() : [],
            surfaceParking: [],
            infrastructure: infraRes.ok ? await infraRes.json() : [],
          });
          if (societiesRes.ok) {
            const societiesData = await societiesRes.json();
            setProjectData(prev => ({ ...prev, societies: societiesData }));
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [projectId, isEditing]);

  // ===== PROJECT FIELD HANDLERS =====
  const updateProject = (field, value) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleMapSelect = useCallback((location) => {
    setProjectData(prev => ({
      ...prev,
      latitude: location.lat, longitude: location.lng,
      address: location.address || prev.address,
      google_place_id: location.placeId || '',
    }));
    setShowMap(false);
  }, []);

  // ===== BUILDING HANDLERS =====
  const addBuilding = () => {
    const newBuilding = {
      id: `new-${Date.now()}`, name: '', application_type: '',
      residential_type: '', twin_buildings: '', status: 'Concept',
      society_id: null, floors: [], staircases: [], lifts: [],
    };
    setProjectData(prev => ({
      ...prev, buildings: [...prev.buildings, newBuilding],
    }));
    setSelectedBuilding(prev => prev?.buildings?.length || 0);
  };

  const updateBuilding = (index, field, value) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      buildings[index] = { ...buildings[index], [field]: value };
      return { ...prev, buildings };
    });
  };

  const removeBuilding = (index) => {
    setProjectData(prev => ({
      ...prev, buildings: prev.buildings.filter((_, i) => i !== index),
    }));
    setSelectedBuilding(null);
  };

  // ===== FLOOR HANDLERS =====
  const addFloor = (buildingIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = buildings[buildingIndex].floors || [];
      buildings[buildingIndex] = {
        ...buildings[buildingIndex],
        floors: [...floors, {
          id: `new-${Date.now()}`, floor_name: '', floor_number: floors.length,
          floor_height: '', twin_floors: '', area_sqm: '', floor_type: 'standard',
          flats: [], parking: null, shops: [], lobbies: [],
        }],
      };
      return { ...prev, buildings };
    });
  };

  const updateFloor = (buildingIndex, floorIndex, field, value) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = [...buildings[buildingIndex].floors];
      floors[floorIndex] = { ...floors[floorIndex], [field]: value };
      buildings[buildingIndex] = { ...buildings[buildingIndex], floors };
      return { ...prev, buildings };
    });
  };

  const removeFloor = (buildingIndex, floorIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      buildings[buildingIndex] = {
        ...buildings[buildingIndex],
        floors: buildings[buildingIndex].floors.filter((_, i) => i !== floorIndex),
      };
      return { ...prev, buildings };
    });
  };

  // ===== FLAT HANDLERS =====
  const addFlat = (buildingIndex, floorIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = [...buildings[buildingIndex].floors];
      const flats = floors[floorIndex].flats || [];
      floors[floorIndex] = {
        ...floors[floorIndex],
        flats: [...flats, {
          id: `new-${Date.now()}`, flat_type: '', number_of_flats: 1, area_sqm: '',
        }],
      };
      buildings[buildingIndex] = { ...buildings[buildingIndex], floors };
      return { ...prev, buildings };
    });
  };

  const updateFlat = (buildingIndex, floorIndex, flatIndex, field, value) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = [...buildings[buildingIndex].floors];
      const flats = [...floors[floorIndex].flats];
      flats[flatIndex] = { ...flats[flatIndex], [field]: value };
      floors[floorIndex] = { ...floors[floorIndex], flats };
      buildings[buildingIndex] = { ...buildings[buildingIndex], floors };
      return { ...prev, buildings };
    });
  };

  const removeFlat = (buildingIndex, floorIndex, flatIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = [...buildings[buildingIndex].floors];
      floors[floorIndex] = {
        ...floors[floorIndex],
        flats: floors[floorIndex].flats.filter((_, i) => i !== flatIndex),
      };
      buildings[buildingIndex] = { ...buildings[buildingIndex], floors };
      return { ...prev, buildings };
    });
  };

  // ===== SOCIETY HANDLERS =====
  const addSociety = () => {
    setProjectData(prev => ({
      ...prev,
      societies: [...prev.societies, { id: `new-${Date.now()}`, name: '', description: '', buildings: [] }],
    }));
  };

  const updateSociety = (index, field, value) => {
    setProjectData(prev => {
      const societies = [...prev.societies];
      societies[index] = { ...societies[index], [field]: value };
      return { ...prev, societies };
    });
  };

  const assignBuildingToSociety = (societyIndex, buildingIndex) => {
    const building = projectData.buildings[buildingIndex];
    // Check if already assigned to another society
    const alreadyAssigned = projectData.societies.some((s, i) =>
      i !== societyIndex && s.buildings?.some(b => b.id === building.id || b.name === building.name)
    );
    if (alreadyAssigned) {
      setError('This building is already assigned to another society');
      return;
    }
    updateBuilding(buildingIndex, 'society_id', projectData.societies[societyIndex].id);
  };

  // ===== STAIRCASE/LIFT HANDLERS =====
  const addStaircase = (buildingIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const staircases = buildings[buildingIndex].staircases || [];
      buildings[buildingIndex] = {
        ...buildings[buildingIndex],
        staircases: [...staircases, {
          id: `new-${Date.now()}`, name: '', windows: [], doors: [],
        }],
      };
      return { ...prev, buildings };
    });
  };

  const addLift = (buildingIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const lifts = buildings[buildingIndex].lifts || [];
      buildings[buildingIndex] = {
        ...buildings[buildingIndex],
        lifts: [...lifts, {
          id: `new-${Date.now()}`, name: '', start_floor_id: null,
          last_floor_id: null, door_type: 'single', door_width_mm: '', door_height_mm: '',
        }],
      };
      return { ...prev, buildings };
    });
  };

  // ===== PARKING (MLCP) HANDLERS =====
  const addParkingToFloor = (buildingIndex, floorIndex) => {
    updateFloor(buildingIndex, floorIndex, 'parking', {
      two_wheeler_count: 0, four_wheeler_count: 0, ev_count: 0,
    });
  };

  // ===== SHOP HANDLERS =====
  const addShop = (buildingIndex, floorIndex) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = [...buildings[buildingIndex].floors];
      const shops = floors[floorIndex].shops || [];
      floors[floorIndex] = {
        ...floors[floorIndex],
        shops: [...shops, {
          id: `new-${Date.now()}`, name: '', area_sqm: '', identical_shops: '', is_fnb: false,
        }],
      };
      buildings[buildingIndex] = { ...buildings[buildingIndex], floors };
      return { ...prev, buildings };
    });
  };

  // ===== LOBBY HANDLERS =====
  const addLobby = (buildingIndex, floorIndex, lobbyType) => {
    setProjectData(prev => {
      const buildings = [...prev.buildings];
      const floors = [...buildings[buildingIndex].floors];
      const lobbies = floors[floorIndex].lobbies || [];
      floors[floorIndex] = {
        ...floors[floorIndex],
        lobbies: [...lobbies, {
          id: `new-${Date.now()}`, lobby_type: lobbyType, name: '', area_sqm: '',
        }],
      };
      buildings[buildingIndex] = { ...buildings[buildingIndex], floors };
      return { ...prev, buildings };
    });
  };

  // ===== AMENITY HANDLERS =====
  const addAmenity = (type) => {
    const templates = {
      swimmingPools: { name: '', volume_cum: '', depth_m: '', society_id: null },
      landscapes: { name: '', total_area_sqm: '', softscape_area_sqm: '', society_id: null },
      surfaceParking: { name: '', two_wheeler_count: 0, four_wheeler_count: 0, ev_charging_count: 0, society_id: null },
      infrastructure: { infra_type: 'STP', name: '', capacity: '', description: '', society_id: null },
    };
    setAmenities(prev => ({
      ...prev, [type]: [...prev[type], { id: `new-${Date.now()}`, ...templates[type] }],
    }));
  };

  // ===== SAVE PROJECT =====
  const handleSave = async () => {
    if (!projectData.name?.trim()) {
      setError('Project name is required');
      return;
    }
    if (!projectData.address?.trim()) {
      setError('Project address is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: projectData.name,
        description: projectData.address,
        address: projectData.address,
        latitude: projectData.latitude,
        longitude: projectData.longitude,
        google_place_id: projectData.google_place_id,
        status: 'on_track',
        lifecycle_stage: projectData.projectCategory || 'Concept',
        assigned_lead_id: projectData.assignedLeadId,
        start_date: projectData.start_date || new Date().toISOString().split('T')[0],
        target_completion_date: projectData.target_completion_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        buildings: projectData.buildings.map(b => ({
          name: b.name,
          application_type: b.application_type,
          residential_type: b.residential_type,
          twin_buildings: b.twin_buildings,
          status: b.status,
          floors: (b.floors || []).map(f => ({
            floor_name: f.floor_name,
            floor_number: f.floor_number,
            floor_height: f.floor_height,
            twin_floors: f.twin_floors,
            area_sqm: f.area_sqm,
            flats: (f.flats || []).map(fl => ({
              flat_type: fl.flat_type,
              number_of_flats: fl.number_of_flats,
              area_sqm: fl.area_sqm,
            })),
          })),
        })),
      };

      const url = isEditing ? `/api/projects/${projectId}` : '/api/projects';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save project');
      }

      const savedProject = await response.json();
      const projId = savedProject.id || projectId;

      // Save societies
      for (const society of projectData.societies) {
        if (String(society.id).startsWith('new-')) {
          await fetch(`/api/projects/${projId}/societies`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: society.name, description: society.description }),
          });
        }
      }

      // Save amenities
      for (const pool of amenities.swimmingPools) {
        if (String(pool.id).startsWith('new-') && pool.name) {
          await fetch(`/api/projects/${projId}/swimming-pools`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pool),
          });
        }
      }

      for (const landscape of amenities.landscapes) {
        if (String(landscape.id).startsWith('new-') && landscape.name) {
          await fetch(`/api/projects/${projId}/landscapes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(landscape),
          });
        }
      }

      for (const parking of amenities.surfaceParking) {
        if (String(parking.id).startsWith('new-')) {
          await fetch(`/api/projects/${projId}/surface-parking`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parking),
          });
        }
      }

      for (const infra of amenities.infrastructure) {
        if (String(infra.id).startsWith('new-') && infra.name) {
          await fetch(`/api/projects/${projId}/infrastructure`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(infra),
          });
        }
      }

      // Save staircases and lifts
      for (const building of projectData.buildings) {
        if (building.id && !String(building.id).startsWith('new-')) {
          for (const staircase of (building.staircases || [])) {
            if (String(staircase.id).startsWith('new-') && staircase.name) {
              await fetch(`/api/buildings/${building.id}/staircases`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(staircase),
              });
            }
          }
          for (const lift of (building.lifts || [])) {
            if (String(lift.id).startsWith('new-') && lift.name) {
              await fetch(`/api/buildings/${building.id}/lifts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lift),
              });
            }
          }
        }
      }

      navigate(`/project/${projId}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== TOGGLE HELPERS =====
  const toggleBuilding = (index) => {
    setExpandedBuildings(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleFloor = (key) => {
    setExpandedFloors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ===== BUILDING TYPE OPTIONS =====
  const showResidentialType = (type) => {
    return type === 'Residential Apartment' || type === 'Residential' || type === 'Villa';
  };

  const isMLCP = (type) => type === 'MLCP';
  const isCommercialOrShop = (type) => type === 'Shop' || type === 'Commercial';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold"></div>
        </div>
      </Layout>
    );
  }

  const canAddBuildings = projectData.name?.trim() && projectData.address?.trim();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-lodha-gold">
              {isEditing ? 'Edit Project' : 'Create New Project'}
            </h1>
            <p className="text-sm text-lodha-grey mt-1">
              Fill in project details, add buildings, floors, and amenities
            </p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 
                       disabled:opacity-50 flex items-center gap-2 font-medium transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* ===== PROJECT INFO SECTION ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-6 mb-6">
          <h2 className="text-lg font-serif font-semibold text-lodha-gold mb-4 flex items-center gap-2">
            <Landmark className="w-5 h-5" /> Project Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Project Name *</label>
              <input type="text" value={projectData.name}
                onChange={(e) => updateProject('name', e.target.value)}
                className="w-full px-3 py-2 border border-lodha-steel/40 rounded-lg focus:ring-2 focus:ring-lodha-gold/30 focus:border-lodha-gold"
                placeholder="Enter project name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Assign L1 Lead</label>
              <select value={projectData.assignedLeadId || ''}
                onChange={(e) => updateProject('assignedLeadId', e.target.value || null)}
                className="w-full px-3 py-2 border border-lodha-steel/40 rounded-lg focus:ring-2 focus:ring-lodha-gold/30">
                <option value="">Select L1 Lead</option>
                {l1Users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-lodha-grey mb-1">Address *</label>
              <div className="flex gap-2">
                <input type="text" value={projectData.address}
                  onChange={(e) => updateProject('address', e.target.value)}
                  className="flex-1 px-3 py-2 border border-lodha-steel/40 rounded-lg focus:ring-2 focus:ring-lodha-gold/30"
                  placeholder="Enter project address" />
                <button onClick={() => setShowMap(!showMap)}
                  className="px-3 py-2 bg-lodha-cream text-lodha-gold border border-lodha-gold/30 rounded-lg hover:bg-lodha-gold hover:text-white transition-colors flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Map
                </button>
              </div>
            </div>
            {showMap && (
              <div className="md:col-span-2 h-64 rounded-lg overflow-hidden border border-lodha-steel/30">
                <GoogleMapComponent onSelect={handleMapSelect}
                  initialLat={projectData.latitude} initialLng={projectData.longitude} />
              </div>
            )}
            {projectData.latitude && (
              <div className="text-xs text-lodha-grey flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Location: {projectData.latitude}, {projectData.longitude}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Start Date</label>
              <input type="date" value={projectData.start_date}
                onChange={(e) => updateProject('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-lodha-steel/40 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Target Completion Date</label>
              <input type="date" value={projectData.target_completion_date}
                onChange={(e) => updateProject('target_completion_date', e.target.value)}
                className="w-full px-3 py-2 border border-lodha-steel/40 rounded-lg" />
            </div>
          </div>
        </div>

        {/* ===== TABS ===== */}
        <div className="flex gap-1 mb-4 bg-lodha-cream/50 p-1 rounded-lg overflow-x-auto">
          {[
            { key: 'buildings', label: 'Buildings', icon: Building2 },
            { key: 'societies', label: 'Societies', icon: Landmark },
            { key: 'amenities', label: 'Amenities & Infrastructure', icon: Waves },
            { key: 'summary', label: 'Summary', icon: SlidersHorizontal },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              disabled={!canAddBuildings && tab.key !== 'buildings'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.key
                  ? 'bg-white text-lodha-gold shadow-sm'
                  : 'text-lodha-grey hover:text-lodha-gold'
                } ${!canAddBuildings && tab.key !== 'buildings' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* ===== BUILDINGS TAB ===== */}
        {activeTab === 'buildings' && (
          <div className="space-y-4">
            {!canAddBuildings && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Enter project name and address to enable building configuration
              </div>
            )}

            {canAddBuildings && (
              <button onClick={addBuilding}
                className="px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Add Building
              </button>
            )}

            {projectData.buildings.map((building, bIdx) => (
              <div key={building.id || bIdx} className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 overflow-hidden">
                {/* Building Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-lodha-cream/30 border-b border-lodha-steel/20 cursor-pointer"
                     onClick={() => toggleBuilding(bIdx)}>
                  <div className="flex items-center gap-2">
                    {expandedBuildings[bIdx] ? <ChevronDown className="w-4 h-4 text-lodha-gold" /> : <ChevronRight className="w-4 h-4 text-lodha-grey" />}
                    <Building2 className="w-4 h-4 text-lodha-gold" />
                    <span className="font-medium text-lodha-gold">
                      {building.name || `Building ${bIdx + 1}`}
                    </span>
                    {building.application_type && (
                      <span className="text-xs px-2 py-0.5 bg-lodha-gold/10 text-lodha-gold rounded-full">
                        {building.application_type}
                      </span>
                    )}
                    {building.status && building.status !== 'Concept' && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {building.status}
                      </span>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeBuilding(bIdx); }}
                    className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Building Fields */}
                {expandedBuildings[bIdx] && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-lodha-grey mb-1">Building Name</label>
                        <input type="text" value={building.name}
                          onChange={(e) => updateBuilding(bIdx, 'name', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg" placeholder="Building name" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-lodha-grey mb-1">Building Type</label>
                        <select value={building.application_type}
                          onChange={(e) => updateBuilding(bIdx, 'application_type', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg">
                          <option value="">Select Type</option>
                          {standards.applicationTypes.map(t => (
                            <option key={t.id || t.value} value={t.value}>{t.value}</option>
                          ))}
                        </select>
                      </div>
                      {showResidentialType(building.application_type) && (
                        <div>
                          <label className="block text-xs font-medium text-lodha-grey mb-1">Project Type</label>
                          <select value={building.residential_type || ''}
                            onChange={(e) => updateBuilding(bIdx, 'residential_type', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg">
                            <option value="">Select Type</option>
                            {standards.residentialTypes.map(t => (
                              <option key={t.id || t.value} value={t.value}>{t.value}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-lodha-grey mb-1">
                          Twin Building(s) <span className="text-lodha-cool-grey">(comma separated)</span>
                        </label>
                        <input type="text" value={building.twin_buildings || ''}
                          onChange={(e) => updateBuilding(bIdx, 'twin_buildings', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg"
                          placeholder="e.g., Wing B, Wing C" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-lodha-grey mb-1">Status</label>
                        <select value={building.status || 'Concept'}
                          onChange={(e) => updateBuilding(bIdx, 'status', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg">
                          <option value="Concept">Concept</option>
                          {standards.buildingStatuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Floors Section */}
                    <div className="border-t border-lodha-steel/20 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-lodha-grey flex items-center gap-1">
                          <Layers className="w-4 h-4" /> Floors ({building.floors?.length || 0})
                        </h4>
                        <button onClick={() => addFloor(bIdx)}
                          className="text-xs px-2.5 py-1 bg-lodha-gold/10 text-lodha-gold rounded-md hover:bg-lodha-gold/20 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Floor
                        </button>
                      </div>

                      {(building.floors || []).map((floor, fIdx) => {
                        const floorKey = `${bIdx}-${fIdx}`;
                        return (
                          <div key={floor.id || fIdx} className="ml-4 mb-2 border border-lodha-steel/20 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-lodha-sage/30 cursor-pointer"
                                 onClick={() => toggleFloor(floorKey)}>
                              <div className="flex items-center gap-2 text-sm">
                                {expandedFloors[floorKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <span className="font-medium">{floor.floor_name || `Floor ${fIdx}`}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeFloor(bIdx, fIdx); }}
                                className="text-red-400 hover:text-red-600 p-0.5">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {expandedFloors[floorKey] && (
                              <div className="p-3 space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-xs text-lodha-grey mb-0.5">Floor Name</label>
                                    <input type="text" value={floor.floor_name || ''}
                                      onChange={(e) => updateFloor(bIdx, fIdx, 'floor_name', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-lodha-steel/40 rounded" placeholder="e.g., Ground Floor" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-lodha-grey mb-0.5">Floor Height (m)</label>
                                    <input type="number" step="0.01" value={floor.floor_height || ''}
                                      onChange={(e) => updateFloor(bIdx, fIdx, 'floor_height', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-lodha-steel/40 rounded" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-lodha-grey mb-0.5">Area (sqm)</label>
                                    <input type="number" step="0.01" value={floor.area_sqm || ''}
                                      onChange={(e) => updateFloor(bIdx, fIdx, 'area_sqm', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-lodha-steel/40 rounded" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-lodha-grey mb-0.5">Twin Floors</label>
                                    <input type="text" value={floor.twin_floors || ''}
                                      onChange={(e) => updateFloor(bIdx, fIdx, 'twin_floors', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-lodha-steel/40 rounded"
                                      placeholder="e.g., 3rd, 5th" />
                                  </div>
                                </div>

                                {/* Residential Flats */}
                                {showResidentialType(building.application_type) && (
                                  <div className="border-t border-lodha-steel/10 pt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-lodha-grey flex items-center gap-1">
                                        <Home className="w-3 h-3" /> Flats
                                      </span>
                                      <button onClick={() => addFlat(bIdx, fIdx)}
                                        className="text-xs px-2 py-0.5 text-lodha-gold hover:bg-lodha-gold/10 rounded flex items-center gap-0.5">
                                        <Plus className="w-3 h-3" /> Add
                                      </button>
                                    </div>
                                    {(floor.flats || []).map((flat, flIdx) => (
                                      <div key={flat.id || flIdx} className="flex items-center gap-2 mb-1">
                                        <select value={flat.flat_type}
                                          onChange={(e) => updateFlat(bIdx, fIdx, flIdx, 'flat_type', e.target.value)}
                                          className="px-2 py-1 text-xs border border-lodha-steel/40 rounded flex-1">
                                          <option value="">Type</option>
                                          {standards.flatTypes.map(t => (
                                            <option key={t.id || t.value} value={t.value}>{t.value}</option>
                                          ))}
                                        </select>
                                        <input type="number" min="1" value={flat.number_of_flats}
                                          onChange={(e) => updateFlat(bIdx, fIdx, flIdx, 'number_of_flats', parseInt(e.target.value))}
                                          className="w-16 px-2 py-1 text-xs border border-lodha-steel/40 rounded" placeholder="Count" />
                                        <input type="number" step="0.01" value={flat.area_sqm || ''}
                                          onChange={(e) => updateFlat(bIdx, fIdx, flIdx, 'area_sqm', e.target.value)}
                                          className="w-20 px-2 py-1 text-xs border border-lodha-steel/40 rounded" placeholder="Area sqm" />
                                        <button onClick={() => removeFlat(bIdx, fIdx, flIdx)}
                                          className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* MLCP Parking */}
                                {isMLCP(building.application_type) && (
                                  <div className="border-t border-lodha-steel/10 pt-2">
                                    <span className="text-xs font-medium text-lodha-grey flex items-center gap-1 mb-1">
                                      <Car className="w-3 h-3" /> Parking
                                    </span>
                                    {!floor.parking ? (
                                      <button onClick={() => addParkingToFloor(bIdx, fIdx)}
                                        className="text-xs px-2 py-1 text-lodha-gold hover:bg-lodha-gold/10 rounded">
                                        + Add Parking Details
                                      </button>
                                    ) : (
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <label className="block text-xs text-lodha-grey">2-Wheeler</label>
                                          <input type="number" min="0" value={floor.parking.two_wheeler_count}
                                            onChange={(e) => updateFloor(bIdx, fIdx, 'parking', {
                                              ...floor.parking, two_wheeler_count: parseInt(e.target.value) || 0
                                            })} className="w-full px-2 py-1 text-xs border rounded" />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-lodha-grey">4-Wheeler</label>
                                          <input type="number" min="0" value={floor.parking.four_wheeler_count}
                                            onChange={(e) => updateFloor(bIdx, fIdx, 'parking', {
                                              ...floor.parking, four_wheeler_count: parseInt(e.target.value) || 0
                                            })} className="w-full px-2 py-1 text-xs border rounded" />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-lodha-grey">EV</label>
                                          <input type="number" min="0" value={floor.parking.ev_count}
                                            onChange={(e) => updateFloor(bIdx, fIdx, 'parking', {
                                              ...floor.parking, ev_count: parseInt(e.target.value) || 0
                                            })} className="w-full px-2 py-1 text-xs border rounded" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Shops (MLCP / Commercial) */}
                                {(isMLCP(building.application_type) || isCommercialOrShop(building.application_type)) && (
                                  <div className="border-t border-lodha-steel/10 pt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-lodha-grey">Shops</span>
                                      <button onClick={() => addShop(bIdx, fIdx)}
                                        className="text-xs px-2 py-0.5 text-lodha-gold hover:bg-lodha-gold/10 rounded flex items-center gap-0.5">
                                        <Plus className="w-3 h-3" /> Add Shop
                                      </button>
                                    </div>
                                    {(floor.shops || []).map((shop, sIdx) => (
                                      <div key={shop.id || sIdx} className="flex items-center gap-2 mb-1">
                                        <input type="text" value={shop.name}
                                          onChange={(e) => {
                                            const shops = [...floor.shops]; shops[sIdx] = { ...shop, name: e.target.value };
                                            updateFloor(bIdx, fIdx, 'shops', shops);
                                          }} className="flex-1 px-2 py-1 text-xs border rounded" placeholder="Shop name" />
                                        <input type="number" step="0.01" value={shop.area_sqm}
                                          onChange={(e) => {
                                            const shops = [...floor.shops]; shops[sIdx] = { ...shop, area_sqm: e.target.value };
                                            updateFloor(bIdx, fIdx, 'shops', shops);
                                          }} className="w-20 px-2 py-1 text-xs border rounded" placeholder="Area" />
                                        <label className="flex items-center gap-1 text-xs">
                                          <input type="checkbox" checked={shop.is_fnb}
                                            onChange={(e) => {
                                              const shops = [...floor.shops]; shops[sIdx] = { ...shop, is_fnb: e.target.checked };
                                              updateFloor(bIdx, fIdx, 'shops', shops);
                                            }} className="rounded text-lodha-gold" />
                                          F&B
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Lobbies */}
                                <div className="border-t border-lodha-steel/10 pt-2 flex gap-2">
                                  <button onClick={() => addLobby(bIdx, fIdx, 'floor')}
                                    className="text-xs px-2 py-1 text-lodha-gold hover:bg-lodha-gold/10 rounded flex items-center gap-0.5">
                                    <DoorOpen className="w-3 h-3" /> + Floor Lobby
                                  </button>
                                  <button onClick={() => addLobby(bIdx, fIdx, 'entrance')}
                                    className="text-xs px-2 py-1 text-lodha-gold hover:bg-lodha-gold/10 rounded flex items-center gap-0.5">
                                    <DoorOpen className="w-3 h-3" /> + Main Entrance Lobby
                                  </button>
                                </div>
                                {(floor.lobbies || []).map((lobby, lIdx) => (
                                  <div key={lobby.id || lIdx} className="flex items-center gap-2 ml-2 mb-1">
                                    <span className="text-xs px-1.5 py-0.5 bg-lodha-cream rounded">
                                      {lobby.lobby_type === 'entrance' ? 'Entrance' : 'Floor'} Lobby
                                    </span>
                                    <input type="number" step="0.01" value={lobby.area_sqm || ''}
                                      onChange={(e) => {
                                        const lobbies = [...floor.lobbies]; lobbies[lIdx] = { ...lobby, area_sqm: e.target.value };
                                        updateFloor(bIdx, fIdx, 'lobbies', lobbies);
                                      }} className="w-24 px-2 py-1 text-xs border rounded" placeholder="Area sqm" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Staircases */}
                    <div className="border-t border-lodha-steel/20 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-lodha-grey flex items-center gap-1">
                          <ArrowUpDown className="w-4 h-4" /> Staircases ({building.staircases?.length || 0})
                        </h4>
                        <button onClick={() => addStaircase(bIdx)}
                          className="text-xs px-2.5 py-1 bg-lodha-gold/10 text-lodha-gold rounded-md hover:bg-lodha-gold/20">
                          + Add Staircase
                        </button>
                      </div>
                      {(building.staircases || []).map((staircase, sIdx) => (
                        <div key={staircase.id || sIdx} className="ml-4 mb-2 p-2 border border-lodha-steel/20 rounded">
                          <input type="text" value={staircase.name}
                            onChange={(e) => {
                              const buildings = [...projectData.buildings];
                              const staircases = [...buildings[bIdx].staircases];
                              staircases[sIdx] = { ...staircase, name: e.target.value };
                              buildings[bIdx] = { ...buildings[bIdx], staircases };
                              setProjectData(prev => ({ ...prev, buildings }));
                            }}
                            className="w-full px-2 py-1 text-sm border border-lodha-steel/40 rounded" placeholder="Staircase name" />
                          <p className="text-xs text-lodha-cool-grey mt-1">
                            Windows and doors per floor can be configured after saving
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Lifts */}
                    <div className="border-t border-lodha-steel/20 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-lodha-grey flex items-center gap-1">
                          Lifts ({building.lifts?.length || 0})
                        </h4>
                        <button onClick={() => addLift(bIdx)}
                          className="text-xs px-2.5 py-1 bg-lodha-gold/10 text-lodha-gold rounded-md hover:bg-lodha-gold/20">
                          + Add Lift
                        </button>
                      </div>
                      {(building.lifts || []).map((lift, lIdx) => (
                        <div key={lift.id || lIdx} className="ml-4 mb-2 p-2 border border-lodha-steel/20 rounded">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <input type="text" value={lift.name}
                              onChange={(e) => {
                                const buildings = [...projectData.buildings];
                                const lifts = [...buildings[bIdx].lifts];
                                lifts[lIdx] = { ...lift, name: e.target.value };
                                buildings[bIdx] = { ...buildings[bIdx], lifts };
                                setProjectData(prev => ({ ...prev, buildings }));
                              }}
                              className="px-2 py-1 text-sm border rounded" placeholder="Lift name" />
                            <select value={lift.door_type}
                              onChange={(e) => {
                                const buildings = [...projectData.buildings];
                                const lifts = [...buildings[bIdx].lifts];
                                lifts[lIdx] = { ...lift, door_type: e.target.value };
                                buildings[bIdx] = { ...buildings[bIdx], lifts };
                                setProjectData(prev => ({ ...prev, buildings }));
                              }}
                              className="px-2 py-1 text-sm border rounded">
                              <option value="single">Single Door</option>
                              <option value="double">Two Door</option>
                            </select>
                            <input type="number" step="0.1" value={lift.door_width_mm || ''}
                              onChange={(e) => {
                                const buildings = [...projectData.buildings];
                                const lifts = [...buildings[bIdx].lifts];
                                lifts[lIdx] = { ...lift, door_width_mm: e.target.value };
                                buildings[bIdx] = { ...buildings[bIdx], lifts };
                                setProjectData(prev => ({ ...prev, buildings }));
                              }}
                              className="px-2 py-1 text-sm border rounded" placeholder="Door width (mm)" />
                            <input type="number" step="0.1" value={lift.door_height_mm || ''}
                              onChange={(e) => {
                                const buildings = [...projectData.buildings];
                                const lifts = [...buildings[bIdx].lifts];
                                lifts[lIdx] = { ...lift, door_height_mm: e.target.value };
                                buildings[bIdx] = { ...buildings[bIdx], lifts };
                                setProjectData(prev => ({ ...prev, buildings }));
                              }}
                              className="px-2 py-1 text-sm border rounded" placeholder="Door height (mm)" />
                          </div>
                          <p className="text-xs text-lodha-cool-grey mt-1">
                            Start/end floors can be selected after saving building floors
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== SOCIETIES TAB ===== */}
        {activeTab === 'societies' && (
          <div className="space-y-4">
            <button onClick={addSociety}
              className="px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Society
            </button>

            {projectData.societies.map((society, sIdx) => (
              <div key={society.id || sIdx} className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-lodha-grey mb-1">Society Name</label>
                    <input type="text" value={society.name}
                      onChange={(e) => updateSociety(sIdx, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-lodha-grey mb-1">Description</label>
                    <input type="text" value={society.description || ''}
                      onChange={(e) => updateSociety(sIdx, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-lodha-steel/40 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-lodha-grey mb-1">Assign Buildings</label>
                  <div className="flex flex-wrap gap-2">
                    {projectData.buildings.filter(b => !b.society_id || b.society_id === society.id).map((b, bIdx) => (
                      <button key={b.id || bIdx}
                        onClick={() => {
                          if (b.society_id === society.id) {
                            updateBuilding(projectData.buildings.indexOf(b), 'society_id', null);
                          } else {
                            assignBuildingToSociety(sIdx, projectData.buildings.indexOf(b));
                          }
                        }}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          b.society_id === society.id
                            ? 'bg-lodha-gold text-white border-lodha-gold'
                            : 'border-lodha-steel text-lodha-grey hover:border-lodha-gold'
                        }`}>
                        {b.name || `Building ${projectData.buildings.indexOf(b) + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== AMENITIES TAB ===== */}
        {activeTab === 'amenities' && (
          <div className="space-y-6">
            {/* Swimming Pools */}
            <div className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-lodha-gold flex items-center gap-1">
                  <Waves className="w-4 h-4" /> Swimming Pools
                </h3>
                <button onClick={() => addAmenity('swimmingPools')}
                  className="text-xs px-2 py-1 bg-lodha-gold/10 text-lodha-gold rounded hover:bg-lodha-gold/20">
                  + Add Pool
                </button>
              </div>
              {amenities.swimmingPools.map((pool, idx) => (
                <div key={pool.id || idx} className="grid grid-cols-4 gap-2 mb-2">
                  <input type="text" value={pool.name} placeholder="Pool name"
                    onChange={(e) => { const p = [...amenities.swimmingPools]; p[idx] = { ...pool, name: e.target.value }; setAmenities(prev => ({ ...prev, swimmingPools: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" step="0.01" value={pool.volume_cum} placeholder="Volume (cum)"
                    onChange={(e) => { const p = [...amenities.swimmingPools]; p[idx] = { ...pool, volume_cum: e.target.value }; setAmenities(prev => ({ ...prev, swimmingPools: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" step="0.01" value={pool.depth_m} placeholder="Depth (m)"
                    onChange={(e) => { const p = [...amenities.swimmingPools]; p[idx] = { ...pool, depth_m: e.target.value }; setAmenities(prev => ({ ...prev, swimmingPools: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <select value={pool.society_id || ''}
                    onChange={(e) => { const p = [...amenities.swimmingPools]; p[idx] = { ...pool, society_id: e.target.value || null }; setAmenities(prev => ({ ...prev, swimmingPools: p })); }}
                    className="px-2 py-1.5 text-sm border rounded">
                    <option value="">Project Level</option>
                    {projectData.societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Landscape */}
            <div className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-lodha-gold flex items-center gap-1">
                  <Trees className="w-4 h-4" /> Landscape
                </h3>
                <button onClick={() => addAmenity('landscapes')}
                  className="text-xs px-2 py-1 bg-lodha-gold/10 text-lodha-gold rounded hover:bg-lodha-gold/20">
                  + Add Landscape
                </button>
              </div>
              {amenities.landscapes.map((ls, idx) => (
                <div key={ls.id || idx} className="grid grid-cols-4 gap-2 mb-2">
                  <input type="text" value={ls.name || ''} placeholder="Name"
                    onChange={(e) => { const l = [...amenities.landscapes]; l[idx] = { ...ls, name: e.target.value }; setAmenities(prev => ({ ...prev, landscapes: l })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" step="0.01" value={ls.total_area_sqm || ''} placeholder="Total area (sqm)"
                    onChange={(e) => { const l = [...amenities.landscapes]; l[idx] = { ...ls, total_area_sqm: e.target.value }; setAmenities(prev => ({ ...prev, landscapes: l })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" step="0.01" value={ls.softscape_area_sqm || ''} placeholder="Softscape (sqm)"
                    onChange={(e) => { const l = [...amenities.landscapes]; l[idx] = { ...ls, softscape_area_sqm: e.target.value }; setAmenities(prev => ({ ...prev, landscapes: l })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <select value={ls.society_id || ''}
                    onChange={(e) => { const l = [...amenities.landscapes]; l[idx] = { ...ls, society_id: e.target.value || null }; setAmenities(prev => ({ ...prev, landscapes: l })); }}
                    className="px-2 py-1.5 text-sm border rounded">
                    <option value="">Project Level</option>
                    {projectData.societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Surface Parking */}
            <div className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-lodha-gold flex items-center gap-1">
                  <Car className="w-4 h-4" /> Surface Parking
                </h3>
                <button onClick={() => addAmenity('surfaceParking')}
                  className="text-xs px-2 py-1 bg-lodha-gold/10 text-lodha-gold rounded hover:bg-lodha-gold/20">
                  + Add Surface Parking
                </button>
              </div>
              {amenities.surfaceParking.map((sp, idx) => (
                <div key={sp.id || idx} className="grid grid-cols-5 gap-2 mb-2">
                  <input type="text" value={sp.name || ''} placeholder="Name"
                    onChange={(e) => { const p = [...amenities.surfaceParking]; p[idx] = { ...sp, name: e.target.value }; setAmenities(prev => ({ ...prev, surfaceParking: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" min="0" value={sp.two_wheeler_count} placeholder="2-Wheeler"
                    onChange={(e) => { const p = [...amenities.surfaceParking]; p[idx] = { ...sp, two_wheeler_count: parseInt(e.target.value) || 0 }; setAmenities(prev => ({ ...prev, surfaceParking: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" min="0" value={sp.four_wheeler_count} placeholder="4-Wheeler"
                    onChange={(e) => { const p = [...amenities.surfaceParking]; p[idx] = { ...sp, four_wheeler_count: parseInt(e.target.value) || 0 }; setAmenities(prev => ({ ...prev, surfaceParking: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="number" min="0" value={sp.ev_charging_count} placeholder="EV Stations"
                    onChange={(e) => { const p = [...amenities.surfaceParking]; p[idx] = { ...sp, ev_charging_count: parseInt(e.target.value) || 0 }; setAmenities(prev => ({ ...prev, surfaceParking: p })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <select value={sp.society_id || ''}
                    onChange={(e) => { const p = [...amenities.surfaceParking]; p[idx] = { ...sp, society_id: e.target.value || null }; setAmenities(prev => ({ ...prev, surfaceParking: p })); }}
                    className="px-2 py-1.5 text-sm border rounded">
                    <option value="">Project Level</option>
                    {projectData.societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Infrastructure */}
            <div className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-lodha-gold flex items-center gap-1">
                  <Zap className="w-4 h-4" /> Infrastructure
                </h3>
                <button onClick={() => addAmenity('infrastructure')}
                  className="text-xs px-2 py-1 bg-lodha-gold/10 text-lodha-gold rounded hover:bg-lodha-gold/20">
                  + Add Infrastructure
                </button>
              </div>
              {amenities.infrastructure.map((infra, idx) => (
                <div key={infra.id || idx} className="grid grid-cols-5 gap-2 mb-2">
                  <select value={infra.infra_type}
                    onChange={(e) => { const i = [...amenities.infrastructure]; i[idx] = { ...infra, infra_type: e.target.value }; setAmenities(prev => ({ ...prev, infrastructure: i })); }}
                    className="px-2 py-1.5 text-sm border rounded">
                    <option value="STP">STP</option>
                    <option value="Substation">Substation</option>
                    <option value="UG_Water_Tank">UG Water Tank</option>
                    <option value="Ground_Storage_Reservoir">Ground Storage Reservoir</option>
                  </select>
                  <input type="text" value={infra.name || ''} placeholder="Name"
                    onChange={(e) => { const i = [...amenities.infrastructure]; i[idx] = { ...infra, name: e.target.value }; setAmenities(prev => ({ ...prev, infrastructure: i })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="text" value={infra.capacity || ''} placeholder="Capacity"
                    onChange={(e) => { const i = [...amenities.infrastructure]; i[idx] = { ...infra, capacity: e.target.value }; setAmenities(prev => ({ ...prev, infrastructure: i })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <input type="text" value={infra.description || ''} placeholder="Description"
                    onChange={(e) => { const i = [...amenities.infrastructure]; i[idx] = { ...infra, description: e.target.value }; setAmenities(prev => ({ ...prev, infrastructure: i })); }}
                    className="px-2 py-1.5 text-sm border rounded" />
                  <select value={infra.society_id || ''}
                    onChange={(e) => { const i = [...amenities.infrastructure]; i[idx] = { ...infra, society_id: e.target.value || null }; setAmenities(prev => ({ ...prev, infrastructure: i })); }}
                    className="px-2 py-1.5 text-sm border rounded">
                    <option value="">Project Level</option>
                    {projectData.societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SUMMARY TAB ===== */}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-xl shadow-sm border border-lodha-steel/30 p-6">
            <h2 className="text-lg font-serif font-semibold text-lodha-gold mb-4">Project Summary</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-lodha-cream/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-lodha-gold">{projectData.buildings.length}</p>
                <p className="text-xs text-lodha-grey">Buildings</p>
              </div>
              <div className="bg-lodha-cream/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-lodha-gold">
                  {projectData.buildings.reduce((s, b) => s + (b.floors?.length || 0), 0)}
                </p>
                <p className="text-xs text-lodha-grey">Floors</p>
              </div>
              <div className="bg-lodha-cream/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-lodha-gold">
                  {projectData.buildings.reduce((s, b) =>
                    s + (b.floors || []).reduce((fs, f) =>
                      fs + (f.flats || []).reduce((fls, fl) => fls + (fl.number_of_flats || 0), 0), 0), 0)}
                </p>
                <p className="text-xs text-lodha-grey">Total Flats</p>
              </div>
              <div className="bg-lodha-cream/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-lodha-gold">{projectData.societies.length}</p>
                <p className="text-xs text-lodha-grey">Societies</p>
              </div>
            </div>

            {/* Building-wise summary */}
            {projectData.buildings.map((building, bIdx) => (
              <div key={building.id || bIdx} className="mb-4 p-3 border border-lodha-steel/20 rounded-lg">
                <h4 className="font-medium text-lodha-gold mb-2">
                  {building.name || `Building ${bIdx + 1}`}
                  <span className="text-xs text-lodha-grey ml-2">({building.application_type})</span>
                  {building.twin_buildings && (
                    <span className="text-xs text-blue-600 ml-2">Twin: {building.twin_buildings}</span>
                  )}
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>Floors: {building.floors?.length || 0}</div>
                  <div>Flats: {(building.floors || []).reduce((s, f) =>
                    s + (f.flats || []).reduce((fs, fl) => fs + (fl.number_of_flats || 0), 0), 0)}</div>
                  <div>Status: {building.status || 'Concept'}</div>
                </div>
              </div>
            ))}

            {/* Society-wise summary */}  
            {projectData.societies.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-lodha-grey mb-2">Society Summary</h3>
                {projectData.societies.map((society, sIdx) => (
                  <div key={society.id || sIdx} className="mb-2 p-2 bg-lodha-cream/30 rounded">
                    <span className="font-medium">{society.name}</span>
                    <span className="text-xs text-lodha-grey ml-2">
                      Buildings: {projectData.buildings.filter(b => b.society_id === society.id).map(b => b.name).join(', ') || 'None'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
