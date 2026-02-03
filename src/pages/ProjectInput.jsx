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
    assignedLeadId: null,
    buildings: [],
  });

  const [standards, setStandards] = useState({
    applicationTypes: [],
    residentialTypes: [],
    flatTypes: [],
    buildingTypes: [],
  });

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [l1Users, setL1Users] = useState([]);

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

    const fetchL1Users = async () => {
      try {
        const response = await fetch('/api/users/level/L1');
        if (response.ok) {
          const data = await response.json();
          setL1Users(data);
        }
      } catch (err) {
        console.error('Error fetching L1 users:', err);
      }
    };

    fetchStandards();
    fetchAllProjects();
    fetchL1Users();

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
    const buildingName = prompt('Enter building name:');
    if (!buildingName || !buildingName.trim()) return;
    
    const trimmedBuildingName = buildingName.trim();
    
    // Check if building name already exists
    const existingBuilding = projectData.buildings.find(b => b.name.toLowerCase() === trimmedBuildingName.toLowerCase());
    if (existingBuilding) {
      alert('A building with this name already exists!');
      return;
    }
    
    const twinBuildingNames = prompt('Enter twin building names (comma-separated, optional):');
    const baseId = Math.floor(Math.random() * 1000000000);
    
    const newBuilding = {
      id: baseId,
      name: trimmedBuildingName,
      applicationType: '',
      residentialType: '',
      buildingType: '',
      villaType: '',
      villaCount: '',
      // Villa-specific fields
      poolVolume: '',
      hasLift: false,
      liftName: '',
      liftPassengerCapacity: '',
      // MLCP/Parking fields
      carParkingCountPerFloor: '',
      carParkingArea: '',
      twoWheelerParkingCount: '',
      twoWheelerParkingArea: '',
      evParkingPercentage: '',
      shopCount: '',
      shopArea: '',
      // Commercial fields
      officeCount: '',
      officeArea: '',
      commonArea: '',
      isTwin: false,
      twinOfBuildingId: null,
      twinBuildingNames: [], // Store twin names
      floors: [],
    };
    
    const newBuildings = [newBuilding];
    
    // Create twin buildings if specified
    if (twinBuildingNames && twinBuildingNames.trim()) {
      const twinNames = twinBuildingNames.split(',').map(n => n.trim()).filter(n => n);
      
      // Check for duplicate twin names
      const twinNamesSet = new Set();
      for (const name of twinNames) {
        const lowerName = name.toLowerCase();
        if (lowerName === trimmedBuildingName.toLowerCase()) {
          alert(`Twin building name "${name}" cannot be the same as parent building!`);
          return;
        }
        if (twinNamesSet.has(lowerName)) {
          alert(`Duplicate twin building name: "${name}"`);
          return;
        }
        if (projectData.buildings.find(b => b.name.toLowerCase() === lowerName)) {
          alert(`Building with name "${name}" already exists!`);
          return;
        }
        twinNamesSet.add(lowerName);
      }
      
      // Store twin names in parent building
      newBuilding.twinBuildingNames = twinNames;
      
      // Create twin building objects
      twinNames.forEach((twinName, index) => {
        newBuildings.push({
          id: baseId + index + 1,
          name: twinName,
          applicationType: '',
          residentialType: '',
          buildingType: '',
          villaType: '',
          villaCount: '',
          // Villa-specific fields
          poolVolume: '',
          hasLift: false,
          liftName: '',
          liftPassengerCapacity: '',
          // MLCP/Parking fields
          carParkingCountPerFloor: '',
          carParkingArea: '',
          twoWheelerParkingCount: '',
          twoWheelerParkingArea: '',
          evParkingPercentage: '',
          shopCount: '',
          shopArea: '',
          // Commercial fields
          officeCount: '',
          officeArea: '',
          commonArea: '',
          isTwin: true,
          twinOfBuildingName: trimmedBuildingName, // Reference by name
          floors: [],
        });
      });
    }
    
    setProjectData(prev => ({
      ...prev,
      buildings: [...prev.buildings, ...newBuildings],
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
    const building = projectData.buildings.find(b => b.id === buildingId);
    
    setProjectData(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => 
        b.id !== buildingId && b.twinOfBuildingName !== building.name
      ),
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
    
    // Find twin buildings of this building
    const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === building.name);
    
    // Update current building and all its twin buildings
    const updatedBuildings = projectData.buildings.map(b => {
      if (b.id === buildingId) {
        // Update current building
        return {
          ...b,
          floors: [...b.floors, ...newFloors],
        };
      } else if (twinBuildings.find(tb => tb.id === b.id)) {
        // Update twin building with same floors (but unique IDs)
        const twinNewFloors = newFloors.map(f => ({
          ...f,
          id: Math.floor(Math.random() * 1000000000),
          flats: f.flats.map(fl => ({
            ...fl,
            id: Math.floor(Math.random() * 1000000000),
          })),
        }));
        return {
          ...b,
          floors: [...b.floors, ...twinNewFloors],
        };
      }
      return b;
    });
    
    setProjectData(prev => ({
      ...prev,
      buildings: updatedBuildings,
    }));
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
    
    // Get all twin buildings
    const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === building.name);
    
    const updatedBuildings = projectData.buildings.map(b => {
      if (b.id === buildingId || twinBuildings.find(tb => tb.id === b.id)) {
        // Find corresponding floor in this building
        const currentFloor = b.floors.find(f => f.floorName === floor.floorName && !f.twinOfFloorName);
        if (!currentFloor) return b;
        
        const twinFloorsInBuilding = b.floors.filter(f => f.twinOfFloorName === currentFloor.floorName);
        
        const updatedFloors = b.floors.map(f => {
          if (f.id === currentFloor.id) {
            // Add to parent floor
            const flatId = Math.floor(Math.random() * 1000000000);
            return { ...f, flats: [...f.flats, { ...newFlat, id: flatId }] };
          } else if (twinFloorsInBuilding.find(tf => tf.id === f.id)) {
            // Add to twin floors with unique IDs
            const twinFlatId = Math.floor(Math.random() * 1000000000);
            return { ...f, flats: [...f.flats, { ...newFlat, id: twinFlatId }] };
          }
          return f;
        });
        
        return { ...b, floors: updatedFloors };
      }
      return b;
    });
    
    setProjectData(prev => ({
      ...prev,
      buildings: updatedBuildings,
    }));
  };

  const updateFlat = (buildingId, floorId, flatId, updates) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const floor = building.floors.find(f => f.id === floorId);
    const flatIndex = floor.flats.findIndex(fl => fl.id === flatId);
    
    // Get all twin floors by name
    const twinFloors = building.floors.filter(f => f.twinOfFloorName === floor.floorName);
    
    // Get all twin buildings
    const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === building.name);
    
    const updatedBuildings = projectData.buildings.map(b => {
      if (b.id === buildingId || twinBuildings.find(tb => tb.id === b.id)) {
        // Find corresponding floor in this building
        const currentFloor = b.floors.find(f => f.floorName === floor.floorName && !f.twinOfFloorName);
        if (!currentFloor) return b;
        
        const twinFloorsInBuilding = b.floors.filter(f => f.twinOfFloorName === currentFloor.floorName);
        
        const updatedFloors = b.floors.map(f => {
          if (f.id === currentFloor.id) {
            // Update parent floor
            return {
              ...f,
              flats: f.flats.map((fl, idx) => (idx === flatIndex ? { ...fl, ...updates } : fl)),
            };
          } else if (twinFloorsInBuilding.find(tf => tf.id === f.id)) {
            // Update corresponding flat in twin floors (same index)
            return {
              ...f,
              flats: f.flats.map((fl, idx) => (idx === flatIndex ? { ...fl, ...updates } : fl)),
            };
          }
          return f;
        });
        
        return { ...b, floors: updatedFloors };
      }
      return b;
    });
    
    setProjectData(prev => ({
      ...prev,
      buildings: updatedBuildings,
    }));
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
    
    // Get all twin buildings
    const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === building.name);
    
    const updatedBuildings = projectData.buildings.map(b => {
      if (b.id === buildingId || twinBuildings.find(tb => tb.id === b.id)) {
        // Find corresponding floor in this building
        const currentFloor = b.floors.find(f => f.floorName === floor.floorName && !f.twinOfFloorName);
        if (!currentFloor) return b;
        
        const twinFloorsInBuilding = b.floors.filter(f => f.twinOfFloorName === currentFloor.floorName);
        
        const updatedFloors = b.floors.map(f => {
          if (f.id === currentFloor.id) {
            // Delete from parent floor by index
            return { ...f, flats: f.flats.filter((fl, idx) => idx !== flatIndex) };
          } else if (twinFloorsInBuilding.find(tf => tf.id === f.id)) {
            // Delete from twin floors (same index)
            return { ...f, flats: f.flats.filter((fl, idx) => idx !== flatIndex) };
          }
          return f;
        });
        
        return { ...b, floors: updatedFloors };
      }
      return b;
    });
    
    setProjectData(prev => ({
      ...prev,
      buildings: updatedBuildings,
    }));
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

  const copyBuildingData = (fromBuildingId, toBuildingId) => {
    const sourceBuilding = projectData.buildings.find(b => b.id === fromBuildingId);
    const targetBuilding = projectData.buildings.find(b => b.id === toBuildingId);
    if (!sourceBuilding || !targetBuilding) return;
    
    // Copy floors and flats from source building to target building
    const copiedFloors = sourceBuilding.floors.map(f => ({
      ...f,
      id: Math.floor(Math.random() * 1000000000),
      flats: f.flats.map(fl => ({ 
        ...fl, 
        id: Math.floor(Math.random() * 1000000000) 
      })),
    }));
    
    // Find all twin buildings of the target building
    const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === targetBuilding.name);
    
    // Update the target building
    const updatedBuildings = projectData.buildings.map(b => {
      if (b.id === toBuildingId) {
        // Update target building with copied data
        return {
          ...b,
          applicationType: sourceBuilding.applicationType,
          residentialType: sourceBuilding.residentialType,
          villaType: sourceBuilding.villaType,
          villaCount: sourceBuilding.villaCount,
          floors: copiedFloors,
        };
      } else if (twinBuildings.find(tb => tb.id === b.id)) {
        // Update twin buildings with copied data (with unique IDs)
        const twinFloors = sourceBuilding.floors.map(f => ({
          ...f,
          id: Math.floor(Math.random() * 1000000000),
          flats: f.flats.map(fl => ({ 
            ...fl, 
            id: Math.floor(Math.random() * 1000000000) 
          })),
        }));
        return {
          ...b,
          applicationType: sourceBuilding.applicationType,
          residentialType: sourceBuilding.residentialType,
          villaType: sourceBuilding.villaType,
          villaCount: sourceBuilding.villaCount,
          floors: twinFloors,
        };
      }
      return b;
    });
    
    setProjectData(prev => ({
      ...prev,
      buildings: updatedBuildings,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate that project has a name
      if (!projectData.name.trim()) {
        setError('Project name is required');
        return;
      }

      setSaving(true);
      setError(null);

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
        setSaving(false);
        return;
      }

      const result = await response.json();
      alert(`Project ${isEditing ? 'updated' : 'created'} successfully!`);
      
      // Redirect to L1 dashboard after successful creation
      navigate('/l1-dashboard');
    } catch (err) {
      setError('Failed to save project: ' + err.message);
      console.error(err);
      setSaving(false);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section - 2/3 width */}
        <div className="lg:col-span-2">
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

              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Assign Project Lead (L1 Manager)
                </label>
                <select
                  value={projectData.assignedLeadId || ''}
                  onChange={e => handleProjectFieldChange('assignedLeadId', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                >
                  <option value="">Select L1 Manager (Optional)</option>
                  {l1Users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">Assign an L1 manager who will be responsible for this project</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {projectData.buildings.filter(b => !b.twinOfBuildingName).map((building, idx) => {
                // Find twin buildings for this parent
                const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === building.name);
                
                return (
                  <BuildingSection
                    key={building.id}
                    building={building}
                    buildingIndex={idx}
                    allBuildings={projectData.buildings}
                    twinBuildings={twinBuildings}
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
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={!projectData.name.trim() || warnings.some(w => w.type === 'error') || saving}
              className={`px-6 py-3 font-jost font-semibold rounded-lg transition-all ${
                !projectData.name.trim() || warnings.some(w => w.type === 'error') || saving
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-lodha-gold text-white hover:bg-lodha-gold/90'
              }`}
              title={
                !projectData.name.trim()
                  ? 'Please enter project name'
                  : warnings.some(w => w.type === 'error')
                  ? 'Please resolve errors before submitting'
                  : saving
                  ? 'Saving...'
                  : ''
              }
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'} Project
            </button>
            <button
              onClick={() => window.history.back()}
              disabled={saving}
              className={`px-6 py-3 font-jost font-semibold rounded-lg border border-lodha-gold ${
                saving
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Live Preview Section - 1/3 width */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-6">
            <h2 className="heading-secondary mb-4">Project Preview</h2>
            <ProjectPreview data={projectData} />
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 border-4 border-lodha-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
            <h3 className="text-xl font-garamond font-bold text-lodha-black mb-2">
              {isEditing ? 'Updating' : 'Creating'} Project
            </h3>
            <p className="text-lodha-grey font-jost">
              Please wait while we {isEditing ? 'update' : 'save'} your project...
            </p>
            <p className="text-xs text-lodha-grey mt-4 font-jost">
              This may take a few moments
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Building Section Component
function BuildingSection({
  building,
  buildingIndex,
  allBuildings,
  twinBuildings,
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
        <div>
          <h3 className="heading-tertiary">Building {buildingIndex + 1}</h3>
          {twinBuildings && twinBuildings.length > 0 && (
            <div className="text-xs text-lodha-grey mt-1 font-jost">
              Twin buildings: {twinBuildings.map(b => b.name).join(', ')}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(building.id)}
          className="text-lodha-gold hover:text-lodha-deep"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Building Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

      {/* Building Type Selection - NEW */}
      <div className="mb-4">
        <label className="block text-sm font-jost font-semibold mb-2">Building Type</label>
        <select
          value={building.buildingType || ''}
          onChange={e => onUpdate(building.id, { buildingType: e.target.value })}
          className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
        >
          <option value="">Select building type...</option>
          {standards.buildingTypes?.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

      {/* Villa-Specific Fields - NEW */}
      {building.buildingType === 'Villa' && (
        <div className="border border-lodha-gold/30 rounded-lg p-4 mb-4 bg-yellow-50/30">
          <h4 className="text-sm font-jost font-semibold mb-3 text-lodha-gold">Villa Specifications</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Pool Volume (m³)</label>
              <input
                type="number"
                step="0.01"
                value={building.poolVolume || ''}
                onChange={e => onUpdate(building.id, { poolVolume: e.target.value })}
                placeholder="e.g., 50.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 font-jost mt-6">
                <input
                  type="checkbox"
                  checked={building.hasLift || false}
                  onChange={e => onUpdate(building.id, { hasLift: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Has Lift?</span>
              </label>
            </div>
            {building.hasLift && (
              <>
                <div>
                  <label className="block text-sm font-jost font-semibold mb-2">Lift Name/Model</label>
                  <input
                    type="text"
                    value={building.liftName || ''}
                    onChange={e => onUpdate(building.id, { liftName: e.target.value })}
                    placeholder="e.g., Otis 2000"
                    className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-jost font-semibold mb-2">Lift Passenger Capacity</label>
                  <input
                    type="number"
                    value={building.liftPassengerCapacity || ''}
                    onChange={e => onUpdate(building.id, { liftPassengerCapacity: e.target.value })}
                    placeholder="e.g., 8"
                    className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MLCP/Parking-Specific Fields - NEW */}
      {building.buildingType === 'MLCP/Parking' && (
        <div className="border border-lodha-gold/30 rounded-lg p-4 mb-4 bg-yellow-50/30">
          <h4 className="text-sm font-jost font-semibold mb-3 text-lodha-gold">Parking Specifications</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Car Parking Count (per floor)</label>
              <input
                type="number"
                value={building.carParkingCountPerFloor || ''}
                onChange={e => onUpdate(building.id, { carParkingCountPerFloor: e.target.value })}
                placeholder="e.g., 50"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Car Parking Area (m²)</label>
              <input
                type="number"
                step="0.01"
                value={building.carParkingArea || ''}
                onChange={e => onUpdate(building.id, { carParkingArea: e.target.value })}
                placeholder="e.g., 1500.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">2-Wheeler Parking Count</label>
              <input
                type="number"
                value={building.twoWheelerParkingCount || ''}
                onChange={e => onUpdate(building.id, { twoWheelerParkingCount: e.target.value })}
                placeholder="e.g., 100"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">2-Wheeler Parking Area (m²)</label>
              <input
                type="number"
                step="0.01"
                value={building.twoWheelerParkingArea || ''}
                onChange={e => onUpdate(building.id, { twoWheelerParkingArea: e.target.value })}
                placeholder="e.g., 200.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">EV Parking %</label>
              <input
                type="number"
                step="0.01"
                value={building.evParkingPercentage || ''}
                onChange={e => onUpdate(building.id, { evParkingPercentage: e.target.value })}
                placeholder="e.g., 20.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Shop Count</label>
              <input
                type="number"
                value={building.shopCount || ''}
                onChange={e => onUpdate(building.id, { shopCount: e.target.value })}
                placeholder="e.g., 5"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-jost font-semibold mb-2">Shop Area (m²)</label>
              <input
                type="number"
                step="0.01"
                value={building.shopArea || ''}
                onChange={e => onUpdate(building.id, { shopArea: e.target.value })}
                placeholder="e.g., 500.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Commercial-Specific Fields - NEW */}
      {building.buildingType === 'Commercial' && (
        <div className="border border-lodha-gold/30 rounded-lg p-4 mb-4 bg-yellow-50/30">
          <h4 className="text-sm font-jost font-semibold mb-3 text-lodha-gold">Commercial Specifications</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Office Count</label>
              <input
                type="number"
                value={building.officeCount || ''}
                onChange={e => onUpdate(building.id, { officeCount: e.target.value })}
                placeholder="e.g., 20"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Office Area (m²)</label>
              <input
                type="number"
                step="0.01"
                value={building.officeArea || ''}
                onChange={e => onUpdate(building.id, { officeArea: e.target.value })}
                placeholder="e.g., 2000.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-jost font-semibold mb-2">Common Area (m²)</label>
              <input
                type="number"
                step="0.01"
                value={building.commonArea || ''}
                onChange={e => onUpdate(building.id, { commonArea: e.target.value })}
                placeholder="e.g., 500.00"
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              />
            </div>
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
              onClick={() => onCopyBuilding(allBuildings[buildingIndex - 1].id, building.id)}
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
