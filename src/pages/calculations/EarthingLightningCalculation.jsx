import { Zap, Shield, Globe, AlertTriangle } from 'lucide-react';
import MepCalculatorShell, { CalcFieldGroup, CalcField, ResultCard, ResultTable } from '../../components/MepCalculatorShell';

const defaultParams = {
  buildingLength: 50,
  buildingWidth: 30,
  buildingHeight: 45,
  soilType: 'CLAY_DRY',
  soilResistivity: 100,
  faultCurrent: 25000,
  faultDuration: 1.0,
  targetResistance: 1.0,
  electrodeType: 'COPPER_ROD',
  rodLength: 3.0,
  rodDiameter: 0.016,
  city: 'Mumbai',
  protectionLevel: 'III',
  numberOfFloors: 15,
};

function renderInputs(params, onChange) {
  return (
    <div className="space-y-6">
      <CalcFieldGroup label="Building Dimensions">
        <CalcField label="Length" value={params.buildingLength} onChange={v => onChange('buildingLength', v)} type="number" unit="m" />
        <CalcField label="Width" value={params.buildingWidth} onChange={v => onChange('buildingWidth', v)} type="number" unit="m" />
        <CalcField label="Height" value={params.buildingHeight} onChange={v => onChange('buildingHeight', v)} type="number" unit="m" />
        <CalcField label="Floors" value={params.numberOfFloors} onChange={v => onChange('numberOfFloors', v)} type="number" />
        <CalcField label="City" value={params.city} onChange={v => onChange('city', v)}
          options={['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata','Jaipur','Lucknow'].map(c=>({value:c,label:c}))} />
      </CalcFieldGroup>
      <CalcFieldGroup label="Soil & Electrode">
        <CalcField label="Soil Type" value={params.soilType} onChange={v => onChange('soilType', v)}
          options={['CLAY_DRY','CLAY_WET','SAND_DRY','SAND_WET','LOAM','ROCK','MARSHY','LATERITE','GRAVEL','BLACK_COTTON','ALLUVIAL','SANDY_LOAM'].map(s=>({value:s,label:s.replace(/_/g,' ')}))} />
        <CalcField label="Soil Resistivity" value={params.soilResistivity} onChange={v => onChange('soilResistivity', v)} type="number" unit="Ω·m" />
        <CalcField label="Target Resistance" value={params.targetResistance} onChange={v => onChange('targetResistance', v)} type="number" unit="Ω" />
        <CalcField label="Electrode Type" value={params.electrodeType} onChange={v => onChange('electrodeType', v)}
          options={['COPPER_ROD','GI_ROD','COPPER_PLATE','GI_PLATE','CHEMICAL_ROD','COPPER_STRIP','GI_STRIP','CI_PLATE','MAINTENANCE_FREE'].map(e=>({value:e,label:e.replace(/_/g,' ')}))} />
        <CalcField label="Rod Length" value={params.rodLength} onChange={v => onChange('rodLength', v)} type="number" unit="m" />
      </CalcFieldGroup>
      <CalcFieldGroup label="Fault & Protection">
        <CalcField label="Fault Current" value={params.faultCurrent} onChange={v => onChange('faultCurrent', v)} type="number" unit="A" />
        <CalcField label="Fault Duration" value={params.faultDuration} onChange={v => onChange('faultDuration', v)} type="number" unit="s" />
        <CalcField label="Protection Level" value={params.protectionLevel} onChange={v => onChange('protectionLevel', v)}
          options={[{value:'I',label:'Level I (Critical)'},{value:'II',label:'Level II (High)'},{value:'III',label:'Level III (Normal)'},{value:'IV',label:'Level IV (Low)'}]} />
      </CalcFieldGroup>
    </div>
  );
}

function renderResults(results) {
  const earthing = results.earthingDesign || {};
  const risk = results.riskAssessment || {};
  const lps = results.lpsDesign || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard title="Earth Resistance" value={earthing.achievedResistance || '-'} unit="Ω" icon={Globe} color={earthing.compliant ? 'green' : 'red'} />
        <ResultCard title="Electrodes Needed" value={earthing.totalElectrodes || 0} icon={Zap} color="blue" />
        <ResultCard title="LP Level" value={risk.protectionLevel || '-'} icon={Shield} color="orange" />
        <ResultCard title="Risk Factor" value={risk.riskLevel || '-'} icon={AlertTriangle} color="purple" />
      </div>
      {earthing.conductorSize && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Earthing Design (IS 3043)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Conductor:</span> <strong>{earthing.conductorSize}</strong></div>
            <div><span className="text-lodha-grey/60">Main Earth Bar:</span> <strong>{earthing.mainEarthBar || '-'}</strong></div>
            <div><span className="text-lodha-grey/60">Single Rod R:</span> <strong>{earthing.singleRodResistance} Ω</strong></div>
            <div><span className="text-lodha-grey/60">Parallel Rods:</span> <strong>{earthing.totalElectrodes}</strong></div>
            <div><span className="text-lodha-grey/60">Achieved R:</span> <strong>{earthing.achievedResistance} Ω</strong></div>
            <div><span className="text-lodha-grey/60">Compliant:</span> <strong>{earthing.compliant ? '✓ Yes' : '⚠ No'}</strong></div>
          </div>
        </div>
      )}
      {lps.meshSize && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Lightning Protection (IEC 62305)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-lodha-grey/60">Method:</span> <strong>{lps.method || 'Mesh + Rolling Sphere'}</strong></div>
            <div><span className="text-lodha-grey/60">Mesh Size:</span> <strong>{lps.meshSize}</strong></div>
            <div><span className="text-lodha-grey/60">Down Conductors:</span> <strong>{lps.downConductors}</strong></div>
            <div><span className="text-lodha-grey/60">Air Terms:</span> <strong>{lps.airTerminals || '-'}</strong></div>
            <div><span className="text-lodha-grey/60">Ring Earth:</span> <strong>{lps.ringEarth || '-'}</strong></div>
          </div>
        </div>
      )}
      {results.surgeProtection && (
        <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6">
          <h3 className="text-base font-semibold text-lodha-grey mb-3">Surge Protection</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {results.surgeProtection.map((spd, i) => (
              <div key={i}><span className="text-lodha-grey/60">{spd.type}:</span> <strong>{spd.location} — {spd.rating}</strong></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EarthingLightningCalculation() {
  return (
    <MepCalculatorShell
      calculationType="earthing_lightning"
      title="Earthing & Lightning Protection"
      icon={Zap}
      defaultParams={defaultParams}
      renderInputs={renderInputs}
      renderResults={renderResults}
    />
  );
}
