import { query, closePool } from './server/db.js';
import ElectricalLoadCalculator from './server/services/electricalLoadService.js';

async function testCalculation() {
  try {
    console.log('Initializing calculator...');
    const calculator = new ElectricalLoadCalculator({ query });

    const inputs = {
      // Project Level
      projectCategory: 'GOLD 2',
      buildingNumbersPerSociety: 2,
      
      // Building Parameters
      buildingHeight: 90,
      numberOfFloors: 38,
      gfEntranceLobby: 100,
      typicalFloorLobby: 30,
      terraceArea: 200,
      terraceLighting: true,
      landscapeLighting: true,
      landscapeLightingLoad: 10,
      
      // Lift Configuration
      passengerLifts: 2,
      passengerFireLifts: 1,
      firemenLifts: 1,
      lobbyType: 'Nat. Vent',
      
      // HVAC & Ventilation
      mechanicalVentilation: false,
      ventilationCFM: 5000,
      ventilationFans: 4,
      
      // Pressurization
      numberOfStaircases: 2,
      
      // PHE (Building Level)
      boosterPumpFlow: 300,
      boosterPumpSet: '1W+1S',
      sewagePumpCapacity: 300,
      sewagePumpSet: 2,
      wetRiserPump: false,
      wetRiserPumpPower: 11,
      
      // Society Level - Fire Fighting
      mainPumpFlow: 2850,
      fbtPumpSetType: 'Main+SBY+Jky',
      sprinklerPumpFlow: 1425,
      sprinklerPumpSet: 'Main+SBY+Jky',
      
      // Society Level - PHE
      domTransferFlow: 300,
      domTransferConfig: '1W+1S',
      
      // Society Infrastructure
      stpCapacity: 500,
      clubhouseLoad: 50,
      streetLightingLoad: 20,
      evChargerCount: 10,
      evChargerType: 'fast',
      
      // Other
      securitySystemLoad: 2,
      smallPowerLoad: 5
    };

    const selectedBuildings = [
      { id: 1, name: 'Building A' }
    ];

    console.log('Running calculation...');
    const results = await calculator.calculate(inputs, selectedBuildings);
    
    console.log('✅ Calculation successful!');
    console.log('Total Connected Load:', results.totals.grandTotalTCL, 'kW');
    console.log('Maximum Demand:', results.totals.totalMaxDemand, 'kW');
    console.log('Transformer Size:', results.totals.transformerSizeKVA, 'kVA');
    
  } catch (error) {
    console.error('❌ Calculation failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await closePool();
  }
}

testCalculation();
