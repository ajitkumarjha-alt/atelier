import { TrendingDown, Zap, Gauge, Layers } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const defaultParams = {
  designType: 'DOWN_TAKE',
  systemVoltage: 415,
  numberOfFloors: 20,
  floorHeight: 3.2,
  totalBuildingLoadKVA: 2000,
  busbarMaterial: 'COPPER',
  conductorType: 'BUSBAR',
  maxVoltageDrop: 2.5,
  installationMethod: 'VERTICAL_BUS_DUCT',
  floorLoads: [],
};

function renderInputs(params, onChange) {
  const generateFloorLoads = () => {
    const loads = Array.from({ length: params.numberOfFloors }, (_, i) => ({
      floor: i + 1,
      loadKVA: i === 0 ? 200 : 100,
      powerFactor: 0.85,
      description: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
    }));
    onChange('floorLoads', loads);
  };

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="System Parameters">
        <CalcField label="Design Type" value={params.designType} onChange={v => onChange('designType', v)}
          options={[{value:'DOWN_TAKE',label:'Down Take'}]} />
        <CalcField label="System Voltage" value={params.systemVoltage} onChange={v => onChange('systemVoltage', v)} type="number" unit="V" />
        <CalcField label="Number of Floors" value={params.numberOfFloors} onChange={v => onChange('numberOfFloors', v)} type="number" />
        <CalcField label="Floor Height" value={params.floorHeight} onChange={v => onChange('floorHeight', v)} type="number" unit="m" />
        <CalcField label="Total Building Load" value={params.totalBuildingLoadKVA} onChange={v => onChange('totalBuildingLoadKVA', v)} type="number" unit="kVA" />
        <CalcField label="Max Voltage Drop" value={params.maxVoltageDrop} onChange={v => onChange('maxVoltageDrop', v)} type="number" unit="%" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Conductor">
        <CalcField label="Material" value={params.busbarMaterial} onChange={v => onChange('busbarMaterial', v)}
          options={[{value:'COPPER',label:'Copper'},{value:'ALUMINIUM',label:'Aluminium'}]} />
        <CalcField label="Type" value={params.conductorType} onChange={v => onChange('conductorType', v)}
          options={[{value:'BUSBAR',label:'Busbar (Bus Duct)'},{value:'CABLE',label:'Cable'}]} />
      </CalcFieldGroup>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Floor Loads</h3>
          <button onClick={generateFloorLoads} className="btn-secondary text-sm px-3 py-1">Auto-Generate</button>
        </div>
        {params.floorLoads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {params.floorLoads.map((fl, i) => (
              <div key={i} className="border border-lodha-sand rounded-lg p-3 bg-lodha-sand/10">
                <div className="text-sm font-semibold mb-2">{fl.description}</div>
                <div className="grid grid-cols-2 gap-2">
                  <CalcField label="Load" value={fl.loadKVA} onChange={v => {
                    const loads = [...params.floorLoads]; loads[i] = {...fl, loadKVA: v}; onChange('floorLoads', loads);
                  }} type="number" unit="kVA" />
                  <CalcField label="PF" value={fl.powerFactor} onChange={v => {
                    const loads = [...params.floorLoads]; loads[i] = {...fl, powerFactor: v}; onChange('floorLoads', loads);
                  }} type="number" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-lodha-grey/60 italic">Click Auto-Generate to populate floor loads</p>
        )}
      </div>
    </div>
  );
}

function renderResults(results) {
  const floors = results.floorResults || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Busbar Rating" value={results.selectedBusbar?.ratingA || '-'} unit="A" icon={TrendingDown} color="blue" />
        <ResultCard title="Total Current" value={results.totalDiversifiedCurrentA || 0} unit="A" icon={Zap} color="green" />
        <ResultCard title="Max VD" value={results.maxVoltageDropPercent || 0} unit="%" icon={Gauge} color={results.voltageDropCompliant ? 'green' : 'red'} />
        <ResultCard title="Sections" value={results.numberOfSections || 0} icon={Layers} color="orange" />
      </div>
      {results.selectedBusbar && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Selected Down Take Conductor</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Type:</span> <strong>{results.selectedBusbar.type || results.conductorType}</strong></div>
            <div><span className="text-lodha-grey/60">Size:</span> <strong>{results.selectedBusbar.size || results.selectedBusbar.ratingA + 'A'}</strong></div>
            <div><span className="text-lodha-grey/60">Material:</span> <strong>{results.busbarMaterial}</strong></div>
            <div><span className="text-lodha-grey/60">VD Compliant:</span> <strong>{results.voltageDropCompliant ? '✓ Yes' : '⚠ No'}</strong></div>
          </div>
        </div>
      )}
      {floors.length > 0 && (
        <ResultTable
          title="Floor-wise Down Take Analysis"
          headers={['Floor', 'Load (kVA)', 'Current (A)', 'Diversity', 'Diversified (A)', 'VD (%)', 'Cumulative VD (%)']}
          rows={floors.map(f => [f.floor, f.loadKVA, f.currentA, f.diversityFactor, f.diversifiedCurrentA, f.voltageDropPercent, f.cumulativeVDPercent])}
        />
      )}
    </div>
  );
}

export default function DownTakeDesign() {
  return (
    <MepCalculatorShell
      calculationType="rising_main"
      title="Down Take Design"
      icon={TrendingDown}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
