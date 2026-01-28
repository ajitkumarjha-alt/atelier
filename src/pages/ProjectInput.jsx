import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Plus, Trash2, Edit2, MapPin, Copy } from 'lucide-react';

export default function ProjectInput() {
  const { projectId } = useParams();
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

    fetchStandards();

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

  // Auto-save handler
  const autoSaveField = useCallback(async (field, value) => {
    try {
      const url = isEditing ? `/api/projects/${projectId}` : '/api/projects';
      const method = isEditing ? 'PATCH' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, [projectId, isEditing]);

  const handleProjectFieldChange = (field, value) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
    autoSaveField(field, value);
  };

  const addBuilding = () => {
    const newBuilding = {
      id: Date.now(),
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
    const newFloor = {
      id: Date.now(),
      floorNumber: building.floors.length + 1,
      floorName: `Floor ${building.floors.length + 1}`,
      flats: [],
    };
    updateBuilding(buildingId, {
      floors: [...building.floors, newFloor],
    });
  };

  const addFlat = (buildingId, floorId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const floor = building.floors.find(f => f.id === floorId);
    const newFlat = {
      id: Date.now(),
      type: '',
      area: '',
      count: '',
    };
    const updatedFloors = building.floors.map(f =>
      f.id === floorId ? { ...f, flats: [...floor.flats, newFlat] } : f
    );
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const updateFlat = (buildingId, floorId, flatId, updates) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const updatedFloors = building.floors.map(f =>
      f.id === floorId
        ? {
            ...f,
            flats: f.flats.map(fl => (fl.id === flatId ? { ...fl, ...updates } : fl)),
          }
        : f
    );
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const deleteFlat = (buildingId, floorId, flatId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const updatedFloors = building.floors.map(f =>
      f.id === floorId
        ? { ...f, flats: f.flats.filter(fl => fl.id !== flatId) }
        : f
    );
    updateBuilding(buildingId, { floors: updatedFloors });
  };

  const copyFloorData = (buildingId, fromFloorId) => {
    const building = projectData.buildings.find(b => b.id === buildingId);
    const sourceFloor = building.floors.find(f => f.id === fromFloorId);
    
    const newFloor = {
      id: Date.now(),
      floorNumber: building.floors.length + 1,
      floorName: `Floor ${building.floors.length + 1}`,
      flats: sourceFloor.flats.map(f => ({ ...f, id: Date.now() })),
    };
    
    updateBuilding(buildingId, {
      floors: [...building.floors, newFloor],
    });
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
      const url = isEditing ? `/api/projects/${projectId}` : '/api/projects';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        alert(`Project ${isEditing ? 'updated' : 'created'} successfully!`);
        // Redirect to L1 dashboard or project list
      }
    } catch (err) {
      setError('Failed to save project');
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
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
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
                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Google Map iframe would go here</p>
                </div>
              )}
            </div>
          </div>

          {/* Buildings Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-secondary">Buildings</h2>
              <button
                onClick={addBuilding}
                className="flex items-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90"
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
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-lodha-gold text-white font-jost font-semibold rounded-lg hover:bg-lodha-gold/90"
            >
              {isEditing ? 'Update' : 'Create'} Project
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-300 text-gray-700 font-jost font-semibold rounded-lg hover:bg-gray-400"
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
}) {
  const isResidential = building.applicationType === 'Residential';
  const isVilla = building.applicationType === 'Villa';

  return (
    <div className="border border-lodha-grey rounded-lg p-4 bg-lodha-sand/30">
      <div className="flex justify-between items-start mb-4">
        <h3 className="heading-tertiary">Building {buildingIndex + 1}</h3>
        <button
          onClick={() => onDelete(building.id)}
          className="text-red-600 hover:text-red-700"
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
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
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
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
            className="flex items-center gap-1 px-3 py-1 text-sm bg-lodha-gold/20 text-lodha-gold rounded hover:bg-lodha-gold/30"
          >
            <Plus className="w-3 h-3" />
            Add Floor
          </button>
        </div>

        <div className="space-y-3">
          {building.floors.map((floor, floorIdx) => (
            <FloorSection
              key={floor.id}
              floor={floor}
              floorIndex={floorIdx}
              buildingId={building.id}
              allFloors={building.floors}
              standards={standards}
              onAddFlat={onAddFlat}
              onUpdateFlat={onUpdateFlat}
              onDeleteFlat={onDeleteFlat}
              onCopyFloor={onCopyFloor}
            />
          ))}
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
}) {
  return (
    <div className="border border-lodha-grey/50 rounded p-3 bg-white">
      <div className="flex justify-between items-center mb-3">
        <h5 className="font-jost font-semibold text-sm">{floor.floorName}</h5>
        {floorIndex > 0 && (
          <button
            onClick={() => onCopyFloor(buildingId, allFloors[floorIndex - 1].id)}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            <Copy className="w-3 h-3" />
            Copy prev
          </button>
        )}
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
}) {
  return (
    <div className="flex gap-2 items-center bg-gray-50 p-2 rounded text-sm">
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

      <input
        type="number"
        step="0.1"
        value={flat.area}
        onChange={e => onUpdate(buildingId, floorId, flatId, { area: e.target.value })}
        placeholder="Area"
        className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
      />

      <input
        type="number"
        value={flat.count}
        onChange={e => onUpdate(buildingId, floorId, flatId, { count: e.target.value })}
        placeholder="Count"
        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-lodha-gold"
      />

      <button
        onClick={() => onDelete(buildingId, floorId, flatId)}
        className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Project Preview Component
function ProjectPreview({ data }) {
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
          <p>
            Total Flats:{' '}
            {data.buildings.reduce(
              (sum, b) => sum + b.floors.reduce((fSum, f) => fSum + f.flats.length, 0),
              0
            )}
          </p>
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
