import { Grid3X3 as Grid, Zap, Gauge, BarChart3 } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const defaultParams = {
  panelName: 'MDB-1',
  panelType: 'MDB',
  systemVoltage: 415,
  phases: 3,
  busbarMaterial: 'COPPER',
  incomingSupply: 'TRANSFORMER',
  circuits: [
    { name: 'Lighting', loadKW: 15, powerFactor: 0.9, phases: 1, type: 'LIGHTING', cableLength: 30 },
    { name: 'Power Sockets', loadKW: 25, powerFactor: 0.8, phases: 1, type: 'POWER', cableLength: 40 },
    { name: 'HVAC AHU-1', loadKW: 50, powerFactor: 0.85, phases: 3, type: 'MOTOR', cableLength: 50 },
    { name: 'Fire Pump', loadKW: 30, powerFactor: 0.85, phases: 3, type: 'FIRE', cableLength: 60 },
    { name: 'Elevator', loadKW: 40, powerFactor: 0.8, phases: 3, type: 'MOTOR', cableLength: 45 },
  ],
};

function renderInputs(params, onChange) {
  const updateCircuit = (idx, ckt) => { const c = [...params.circuits]; c[idx] = ckt; onChange('circuits', c); };
  const removeCircuit = idx => onChange('circuits', params.circuits.filter((_, i) => i !== idx));
  const addCircuit = () => onChange('circuits', [...params.circuits, { name: `Circuit ${params.circuits.length+1}`, loadKW: 10, powerFactor: 0.85, phases: 1, type: 'POWER', cableLength: 25 }]);

  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Panel Details">
        <CalcField label="Panel Name" value={params.panelName} onChange={v => onChange('panelName', v)} />
        <CalcField label="Panel Type" value={params.panelType} onChange={v => onChange('panelType', v)}
          options={['MDB','SMDB','DB','EMDB','MLDB','PCC','MCC','PMCC','PDB'].map(t=>({value:t,label:t}))} />
        <CalcField label="Voltage" value={params.systemVoltage} onChange={v => onChange('systemVoltage', v)} type="number" unit="V" />
        <CalcField label="Phases" value={params.phases} onChange={v => onChange('phases', v)}
          options={[{value:3,label:'3 Phase'},{value:1,label:'1 Phase'}]} />
        <CalcField label="Busbar Material" value={params.busbarMaterial} onChange={v => onChange('busbarMaterial', v)}
          options={[{value:'COPPER',label:'Copper'},{value:'ALUMINIUM',label:'Aluminium'}]} />
        <CalcField label="Incoming Supply" value={params.incomingSupply} onChange={v => onChange('incomingSupply', v)}
          options={[{value:'TRANSFORMER',label:'Transformer'},{value:'DG_SET',label:'DG Set'},{value:'RISING_MAIN',label:'Rising Main'},{value:'SUBMAIN_CABLE',label:'Sub-main Cable'}]} />
      </CalcFieldGroup>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-lodha-grey">Circuits</h3>
          <button onClick={addCircuit} className="btn-secondary text-sm px-3 py-1">+ Add Circuit</button>
        </div>
        {params.circuits.map((ckt, i) => (
          <div key={i} className="border border-lodha-sand rounded-lg p-4 mb-3 bg-lodha-sand/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">{ckt.name}</span>
              <button onClick={() => removeCircuit(i)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <CalcField label="Name" value={ckt.name} onChange={v => updateCircuit(i, {...ckt, name:v})} />
              <CalcField label="Load" value={ckt.loadKW} onChange={v => updateCircuit(i, {...ckt, loadKW:v})} type="number" unit="kW" />
              <CalcField label="PF" value={ckt.powerFactor} onChange={v => updateCircuit(i, {...ckt, powerFactor:v})} type="number" />
              <CalcField label="Phases" value={ckt.phases} onChange={v => updateCircuit(i, {...ckt, phases:v})}
                options={[{value:1,label:'1Φ'},{value:3,label:'3Φ'}]} />
              <CalcField label="Type" value={ckt.type} onChange={v => updateCircuit(i, {...ckt, type:v})}
                options={['LIGHTING','POWER','MOTOR','HVAC','FIRE','UPS','SPARE'].map(t=>({value:t,label:t}))} />
              <CalcField label="Cable Len" value={ckt.cableLength} onChange={v => updateCircuit(i, {...ckt, cableLength:v})} type="number" unit="m" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderResults(results) {
  const circuits = results.circuits || [];
  const balance = results.phaseBalance || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Total Load" value={results.totalLoadKW || 0} unit="kW" icon={Zap} color="blue" />
        <ResultCard title="Incoming Device" value={results.incomingDevice?.type || '-'} icon={Gauge} color="green" />
        <ResultCard title="Incoming Rating" value={results.incomingDevice?.ratingA || 0} unit="A" icon={Zap} color="orange" />
        <ResultCard title="Phase Imbalance" value={balance.imbalancePercent || 0} unit="%" icon={BarChart3} color={balance.imbalancePercent <= 15 ? 'green' : 'red'} />
      </div>
      {balance.phases && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Phase Balance</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {['R','Y','B'].map((ph, i) => (
              <div key={ph} className="text-center p-3 rounded-lg bg-lodha-sand/20">
                <div className="text-lg font-bold text-lodha-primary">{balance.phases?.[i]?.loadKW || 0} kW</div>
                <div className="text-lodha-grey/60">Phase {ph}</div>
                <div className="text-xs">{balance.phases?.[i]?.circuits || 0} circuits</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {circuits.length > 0 && (
        <ResultTable
          title="Panel Schedule"
          headers={['Circuit', 'Load (kW)', 'Current (A)', 'Phase', 'MCB/MCCB', 'Rating (A)', 'Cable Size', 'VD (%)']}
          rows={circuits.map(c => [
            c.name, c.loadKW, c.currentA, c.assignedPhase || '-',
            c.protectionDevice?.type || '-', c.protectionDevice?.ratingA || '-',
            c.cableSize || '-', c.voltageDropPercent || '-',
          ])}
        />
      )}
      {results.panelDimensions && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Panel Dimensions</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Height:</span> <strong>{results.panelDimensions.heightMM} mm</strong></div>
            <div><span className="text-lodha-grey/60">Width:</span> <strong>{results.panelDimensions.widthMM} mm</strong></div>
            <div><span className="text-lodha-grey/60">Depth:</span> <strong>{results.panelDimensions.depthMM} mm</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PanelSchedule() {
  return (
    <MepCalculatorShell
      calculationType="panel_schedule"
      title="Panel Schedule"
      icon={Grid}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
