import { Flame, Droplets, Gauge, Zap } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const HEIGHT_CATEGORIES = [
  { value: 'UP_TO_15M', label: 'Up to 15m' },
  { value: '15M_TO_24M', label: '15m to 24m' },
  { value: '24M_TO_45M', label: '24m to 45m' },
  { value: '45M_TO_60M', label: '45m to 60m' },
  { value: 'ABOVE_60M', label: 'Above 60m' },
];

const defaultParams = {
  buildingType: 'COMMERCIAL',
  heightCategory: '24M_TO_45M',
  buildingHeight: 45,
  numberOfFloors: 15,
  floorArea: 500,
  hasSprinkler: true,
  sprinklerHazardClass: 'LIGHT',
  pipeMaterial: 'MS ERW IS 1239',
  pipeLength: 100,
  numberOfBends: 10,
};

function renderInputs(params, onChange) {
  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Building Parameters">
        <CalcField label="Building Type" value={params.buildingType} onChange={v => onChange('buildingType', v)}
          options={[{value:'RESIDENTIAL',label:'Residential'},{value:'COMMERCIAL',label:'Commercial'}]} />
        <CalcField label="Height Category" value={params.heightCategory} onChange={v => onChange('heightCategory', v)}
          options={HEIGHT_CATEGORIES} />
        <CalcField label="Building Height" value={params.buildingHeight} onChange={v => onChange('buildingHeight', v)} type="number" unit="m" />
        <CalcField label="Number of Floors" value={params.numberOfFloors} onChange={v => onChange('numberOfFloors', v)} type="number" />
        <CalcField label="Floor Area" value={params.floorArea} onChange={v => onChange('floorArea', v)} type="number" unit="m²" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Sprinkler System">
        <CalcField label="Has Sprinkler" value={params.hasSprinkler ? 'true' : 'false'}
          onChange={v => onChange('hasSprinkler', v === 'true')}
          options={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
        <CalcField label="Hazard Class" value={params.sprinklerHazardClass} onChange={v => onChange('sprinklerHazardClass', v)}
          options={[{value:'LIGHT',label:'Light'},{value:'ORDINARY_1',label:'Ordinary Group 1'},{value:'ORDINARY_2',label:'Ordinary Group 2'},{value:'HIGH',label:'High Hazard'}]} />
      </CalcFieldGroup>
      <CalcFieldGroup label="Piping">
        <CalcField label="Pipe Material" value={params.pipeMaterial} onChange={v => onChange('pipeMaterial', v)}
          options={['MS ERW IS 1239','GI','CI Flanged','SS 304','HDPE'].map(m=>({value:m,label:m}))} />
        <CalcField label="Pipe Length" value={params.pipeLength} onChange={v => onChange('pipeLength', v)} type="number" unit="m" />
        <CalcField label="Number of Bends" value={params.numberOfBends} onChange={v => onChange('numberOfBends', v)} type="number" />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Hydrant Flow" value={results.hydrantSystem?.pumpFlowM3h || 0} unit="m³/h" icon={Droplets} color="blue" />
        <ResultCard title="Pump Head" value={results.hydrantSystem?.pumpHeadM || 0} unit="m" icon={Gauge} color="green" />
        <ResultCard title="Pump Power" value={results.hydrantSystem?.pumpPowerKW || 0} unit="kW" icon={Zap} color="orange" />
        <ResultCard title="Tank Size" value={results.tankSizing?.totalCapacityLitres || 0} unit="L" icon={Droplets} color="purple" />
      </div>

      {results.nbcRequirements && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">NBC 2016 Requirements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {Object.entries(results.nbcRequirements).map(([k, v]) => (
              <div key={k}><span className="text-lodha-grey/60">{k.replace(/([A-Z])/g, ' $1')}:</span> <strong>{typeof v === 'boolean' ? (v ? '✓ Required' : '✗ Not Required') : v}</strong></div>
            ))}
          </div>
        </div>
      )}

      {results.sprinklerSystem && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Sprinkler System</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Design Density:</span> <strong>{results.sprinklerSystem.designDensity}</strong></div>
            <div><span className="text-lodha-grey/60">Operating Area:</span> <strong>{results.sprinklerSystem.operatingArea}</strong></div>
            <div><span className="text-lodha-grey/60">Flow:</span> <strong>{results.sprinklerSystem.flowLPS} l/s</strong></div>
            <div><span className="text-lodha-grey/60">Pump Power:</span> <strong>{results.sprinklerSystem.pumpPowerKW} kW</strong></div>
          </div>
        </div>
      )}

      {results.jockeyPump && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Jockey & Diesel Pumps</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Jockey Flow:</span> <strong>{results.jockeyPump?.flowM3h} m³/h</strong></div>
            <div><span className="text-lodha-grey/60">Jockey Power:</span> <strong>{results.jockeyPump?.motorKW} kW</strong></div>
            <div><span className="text-lodha-grey/60">Diesel Power:</span> <strong>{results.dieselPump?.engineHP} HP</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FirePumpCalculation() {
  return (
    <MepCalculatorShell
      calculationType="fire_pump"
      title="Fire Pump Calculation"
      icon={Flame}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
