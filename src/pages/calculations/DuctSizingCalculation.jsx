import { Wind, Ruler, Gauge, BarChart3 } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const DUCT_MATERIALS = [
  { value: 'GI', label: 'Galvanized Iron (GI)' },
  { value: 'ALUMINIUM', label: 'Aluminium' },
  { value: 'SS', label: 'Stainless Steel' },
  { value: 'FRP', label: 'FRP' },
  { value: 'PU_PANEL', label: 'PU Panel' },
];

const defaultParams = {
  ductMaterial: 'GI',
  method: 'EQUAL_FRICTION',
  maxVelocity: 8,
  frictionRate: 1.0,
  ductShape: 'RECTANGULAR',
  sections: [
    { name: 'Main Duct', airflowCFM: 5000, length: 20, fittings: ['ELBOW_90', 'TEE_BRANCH'] },
    { name: 'Branch 1', airflowCFM: 2000, length: 12, fittings: ['ELBOW_90', 'REDUCER'] },
    { name: 'Branch 2', airflowCFM: 1500, length: 10, fittings: ['ELBOW_90'] },
    { name: 'Branch 3', airflowCFM: 1500, length: 8, fittings: ['ELBOW_90'] },
  ],
};

const FITTING_OPTIONS = [
  'ELBOW_90', 'ELBOW_45', 'TEE_BRANCH', 'TEE_MAIN', 'REDUCER',
  'EXPANSION', 'DAMPER', 'DIFFUSER', 'GRILLE', 'FIRE_DAMPER',
  'FLEXIBLE_CONN', 'OFFSET', 'WYE_BRANCH', 'TRANSITION',
];

function renderInputs(params, onChange) {
  const updateSection = (idx, sec) => { const s = [...params.sections]; s[idx] = sec; onChange('sections', s); };
  const removeSection = idx => onChange('sections', params.sections.filter((_, i) => i !== idx));
  const addSection = () => onChange('sections', [...params.sections, { name: `Section ${params.sections.length+1}`, airflowCFM: 1000, length: 8, fittings: ['ELBOW_90'] }]);

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="System Parameters">
        <CalcField label="Duct Material" value={params.ductMaterial} onChange={v => onChange('ductMaterial', v)} options={DUCT_MATERIALS} />
        <CalcField label="Sizing Method" value={params.method} onChange={v => onChange('method', v)}
          options={[{value:'EQUAL_FRICTION',label:'Equal Friction'},{value:'VELOCITY_REDUCTION',label:'Velocity Reduction'},{value:'STATIC_REGAIN',label:'Static Regain'}]} />
        <CalcField label="Max Velocity" value={params.maxVelocity} onChange={v => onChange('maxVelocity', v)} type="number" unit="m/s" />
        <CalcField label="Friction Rate" value={params.frictionRate} onChange={v => onChange('frictionRate', v)} type="number" unit="Pa/m" />
        <CalcField label="Duct Shape" value={params.ductShape} onChange={v => onChange('ductShape', v)}
          options={[{value:'RECTANGULAR',label:'Rectangular'},{value:'CIRCULAR',label:'Circular'},{value:'FLAT_OVAL',label:'Flat Oval'}]} />
      </CalcFieldGroup>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Duct Sections</h3>
          <button onClick={addSection} className="btn-secondary text-sm px-3 py-1">+ Add Section</button>
        </div>
        {params.sections.map((sec, i) => (
          <div key={i} className="border border-lodha-sand rounded-lg p-4 mb-3 bg-lodha-sand/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">{sec.name}</span>
              <button onClick={() => removeSection(i)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CalcField label="Name" value={sec.name} onChange={v => updateSection(i, {...sec, name:v})} />
              <CalcField label="Airflow" value={sec.airflowCFM} onChange={v => updateSection(i, {...sec, airflowCFM:v})} type="number" unit="CFM" />
              <CalcField label="Length" value={sec.length} onChange={v => updateSection(i, {...sec, length:v})} type="number" unit="m" />
              <div>
                <label className="block text-xs font-medium text-lodha-grey/70 mb-1">Fittings</label>
                <div className="flex flex-wrap gap-1">
                  {FITTING_OPTIONS.map(f => (
                    <button key={f}
                      onClick={() => {
                        const fts = sec.fittings.includes(f) ? sec.fittings.filter(x => x !== f) : [...sec.fittings, f];
                        updateSection(i, {...sec, fittings: fts});
                      }}
                      className={`text-xs px-1.5 py-0.5 rounded ${sec.fittings.includes(f) ? 'bg-lodha-gold/20 text-lodha-black' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {f.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderResults(results) {
  const sections = results.sections || [];
  const fan = results.fanSizing || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Fan Static" value={fan.totalStaticPressurePa || 0} unit="Pa" icon={Gauge} color="blue" />
        <ResultCard title="Fan Power" value={fan.fanPowerKW || 0} unit="kW" icon={Wind} color="green" />
        <ResultCard title="Duct Area" value={results.totalDuctAreaSqM || 0} unit="m²" icon={Ruler} color="orange" />
        <ResultCard title="Critical Path" value={results.criticalPath?.name || '-'} icon={BarChart3} color="purple" />
      </div>

      {sections.length > 0 && (
        <ResultTable
          title="Duct Section Sizing"
          headers={['Section', 'CFM', 'Size (W×H or Ø)', 'Velocity (m/s)', 'Friction (Pa/m)', 'Length (m)', 'Fitting Loss (Pa)', 'Total ΔP (Pa)']}
          rows={sections.map(s => [
            s.name, s.airflowCFM,
            s.circularDia ? `Ø${s.circularDia}mm` : `${s.width}×${s.height}mm`,
            s.velocity, s.frictionRate, s.length, s.fittingLossPa, s.totalPressureDropPa,
          ])}
        />
      )}

      {fan.totalStaticPressurePa && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Fan Sizing</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Total SP:</span> <strong>{fan.totalStaticPressurePa} Pa</strong></div>
            <div><span className="text-lodha-grey/60">Safety Factor:</span> <strong>{fan.safetyFactor || '15%'}</strong></div>
            <div><span className="text-lodha-grey/60">Design SP:</span> <strong>{fan.designStaticPressurePa || '-'} Pa</strong></div>
            <div><span className="text-lodha-grey/60">Fan Power:</span> <strong>{fan.fanPowerKW} kW</strong></div>
          </div>
        </div>
      )}

      {results.materialSchedule && results.materialSchedule.length > 0 && (
        <ResultTable
          title="Material Schedule / BoQ"
          headers={['Item', 'Size', 'Quantity', 'Unit', 'Material']}
          rows={results.materialSchedule.map(m => [m.item, m.size, m.quantity, m.unit, m.material])}
        />
      )}
    </div>
  );
}

export default function DuctSizingCalculation() {
  return (
    <MepCalculatorShell
      calculationType="duct_sizing"
      title="Duct Sizing Calculation"
      icon={Wind}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
