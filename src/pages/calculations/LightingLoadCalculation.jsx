import { Lightbulb, Sun, Zap, BarChart3 } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const SPACE_TYPES = [
  'Office General', 'Office Executive', 'Conference Room', 'Reception/Lobby',
  'Corridor', 'Staircase', 'Toilet', 'Parking', 'Retail', 'Classroom',
  'Hospital Ward', 'Operating Theatre', 'Laboratory', 'Kitchen', 'Restaurant',
];

const defaultParams = {
  buildingType: 'Office',
  rooms: [
    { name: 'Open Office', spaceType: 'Office General', length: 20, width: 12, height: 3.0, ceilingColor: 'White', wallColor: 'Light', floorColor: 'Medium' },
  ],
};

function renderInputs(params, onChange) {
  const updateRoom = (idx, room) => { const r = [...params.rooms]; r[idx] = room; onChange('rooms', r); };
  const removeRoom = idx => onChange('rooms', params.rooms.filter((_, i) => i !== idx));
  const addRoom = () => onChange('rooms', [...params.rooms, { name: `Room ${params.rooms.length+1}`, spaceType: 'Office General', length: 10, width: 8, height: 3.0, ceilingColor: 'White', wallColor: 'Light', floorColor: 'Medium' }]);

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Building">
        <CalcField label="Building Type" value={params.buildingType} onChange={v => onChange('buildingType', v)}
          options={['Office','Retail','Hospital','School','Hotel','Industrial','Residential'].map(t=>({value:t,label:t}))} />
      </CalcFieldGroup>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Rooms</h3>
          <button onClick={addRoom} className="btn-secondary text-sm px-3 py-1">+ Add Room</button>
        </div>
        {params.rooms.map((room, i) => (
          <div key={i} className="border border-lodha-sand rounded-lg p-4 mb-3 bg-lodha-sand/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">{room.name || `Room ${i+1}`}</span>
              <button onClick={() => removeRoom(i)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <CalcField label="Name" value={room.name} onChange={v => updateRoom(i, {...room, name:v})} />
              <CalcField label="Space Type" value={room.spaceType} onChange={v => updateRoom(i, {...room, spaceType:v})} options={SPACE_TYPES.map(s=>({value:s,label:s}))} />
              <CalcField label="Length" value={room.length} onChange={v => updateRoom(i, {...room, length:v})} type="number" unit="m" />
              <CalcField label="Width" value={room.width} onChange={v => updateRoom(i, {...room, width:v})} type="number" unit="m" />
              <CalcField label="Height" value={room.height} onChange={v => updateRoom(i, {...room, height:v})} type="number" unit="m" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderResults(results) {
  const rooms = results.rooms || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Total Luminaires" value={results.summary?.totalLuminaires || 0} icon={Lightbulb} color="blue" />
        <ResultCard title="Total Wattage" value={results.summary?.totalWattage || 0} unit="W" icon={Zap} color="green" />
        <ResultCard title="Avg LPD" value={results.summary?.avgLPD || 0} unit="W/m²" icon={BarChart3} color="orange" />
        <ResultCard title="ECBC Compliant" value={results.summary?.ecbcCompliant ? 'Yes' : 'No'} icon={Sun} color={results.summary?.ecbcCompliant ? 'green' : 'red'} />
      </div>
      {rooms.length > 0 && (
        <ResultTable
          title="Room-wise Lighting Design"
          headers={['Room', 'Area (m²)', 'Lux Required', 'Luminaire Type', 'Count', 'Layout', 'LPD (W/m²)', 'ECBC Max', 'Status']}
          rows={rooms.map(r => [
            r.name, r.area, r.luxRequired, r.selectedLuminaire?.type || '-', r.numberOfLuminaires,
            r.gridLayout || '-', r.actualLPD, r.ecbcMaxLPD || '-', r.lpdCompliant ? '✓' : '⚠',
          ])}
        />
      )}
    </div>
  );
}

export default function LightingLoadCalculation() {
  return (
    <MepCalculatorShell
      calculationType="lighting_design"
      title="Lighting Design Calculation"
      icon={Lightbulb}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
