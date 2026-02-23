import { Wind, Fan, Gauge, Activity } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const ACH_SPACE_TYPES = [
  'Basement Parking', 'Kitchen Commercial', 'Toilet/Washroom', 'Electrical Room',
  'Server Room', 'Generator Room', 'Pump Room', 'Garbage Room', 'Workshop',
  'Laboratory', 'Swimming Pool', 'Gymnasium', 'Restaurant Dining', 'Conference Room',
  'Office General', 'Hospital Ward', 'Operating Theatre',
];

const defaultParams = {
  spaces: [
    { name: 'B1 Parking', type: 'Basement Parking', length: 60, width: 40, height: 3.0, numberOfLevels: 1 },
    { name: 'B2 Parking', type: 'Basement Parking', length: 60, width: 40, height: 3.0, numberOfLevels: 1 },
  ],
  pressurizationZones: [
    { name: 'Staircase 1', type: 'STAIRCASE', height: 45, levels: 15, doorArea: 2.0 },
    { name: 'Lift Lobby', type: 'LIFT_LOBBY', height: 45, levels: 15, doorArea: 1.8 },
  ],
  smokeExtraction: {
    required: true,
    atrium: false,
    atriumHeight: 0,
    atriumArea: 0,
  },
  coSensorDesign: true,
};

function renderInputs(params, onChange) {
  const updateSpace = (idx, space) => { const s = [...params.spaces]; s[idx] = space; onChange('spaces', s); };
  const updateZone = (idx, zone) => { const z = [...params.pressurizationZones]; z[idx] = zone; onChange('pressurizationZones', z); };
  const addSpace = () => onChange('spaces', [...params.spaces, { name: `Space ${params.spaces.length+1}`, type: 'Office General', length: 10, width: 8, height: 3.0, numberOfLevels: 1 }]);
  const addZone = () => onChange('pressurizationZones', [...params.pressurizationZones, { name: `Zone ${params.pressurizationZones.length+1}`, type: 'STAIRCASE', height: 30, levels: 10, doorArea: 2.0 }]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Ventilation Spaces</h3>
          <button onClick={addSpace} className="btn-secondary text-sm px-3 py-1">+ Add Space</button>
        </div>
        {params.spaces.map((sp, i) => (
          <div key={i} className="border border-lodha-sand rounded-lg p-4 mb-3 bg-lodha-sand/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">{sp.name}</span>
              <button onClick={() => onChange('spaces', params.spaces.filter((_,j) => j !== i))} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <CalcField label="Name" value={sp.name} onChange={v => updateSpace(i, {...sp, name:v})} />
              <CalcField label="Type" value={sp.type} onChange={v => updateSpace(i, {...sp, type:v})} options={ACH_SPACE_TYPES.map(t=>({value:t,label:t}))} />
              <CalcField label="Length" value={sp.length} onChange={v => updateSpace(i, {...sp, length:v})} type="number" unit="m" />
              <CalcField label="Width" value={sp.width} onChange={v => updateSpace(i, {...sp, width:v})} type="number" unit="m" />
              <CalcField label="Height" value={sp.height} onChange={v => updateSpace(i, {...sp, height:v})} type="number" unit="m" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Pressurization Zones</h3>
          <button onClick={addZone} className="btn-secondary text-sm px-3 py-1">+ Add Zone</button>
        </div>
        {params.pressurizationZones.map((zone, i) => (
          <div key={i} className="border border-lodha-sand rounded-lg p-4 mb-3 bg-blue-50/50">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">{zone.name}</span>
              <button onClick={() => onChange('pressurizationZones', params.pressurizationZones.filter((_,j) => j !== i))} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CalcField label="Name" value={zone.name} onChange={v => updateZone(i, {...zone, name:v})} />
              <CalcField label="Type" value={zone.type} onChange={v => updateZone(i, {...zone, type:v})}
                options={[{value:'STAIRCASE',label:'Staircase'},{value:'LIFT_LOBBY',label:'Lift Lobby'},{value:'LIFT_SHAFT',label:'Lift Shaft'}]} />
              <CalcField label="Height" value={zone.height} onChange={v => updateZone(i, {...zone, height:v})} type="number" unit="m" />
              <CalcField label="Door Area" value={zone.doorArea} onChange={v => updateZone(i, {...zone, doorArea:v})} type="number" unit="m²" />
            </div>
          </div>
        ))}
      </div>
      <CalcFieldGroup label="Smoke & CO">
        <CalcField label="Smoke Extraction" value={params.smokeExtraction?.required ? 'true' : 'false'}
          onChange={v => onChange('smokeExtraction', { ...params.smokeExtraction, required: v === 'true' })}
          options={[{value:'true',label:'Required'},{value:'false',label:'Not Required'}]} />
        <CalcField label="CO Sensor Design" value={params.coSensorDesign ? 'true' : 'false'}
          onChange={v => onChange('coSensorDesign', v === 'true')}
          options={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  const ventSpaces = results.ventilationDesign?.spaces || [];
  const pressZones = results.pressurizationDesign?.zones || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Total Vent CFM" value={results.ventilationDesign?.totalCFM || 0} unit="CFM" icon={Wind} color="blue" />
        <ResultCard title="Press. Fans" value={results.pressurizationDesign?.totalFans || 0} icon={Fan} color="green" />
        <ResultCard title="Smoke CFM" value={results.smokeExtraction?.totalCFM || 0} unit="CFM" icon={Activity} color="red" />
        <ResultCard title="CO Sensors" value={results.coSensorLayout?.totalSensors || 0} icon={Gauge} color="orange" />
      </div>

      {ventSpaces.length > 0 && (
        <ResultTable
          title="Ventilation Design"
          headers={['Space', 'Volume (m³)', 'ACH', 'CFM Required', 'Fan Type', 'Fan Model', 'Duct Size']}
          rows={ventSpaces.map(s => [s.name, s.volume, s.ach, s.cfm, s.fanType || '-', s.fanModel || '-', s.ductSize || '-'])}
        />
      )}

      {pressZones.length > 0 && (
        <ResultTable
          title="Pressurization Design"
          headers={['Zone', 'Type', 'Pressure (Pa)', 'Air Flow (m³/s)', 'Fan CFM', 'Power (kW)']}
          rows={pressZones.map(z => [z.name, z.type, z.pressurePa, z.airFlowM3s, z.fanCFM, z.fanPowerKW])}
        />
      )}

      {results.coSensorLayout?.sensors && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">CO Sensor Layout</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Total Sensors:</span> <strong>{results.coSensorLayout.totalSensors}</strong></div>
            <div><span className="text-lodha-grey/60">Coverage:</span> <strong>{results.coSensorLayout.coverageArea || '-'} m² each</strong></div>
            <div><span className="text-lodha-grey/60">Trip Level:</span> <strong>{results.coSensorLayout.tripLevelPPM || 50} ppm</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VentilationPressurisation() {
  return (
    <MepCalculatorShell
      calculationType="ventilation"
      title="Ventilation & Pressurisation"
      icon={Wind}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
