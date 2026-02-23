import { Activity, Droplets, Gauge, Zap } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const defaultParams = {
  application: 'CHILLED_WATER',
  pumpType: 'END_SUCTION',
  flowM3h: 50,
  headM: 25,
  fluidTemp: 7,
  fluidDensity: 999,
  suctionHeadM: 2,
  dischargePipeDia: 150,
  suctionPipeDia: 200,
  pipeLength: 80,
  fittings: [
    { type: 'ELBOW_90', count: 6 },
    { type: 'TEE_BRANCH', count: 2 },
    { type: 'GATE_VALVE', count: 2 },
    { type: 'CHECK_VALVE', count: 1 },
    { type: 'BUTTERFLY_VALVE', count: 2 },
  ],
  vfdEnabled: true,
  standbyPump: true,
};

function renderInputs(params, onChange) {
  const updateFitting = (idx, fit) => { const f = [...params.fittings]; f[idx] = fit; onChange('fittings', f); };
  const addFitting = () => onChange('fittings', [...params.fittings, { type: 'ELBOW_90', count: 1 }]);

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Application">
        <CalcField label="Application" value={params.application} onChange={v => onChange('application', v)}
          options={['CHILLED_WATER','CONDENSER_WATER','HOT_WATER','DOMESTIC_WATER','FIRE_FIGHTING','SEWAGE','DRAINAGE'].map(a=>({value:a,label:a.replace(/_/g,' ')}))} />
        <CalcField label="Pump Type" value={params.pumpType} onChange={v => onChange('pumpType', v)}
          options={[{value:'END_SUCTION',label:'End Suction'},{value:'SPLIT_CASE',label:'Split Case'},{value:'VERTICAL_INLINE',label:'Vertical Inline'},{value:'SUBMERSIBLE',label:'Submersible'},{value:'BOOSTER',label:'Booster Set'},{value:'VERTICAL_TURBINE',label:'Vertical Turbine'}]} />
      </CalcFieldGroup>
      <CalcFieldGroup label="Duty Point">
        <CalcField label="Flow" value={params.flowM3h} onChange={v => onChange('flowM3h', v)} type="number" unit="m³/h" required />
        <CalcField label="Head" value={params.headM} onChange={v => onChange('headM', v)} type="number" unit="m" required />
        <CalcField label="Fluid Temp" value={params.fluidTemp} onChange={v => onChange('fluidTemp', v)} type="number" unit="°C" />
        <CalcField label="Suction Head" value={params.suctionHeadM} onChange={v => onChange('suctionHeadM', v)} type="number" unit="m" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Piping">
        <CalcField label="Discharge Dia" value={params.dischargePipeDia} onChange={v => onChange('dischargePipeDia', v)} type="number" unit="mm" />
        <CalcField label="Suction Dia" value={params.suctionPipeDia} onChange={v => onChange('suctionPipeDia', v)} type="number" unit="mm" />
        <CalcField label="Pipe Length" value={params.pipeLength} onChange={v => onChange('pipeLength', v)} type="number" unit="m" />
      </CalcFieldGroup>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Pipe Fittings</h3>
          <button onClick={addFitting} className="btn-secondary text-sm px-3 py-1">+ Add Fitting</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {params.fittings.map((fit, i) => (
            <div key={i} className="border border-lodha-sand rounded-lg p-3 bg-lodha-sand/10 flex gap-2 items-end">
              <CalcField label="Type" value={fit.type} onChange={v => updateFitting(i, {...fit, type:v})}
                options={['ELBOW_90','ELBOW_45','TEE_BRANCH','TEE_RUN','GATE_VALVE','GLOBE_VALVE','BUTTERFLY_VALVE','CHECK_VALVE','BALL_VALVE','REDUCER','EXPANSION','STRAINER','FLEX_CONNECTOR','BELLMOUTH','DIFFUSER'].map(t=>({value:t,label:t.replace(/_/g,' ')}))} />
              <CalcField label="Qty" value={fit.count} onChange={v => updateFitting(i, {...fit, count:v})} type="number" />
              <button onClick={() => onChange('fittings', params.fittings.filter((_,j) => j !== i))} className="text-xs text-red-500 hover:underline pb-1">×</button>
            </div>
          ))}
        </div>
      </div>
      <CalcFieldGroup label="Options">
        <CalcField label="VFD" value={params.vfdEnabled ? 'true' : 'false'}
          onChange={v => onChange('vfdEnabled', v === 'true')}
          options={[{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
        <CalcField label="Standby Pump" value={params.standbyPump ? 'true' : 'false'}
          onChange={v => onChange('standbyPump', v === 'true')}
          options={[{value:'true',label:'Yes (1+1)'},{value:'false',label:'No'}]} />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  const pump = results.pumpSelection || {};
  const npsh = results.npshVerification || {};
  const vfd = results.vfdAnalysis || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Pump Power" value={pump.motorKW || 0} unit="kW" icon={Zap} color="blue" />
        <ResultCard title="Efficiency" value={pump.efficiency || 0} unit="%" icon={Activity} color="green" />
        <ResultCard title="NPSH Margin" value={npsh.margin || 0} unit="m" icon={Gauge} color={npsh.adequate ? 'green' : 'red'} />
        <ResultCard title="VFD Savings" value={vfd.annualSavingsPercent || 0} unit="%" icon={Droplets} color="orange" />
      </div>

      {pump.motorKW && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Selected Pump</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Motor:</span> <strong>{pump.motorKW} kW</strong></div>
            <div><span className="text-lodha-grey/60">Speed:</span> <strong>{pump.speedRPM || 1450} RPM</strong></div>
            <div><span className="text-lodha-grey/60">Efficiency:</span> <strong>{pump.efficiency}%</strong></div>
            <div><span className="text-lodha-grey/60">Type:</span> <strong>{pump.type || '-'}</strong></div>
          </div>
        </div>
      )}

      {npsh.available && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">NPSH Verification</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Available:</span> <strong>{npsh.available} m</strong></div>
            <div><span className="text-lodha-grey/60">Required:</span> <strong>{npsh.required} m</strong></div>
            <div><span className="text-lodha-grey/60">Margin:</span> <strong>{npsh.margin} m</strong></div>
            <div><span className="text-lodha-grey/60">Status:</span> <strong>{npsh.adequate ? '✓ Adequate' : '⚠ Insufficient'}</strong></div>
          </div>
        </div>
      )}

      {results.systemCurve && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">System Losses</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Friction Loss:</span> <strong>{results.systemCurve.frictionLoss?.toFixed(1)} m</strong></div>
            <div><span className="text-lodha-grey/60">Fitting Loss:</span> <strong>{results.systemCurve.fittingLoss?.toFixed(1)} m</strong></div>
            <div><span className="text-lodha-grey/60">Total Dynamic Head:</span> <strong>{results.systemCurve.totalHead?.toFixed(1)} m</strong></div>
          </div>
        </div>
      )}

      {vfd.annualSavingsPercent > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">VFD Energy Savings</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Annual Savings:</span> <strong>{vfd.annualSavingsPercent}%</strong></div>
            <div><span className="text-lodha-grey/60">Energy Saved:</span> <strong>{vfd.annualKWhSaved || '-'} kWh</strong></div>
            <div><span className="text-lodha-grey/60">Payback:</span> <strong>{vfd.paybackYears || '-'} years</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PHEPumpSelection() {
  return (
    <MepCalculatorShell
      calculationType="phe_pump"
      title="PHE Pump Selection"
      icon={Activity}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
