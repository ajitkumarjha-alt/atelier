import { Wrench, Droplets, Gauge, ThermometerSun } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const FIXTURE_TYPES = [
  'Water Closet (Flush Valve)', 'Water Closet (Flush Tank)', 'Urinal (Flush Valve)',
  'Urinal (Flush Tank)', 'Lavatory', 'Bathtub', 'Shower Head', 'Kitchen Sink',
  'Washing Machine', 'Dishwasher', 'Floor Drain', 'Drinking Fountain',
];

const defaultParams = {
  projectType: 'RESIDENTIAL',
  numberOfFloors: 15,
  fixtures: [
    { type: 'Water Closet (Flush Tank)', count: 120, hotWater: false },
    { type: 'Lavatory', count: 120, hotWater: true },
    { type: 'Shower Head', count: 60, hotWater: true },
    { type: 'Kitchen Sink', count: 60, hotWater: true },
  ],
  hotWaterSource: 'SOLAR_ELECTRIC',
  hotWaterTempC: 60,
  coldWaterTempC: 25,
  storageHours: 2,
};

function renderInputs(params, onChange) {
  const updateFixture = (idx, fix) => { const f = [...params.fixtures]; f[idx] = fix; onChange('fixtures', f); };
  const removeFixture = idx => onChange('fixtures', params.fixtures.filter((_, i) => i !== idx));
  const addFixture = () => onChange('fixtures', [...params.fixtures, { type: 'Lavatory', count: 10, hotWater: false }]);

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Project">
        <CalcField label="Project Type" value={params.projectType} onChange={v => onChange('projectType', v)}
          options={[{value:'RESIDENTIAL',label:'Residential'},{value:'COMMERCIAL',label:'Commercial'},{value:'HOSPITAL',label:'Hospital'},{value:'HOTEL',label:'Hotel'}]} />
        <CalcField label="Number of Floors" value={params.numberOfFloors} onChange={v => onChange('numberOfFloors', v)} type="number" />
      </CalcFieldGroup>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Fixtures</h3>
          <button onClick={addFixture} className="btn-secondary text-sm px-3 py-1">+ Add Fixture</button>
        </div>
        {params.fixtures.map((fix, i) => (
          <div key={i} className="border border-lodha-sand rounded-lg p-4 mb-3 bg-lodha-sand/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">{fix.type}</span>
              <button onClick={() => removeFixture(i)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CalcField label="Type" value={fix.type} onChange={v => updateFixture(i, {...fix, type:v})} options={FIXTURE_TYPES.map(t=>({value:t,label:t}))} />
              <CalcField label="Count" value={fix.count} onChange={v => updateFixture(i, {...fix, count:v})} type="number" />
              <CalcField label="Hot Water" value={fix.hotWater ? 'true' : 'false'} onChange={v => updateFixture(i, {...fix, hotWater: v==='true'})}
                options={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
            </div>
          </div>
        ))}
      </div>
      <CalcFieldGroup label="Hot Water System">
        <CalcField label="Source" value={params.hotWaterSource} onChange={v => onChange('hotWaterSource', v)}
          options={[{value:'SOLAR_ELECTRIC',label:'Solar + Electric'},{value:'HEAT_PUMP',label:'Heat Pump'},{value:'BOILER',label:'Boiler'},{value:'ELECTRIC',label:'Electric Only'}]} />
        <CalcField label="Hot Water Temp" value={params.hotWaterTempC} onChange={v => onChange('hotWaterTempC', v)} type="number" unit="°C" />
        <CalcField label="Storage Hours" value={params.storageHours} onChange={v => onChange('storageHours', v)} type="number" unit="hrs" />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  const cold = results.coldWaterSystem || {};
  const hot = results.hotWaterSystem || {};
  const fixtures = results.fixtureDetails || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Total FU" value={cold.totalFixtureUnits || 0} icon={Wrench} color="blue" />
        <ResultCard title="Peak Flow" value={cold.peakDemandLPS || 0} unit="l/s" icon={Droplets} color="green" />
        <ResultCard title="Main Pipe" value={cold.mainPipeDia || '-'} unit="mm" icon={Gauge} color="orange" />
        <ResultCard title="Hot Water" value={hot.storageLitres || 0} unit="L" icon={ThermometerSun} color="red" />
      </div>
      {fixtures.length > 0 && (
        <ResultTable
          title="Fixture Unit Summary"
          headers={['Fixture', 'Count', 'FU Each', 'Total FU', 'Min Pipe']}
          rows={fixtures.map(f => [f.type, f.count, f.fixtureUnits, f.totalFU, f.minPipeSize || '-'])}
        />
      )}
      {cold.riserPipes && cold.riserPipes.length > 0 && (
        <ResultTable
          title="Cold Water Riser Sizing"
          headers={['Riser', 'Floors Served', 'FU', 'Flow (l/s)', 'Pipe Dia (mm)', 'Velocity (m/s)']}
          rows={cold.riserPipes.map(r => [r.name, r.floorsServed, r.fixtureUnits, r.flowLPS, r.pipeDia, r.velocity])}
        />
      )}
      {hot.solarCollector && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Hot Water System</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Daily Demand:</span> <strong>{hot.dailyDemandLitres} L</strong></div>
            <div><span className="text-lodha-grey/60">Storage:</span> <strong>{hot.storageLitres} L</strong></div>
            <div><span className="text-lodha-grey/60">Solar Area:</span> <strong>{hot.solarCollector?.areaSqM || '-'} m²</strong></div>
            <div><span className="text-lodha-grey/60">Backup kW:</span> <strong>{hot.backupHeaterKW || '-'} kW</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlumbingFixtureCalculation() {
  return (
    <MepCalculatorShell
      calculationType="plumbing_fixture"
      title="Plumbing Fixture Calculation"
      icon={Wrench}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
