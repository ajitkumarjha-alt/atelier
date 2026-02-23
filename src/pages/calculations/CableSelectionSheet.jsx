import { Cable, Zap, Gauge, AlertTriangle } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const defaultParams = {
  loadKW: 100,
  voltage: 415,
  phases: 3,
  powerFactor: 0.85,
  cableLength: 50,
  installationMethod: 'CABLE_TRAY_TREFOIL',
  insulationType: 'XLPE',
  conductorMaterial: 'COPPER',
  ambientTemp: 45,
  numberOfCircuits: 1,
  soilResistivity: 1.5,
  faultLevel: 25,
  faultDuration: 1.0,
  maxVoltageDropPercent: 3.0,
};

function renderInputs(params, onChange) {
  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Load Parameters">
        <CalcField label="Load" value={params.loadKW} onChange={v => onChange('loadKW', v)} type="number" unit="kW" required />
        <CalcField label="Voltage" value={params.voltage} onChange={v => onChange('voltage', v)} type="number" unit="V" />
        <CalcField label="Phases" value={params.phases} onChange={v => onChange('phases', v)}
          options={[{value:1,label:'Single Phase'},{value:3,label:'Three Phase'}]} />
        <CalcField label="Power Factor" value={params.powerFactor} onChange={v => onChange('powerFactor', v)} type="number" />
        <CalcField label="Cable Length" value={params.cableLength} onChange={v => onChange('cableLength', v)} type="number" unit="m" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Installation">
        <CalcField label="Method" value={params.installationMethod} onChange={v => onChange('installationMethod', v)}
          options={['CABLE_TRAY_TREFOIL','CABLE_TRAY_FLAT','IN_GROUND_DIRECT','IN_GROUND_DUCT','IN_AIR_CLEAT','IN_CONDUIT','LADDER_RACK','ON_WALL'].map(m=>({value:m,label:m.replace(/_/g,' ')}))} />
        <CalcField label="Insulation" value={params.insulationType} onChange={v => onChange('insulationType', v)}
          options={[{value:'XLPE',label:'XLPE'},{value:'PVC',label:'PVC'}]} />
        <CalcField label="Conductor" value={params.conductorMaterial} onChange={v => onChange('conductorMaterial', v)}
          options={[{value:'COPPER',label:'Copper'},{value:'ALUMINIUM',label:'Aluminium'}]} />
        <CalcField label="Ambient Temp" value={params.ambientTemp} onChange={v => onChange('ambientTemp', v)} type="number" unit="°C" />
        <CalcField label="Parallel Circuits" value={params.numberOfCircuits} onChange={v => onChange('numberOfCircuits', v)} type="number" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Short Circuit">
        <CalcField label="Fault Level" value={params.faultLevel} onChange={v => onChange('faultLevel', v)} type="number" unit="kA" />
        <CalcField label="Fault Duration" value={params.faultDuration} onChange={v => onChange('faultDuration', v)} type="number" unit="s" />
        <CalcField label="Max Voltage Drop" value={params.maxVoltageDropPercent} onChange={v => onChange('maxVoltageDropPercent', v)} type="number" unit="%" />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  const sc = results.selectedCable || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Selected Cable" value={sc.size || '-'} unit="sq mm" icon={Cable} color="blue" />
        <ResultCard title="Full Load Current" value={results.loadCurrent?.fullLoadCurrentA || 0} unit="A" icon={Zap} color="green" />
        <ResultCard title="Voltage Drop" value={results.voltageDrop?.percent || 0} unit="%" icon={Gauge} color={results.voltageDrop?.compliant ? 'green' : 'red'} />
        <ResultCard title="Governing" value={sc.governingCriteria || '-'} icon={AlertTriangle} color="orange" />
      </div>

      {results.deratingFactors && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Derating Factors</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Temperature:</span> <strong>{results.deratingFactors.temperature}</strong></div>
            <div><span className="text-lodha-grey/60">Grouping:</span> <strong>{results.deratingFactors.grouping}</strong></div>
            <div><span className="text-lodha-grey/60">Installation:</span> <strong>{results.deratingFactors.installation}</strong></div>
            <div><span className="text-lodha-grey/60">Combined:</span> <strong>{results.deratingFactors.combined}</strong></div>
          </div>
        </div>
      )}

      <ResultTable
        title="Cable Selection Summary"
        headers={['Criteria', 'Required Size', 'Selected Size', 'Status']}
        rows={[
          ['Current Carrying', `${results.sizeByCurrent?.minimumSizeSqMM || '-'} sq mm`, `${sc.size || '-'} sq mm`, results.sizeByCurrent?.adequate ? '✓' : '⚠'],
          ['Voltage Drop', `${results.sizeByVoltageDrop?.minimumSizeSqMM || '-'} sq mm`, `${sc.size || '-'} sq mm`, results.voltageDrop?.compliant ? '✓' : '⚠'],
          ['Short Circuit', `${results.sizeByShortCircuit?.minimumSizeSqMM || '-'} sq mm`, `${sc.size || '-'} sq mm`, '✓'],
        ]}
      />
    </div>
  );
}

export default function CableSelectionSheet() {
  return (
    <MepCalculatorShell
      calculationType="cable_selection"
      title="Cable Selection Sheet"
      icon={Cable}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
