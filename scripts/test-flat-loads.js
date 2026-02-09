import ElectricalLoadCalculator from '../server/services/electricalLoadService.js';

// Mock database query function
const mockDb = {
  query: async (sql, params) => {
    // Mock lookup values
    return { rows: [{ result_value: '15' }] };
  }
};

const calculator = new ElectricalLoadCalculator(mockDb);

// Test flat load calculation
const testFlats = [
  { flat_type: '1BHK', area_sqft: 650, total_count: 8 },
  { flat_type: '2BHK', area_sqft: 950, total_count: 12 },
  { flat_type: '3BHK', area_sqft: 1350, total_count: 6 }
];

console.log('\n=== Testing Flat Load Calculation ===\n');
console.log('Input Flats:', testFlats);

const flatLoads = calculator.calculateFlatLoads(testFlats);
console.log('\nFlat Loads (before demand factors):', JSON.stringify(flatLoads, null, 2));

const withDF = calculator.applyDemandFactors(flatLoads);
console.log('\nFlat Loads (with demand factors):', JSON.stringify(withDF, null, 2));

// Test with mock building data
const mockBuildings = [
  {
    id: 1,
    name: 'T1',
    floor_count: 38,
    total_height_m: 134,
    gf_entrance_lobby: 100,
    avg_typical_lobby_area: 30,
    flats: [
      { flat_type: '2BHK', area_sqft: 950, total_count: 76 },
      { flat_type: '3BHK', area_sqft: 1350, total_count: 38 }
    ]
  },
  {
    id: 2,
    name: 'T2',
    floor_count: 38,
    total_height_m: 134,
    gf_entrance_lobby: 100,
    avg_typical_lobby_area: 30,
    flats: [
      { flat_type: '2BHK', area_sqft: 950, total_count: 76 },
      { flat_type: '3BHK', area_sqft: 1350, total_count: 38 }
    ]
  }
];

const inputs = {
  projectCategory: 'GOLD 2',
  buildingHeight: 134,
  numberOfFloors: 38,
  gfEntranceLobby: 100,
  typicalFloorLobby: 30,
  passengerLifts: 2,
  passengerFireLifts: 1,
  firemenLifts: 1,
  lobbyType: 'Nat. Vent',
  numberOfStaircases: 2,
  boosterPumpFlow: 100,
  boosterPumpSet: '1W+1S',
  ffMainPumpFlow: 500,
  ffMainPumpSet: '2W+1S',
  ffJockeyPumpFlow: 50,
  clubHouse: false,
  gym: false,
  swimmingPool: false
};

console.log('\n=== Testing Full Calculation with Flats ===\n');

calculator.calculate(inputs, mockBuildings)
  .then(results => {
    console.log('Calculation successful!');
    console.log('\nFlat Loads Summary:');
    if (results.flatLoads) {
      console.log('- Category:', results.flatLoads.category);
      console.log('- Total TCL:', results.flatLoads.totalTCL?.toFixed(2), 'kW');
      console.log('- Max Demand:', results.flatLoads.totalMaxDemand?.toFixed(2), 'kW');
      console.log('- Number of flat types:', results.flatLoads.items?.length);
      console.log('\nFlat Types:');
      results.flatLoads.items?.forEach(item => {
        console.log(`  ${item.description}: ${item.nos} units × ${item.loadPerUnit} kW = ${item.tcl.toFixed(2)} kW (MD: ${item.maxDemandKW?.toFixed(2)} kW)`);
      });
    } else {
      console.log('No flat loads in results!');
    }
    
    console.log('\nGrand Totals:');
    console.log('- Total Connected Load:', results.totals.grandTotalTCL?.toFixed(2), 'kW');
    console.log('- Maximum Demand:', results.totals.totalMaxDemand?.toFixed(2), 'kW');
    console.log('- Transformer Size:', results.totals.transformerSizeKVA, 'kVA');
  })
  .catch(error => {
    console.error('Calculation failed:', error);
  });
