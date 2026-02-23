import { Shield, Droplets, Gauge, Flame } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const defaultParams = {
  buildingType: 'COMMERCIAL',
  buildingHeight: 45,
  numberOfFloors: 15,
  floorArea: 500,
  occupancyType: 'BUSINESS',
  hasBasement: true,
  basementLevels: 3,
  basementArea: 2000,
  systems: {
    wetRiser: true,
    dryRiser: false,
    sprinkler: true,
    hoseReel: true,
    internalHydrant: true,
    yardHydrant: true,
  },
  sprinklerHazardClass: 'LIGHT',
};

function renderInputs(params, onChange) {
  const toggleSystem = (sys) => {
    const systems = { ...params.systems, [sys]: !params.systems[sys] };
    onChange('systems', systems);
  };

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Building Parameters">
        <CalcField label="Building Type" value={params.buildingType} onChange={v => onChange('buildingType', v)}
          options={[{value:'RESIDENTIAL',label:'Residential'},{value:'COMMERCIAL',label:'Commercial'},{value:'HOSPITAL',label:'Hospital'},{value:'HOTEL',label:'Hotel'}]} />
        <CalcField label="Building Height" value={params.buildingHeight} onChange={v => onChange('buildingHeight', v)} type="number" unit="m" />
        <CalcField label="Floors" value={params.numberOfFloors} onChange={v => onChange('numberOfFloors', v)} type="number" />
        <CalcField label="Floor Area" value={params.floorArea} onChange={v => onChange('floorArea', v)} type="number" unit="m²" />
        <CalcField label="Occupancy" value={params.occupancyType} onChange={v => onChange('occupancyType', v)}
          options={['BUSINESS','MERCANTILE','ASSEMBLY','INSTITUTIONAL','STORAGE','INDUSTRIAL','RESIDENTIAL','EDUCATIONAL'].map(t=>({value:t,label:t}))} />
      </CalcFieldGroup>
      <CalcFieldGroup label="Basement">
        <CalcField label="Has Basement" value={params.hasBasement ? 'true' : 'false'}
          onChange={v => onChange('hasBasement', v === 'true')}
          options={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
        <CalcField label="Basement Levels" value={params.basementLevels} onChange={v => onChange('basementLevels', v)} type="number" />
        <CalcField label="Basement Area" value={params.basementArea} onChange={v => onChange('basementArea', v)} type="number" unit="m²" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Fire Systems">
        {Object.entries(params.systems).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <input type="checkbox" checked={val} onChange={() => toggleSystem(key)} className="rounded border-lodha-sand" />
            <label className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
          </div>
        ))}
      </CalcFieldGroup>
      <CalcFieldGroup label="Sprinkler">
        <CalcField label="Hazard Class" value={params.sprinklerHazardClass} onChange={v => onChange('sprinklerHazardClass', v)}
          options={[{value:'LIGHT',label:'Light Hazard'},{value:'ORDINARY_1',label:'Ordinary Group 1'},{value:'ORDINARY_2',label:'Ordinary Group 2'},{value:'HIGH',label:'High Hazard'}]} />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  const nbcReq = results.nbcRequirements || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Water Storage" value={results.waterStorage?.totalCapacityLitres || 0} unit="L" icon={Droplets} color="blue" />
        <ResultCard title="Hydrant Flow" value={results.wetRiser?.flowLPS || 0} unit="l/s" icon={Gauge} color="green" />
        <ResultCard title="Sprinkler Flow" value={results.sprinklerSystem?.flowLPS || 0} unit="l/s" icon={Droplets} color="orange" />
        <ResultCard title="Extinguishers" value={results.portableExtinguishers?.totalCount || 0} icon={Flame} color="red" />
      </div>

      {nbcReq && Object.keys(nbcReq).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">NBC 2016 Part 4 Requirements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {Object.entries(nbcReq).map(([k, v]) => (
              <div key={k}><span className="text-lodha-grey/60">{k.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                <strong>{typeof v === 'boolean' ? (v ? '✓ Required' : '✗') : v}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.wetRiser && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Wet Riser System</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Riser Pipe:</span> <strong>{results.wetRiser.riserPipeDia} mm</strong></div>
            <div><span className="text-lodha-grey/60">Outlets/Floor:</span> <strong>{results.wetRiser.outletsPerFloor}</strong></div>
            <div><span className="text-lodha-grey/60">Zone Valves:</span> <strong>{results.wetRiser.zoneValves || '-'}</strong></div>
          </div>
        </div>
      )}

      {results.sprinklerSystem && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Sprinkler System</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Density:</span> <strong>{results.sprinklerSystem.designDensity} mm/min/m²</strong></div>
            <div><span className="text-lodha-grey/60">Area:</span> <strong>{results.sprinklerSystem.operatingArea} m²</strong></div>
            <div><span className="text-lodha-grey/60">Heads:</span> <strong>{results.sprinklerSystem.totalHeads || '-'}</strong></div>
            <div><span className="text-lodha-grey/60">Flow:</span> <strong>{results.sprinklerSystem.flowLPS} l/s</strong></div>
          </div>
        </div>
      )}

      {results.portableExtinguishers?.schedule && (
        <ResultTable
          title="Portable Extinguisher Schedule"
          headers={['Type', 'Rating', 'Count', 'Location']}
          rows={results.portableExtinguishers.schedule.map(e => [e.type, e.rating, e.count, e.location || '-'])}
        />
      )}

      {results.waterStorage && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Water Storage</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Total Capacity:</span> <strong>{results.waterStorage.totalCapacityLitres} L</strong></div>
            <div><span className="text-lodha-grey/60">Underground:</span> <strong>{results.waterStorage.undergroundLitres || '-'} L</strong></div>
            <div><span className="text-lodha-grey/60">Overhead:</span> <strong>{results.waterStorage.overheadLitres || '-'} L</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FireFightingSystemDesign() {
  return (
    <MepCalculatorShell
      calculationType="fire_fighting"
      title="Fire Fighting System Design"
      icon={Shield}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
