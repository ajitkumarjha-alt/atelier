import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import GoogleMapComponent from '../components/GoogleMapComponent';
import { Plus, Trash2, Edit2, MapPin, Copy, AlertCircle, CheckCircle } from 'lucide-react';

export default function ProjectInput() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!projectId;

  const [projectData, setProjectData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    buildings: [],
  });

  const [standards, setStandards] = useState({
    applicationTypes: [],
    residentialTypes: [],
    flatTypes: [],
  });

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [allProjects, setAllProjects] = useState([]);

  // Fetch standards from database
  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const response = await fetch('/api/project-standards');
        if (response.ok) {
          const data = await response.json();
          setStandards(data);
        }
      } catch (err) {
        console.error('Error fetching standards:', err);
      }
    };

    const fetchAllProjects = async () => {
      try {
        const response = await fetch('/api/projects-public');
        if (response.ok) {
          const data = await response.json();
          setAllProjects(data);
        } else {
          console.error('Failed to fetch projects:', response.status);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };

    fetchStandards();
    fetchAllProjects();

    // Fetch existing project if editing
    if (isEditing) {
      fetchProjectData();
    } else {
      setLoading(false);
    }
  }, [projectId, isEditing]);

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/full`);
      if (response.ok) {
        const data = await response.json();
        setProjectData(data);
      }
    } catch (err) {
      setError('Failed to fetch project data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Similarity check function (Levenshtein distance)
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  // Check for duplicate and similar project names
  const checkProjectName = (name) => {
    const newWarnings = [];
    
    if (!name.trim()) {
      return newWarnings;
    }

    const existingProjects = allProjects.filter(p => !isEditing || p.id !== projectId);
    
    // Check for exact duplicate
    const isDuplicate = existingProjects.some(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (isDuplicate) {
      newWarnings.push({
        type: 'error',
        message: '⚠️ This project name already exists. Please choose a different name.',
      });
    }

    // Check for similar names
    const similarNames = existingProjects
      .filter(p => calculateSimilarity(p.name, name) > 0.7)
      .map(p => p.name);
    
    if (similarNames.length > 0 && !isDuplicate) {
      newWarnings.push({
        type: 'warning',
        message: `Similar project names exist: ${similarNames.join(', ')}. Make sure you're not creating a duplicate.`,
      });
    }

    setWarnings(newWarnings);
    return newWarnings;
  };

  const handleProjectFieldChange = (field, value) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
    
    // Check project name for duplicates and similarities
    if (field === 'name') {
      checkProjectName(value);
    }
  };

  const addBuilding = () => {
    const newBuilding = {
      id: Math.floor(Math.random() * 1000000000),
      name: '',
      applicationType: '',
      residentialType: '',
      villaType: '',
      villaCount: '',
      isTwin: false,
      twinOfBuildingId: null,
      floors: [],
    };
    setProjectData(prev => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding],
    }));
  };

  const updateBuilding = (buildingId, updates) => {
    setProjectData(prev => ({
      ...prev,
      buildings: prev.buildings.map(b =>
        b.id === buildingId ? { ...b, ...updates } : b
      ),
    }));
  };

  const deleteBuilding = (buildingId) => {
    setProjectData(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== buildingId),
    }));
  };

  const addFloor = (buildingId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    
    const floorName = prompt('Enter floor name:');
    if (!floorName || !floorName.trim()) return;
    
    const trimmedFloorName = floorName.trim();
    
    // Check if floor name already exists
    const existingFloor = building.floors.find(f => f.floorName.toLowerCase() === trimmedFloorName.toLowerCase());
    if (existingFloor) {
      alert('A floor with this name already exists!');
      return;
    }
    
    const twinFloorNames = prompt('Enter twin floor names (comma-separated, optional):');
    const baseId = Math.floor(Math.random() * 1000000000);
    const baseFloorNumber = building.floors.length + 1;
    
    const newFloor = {
      id: baseId,
      floorNumber: baseFloorNumber,
      floorName: trimmedFloorName,
      flats: [],
      twinFloorNames: [], // Store twin names instead of IDs
    };
    
    const newFloors = [newFloor];
    
    // Create twin floors if specified
    if (twinFloorNames && twinFloorNames.trim()) {
      const twinNames = twinFloorNames.split(',').map(n => n.trim()).filter(n => n);
      
      // Check for duplicate twin names
      const twinNamesSet = new Set();
      for (const name of twinNames) {
        const lowerName = name.toLowerCase();
        if (lowerName === trimmedFloorName.toLowerCase()) {
          alert(`Twin floor name "${name}" cannot be the same as parent floor!`);
          return;
        }
        if (twinNamesSet.has(lowerName)) {
          alert(`Duplicate twin floor name: "${name}"`);
          return;
        }
        if (building.floors.find(f => f.floorName.toLowerCase() === lowerName)) {
          alert(`Floor with name "${name}" already exists!`);
          return;
        }
        twinNamesSet.add(lowerName);
      }
      
      // Store twin names in parent floor
      newFloor.twinFloorNames = twinNames;
      
      // Create twin floor objects
      twinNames.forEach((twinName, index) => {
        newFloors.push({
          id: baseId + index + 1,
          floorNumber: baseFloorNumber + index + 1,
          floorName: twinName,
          flats: [],
          twinOfFloorName: trimmedFloorName, // Reference by name instead of ID
        });
      });
    }
    
    updateBuilding(buildingId, {
      floors: [...building.floors, ...newFloors],
    });
  };

  const addFlat = (buildingId, floorId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const floor = building.floors.find(f => f.id === floorId);
    const baseId = Math.floor(Math.random() * 1000000000);
    
    const newFlat = {
      id: baseId,
      type: '',
      area: '',
      count: '',
    };
    
    // Get all twin floors by name
    const twinFloors = building.floors.filter(f => f.twinOfFloorName === floor.floorName);
    
    const updatedFloors = building.floors.map(f => {
      if (f.id === floorId) {
        // Add to parent floor
        return { ...f, flats: [...f.flats, newFlat] };
      } else if (twinFloors.find(tf => tf.id === f.id)) {
        // Add to twin floors with unique IDs
        const twinFlat = { ...newFlat, id: baseId + f.id };
        return { ...f, flats: [...f.flats, twinFlat] };
      }
      return f;
    });
    
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const updateFlat = (buildingId, floorId, flatId, updates) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const floor = building.floors.find(f => f.id === floorId);
    const flatIndex = floor.flats.findIndex(fl => fl.id === flatId);
    
    // Get all twin floors by name
    const twinFloors = building.floors.filter(f => f.twinOfFloorName === floor.floorName);
    
    const updatedFloors = building.floors.map(f => {
      if (f.id === floorId) {
        // Update parent floor
        return {
          ...f,
          flats: f.flats.map(fl => (fl.id === flatId ? { ...fl, ...updates } : fl)),
        };
      } else if (twinFloors.find(tf => tf.id === f.id)) {
        // Update corresponding flat in twin floors (same index)
        return {
          ...f,
          flats: f.flats.map((fl, idx) => (idx === flatIndex ? { ...fl, ...updates } : fl)),
        };
      }
      return f;
    });
    
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const updateFloor = (buildingId, floorId, updates) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const updatedFloors = building.floors.map(f =>
      f.id === floorId ? { ...f, ...updates } : f
    );
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const deleteFlat = (buildingId, floorId, flatId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const floor = building.floors.find(f => f.id === floorId);
    const flatIndex = floor.flats.findIndex(fl => fl.id === flatId);
    
    // Get all twin floors by name
    const twinFloors = building.floors.filter(f => f.twinOfFloorName === floor.floorName);
    
    const updatedFloors = building.floors.map(f => {
      if (f.id === floorId) {
        // Delete from parent floor
        return { ...f, flats: f.flats.filter(fl => fl.id !== flatId) };
      } else if (twinFloors.find(tf => tf.id === f.id)) {
        // Delete from twin floors (same index)
        return { ...f, flats: f.flats.filter((fl, idx) => idx !== flatIndex) };
      }
      return f;
    });
    
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const deleteFloor = (buildingId, floorId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const floor = building.floors.find(f => f.id === floorId);
    // Also delete all twin floors by name
    const updatedFloors = building.floors.filter(f => 
      f.id !== floorId && f.twinOfFloorName !== floor.floorName
    );
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const copyFloorData = (buildingId, targetFloorId, sourceFloorId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const sourceFloor = building.floors.find(f => f.id === sourceFloorId);
    
    const updatedFloors = building.floors.map(f =>
      f.id === targetFloorId
        ? {
            ...f,
            flats: sourceFloor.flats.map(flat => ({ ...flat, id: Date.now() + Math.random() })),
          }
        : f
    );
    
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const copyBuildingData = (fromBuildingId) => {
    const sourceBuilding = projectData.buildings.find(b => b.id === fromBuildingId);
    const newBuilding = {
      id: Date.now(),
      name: `${sourceBuilding.name} (Copy)`,
      applicationType: sourceBuilding.applicationType,
      residentialType: sourceBuilding.residentialType,
      villaType: sourceBuilding.villaType,
      villaCount: sourceBuilding.villaCount,
      isTwin: true,
      twinOfBuildingId: fromBuildingId,
      floors: sourceBuilding.floors.map(f => ({
        ...f,
        id: Date.now(),
        flats: f.flats.map(fl => ({ ...fl, id: Date.now() })),
      })),
    };
    setProjectData(prev => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding],
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate that project has a name
      if (!projectData.name.trim()) {
        setError('Project name is required');
        return;
      }

      const url = isEditing ? `/api/projects/${projectId}` : '/api/projects';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save project';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('Failed to save project:', errorData);
        } catch (jsonErr) {
          console.error('Error parsing error response:', jsonErr);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        setError(errorMessage);
        return;
      }

      const result = await response.json();
      alert(`Project ${isEditing ? 'updated' : 'created'} successfully!`);
      
      // Redirect to L1 dashboard after successful creation
      navigate('/l1-dashboard');
    } catch (err) {
      setError('Failed to save project: ' + err.message);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-body">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-3 gap-6">
        {/* Form Section - 2/3 width */}
        <div className="col-span-2">
          <h1 className="heading-primary mb-6">
            {isEditing ? 'Edit Project' : 'Create New Project'}
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-lodha-sand border-2 border-lodha-gold text-lodha-black rounded-lg">{error}</div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div className="mb-4 space-y-2">
              {warnings.map((warn, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    warn.type === 'error'
                      ? 'bg-red-50 border-2 border-red-500 text-red-700'
                      : 'bg-yellow-50 border-2 border-yellow-500 text-yellow-700'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="font-jost">{warn.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Project Basic Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="heading-secondary mb-4">Project Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectData.name}
                  onChange={e => handleProjectFieldChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Location (Address)
                </label>
                <textarea
                  value={projectData.location}
                  onChange={e => handleProjectFieldChange('location', e.target.value)}
                  className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  placeholder="Enter full address"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={projectData.latitude}
                    onChange={e => handleProjectFieldChange('latitude', e.target.value)}
                    placeholder="e.g., 19.0760"
                    className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={projectData.longitude}
                    onChange={e => handleProjectFieldChange('longitude', e.target.value)}
                    placeholder="e.g., 72.8777"
                    className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-2 px-4 py-2 bg-lodha-gold/10 text-lodha-gold rounded-lg hover:bg-lodha-gold/20"
              >
                <MapPin className="w-4 h-4" />
                {showMap ? 'Hide' : 'Show'} Google Map
              </button>

              {showMap && (
                <GoogleMapComponent
                  latitude={projectData.latitude}
                  longitude={projectData.longitude}
                  location={projectData.location}
                  onLocationSelect={(address, lat, lng) => {
                    setProjectData(prev => ({
                      ...prev,
                      location: address,
                      latitude: lat,
                      longitude: lng,
                    }));
                  }}
                />
              )}
            </div>
          </div>

          {/* Buildings Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-secondary">Buildings</h2>
              <button
                onClick={addBuilding}
                disabled={!projectData.name.trim() || !projectData.location.trim() || warnings.some(w => w.type === 'error')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  !projectData.name.trim() || !projectData.location.trim() || warnings.some(w => w.type === 'error')
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-lodha-gold text-white hover:bg-lodha-gold/90'
                }`}
                title={
                  !projectData.name.trim()
                    ? 'Please enter project name'
                    : !projectData.location.trim()
                    ? 'Please enter project location/address'
                    : warnings.some(w => w.type === 'error')
                    ? 'Please resolve errors with project name'
                    : ''
                }
              >
                <Plus className="w-4 h-4" />
                Add Building
              </button>
            </div>

            <div className="space-y-6">
              {projectData.buildings.map((building, idx) => (
                <BuildingSection
                  key={building.id}
                  building={building}
                  buildingIndex={idx}
                  allBuildings={projectData.buildings}
                  standards={standards}
                  onUpdate={updateBuilding}
                  onDelete={deleteBuilding}
                  onAddFloor={addFloor}
                  onAddFlat={addFlat}
                  onUpdateFlat={updateFlat}
                  onDeleteFlat={deleteFlat}
                  onCopyFloor={copyFloorData}
                  onCopyBuilding={copyBuildingData}
                  onDeleteFloor={deleteFloor}
                  onUpdateFloor={updateFloor}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={!projectData.name.trim() || warnings.some(w => w.type === 'error')}
              className={`px-6 py-3 font-jost font-semibold rounded-lg transition-all ${
                !projectData.name.trim() || warnings.some(w => w.type === 'error')
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-lodha-gold text-white hover:bg-lodha-gold/90'
              }`}
              title={
                !projectData.name.trim()
                  ? 'Please enter project name'
                  : warnings.some(w => w.type === 'error')
                  ? 'Please resolve errors before submitting'
                  : ''
              }
            >
              {isEditing ? 'Update' : 'Create'} Project
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-lodha-sand text-lodha-black font-jost font-semibold rounded-lg hover:bg-lodha-sand/80 border border-lodha-gold"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Live Preview Section - 1/3 width */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="heading-secondary mb-4">Project Preview</h2>
            <ProjectPreview data={projectData} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Building Section Component
function BuildingSection({
  building,
  buildingIndex,
  allBuildings,
  standards,
  onUpdate,
  onDelete,
  onAddFloor,
  onAddFlat,
  onUpdateFlat,
  onDeleteFlat,
  onCopyFloor,
  onCopyBuilding,
  onDeleteFloor,
  onUpdateFloor,
}) {
  const isResidential = building.applicationType === 'Residential';
  const isVilla = building.applicationType === 'Villa';

  return (
    <div className="border border-lodha-grey rounded-lg p-4 bg-lodha-sand/30">
      <div className="flex justify-between items-start mb-4">
        <h3 className="heading-tertiary">Building {buildingIndex + 1}</h3>
        <button
          onClick={() => onDelete(building.id)}
          className="text-lodha-gold hover:text-lodha-deep"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Building Name */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-jost font-semibold mb-2">Building Name</label>
          <input
            type="text"
            value={building.name}
            onChange={e => onUpdate(building.id, { name: e.target.value })}
            className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
            placeholder="e.g., Tower A"
          />
        </div>

        {/* Application Type */}
        <div>
          <label className="block text-sm font-jost font-semibold mb-2">Application Type</label>
          <select
            value={building.applicationType}
            onChange={e => onUpdate(building.id, { applicationType: e.target.value })}
            className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
          >
            <option value="">Select type...</option>
            {standards.applicationTypes?.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Residential Type */}
      {isResidential && (
        <div className="mb-4">
          <label className="block text-sm font-jost font-semibold mb-2">Residential Type</label>
          <select
            value={building.residentialType}
            onChange={e => onUpdate(building.id, { residentialType: e.target.value })}
            className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
          >
            <option value="">Select type...</option>
            {standards.residentialTypes?.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>
      )}

      {/* Villa Section */}
      {isVilla && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-jost font-semibold mb-2">Villa Type</label>
            <input
              type="text"
              value={building.villaType}
              onChange={e => onUpdate(building.id, { villaType: e.target.value })}
              placeholder="e.g., V1, V2"
              className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-jost font-semibold mb-2">Number of Villas</label>
            <input
              type="number"
              value={building.villaCount}
              onChange={e => onUpdate(building.id, { villaCount: e.target.value })}
              placeholder="e.g., 10"
              className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
            />
          </div>
        </div>
      )}

      {/* Twin Building Option */}
      {buildingIndex > 0 && (
        <div className="mb-4 p-3 bg-lodha-sand rounded border border-lodha-gold">
          <label className="flex items-center gap-2 font-jost">
            <input
              type="checkbox"
              checked={building.isTwin}
              onChange={e => onUpdate(building.id, { isTwin: e.target.checked })}
            />
            <span>Twin of another building</span>
          </label>
          {building.isTwin && (
            <select
              value={building.twinOfBuildingId || ''}
              onChange={e => onUpdate(building.id, { twinOfBuildingId: parseInt(e.target.value) })}
              className="w-full mt-2 px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
            >
              <option value="">Select building to copy from...</option>
              {allBuildings.map((b, i) => (
                i < buildingIndex && (
                  <option key={b.id} value={b.id}>
                    {b.name || `Building ${i + 1}`}
                  </option>
                )
              ))}
            </select>
          )}
          {buildingIndex > 0 && (
            <button
              onClick={() => onCopyBuilding(allBuildings[buildingIndex - 1].id)}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-lodha-gold text-white rounded hover:bg-lodha-deep"
            >
              <Copy className="w-4 h-4" />
              Copy from previous building
            </button>
          )}
        </div>
      )}

      {/* Floors Section */}
      <div className="border-t border-lodha-grey pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-jost font-semibold">Floors</h4>
          <button
            onClick={() => onAddFloor(building.id)}
            disabled={!building.name.trim() || !building.applicationType}
            className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-all ${
              !building.name.trim() || !building.applicationType
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-lodha-gold/20 text-lodha-gold hover:bg-lodha-gold/30'
            }`}
            title={
              !building.name.trim()
                ? 'Please enter building name'
                : !building.applicationType
                ? 'Please select application type'
                : ''
            }
          >
            <Plus className="w-3 h-3" />
            Add Floor
          </button>
        </div>

        <div className="space-y-3">
          {building.floors
            .filter(floor => !floor.twinOfFloorName)
            .map((floor, floorIndex) => {
              return (
                <FloorSection
                  key={floor.id}
                  floor={floor}
                  floorIndex={floorIndex}
                  buildingId={building.id}
                  allFloors={building.floors}
                  standards={standards}
                  onAddFlat={onAddFlat}
                  onUpdateFlat={onUpdateFlat}
                  onDeleteFlat={onDeleteFlat}
                  onCopyFloor={onCopyFloor}
                  onDeleteFloor={onDeleteFloor}
                  onUpdateFloor={onUpdateFloor}
                  onUpdate={onUpdate}
                  twinFloors={building.floors.filter(f => f.twinOfFloorName === floor.floorName)}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

// Floor Section Component
function FloorSection({
  floor,
  floorIndex,
  buildingId,
  allFloors,
  standards,
  onAddFlat,
  onUpdateFlat,
  onDeleteFlat,
  onCopyFloor,
  onDeleteFloor,
  onUpdateFloor,
  onUpdate,
  twinFloors = [],
}) {
  const [selectedCopySource, setSelectedCopySource] = useState('');

  const handleCopyFloor = () => {
    if (selectedCopySource) {
      onCopyFloor(buildingId, floor.id, parseInt(selectedCopySource));
      setSelectedCopySource('');
    }
  };

  return (
    <div className="border border-lodha-grey/50 rounded p-3 bg-white">
      <div className="flex justify-between items-center mb-3">
        <div className="flex-1">
          <input
            type="text"
            value={floor.floorName}
            onChange={(e) => onUpdateFloor(buildingId, floor.id, { floorName: e.target.value })}
            placeholder="Floor name"
            className="px-2 py-1 border border-lodha-gold rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-lodha-gold"
          />
          {twinFloors.length > 0 && (
            <div className="mt-1 text-xs text-lodha-grey">
              Twin floors: {twinFloors.map(f => f.floorName).join(', ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {/* Copy from dropdown */}
          {allFloors.filter(f => !f.twinOfFloorName).length > 1 && (
            <div className="flex items-center gap-1">
              <select
                value={selectedCopySource}
                onChange={(e) => setSelectedCopySource(e.target.value)}
                className="text-xs px-2 py-1 border border-lodha-gold rounded focus:outline-none focus:ring-1 focus:ring-lodha-gold"
              >
                <option value="">Copy from...</option>
                {allFloors
                  .filter(f => f.id !== floor.id && !f.twinOfFloorName)
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.floorName}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleCopyFloor}
                disabled={!selectedCopySource}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                  selectedCopySource
                    ? 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80 border border-lodha-gold'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={!selectedCopySource ? 'Select a floor to copy from' : 'Copy selected floor data'}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          )}
          {/* Delete floor button */}
          <button
            onClick={() => onDeleteFloor(buildingId, floor.id)}
            className="text-lodha-gold hover:text-red-600"
            title="Delete floor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flats List */}
      <div className="space-y-2 mb-3">
        {floor.flats.map((flat, flatIdx) => (
          <FlatRow
            key={flat.id}
            flat={flat}
            flatId={flat.id}
            buildingId={buildingId}
            floorId={floor.id}
            standards={standards}
            onUpdate={onUpdateFlat}
            onDelete={onDeleteFlat}
            twinFloorsCount={twinFloors.length}
          />
        ))}
      </div>

      {/* Add Flat Button */}
      <button
        onClick={() => onAddFlat(buildingId, floor.id)}
        className="w-full px-2 py-2 text-sm bg-lodha-gold/10 text-lodha-gold rounded hover:bg-lodha-gold/20 font-jost"
      >
        + Add Flat Type
      </button>
    </div>
  );
}

// Flat Row Component
function FlatRow({
  flat,
  flatId,
  buildingId,
  floorId,
  standards,
  onUpdate,
  onDelete,
  twinFloorsCount = 0,
}) {
  const totalCount = (parseInt(flat.count) || 0) * (1 + twinFloorsCount);
  
  return (
    <div className="flex gap-2 items-center bg-lodha-sand p-2 rounded text-sm border border-lodha-grey/20">
      <select
        value={flat.type}
        onChange={e =>onUpdate(buildingId, floorId, flatId, { type: e.target.value })}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
      >
        <option value="">Type</option>
        {standards.flatTypes?.map(type => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          value={flat.area}
          onChange={e => onUpdate(buildingId, floorId, flatId, { area: e.target.value })}
          placeholder="Area"
          className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
        />
        <span className="text-xs text-gray-600">sqm</span>
      </div>

      <div className="flex flex-col">
        <input
          type="number"
          value={flat.count}
          onChange={e => onUpdate(buildingId, floorId, flatId, { count: e.target.value })}
          placeholder="Count"
          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
        />
        {twinFloorsCount > 0 && (
          <span className="text-xs text-lodha-grey mt-0.5">
            Total: {totalCount}
          </span>
        )}
      </div>

      <button
        onClick={() => onDelete(buildingId, floorId, flatId)}
        className="px-2 py-1 text-lodha-gold hover:bg-lodha-sand rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Project Preview Component
function ProjectPreview({ data }) {
  // Calculate flat counts by type
  const flatTypesSummary = {};
  data.buildings.forEach(building => {
    building.floors.forEach(floor => {
      floor.flats.forEach(flat => {
        if (flat.type) {
          const count = parseInt(flat.count) || 0;
          flatTypesSummary[flat.type] = (flatTypesSummary[flat.type] || 0) + count;
        }
      });
    });
  });

  const totalFlats = Object.values(flatTypesSummary).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-jost font-semibold text-lodha-black">Project Name:</p>
        <p className="text-body">{data.name || '—'}</p>
      </div>

      <div>
        <p className="font-jost font-semibold text-lodha-black">Location:</p>
        <p className="text-body line-clamp-2">{data.location || '—'}</p>
      </div>

      <div className="border-t border-lodha-grey pt-3">
        <p className="font-jost font-semibold text-lodha-black mb-2">Summary:</p>
        <div className="space-y-1 text-body">
          <p>Buildings: {data.buildings.length}</p>
          <p>Total Floors: {data.buildings.reduce((sum, b) => sum + b.floors.length, 0)}</p>
          <p>Total Flats: {totalFlats}</p>
          
          {Object.keys(flatTypesSummary).length > 0 && (
            <div className="mt-2 pt-2 border-t border-lodha-grey/30">
              <p className="font-jost font-semibold text-lodha-black mb-1">By Type:</p>
              <div className="space-y-0.5 pl-2">
                {Object.entries(flatTypesSummary)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([type, count]) => (
                    <p key={type} className="text-xs text-lodha-grey">
                      {type} — {count}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-lodha-grey pt-3">
        <p className="font-jost font-semibold text-lodha-black mb-2">Buildings:</p>
        <div className="space-y-2">
          {data.buildings.map((b, i) => (
            <div key={b.id} className="bg-lodha-sand p-2 rounded text-xs">
              <p className="font-semibold">{b.name || `Building ${i + 1}`}</p>
              <p className="text-lodha-grey">{b.applicationType}</p>
              <p className="text-lodha-grey">Floors: {b.floors.length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
