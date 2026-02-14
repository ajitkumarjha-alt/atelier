import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import GoogleMapComponent from '../components/GoogleMapComponent';
import { Plus, Trash2, Edit2, MapPin, Copy, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, Building2, Map, Users, Landmark } from 'lucide-react';
import { showSuccess, showError, showWarning } from '../utils/toast';
import { useConfirm, usePrompt } from '../hooks/useDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import PromptDialog from '../components/PromptDialog';

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

export default function ProjectInput() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!projectId;

  const [projectData, setProjectData] = useState({
    name: '',
    location: '',
    state: '',
    latitude: '',
    longitude: '',
    projectCategory: 'GOLD 2',
    assignedLeadId: null,
    buildings: [],
    societies: [],
  });

  const [siteAreas, setSiteAreas] = useState([]);
  const [initialSiteAreas, setInitialSiteAreas] = useState([]);
  const [selectedSiteArea, setSelectedSiteArea] = useState(null);

  const [standards, setStandards] = useState({
    applicationTypes: [],
    residentialTypes: [],
    flatTypes: [],
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
  const [initialProjectSnapshot, setInitialProjectSnapshot] = useState('');
  const [initialSiteAreasSnapshot, setInitialSiteAreasSnapshot] = useState('');

  const { confirm, dialogProps: confirmDialogProps } = useConfirm();
  const { prompt: promptDialog, dialogProps: promptDialogProps } = usePrompt();

  // Wizard stepper
  const [currentStep, setCurrentStep] = useState(0);
  const STEPS = [
    { key: 'details', label: 'Project Details', icon: Landmark, description: 'Name, location & category' },
    { key: 'site', label: 'Site Areas', icon: Map, description: 'Landscape, amenities & parking' },
    { key: 'societies', label: 'Societies', icon: Users, description: 'Group buildings into societies' },
    { key: 'buildings', label: 'Buildings', icon: Building2, description: 'Towers, floors & flats' },
  ];

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
      const [projectResponse, siteAreasResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/full`),
        fetch(`/api/projects/${projectId}/site-areas`)
      ]);

      if (projectResponse.ok) {
        const data = await projectResponse.json();
        const normalizedBuildings = (data.buildings || []).map(building => ({
          ...building,
          societyId: building.societyId ?? building.society_id ?? null,
          societyName: building.societyName ?? building.society_name ?? null,
          gfEntranceLobby: building.gfEntranceLobby ?? building.gf_entrance_lobby ?? '',
          floors: (building.floors || []).map(floor => ({
            ...floor,
            floorHeight: floor.floorHeight ?? floor.floor_height ?? 3.5,
            typicalLobbyArea: floor.typicalLobbyArea ?? floor.typical_lobby_area ?? '',
          })),
        }));
        const nextProjectData = {
          ...data,
          projectCategory: data.projectCategory || data.project_category || 'GOLD 2',
          state: data.state || '',
          buildings: normalizedBuildings,
          societies: Array.isArray(data.societies) ? data.societies : [],
        };
        setProjectData(nextProjectData);
        setInitialProjectSnapshot(stableStringify(nextProjectData));
      }

      if (siteAreasResponse.ok) {
        const siteAreasData = await siteAreasResponse.json();
        setSiteAreas(siteAreasData);
        setInitialSiteAreas(siteAreasData);
        setInitialSiteAreasSnapshot(stableStringify(siteAreasData));
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

  const addBuilding = async () => {
    const buildingName = await promptDialog({ title: 'Enter Building Name', placeholder: 'e.g., Tower A' });
    if (!buildingName || !buildingName.trim()) return;
    
    const trimmedBuildingName = buildingName.trim();
    
    // Check if building name already exists
    const existingBuilding = projectData.buildings.find(b => b.name.toLowerCase() === trimmedBuildingName.toLowerCase());
    if (existingBuilding) {
      showError('A building with this name already exists!');
      return;
    }

    // Get list of existing non-twin buildings to copy from
    const nonTwinBuildings = projectData.buildings.filter(b => !b.isTwin);
    let sourceBuilding = null;
    let isTwinBuilding = false;

    if (nonTwinBuildings.length > 0) {
      const choice = await promptDialog({
        title: 'Building Configuration',
        message: 'Enter "copy" to copy from existing building, or "twin" to create a twin building. Leave empty for default setup.',
        placeholder: 'copy / twin / (empty for default)'
      });

      if (choice !== null && (choice.toLowerCase() === 'copy' || choice.toLowerCase() === 'twin')) {
        // Show available buildings to copy/twin from
        const buildingList = nonTwinBuildings.map((b, i) => `${i + 1}. ${b.name}`).join('\n');
        const buildingChoice = await promptDialog({
          title: 'Select Building',
          message: `Select building to ${choice.toLowerCase() === 'copy' ? 'copy from' : 'twin with'}:\n${buildingList}`,
          placeholder: 'e.g., Tower A or 1'
        });
        
        const buildingIndex = parseInt(buildingChoice) - 1;
        if (buildingIndex >= 0 && buildingIndex < nonTwinBuildings.length) {
          sourceBuilding = nonTwinBuildings[buildingIndex];
          isTwinBuilding = choice.toLowerCase() === 'twin';
        } else {
          const matchedBuilding = nonTwinBuildings.find(b => b.name.toLowerCase() === buildingChoice?.toLowerCase()?.trim());
          if (matchedBuilding) {
            sourceBuilding = matchedBuilding;
            isTwinBuilding = choice.toLowerCase() === 'twin';
          }
        }
      }
    }
    
    const baseId = Math.floor(Math.random() * 1000000000);
    
    let newBuilding;
    
    if (isTwinBuilding && sourceBuilding) {
      // Create twin building - minimal data, just references parent
      newBuilding = {
        id: baseId,
        name: trimmedBuildingName,
        isTwin: true,
        twinOfBuildingName: sourceBuilding.name,
        societyId: null,
        applicationType: sourceBuilding.applicationType,
        floors: [],
      };
    } else if (sourceBuilding) {
      // Copy building data - all fields editable
      newBuilding = {
        id: baseId,
        name: trimmedBuildingName,
        applicationType: sourceBuilding.applicationType,
        residentialType: sourceBuilding.residentialType,
        societyId: null,
        gfEntranceLobby: sourceBuilding.gfEntranceLobby,
        villaType: sourceBuilding.villaType,
        villaCount: sourceBuilding.villaCount,
        poolVolume: sourceBuilding.poolVolume,
        hasLift: sourceBuilding.hasLift,
        liftName: sourceBuilding.liftName,
        liftPassengerCapacity: sourceBuilding.liftPassengerCapacity,
        carParkingCountPerFloor: sourceBuilding.carParkingCountPerFloor,
        carParkingArea: sourceBuilding.carParkingArea,
        twoWheelerParkingCount: sourceBuilding.twoWheelerParkingCount,
        twoWheelerParkingArea: sourceBuilding.twoWheelerParkingArea,
        evParkingPercentage: sourceBuilding.evParkingPercentage,
        shopCount: sourceBuilding.shopCount,
        shopArea: sourceBuilding.shopArea,
        officeCount: sourceBuilding.officeCount,
        officeArea: sourceBuilding.officeArea,
        commonArea: sourceBuilding.commonArea,
        isTwin: false,
        twinOfBuildingId: null,
        twinBuildingNames: [],
        floors: JSON.parse(JSON.stringify(sourceBuilding.floors || [])), // Deep copy floors
      };
    } else {
      // Create new building from scratch
      newBuilding = {
        id: baseId,
        name: trimmedBuildingName,
        applicationType: '',
        residentialType: '',
        societyId: null,
        gfEntranceLobby: '',
        villaType: '',
        villaCount: '',
        poolVolume: '',
        hasLift: false,
        liftName: '',
        liftPassengerCapacity: '',
        carParkingCountPerFloor: '',
        carParkingArea: '',
        twoWheelerParkingCount: '',
        twoWheelerParkingArea: '',
        evParkingPercentage: '',
        shopCount: '',
        shopArea: '',
        officeCount: '',
        officeArea: '',
        commonArea: '',
        isTwin: false,
        twinOfBuildingId: null,
        twinBuildingNames: [],
        floors: [],
      };
    }
    
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

  const addSociety = async () => {
    const societyName = await promptDialog({ title: 'Enter Society Name', placeholder: 'e.g., Paradise Society' });
    if (!societyName || !societyName.trim()) return;

    const trimmedName = societyName.trim();
    const exists = projectData.societies.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      showError('A society with this name already exists!');
      return;
    }

    const newSociety = {
      id: `soc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmedName,
      description: ''
    };

    setProjectData(prev => ({
      ...prev,
      societies: [...prev.societies, newSociety]
    }));
  };

  const updateSociety = (societyId, updates) => {
    setProjectData(prev => ({
      ...prev,
      societies: prev.societies.map(society =>
        society.id === societyId ? { ...society, ...updates } : society
      )
    }));
  };

  const deleteSociety = async (societyId) => {
    const society = projectData.societies.find(s => s.id === societyId);
    if (!society) return;

    const assignedBuildings = projectData.buildings.filter(b => b.societyId === societyId);
    if (assignedBuildings.length > 0) {
      const confirmed = await confirm({
        title: 'Remove Society',
        message: `This society has ${assignedBuildings.length} building(s) assigned. Remove the society anyway?`,
        variant: 'danger',
        confirmLabel: 'Remove'
      });
      if (!confirmed) return;
    }

    setProjectData(prev => ({
      ...prev,
      societies: prev.societies.filter(s => s.id !== societyId),
      buildings: prev.buildings.map(b =>
        b.societyId === societyId ? { ...b, societyId: null } : b
      )
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

  const createEmptySiteArea = () => ({
    id: `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    area_type: 'landscape',
    name: '',
    description: '',
    area_sqm: '',
    water_volume_cum: '',
    softscape_area_sqm: '',
    requires_water: false,
    water_connection_points: '',
    estimated_water_demand: '',
    requires_electrical: false,
    electrical_load_kw: '',
    lighting_points: '',
    power_points: '',
    has_ev_charging: false,
    ev_charging_points: '',
    requires_drainage: false,
    drainage_type: '',
    requires_hvac: false,
    hvac_capacity_tr: '',
    requires_fire_fighting: false,
    fire_hydrant_points: '',
    sprinkler_required: false,
    irrigation_type: '',
    landscape_category: '',
    amenity_type: '',
    capacity_persons: '',
    operational_hours: '',
    parking_type: '',
    car_spaces: '',
    bike_spaces: '',
    infrastructure_type: '',
    equipment_details: '',
    capacity_rating: '',
    location_description: '',
    notes: ''
  });

  const addSiteArea = () => {
    const newArea = createEmptySiteArea();
    setSiteAreas(prev => [...prev, newArea]);
    setSelectedSiteArea(newArea.id);
  };

  const updateSiteArea = (areaId, updates) => {
    setSiteAreas(prev => prev.map(area => (
      area.id === areaId ? { ...area, ...updates } : area
    )));
  };

  const deleteSiteArea = (areaId) => {
    setSiteAreas(prev => prev.filter(area => area.id !== areaId));
    if (selectedSiteArea === areaId) {
      setSelectedSiteArea(null);
    }
  };

  const toggleSiteAreaDetails = (areaId) => {
    setSelectedSiteArea(prev => (prev === areaId ? null : areaId));
  };

  const addFloor = async (buildingId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    
    const floorName = await promptDialog({ title: 'Enter Floor Name', placeholder: 'e.g., Ground Floor' });
    if (!floorName || !floorName.trim()) return;

    const floorHeightInput = await promptDialog({ title: 'Floor Height', message: 'Enter height in meters', placeholder: '3.5', defaultValue: '3.5', inputType: 'number' });
    const parsedFloorHeight = parseFloat(floorHeightInput);
    if (!floorHeightInput || Number.isNaN(parsedFloorHeight) || parsedFloorHeight <= 0) {
      showWarning('Please enter a valid floor height in meters.');
      return;
    }
    
    const trimmedFloorName = floorName.trim();
    
    // Check if floor name already exists
    const existingFloor = building.floors.find(f => f.floorName.toLowerCase() === trimmedFloorName.toLowerCase());
    if (existingFloor) {
      showError('A floor with this name already exists!');
      return;
    }
    
    const twinFloorNames = await promptDialog({ title: 'Twin Floor Names', message: 'Enter comma-separated names (optional)', placeholder: 'e.g., Floor 2A, Floor 2B' });
    const baseId = Math.floor(Math.random() * 1000000000);
    const baseFloorNumber = building.floors.length + 1;
    
    const newFloor = {
      id: baseId,
      floorNumber: baseFloorNumber,
      floorName: trimmedFloorName,
      floorHeight: parsedFloorHeight,
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
          showError(`Twin floor name "${name}" cannot be the same as parent floor!`);
          return;
        }
        if (twinNamesSet.has(lowerName)) {
          showError(`Duplicate twin floor name: "${name}"`);
          return;
        }
        if (building.floors.find(f => f.floorName.toLowerCase() === lowerName)) {
          showError(`Floor with name "${name}" already exists!`);
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
          floorHeight: parsedFloorHeight,
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
    const targetFloor = building.floors.find(f => f.id === floorId);
    if (!targetFloor) return;

    const baseFloorName = targetFloor.twinOfFloorName || targetFloor.floorName;
    const shouldSyncHeight = Object.prototype.hasOwnProperty.call(updates, 'floorHeight');
    const shouldSyncLobby = Object.prototype.hasOwnProperty.call(updates, 'typicalLobbyArea');

    const updatedFloors = building.floors.map(f => {
      if (f.id === floorId) {
        return { ...f, ...updates };
      }
      if ((shouldSyncHeight || shouldSyncLobby) && (f.floorName === baseFloorName || f.twinOfFloorName === baseFloorName)) {
        return {
          ...f,
          floorHeight: shouldSyncHeight ? updates.floorHeight : f.floorHeight,
          typicalLobbyArea: shouldSyncLobby ? updates.typicalLobbyArea : f.typicalLobbyArea
        };
      }
      return f;
    });

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

  const normalizeNumber = (value, isInt = false) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const parsed = isInt ? parseInt(value, 10) : parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const buildSiteAreaPayload = (area) => ({
    area_type: area.area_type,
    name: area.name,
    description: area.description || null,
    area_sqm: normalizeNumber(area.area_sqm),
    water_volume_cum: normalizeNumber(area.water_volume_cum),
    softscape_area_sqm: normalizeNumber(area.softscape_area_sqm),
    requires_water: !!area.requires_water,
    water_connection_points: normalizeNumber(area.water_connection_points, true),
    estimated_water_demand: normalizeNumber(area.estimated_water_demand),
    requires_electrical: !!area.requires_electrical,
    electrical_load_kw: normalizeNumber(area.electrical_load_kw),
    lighting_points: normalizeNumber(area.lighting_points, true),
    power_points: normalizeNumber(area.power_points, true),
    has_ev_charging: !!area.has_ev_charging,
    ev_charging_points: normalizeNumber(area.ev_charging_points, true),
    requires_drainage: !!area.requires_drainage,
    drainage_type: area.drainage_type || null,
    requires_hvac: !!area.requires_hvac,
    hvac_capacity_tr: normalizeNumber(area.hvac_capacity_tr),
    requires_fire_fighting: !!area.requires_fire_fighting,
    fire_hydrant_points: normalizeNumber(area.fire_hydrant_points, true),
    sprinkler_required: !!area.sprinkler_required,
    irrigation_type: area.irrigation_type || null,
    landscape_category: area.landscape_category || null,
    amenity_type: area.amenity_type || null,
    capacity_persons: normalizeNumber(area.capacity_persons, true),
    operational_hours: area.operational_hours || null,
    parking_type: area.parking_type || null,
    car_spaces: normalizeNumber(area.car_spaces, true),
    bike_spaces: normalizeNumber(area.bike_spaces, true),
    infrastructure_type: area.infrastructure_type || null,
    equipment_details: area.equipment_details || null,
    capacity_rating: area.capacity_rating || null,
    location_description: area.location_description || null,
    notes: area.notes || null
  });

  const syncSiteAreas = async (projectIdToSync) => {
    const originalIds = initialSiteAreas
      .filter(area => typeof area.id === 'number')
      .map(area => area.id);
    const currentIds = siteAreas
      .filter(area => typeof area.id === 'number')
      .map(area => area.id);
    const deletedIds = originalIds.filter(id => !currentIds.includes(id));

    await Promise.all(deletedIds.map(id =>
      fetch(`/api/site-areas/${id}`, { method: 'DELETE' })
    ));

    await Promise.all(siteAreas.map(area => {
      const payload = buildSiteAreaPayload(area);
      if (typeof area.id === 'number') {
        return fetch(`/api/site-areas/${area.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      return fetch(`/api/projects/${projectIdToSync}/site-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate that project has a name
      if (!String(projectData.name || '').trim()) {
        setError('Project name is required');
        return;
      }

      const invalidSoftscape = siteAreas.find(area => (
        area.area_type === 'landscape' &&
        area.area_sqm !== '' &&
        area.softscape_area_sqm !== '' &&
        Number(area.softscape_area_sqm) > Number(area.area_sqm)
      ));

      if (invalidSoftscape) {
        setError('Softscape area cannot exceed total landscape area.');
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
      const savedProjectId = result.id || projectId;

      await syncSiteAreas(savedProjectId);
      setInitialSiteAreas(siteAreas);

      showSuccess(`Project ${isEditing ? 'updated' : 'created'} successfully!`);
      
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

  const trimmedProjectName = String(projectData.name || '').trim();
  const trimmedProjectLocation = String(projectData.location || '').trim();
  const currentProjectSnapshot = stableStringify(projectData);
  const currentSiteAreasSnapshot = stableStringify(siteAreas);
  const hasChanges = !isEditing ||
    currentProjectSnapshot !== initialProjectSnapshot ||
    currentSiteAreasSnapshot !== initialSiteAreasSnapshot;

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section - 2/3 width */}
        <div className="lg:col-span-2">
          <h1 className="heading-primary mb-2">
            {isEditing ? 'Edit Project' : 'Create New Project'}
          </h1>

          {/* ── Wizard Stepper ──────────────────────────────── */}
          <nav className="mb-6" aria-label="Form progress">
            <ol className="flex items-center gap-1 overflow-x-auto pb-2">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                return (
                  <li key={step.key} className="flex items-center min-w-0">
                    <button
                      onClick={() => setCurrentStep(idx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-jost font-medium transition-all whitespace-nowrap
                        ${isActive
                          ? 'bg-lodha-gold text-white shadow-sm'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-white text-lodha-grey hover:bg-lodha-sand border border-lodha-steel/30'
                        }`}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-lodha-sand'}`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-lodha-steel mx-1 flex-shrink-0" aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-lodha-grey mt-1 font-jost">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].description}
            </p>
          </nav>

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
          {currentStep === 0 && (
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
                  Project Category
                </label>
                <select
                  value={projectData.projectCategory || 'GOLD 2'}
                  onChange={e => handleProjectFieldChange('projectCategory', e.target.value)}
                  className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                >
                  <option>GOLD 1</option>
                  <option>GOLD 2</option>
                  <option>GOLD 3</option>
                  <option>Platinum</option>
                  <option>Diamond</option>
                </select>
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
                  State
                </label>
                <input
                  type="text"
                  value={projectData.state}
                  onChange={e => handleProjectFieldChange('state', e.target.value)}
                  className="w-full px-4 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                  placeholder="e.g., Maharashtra"
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
                <p className="text-xs text-lodha-grey mt-1">Assign an L1 manager who will be responsible for this project</p>
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
          )}

          {/* Site Areas Section */}
          {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="heading-secondary">Site Areas</h2>
                <p className="text-xs text-lodha-grey mt-1">
                  Landscape, amenities, parking, and external infrastructure with MEP details.
                </p>
              </div>
              <button
                onClick={addSiteArea}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lodha-gold text-white hover:bg-lodha-gold/90"
              >
                <Plus className="w-4 h-4" />
                Add Site Area
              </button>
            </div>

            {siteAreas.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-lodha-steel text-lodha-grey/70 text-sm">
                No site areas added yet. Add landscape zones, amenities, parking, or infrastructure here.
              </div>
            ) : (
              <div className="space-y-4">
                {siteAreas.map((area, index) => (
                  <div key={area.id} className="border border-lodha-steel/30 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Area Name</label>
                        <input
                          type="text"
                          value={area.name}
                          onChange={e => updateSiteArea(area.id, { name: e.target.value })}
                          placeholder={`Site area ${index + 1}`}
                          className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Area Type</label>
                        <select
                          value={area.area_type}
                          onChange={e => {
                            const nextType = e.target.value;
                            const nextUpdates = { area_type: nextType };

                            if (nextType !== 'parking') {
                              nextUpdates.has_ev_charging = false;
                              nextUpdates.ev_charging_points = '';
                              nextUpdates.parking_type = '';
                              nextUpdates.car_spaces = '';
                              nextUpdates.bike_spaces = '';
                            } else {
                              nextUpdates.parking_type = 'surface';
                            }

                            if (nextType !== 'amenity') {
                              nextUpdates.amenity_type = '';
                              nextUpdates.capacity_persons = '';
                              nextUpdates.operational_hours = '';
                            }

                            if (nextType !== 'infrastructure') {
                              nextUpdates.infrastructure_type = '';
                              nextUpdates.equipment_details = '';
                              nextUpdates.capacity_rating = '';
                            }

                            if (nextType !== 'landscape') {
                              nextUpdates.landscape_category = '';
                              nextUpdates.softscape_area_sqm = '';
                            } else {
                              nextUpdates.landscape_category = 'mixed';
                            }

                            if (nextType !== 'swimming_pool' && nextType !== 'water_body') {
                              nextUpdates.water_volume_cum = '';
                            }

                            updateSiteArea(area.id, nextUpdates);
                            setSelectedSiteArea(area.id);
                          }}
                          className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                        >
                          <option value="landscape">Landscape</option>
                          <option value="amenity">Amenity</option>
                          <option value="swimming_pool">Swimming Pool</option>
                          <option value="water_body">Water Body</option>
                          <option value="parking">Parking</option>
                          <option value="infrastructure">Infrastructure</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Area (sqm)</label>
                        <input
                          type="number"
                          value={area.area_sqm}
                          onChange={e => updateSiteArea(area.id, { area_sqm: e.target.value })}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSiteAreaDetails(area.id)}
                          className="px-3 py-2 text-lodha-gold hover:bg-lodha-sand rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSiteArea(area.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {selectedSiteArea === area.id && (
                      <div className="mt-4 pt-4 border-t border-lodha-steel/30 space-y-4">
                        <div>
                          <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Description</label>
                          <textarea
                            value={area.description}
                            onChange={e => updateSiteArea(area.id, { description: e.target.value })}
                            placeholder="Brief description of the area"
                            rows={2}
                            className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                          />
                        </div>

                        {(area.area_type === 'swimming_pool' || area.area_type === 'water_body') && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Water Volume (m³)</label>
                              <input
                                type="number"
                                value={area.water_volume_cum}
                                onChange={e => updateSiteArea(area.id, { water_volume_cum: e.target.value })}
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                          </div>
                        )}

                        {area.area_type === 'landscape' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Softscape Area (sqm)</label>
                              <input
                                type="number"
                                value={area.softscape_area_sqm}
                                onChange={e => updateSiteArea(area.id, { softscape_area_sqm: e.target.value })}
                                placeholder="Portion of landscape that is green"
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                              {area.area_sqm && area.softscape_area_sqm && Number(area.softscape_area_sqm) > Number(area.area_sqm) && (
                                <p className="text-xs text-red-600 mt-1">Softscape area cannot exceed total landscape area.</p>
                              )}
                              {area.area_sqm && area.softscape_area_sqm && Number(area.softscape_area_sqm) <= Number(area.area_sqm) && (
                                <p className="text-xs text-lodha-grey/70 mt-1">
                                  Hardscape area: {Math.max(Number(area.area_sqm) - Number(area.softscape_area_sqm), 0)} sqm
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {area.area_type === 'amenity' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Amenity Type</label>
                              <input
                                type="text"
                                value={area.amenity_type}
                                onChange={e => updateSiteArea(area.id, { amenity_type: e.target.value })}
                                placeholder="Swimming pool, clubhouse, gym..."
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Capacity (persons)</label>
                              <input
                                type="number"
                                value={area.capacity_persons}
                                onChange={e => updateSiteArea(area.id, { capacity_persons: e.target.value })}
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Operational Hours</label>
                              <input
                                type="text"
                                value={area.operational_hours}
                                onChange={e => updateSiteArea(area.id, { operational_hours: e.target.value })}
                                placeholder="e.g., 6am - 10pm"
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                          </div>
                        )}

                        {area.area_type === 'parking' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Car Spaces</label>
                              <input
                                type="number"
                                value={area.car_spaces}
                                onChange={e => updateSiteArea(area.id, { car_spaces: e.target.value })}
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Bike Spaces</label>
                              <input
                                type="number"
                                value={area.bike_spaces}
                                onChange={e => updateSiteArea(area.id, { bike_spaces: e.target.value })}
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">EV Charging Points</label>
                              <input
                                type="number"
                                value={area.ev_charging_points}
                                onChange={e => {
                                  const nextValue = e.target.value;
                                  updateSiteArea(area.id, {
                                    ev_charging_points: nextValue,
                                    has_ev_charging: Number(nextValue) > 0
                                  });
                                }}
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                          </div>
                        )}

                        {area.area_type === 'infrastructure' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Infrastructure Type</label>
                              <input
                                type="text"
                                value={area.infrastructure_type}
                                onChange={e => updateSiteArea(area.id, { infrastructure_type: e.target.value })}
                                placeholder="STP, WTP, Pump Room..."
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Capacity Rating</label>
                              <input
                                type="text"
                                value={area.capacity_rating}
                                onChange={e => updateSiteArea(area.id, { capacity_rating: e.target.value })}
                                placeholder="e.g., 100 KLD, 500 kVA"
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Equipment Details</label>
                              <input
                                type="text"
                                value={area.equipment_details}
                                onChange={e => updateSiteArea(area.id, { equipment_details: e.target.value })}
                                placeholder="Pumps, transformers, etc."
                                className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">Notes</label>
                          <input
                            type="text"
                            value={area.notes}
                            onChange={e => updateSiteArea(area.id, { notes: e.target.value })}
                            placeholder="Any additional notes"
                            className="w-full px-3 py-2 border border-lodha-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Societies Section */}
          {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="heading-secondary">Societies</h2>
                <p className="text-xs text-lodha-grey mt-1">
                  Define societies and assign buildings to them.
                </p>
              </div>
              <button
                onClick={addSociety}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lodha-gold text-white hover:bg-lodha-gold/90"
              >
                <Plus className="w-4 h-4" />
                Add Society
              </button>
            </div>

            {projectData.societies.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-lodha-steel text-lodha-grey/70 text-sm">
                No societies added yet. Add at least one to group buildings.
              </div>
            ) : (
              <div className="space-y-3">
                {projectData.societies.map((society) => (
                  <div key={society.id} className="border border-lodha-grey/50 rounded p-3 bg-lodha-sand/20">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-jost font-semibold text-lodha-black mb-1">Society Name</label>
                        <input
                          type="text"
                          value={society.name}
                          onChange={e => updateSociety(society.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                          placeholder="e.g., Waterfront Society A"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-jost font-semibold text-lodha-black mb-1">Description</label>
                        <input
                          type="text"
                          value={society.description || ''}
                          onChange={e => updateSociety(society.id, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                          placeholder="Optional"
                        />
                      </div>
                      <button
                        onClick={() => deleteSociety(society.id)}
                        className="text-lodha-gold hover:text-red-600"
                        title="Delete society"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Buildings Section */}
          {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-secondary">Buildings</h2>
              <button
                onClick={addBuilding}
                disabled={!trimmedProjectName || !trimmedProjectLocation || warnings.some(w => w.type === 'error')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  !trimmedProjectName || !trimmedProjectLocation || warnings.some(w => w.type === 'error')
                    ? 'bg-lodha-steel/30 text-lodha-grey cursor-not-allowed'
                    : 'bg-lodha-gold text-white hover:bg-lodha-gold/90'
                }`}
                title={
                  !trimmedProjectName
                    ? 'Please enter project name'
                    : !trimmedProjectLocation
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
                const twinBuildings = projectData.buildings.filter(b => b.twinOfBuildingName === building.name);

                return (
                  <BuildingSection
                    key={building.id}
                    building={building}
                    buildingIndex={idx}
                    allBuildings={projectData.buildings}
                    twinBuildings={twinBuildings}
                    societies={projectData.societies}
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
                    onConfirm={confirm}
                  />
                );
              })}
            </div>
          </div>
          )}

          {/* ── Step Navigation ──────────────────────────── */}
          <div className="flex items-center justify-between mt-2 mb-4">
            <button
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-jost font-medium text-sm transition-all ${
                currentStep === 0
                  ? 'text-lodha-grey/40 cursor-not-allowed'
                  : 'text-lodha-grey hover:bg-lodha-sand border border-lodha-steel/30'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs font-jost text-lodha-grey">
              {currentStep + 1} / {STEPS.length}
            </span>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-jost font-semibold text-sm
                           bg-lodha-gold text-white hover:bg-lodha-deep transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span /> /* Placeholder to maintain flex spacing */
            )}
          </div>

          {/* Submit Button — visible on last step or always for editing */}
          {(currentStep === STEPS.length - 1 || isEditing) && (
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={!trimmedProjectName || warnings.some(w => w.type === 'error') || saving || (isEditing && !hasChanges)}
              className={`px-6 py-3 font-jost font-semibold rounded-lg transition-all ${
                !trimmedProjectName || warnings.some(w => w.type === 'error') || saving || (isEditing && !hasChanges)
                  ? 'bg-lodha-steel/30 text-lodha-grey cursor-not-allowed'
                  : 'bg-lodha-gold text-white hover:bg-lodha-gold/90'
              }`}
              title={
                !trimmedProjectName
                  ? 'Please enter project name'
                  : isEditing && !hasChanges
                  ? 'No changes to update'
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
                  ? 'bg-lodha-steel/20 text-lodha-grey/70 cursor-not-allowed'
                  : 'bg-lodha-sand text-lodha-black hover:bg-lodha-sand/80'
              }`}
            >
              Cancel
            </button>
          </div>
          )}
        </div>

        {/* Live Preview Section - 1/3 width */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-6">
            <h2 className="heading-secondary mb-4">Project Preview</h2>
            <ProjectPreview data={projectData} siteAreas={siteAreas} />
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
      <ConfirmDialog {...confirmDialogProps} />
      <PromptDialog {...promptDialogProps} />
    </Layout>
  );
}

// Building Section Component
function BuildingSection({
  building,
  buildingIndex,
  allBuildings,
  twinBuildings,
  societies,
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
  onConfirm,
}) {
  const isResidential = building.applicationType === 'Residential';
  const isVilla = building.applicationType === 'Villa';
  const parentBuildingOptions = allBuildings.filter(b => !b.twinOfBuildingName);
  const isTwinBuilding = building.isTwin && building.twinOfBuildingName;

  return (
    <div className="border border-lodha-grey rounded-lg p-4 bg-lodha-sand/30">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="heading-tertiary">Building {buildingIndex + 1}</h3>
          {isTwinBuilding && (
            <div className="text-sm text-blue-600 mt-1 font-jost font-semibold">
              Twin of: {building.twinOfBuildingName}
            </div>
          )}
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

      {/* Building Name - always show */}
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

        <div>
          <label className="block text-sm font-jost font-semibold mb-2">Society</label>
          <select
            value={building.societyId || ''}
            onChange={e => onUpdate(building.id, { societyId: e.target.value || null })}
            className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
          >
            <option value="">Unassigned</option>
            {(societies || []).map(society => (
              <option key={society.id} value={society.id}>
                {society.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Twin Building Management - allow changing twin status */}
      {isTwinBuilding && (
        <div className="mb-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-jost font-semibold mb-3 text-blue-700">Twin Building Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">Twin Configuration</label>
              <select
                value={building.twinOfBuildingName || 'independent'}
                onChange={e => {
                  const nextValue = e.target.value;
                  if (nextValue === 'independent') {
                    onUpdate(building.id, { twinOfBuildingName: null, isTwin: false });
                  } else {
                    onUpdate(building.id, { twinOfBuildingName: nextValue, isTwin: true });
                  }
                }}
                className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="independent">Convert to Independent Building</option>
                {parentBuildingOptions.map(option => (
                  <option key={option.id} value={option.name}>
                    Twin of {option.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-600 mt-1">
                Twin buildings share all configurations from their parent building.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show full building details only if NOT a twin */}
      {!isTwinBuilding && (
        <>
          {/* GF Entrance Lobby and Application Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-jost font-semibold mb-2">GF Entrance Lobby (sq.m)</label>
              <input
                type="number"
                value={building.gfEntranceLobby}
                onChange={e => onUpdate(building.id, { gfEntranceLobby: e.target.value })}
                className="w-full px-3 py-2 border border-lodha-grey rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                placeholder="e.g., 100"
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
      {building.applicationType === 'Villa' && (
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
      {building.applicationType === 'MLCP/Parking' && (
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
      {building.applicationType === 'Commercial' && (
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

      {/* Floors Section - show for all buildings including twins */}
      <div className="border-t border-lodha-grey pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-jost font-semibold">Floors</h4>
          {!isTwinBuilding && (
            <button
              onClick={() => onAddFloor(building.id)}
              disabled={!building.name.trim() || !building.applicationType}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-all ${
                !building.name.trim() || !building.applicationType
                  ? 'bg-lodha-steel/30 text-lodha-grey cursor-not-allowed'
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
          )}
          {isTwinBuilding && (
            <p className="text-sm text-blue-600 italic">
              Floors inherited from {building.twinOfBuildingName}
            </p>
          )}
        </div>

        {!isTwinBuilding && (
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
                    onConfirm={onConfirm}
                    twinFloors={building.floors.filter(f => f.twinOfFloorName === floor.floorName)}
                  />
                );
              })}
          </div>
        )}
      </div>
      </>
      )}
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
  onConfirm,
  twinFloors = [],
}) {
  const [selectedCopySource, setSelectedCopySource] = useState('');
  const parentFloorOptions = allFloors.filter(f => !f.twinOfFloorName);
  const availableTwinTargets = parentFloorOptions.filter(option => option.id !== floor.id);

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
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={floor.floorName}
              onChange={(e) => onUpdateFloor(buildingId, floor.id, { floorName: e.target.value })}
              placeholder="Floor name"
              className="px-2 py-1 border border-lodha-gold rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-lodha-gold"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                value={floor.floorHeight ?? ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  onUpdateFloor(buildingId, floor.id, {
                    floorHeight: nextValue === '' ? '' : parseFloat(nextValue)
                  });
                }}
                placeholder="Height"
                className="w-24 px-2 py-1 border border-lodha-gold rounded text-sm focus:outline-none focus:ring-1 focus:ring-lodha-gold"
              />
              <span className="text-xs text-lodha-grey">m</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                value={floor.typicalLobbyArea ?? ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  onUpdateFloor(buildingId, floor.id, {
                    typicalLobbyArea: nextValue === '' ? '' : parseFloat(nextValue)
                  });
                }}
                placeholder="Lobby"
                className="w-24 px-2 py-1 border border-lodha-gold rounded text-sm focus:outline-none focus:ring-1 focus:ring-lodha-gold"
              />
              <span className="text-xs text-lodha-grey">sq.m</span>
            </div>
          </div>
          {twinFloors.length > 0 && (
            <div className="mt-1 text-xs text-lodha-grey">
              Twin floors: {twinFloors.map(f => f.floorName).join(', ')}
            </div>
          )}
          {!floor.twinOfFloorName && availableTwinTargets.length > 0 && (
            <div className="mt-2 text-xs text-lodha-grey">
              <label className="block font-jost font-semibold mb-1 text-lodha-grey">
                Mark as twin of
              </label>
              <select
                value=""
                onChange={async (e) => {
                  const nextValue = e.target.value;
                  if (!nextValue) return;
                  const confirmed = await onConfirm({
                    title: 'Convert to Twin Floor',
                    message: `Make "${floor.floorName}" a twin of "${nextValue}"? Existing floor data will be cleared.`,
                    variant: 'warning',
                    confirmLabel: 'Convert'
                  });
                  if (!confirmed) return;
                  onUpdateFloor(buildingId, floor.id, {
                    twinOfFloorName: nextValue,
                    flats: [],
                    typicalLobbyArea: null
                  });
                }}
                className="w-full max-w-xs px-2 py-1 border border-lodha-grey rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
              >
                <option value="">Select parent floor...</option>
                {availableTwinTargets.map(option => (
                  <option key={option.id} value={option.floorName}>
                    {option.floorName}
                  </option>
                ))}
              </select>
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
                    : 'bg-lodha-steel/20 text-lodha-grey/50 cursor-not-allowed'
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

      {twinFloors.length > 0 && (
        <div className="mb-3 border border-lodha-gold/30 rounded-lg p-3 bg-lodha-sand/10">
          <h5 className="text-xs font-jost font-semibold mb-2 text-lodha-gold">Twin Floor Management</h5>
          <div className="space-y-2">
            {twinFloors.map(twin => (
              <div key={twin.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 text-xs font-jost text-lodha-black">{twin.floorName}</div>
                <div className="w-full sm:w-56">
                  <select
                    value={twin.twinOfFloorName || 'independent'}
                    onChange={e => {
                      const nextValue = e.target.value;
                      if (nextValue === 'independent') {
                        onUpdateFloor(buildingId, twin.id, { twinOfFloorName: null });
                      } else {
                        onUpdateFloor(buildingId, twin.id, { twinOfFloorName: nextValue });
                      }
                    }}
                    className="w-full px-2 py-1 border border-lodha-grey rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
                  >
                    <option value="independent">Independent floor</option>
                    {parentFloorOptions.map(option => (
                      <option key={option.id} value={option.floorName}>
                        Twin of {option.floorName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        className="flex-1 px-2 py-1 border border-lodha-steel rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
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
          className="w-20 px-2 py-1 border border-lodha-steel rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
        />
        <span className="text-xs text-lodha-grey">sqm</span>
      </div>

      <div className="flex flex-col">
        <input
          type="number"
          value={flat.count}
          onChange={e => onUpdate(buildingId, floorId, flatId, { count: e.target.value })}
          placeholder="Count"
          className="w-16 px-2 py-1 border border-lodha-steel rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
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
function ProjectPreview({ data, siteAreas = [] }) {
  const getFloorHeightValue = (floor) => {
    const rawHeight = floor.floorHeight ?? floor.floor_height;
    const parsed = parseFloat(rawHeight);
    return Number.isNaN(parsed) || parsed <= 0 ? 3.5 : parsed;
  };

  const getBuildingHeight = (building) => (
    building.floors.reduce((sum, floor) => sum + getFloorHeightValue(floor), 0)
  );

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
          <p>Site Areas: {siteAreas.length}</p>
          
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
              {b.societyName && (
                <p className="text-lodha-grey">Society: {b.societyName}</p>
              )}
              <p className="text-lodha-grey">Floors: {b.floors.length}</p>
              <p className="text-lodha-grey">Height: {getBuildingHeight(b).toFixed(1)} m</p>
            </div>
          ))}
        </div>
      </div>

      {siteAreas.length > 0 && (
        <div className="border-t border-lodha-grey pt-3">
          <p className="font-jost font-semibold text-lodha-black mb-2">Site Areas:</p>
          <div className="space-y-2">
            {siteAreas.map((area, idx) => (
              <div key={area.id} className="bg-lodha-sand p-2 rounded text-xs">
                <p className="font-semibold">{area.name || `Site Area ${idx + 1}`}</p>
                <p className="text-lodha-grey capitalize">{area.area_type}</p>
                {area.area_sqm && (
                  <p className="text-lodha-grey">Area: {area.area_sqm} sqm</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
