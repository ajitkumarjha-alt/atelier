import { Wind, Thermometer, Snowflake, Building2, Zap } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const SPACE_TYPES = [
  'Office', 'Conference Room', 'Lobby', 'Retail', 'Restaurant',
  'Hotel Room', 'Hospital Ward', 'Server Room', 'Auditorium',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Pune', 'Ahmedabad', 'Kolkata', 'DEFAULT',
];

const SEASONS = ['Summer', 'Monsoon', 'Winter'];

const defaultParams = {
  buildingName: '',
  city: 'Mumbai',
  season: 'Summer',
  diversityFactor: 0.85,
  rooms: [
    {
      name: 'Typical Office Floor',
      spaceType: 'Office',
      length: 30,
      width: 15,
      height: 3.6,
      wallArea: 0,
      glassPercentage: 40,
      roofExposed: false,
      occupants: 50,
      orientation: 'WEST',
    },
  ],
};

function RoomRow({ room, index, onChange, onRemove }) {
  const update = (key, val) => onChange(index, { ...room, [key]: val });
  return (
    <div className="border border-lodha-sand rounded-lg p-4 mb-3 bg-lodha-sand/10">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-lodha-grey">Room {index + 1}: {room.name || '(unnamed)'}</span>
        <button onClick={() => onRemove(index)} className="text-xs text-red-500 hover:underline">Remove</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <CalcField label="Name" value={room.name} onChange={v => update('name', v)} />
        <CalcField label="Type" value={room.spaceType} onChange={v => update('spaceType', v)}
          options={SPACE_TYPES.map(s => ({ value: s, label: s }))} />
        <CalcField label="Length" value={room.length} onChange={v => update('length', v)} type="number" unit="m" />
        <CalcField label="Width" value={room.width} onChange={v => update('width', v)} type="number" unit="m" />
        <CalcField label="Height" value={room.height} onChange={v => update('height', v)} type="number" unit="m" />
        <CalcField label="Glass %" value={room.glassPercentage} onChange={v => update('glassPercentage', v)} type="number" unit="%" />
        <CalcField label="Occupants" value={room.occupants} onChange={v => update('occupants', v)} type="number" />
        <CalcField label="Orientation" value={room.orientation}
          onChange={v => update('orientation', v)}
          options={['NORTH','SOUTH','EAST','WEST','NE','NW','SE','SW','ROOF'].map(d=>({value:d,label:d}))} />
      </div>
    </div>
  );
}

function renderInputs(params, onChange) {
  const updateRoom = (idx, room) => {
    const rooms = [...params.rooms];
    rooms[idx] = room;
    onChange('rooms', rooms);
  };
  const removeRoom = (idx) => {
    const rooms = params.rooms.filter((_, i) => i !== idx);
    onChange('rooms', rooms);
  };
  const addRoom = () => {
    onChange('rooms', [...params.rooms, { ...defaultParams.rooms[0], name: `Room ${params.rooms.length + 1}` }]);
  };

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Building Parameters">
        <CalcField label="Building Name" value={params.buildingName} onChange={v => onChange('buildingName', v)} />
        <CalcField label="City" value={params.city} onChange={v => onChange('city', v)}
          options={CITIES.map(c => ({ value: c, label: c }))} />
        <CalcField label="Season" value={params.season} onChange={v => onChange('season', v)}
          options={SEASONS.map(s => ({ value: s, label: s }))} />
        <CalcField label="Diversity Factor" value={params.diversityFactor}
          onChange={v => onChange('diversityFactor', v)} type="number" helpText="0.7 – 1.0" />
      </CalcFieldGroup>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Rooms / Zones</h3>
          <button onClick={addRoom} className="btn-secondary text-sm px-3 py-1">+ Add Room</button>
        </div>
        {params.rooms.map((room, i) => (
          <RoomRow key={i} room={room} index={i} onChange={updateRoom} onRemove={removeRoom} />
        ))}
      </div>
    </div>
  );
}

function renderResults(results) {
  const summary = results.summary || {};
  const rooms = results.roomResults || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Total Cooling" value={summary.totalCoolingTR || 0} unit="TR" icon={Snowflake} color="blue" />
        <ResultCard title="Chiller Capacity" value={summary.chillerCapacityTR || 0} unit="TR" icon={Thermometer} color="green" />
        <ResultCard title="Total AHU CFM" value={summary.totalAHU_CFM || 0} unit="CFM" icon={Wind} color="orange" />
        <ResultCard title="Total Power" value={summary.totalPowerKW || 0} unit="kW" icon={Zap} color="purple" />
      </div>

      {rooms.length > 0 && (
        <ResultTable
          title="Room-wise Cooling Loads"
          headers={['Room', 'Area (m²)', 'Wall (W)', 'Glass (W)', 'Roof (W)', 'People (W)', 'Lighting (W)', 'Equip (W)', 'Ventilation (W)', 'Total (W)', 'TR']}
          rows={rooms.map(r => [
            r.name,
            r.area,
            r.heatGains?.wallTransmission || 0,
            r.heatGains?.glassSolarAndTransmission || 0,
            r.heatGains?.roofHeatGain || 0,
            r.heatGains?.peopleSensible || 0,
            r.heatGains?.lightingHeatGain || 0,
            r.heatGains?.equipmentHeatGain || 0,
            r.heatGains?.ventilationLoad || 0,
            Math.round(r.totalCoolingLoadW || 0),
            (r.coolingLoadTR || 0).toFixed(1),
          ])}
        />
      )}

      {results.chillerSizing && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-4">Chiller Plant Sizing</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-lodha-grey/60">Configuration:</span> <strong>{results.chillerSizing.configuration}</strong></div>
            <div><span className="text-lodha-grey/60">Each Chiller:</span> <strong>{results.chillerSizing.eachChillerTR} TR</strong></div>
            <div><span className="text-lodha-grey/60">COP:</span> <strong>{results.chillerSizing.estimatedCOP}</strong></div>
            <div><span className="text-lodha-grey/60">Chiller Power:</span> <strong>{results.chillerSizing.chillerPowerKW} kW</strong></div>
            <div><span className="text-lodha-grey/60">CHW Pump:</span> <strong>{results.chillerSizing.chwPumpKW} kW</strong></div>
            <div><span className="text-lodha-grey/60">CDW Pump:</span> <strong>{results.chillerSizing.cdwPumpKW} kW</strong></div>
          </div>
        </div>
      )}

      {results.coolingTower && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-4">Cooling Tower</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-lodha-grey/60">Capacity:</span> <strong>{results.coolingTower.capacityTR} TR</strong></div>
            <div><span className="text-lodha-grey/60">Flow:</span> <strong>{results.coolingTower.flowM3h} m³/h</strong></div>
            <div><span className="text-lodha-grey/60">Fan Power:</span> <strong>{results.coolingTower.fanPowerKW} kW</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HVACLoadCalculation() {
  return (
    <MepCalculatorShell
      calculationType="hvac_load"
      title="HVAC Load Calculation"
      icon={Wind}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
