# Electrical Load Calculation - Implementation Plan

## Executive Summary

Based on the Excel file analysis ([ELECTRICAL_LOAD_CALCULATION_ANALYSIS.md](ELECTRICAL_LOAD_CALCULATION_ANALYSIS.md)) and the existing Water Demand Calculation implementation, this document outlines how we can implement an **Electrical Load Calculation** feature in the MEP project management system.

---

## 🎯 Overview

### What the Feature Will Do

The Electrical Load Calculation will allow users to:
1. **Select buildings** in a project
2. **Input building-specific parameters** (height, floors, equipment configs)
3. **Auto-calculate electrical loads** for:
   - Building Common Areas (lighting, lifts, HVAC, pumps, etc.)
   - Society Infrastructure (FF pumps, PHE pumps, society-level systems)
4. **Apply demand factors** (MDF, EDF, FDF - Maximum, Essential, Fire)
5. **View detailed breakdown** of loads by category
6. **Save calculations** for MSEDCL submissions and project records

---

## 📊 Comparison with Water Demand Calculation

### Similarities (Leverage Existing Pattern)

| Aspect | Water Demand | Electrical Load |
|--------|-------------|-----------------|
| **Data Source** | Buildings + Flats/Floors | Buildings + Input Parameters |
| **Calculation Flow** | Select → Configure → Calculate → Save | **Same pattern** |
| **API Structure** | Dedicated endpoints + JSONB storage | **Same approach** |
| **UI Architecture** | Multi-step wizard | **Same structure** |
| **Database Storage** | Separate table `water_demand_calculations` | New table `electrical_load_calculations` |
| **Integration** | Listed in Design Calculations page | **Same integration** |
| **Status Workflow** | Draft → Under Review → Approved | **Same workflow** |

### Key Differences (New Requirements)

| Aspect | Water Demand | Electrical Load |
|--------|-------------|-----------------|
| **Inputs** | Mostly derived from building data | **~100 manual inputs required** |
| **Complexity** | Single formula per building type | **Multiple interconnected formulas** |
| **Lookup Tables** | Simple LPCD rates | **Complex equipment sizing tables** |
| **Demand Factors** | Single multiplier | **3 factors: MDF, EDF, FDF** |
| **Load Types** | Single total | **4 loads: TCL, Max, Essential, Fire** |
| **Dropdowns** | None | **26 validated dropdown lists** |
| **Cross-calculations** | Independent per building | **Society loads shared across buildings** |

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│  1. Building Selection Grid                                 │
│     └─ Select one/multiple buildings                        │
│                                                              │
│  2. Input Forms (26 dropdowns + 70+ text inputs)            │
│     ├─ Project Parameters (height, floors, etc.)            │
│     ├─ Equipment Configs (lifts, pumps, HVAC)               │
│     └─ Society Parameters (FF, PHE systems)                 │
│                                                              │
│  3. Calculate Button → Triggers Calculation Engine          │
│                                                              │
│  4. Results Display                                          │
│     ├─ Building CA Load Breakdown                           │
│     ├─ Society CA Load Breakdown                            │
│     ├─ Demand Factor Applications                           │
│     └─ Total Summary (kW, kVA, transformer sizing)          │
│                                                              │
│  5. Save Calculation                                         │
│     └─ Name, Status, Remarks → Save to DB                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  • POST   /api/electrical-load-calculations                 │
│  • GET    /api/electrical-load-calculations?projectId=X     │
│  • GET    /api/electrical-load-calculations/:id             │
│  • PUT    /api/electrical-load-calculations/:id             │
│  • DELETE /api/electrical-load-calculations/:id             │
│                                                              │
│  Calculation Service:                                        │
│  • Equipment Sizing Functions (VLOOKUP equivalents)         │
│  • Demand Factor Applications                               │
│  • Cross-sheet Calculations                                 │
│  • Formula Engine                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  • electrical_load_calculations (main table)                │
│  • electrical_load_lookup_tables (equipment sizing)         │
│  • electrical_load_inputs (saved input configs)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Database Schema Design

### Main Calculation Table

```sql
CREATE TABLE electrical_load_calculations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    calculation_name VARCHAR(500) NOT NULL,
    
    -- Input Configuration
    selected_buildings JSONB NOT NULL, -- Array of building IDs
    input_parameters JSONB NOT NULL,   -- All ~100 input values
    
    -- Calculation Results
    building_ca_loads JSONB NOT NULL,  -- Building common area loads breakdown
    society_ca_loads JSONB NOT NULL,   -- Society-level loads breakdown
    total_loads JSONB NOT NULL,        -- Aggregated totals
    
    -- Summary Values (for quick queries)
    total_connected_load_kw DECIMAL(12, 2),
    maximum_demand_kw DECIMAL(12, 2),
    essential_demand_kw DECIMAL(12, 2),
    fire_demand_kw DECIMAL(12, 2),
    
    -- Metadata
    status VARCHAR(50) DEFAULT 'Draft',
    calculated_by VARCHAR(255) NOT NULL,
    verified_by VARCHAR(255),
    remarks TEXT,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_elec_calc_project ON electrical_load_calculations(project_id);
CREATE INDEX idx_elec_calc_status ON electrical_load_calculations(status);
```

### Lookup Tables (Equipment Sizing)

```sql
CREATE TABLE electrical_load_lookup_tables (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- 'lift_power', 'pump_power', 'ac_sizing', etc.
    lookup_key VARCHAR(100) NOT NULL,   -- e.g. 'building_height', 'flow_lpm'
    lookup_value VARCHAR(100) NOT NULL, -- e.g. '90', '300'
    result_value DECIMAL(10, 2) NOT NULL, -- e.g. 15.0, 2.2
    unit VARCHAR(50),                     -- 'kW', 'TR', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, lookup_key, lookup_value)
);

-- Seed data examples
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit) VALUES
('lift_power', 'building_height', '60', 12.0, 'kW'),
('lift_power', 'building_height', '70', 14.0, 'kW'),
('lift_power', 'building_height', '90', 15.0, 'kW'),
('lift_power', 'building_height', '100', 18.0, 'kW'),
('lift_power', 'building_height', '110', 20.0, 'kW'),
-- ... more lookup data from Data sheet

('phe_pump', 'flow_lpm', '100', 0.75, 'kW'),
('phe_pump', 'flow_lpm', '200', 1.1, 'kW'),
('phe_pump', 'flow_lpm', '300', 2.2, 'kW'),
-- ... etc

('ac_sizing', 'area_sqft', '150', 1.0, 'TR'),
('ac_sizing', 'area_sqft', '200', 1.5, 'TR');
-- ... etc
```

---

## 🎨 Frontend Implementation

### Component Structure

```
/src/pages/calculations/ElectricalLoadCalculation.jsx
├── Step 1: Building Selection
├── Step 2: Input Parameters Form
│   ├── Project Parameters
│   ├── Building Parameters
│   ├── Society Parameters (FF, PHE)
│   └── 26 Dropdown Validations
├── Step 3: Calculate Button
├── Step 4: Results Display
│   ├── Building CA Load Table
│   ├── Society CA Load Table
│   ├── Demand Factors Summary
│   └── Total Loads Card
└── Step 5: Save Calculation Form
```

### Input Parameters Sections

Based on the Excel "Inputs" sheet, we need forms for:

#### 1. Project Level
```jsx
<section>
  <h3>Project Information</h3>
  <select name="projectCategory">
    <option>GOLD 1</option>
    <option>GOLD 2</option>
    <option>GOLD 3</option>
    <option>Platinum</option>
    <option>Diamond</option>
  </select>
  
  <input type="number" name="buildingNumbersPerSociety" 
         min="1" max="5" />
</section>
```

#### 2. Building Parameters (Per Building)
```jsx
<section>
  <h3>Building Specifications</h3>
  
  <select name="buildingHeight">
    <option>60</option>
    <option>70</option>
    <option>90</option>
    {/* ... */}
  </select>
  
  <select name="numberOfFloors">
    <option>15</option>
    <option>20</option>
    {/* ... */}
  </select>
  
  <input type="number" name="gfEntranceLobby" 
         placeholder="Ground Floor Lobby (sq.m)" />
  
  <input type="number" name="typicalFloorLobby" 
         placeholder="Typical Floor Lobby (sq.m)" />
         
  {/* ... ~30 more building fields */}
</section>
```

#### 3. Lift Configuration
```jsx
<section>
  <h3>Lift Systems</h3>
  
  <select name="passengerLifts">
    <option>2</option>
    <option>3</option>
    <option>4</option>
    <option>5</option>
    <option>6</option>
  </select>
  
  <select name="lobbyType">
    <option>Nat. Vent</option>
    <option>Mech. Vent</option>
    <option>AC</option>
  </select>
  
  {/* ... */}
</section>
```

#### 4. Fire Fighting Systems
```jsx
<section>
  <h3>Fire Fighting Configuration</h3>
  
  <select name="ffPumpType">
    <option>End Suction</option>
    <option>MSMO</option>
  </select>
  
  <select name="mainPumpFlow">
    <option>2280</option>
    <option>2850</option>
    <option>3200</option>
  </select>
  
  <select name="pumpSetConfig">
    <option>Main+SBY+Jky</option>
    <option>2 Main+SBY+Jky</option>
  </select>
  
  {/* ... */}
</section>
```

#### 5. PHE Systems
```jsx
<section>
  <h3>Plumbing & Hydraulic Equipment</h3>
  
  <select name="domTransferConfig">
    <option>1W+1S</option>
    <option>2W+1S</option>
    <option>3W+1S</option>
  </select>
  
  <select name="domTransferFlow">
    <option>100</option>
    <option>200</option>
    <option>300</option>
    <option>400</option>
    <option>500</option>
  </select>
  
  {/* ... */}
</section>
```

---

## ⚙️ Calculation Engine

### Backend Service Structure

```javascript
// /server/services/electricalLoadService.js

class ElectricalLoadCalculator {
  
  /**
   * Main calculation function
   * Mirrors the Excel calculation logic
   */
  async calculate(inputs, selectedBuildings) {
    // Step 1: Validate inputs
    this.validateInputs(inputs);
    
    // Step 2: Calculate Building CA Loads
    const buildingLoads = this.calculateBuildingCALoads(inputs);
    
    // Step 3: Calculate Society CA Loads
    const societyLoads = this.calculateSocietyCALoads(inputs);
    
    // Step 4: Aggregate totals
    const totals = this.aggregateLoads(buildingLoads, societyLoads, selectedBuildings.length);
    
    return {
      buildingCALoads: buildingLoads,
      societyCALoads: societyLoads,
      totals: totals
    };
  }
  
  /**
   * Building Common Area Loads
   * Mirrors "Building CA LOAD" Excel sheet
   */
  calculateBuildingCALoads(inputs) {
    const loads = [];
    
    // 1. Lighting & Small Power
    loads.push(this.calculateLighting(inputs));
    
    // 2. Lifts
    loads.push(this.calculateLifts(inputs));
    
    // 3. HVAC & Ventilation
    loads.push(this.calculateHVAC(inputs));
    
    // 4. Pressurization
    loads.push(this.calculatePressurization(inputs));
    
    // 5. PHE (Building level)
    loads.push(this.calculateBuildingPHE(inputs));
    
    // 6. Fire Fighting (Building level)
    loads.push(this.calculateBuildingFF(inputs));
    
    // Apply demand factors to each
    return loads.map(load => this.applyDemandFactors(load));
  }
  
  /**
   * Lighting Calculations
   */
  calculateLighting(inputs) {
    const items = [];
    
    // GF Entrance Lobby
    const gfLobby = {
      description: 'GF Entrance Lobby',
      areaSqm: inputs.gfEntranceLobby || 100,
      areaSqft: (inputs.gfEntranceLobby || 100) * 10.76,
      wattPerSqft: 0.3,
      nos: 1,
      tclPerUnit: null,
      tcl: null,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25,
      remarks: 'Assumed per EcoNiwas Samhita 3W/sq.m'
    };
    gfLobby.tclPerUnit = (gfLobby.wattPerSqft * gfLobby.areaSqft) / 1000;
    gfLobby.tcl = gfLobby.tclPerUnit * gfLobby.nos;
    items.push(gfLobby);
    
    // Typical Floor Lobby
    const typFloor = {
      description: 'Typical Floor Lobby',
      areaSqm: inputs.typicalFloorLobby || 30,
      areaSqft: (inputs.typicalFloorLobby || 30) * 10.76,
      wattPerSqft: 0.3,
      nos: inputs.numberOfFloors || 38,
      tclPerUnit: null,
      tcl: null,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25
    };
    typFloor.tclPerUnit = (typFloor.wattPerSqft * typFloor.areaSqft) / 1000;
    typFloor.tcl = typFloor.tclPerUnit * typFloor.nos;
    items.push(typFloor);
    
    // Staircases
    const staircases = {
      description: 'Staircases',
      nos: inputs.numberOfFloors * 2 * 2, // floors × 2 stairs × 2 landings
      wattPerFixture: 0.02, // 20W per fixture
      tcl: 0,
      mdf: 0.6,
      edf: 0.6,
      fdf: 1.0, // Full load during fire
      remarks: '20W per fixture, 2 staircases'
    };
    staircases.tcl = staircases.wattPerFixture * staircases.nos;
    items.push(staircases);
    
    // ... Continue for all lighting categories
    // (Terrace, Fire Lift Lobby, Refuge Floor, Service Floor, External, Landscape)
    
    return {
      category: 'Lighting & Small Power',
      items: items
    };
  }
  
  /**
   * Lift Calculations with VLOOKUP
   */
  calculateLifts(inputs) {
    const buildingHeight = inputs.buildingHeight || 90;
    
    // VLOOKUP equivalent: Get lift power from lookup table
    const liftPowerKW = this.lookupLiftPower(buildingHeight);
    
    const items = [];
    
    // Passenger Lifts
    items.push({
      description: 'Passenger Lifts',
      nos: inputs.passengerLifts || 2,
      kwPerLift: liftPowerKW,
      tcl: (inputs.passengerLifts || 2) * liftPowerKW,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.0 // Not used during fire
    });
    
    // Passenger + Fire Lift
    items.push({
      description: 'Passenger + Fire Lift',
      nos: inputs.passengerFireLifts || 1,
      kwPerLift: liftPowerKW,
      tcl: (inputs.passengerFireLifts || 1) * liftPowerKW,
      mdf: 0.6,
      edf: 0.6,
      fdf: 1.0 // Full load during fire
    });
    
    // Firemen Evac Lift
    items.push({
      description: 'Firemen Evac/Service Lift',
      nos: inputs.firemenLifts || 1,
      kwPerLift: liftPowerKW,
      tcl: (inputs.firemenLifts || 1) * liftPowerKW,
      mdf: 0.6,
      edf: 0.6,
      fdf: 1.0
    });
    
    return {
      category: 'Lifts',
      items: items
    };
  }
  
  /**
   * VLOOKUP - Lift Power by Building Height
   */
  async lookupLiftPower(buildingHeight) {
    const result = await db.query(`
      SELECT result_value 
      FROM electrical_load_lookup_tables 
      WHERE category = 'lift_power' 
        AND lookup_key = 'building_height' 
        AND lookup_value = $1
    `, [buildingHeight.toString()]);
    
    return result.rows[0]?.result_value || 15; // Default 15 kW
  }
  
  /**
   * PHE Pump Calculations
   */
  calculateBuildingPHE(inputs) {
    const items = [];
    
    // Booster Pump
    const boosterFlow = inputs.boosterPumpFlow || 300;
    const boosterKW = this.lookupPumpPower('phe_pump', boosterFlow);
    
    items.push({
      description: 'PHE Booster Pump',
      nos: inputs.boosterPumpSet || 1,
      flowLPM: boosterFlow,
      kwPerPump: boosterKW,
      tcl: boosterKW * (inputs.boosterPumpSet || 1),
      mdf: 0.6,
      edf: 0.6,
      fdf: 1.0
    });
    
    return {
      category: 'PHE',
      items: items
    };
  }
  
  /**
   * Society-Level Calculations
   */
  calculateSocietyCALoads(inputs) {
    const loads = [];
    
    // Fire Fighting Pumps
    loads.push(this.calculateFFPumps(inputs));
    
    // PHE Transfer Pumps
    loads.push(this.calculatePHETransferPumps(inputs));
    
    return loads;
  }
  
  /**
   * Fire Fighting Pump Configuration
   */
  calculateFFPumps(inputs) {
    const items = [];
    
    // Main Hydrant Pump
    const pumpConfig = inputs.fbtPumpSetType || 'Main+SBY+Jky';
    const pumpCount = pumpConfig === '2 Main+SBY+Jky' ? 2 : 1;
    
    const mainFlow = inputs.mainPumpFlow || 2850;
    const mainHead = inputs.buildingHeight + (inputs.buildingHeight * 0.1); // Height + 10%
    const mainKW = this.lookupFFPumpPower(mainFlow, mainHead);
    
    items.push({
      description: 'Main Hydrant Pump',
      nos: pumpCount,
      flowLPM: mainFlow,
      headM: mainHead,
      kwPerPump: mainKW,
      tcl: mainKW * pumpCount,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25 // 25% during normal, full during fire
    });
    
    // Jockey Pumps
    items.push({
      description: 'Hydrant Jockey Pump',
      nos: pumpCount,
      flowLPM: 180,
      kwPerPump: 9.33,
      tcl: 9.33 * pumpCount,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25
    });
    
    return {
      category: 'Fire Fighting',
      items: items
    };
  }
  
  /**
   * Apply Demand Factors
   */
  applyDemandFactors(loadGroup) {
    loadGroup.items = loadGroup.items.map(item => {
      item.maxDemandKW = item.tcl * (item.mdf || 0.6);
      item.essentialKW = item.tcl * (item.edf || 0.6);
      item.fireKW = item.tcl * (item.fdf || 0.0);
      return item;
    });
    
    // Calculate category totals
    loadGroup.totalTCL = loadGroup.items.reduce((sum, item) => sum + item.tcl, 0);
    loadGroup.totalMaxDemand = loadGroup.items.reduce((sum, item) => sum + item.maxDemandKW, 0);
    loadGroup.totalEssential = loadGroup.items.reduce((sum, item) => sum + item.essentialKW, 0);
    loadGroup.totalFire = loadGroup.items.reduce((sum, item) => sum + item.fireKW, 0);
    
    return loadGroup;
  }
  
  /**
   * Aggregate all loads
   */
  aggregateLoads(buildingLoads, societyLoads, numberOfBuildings) {
    const totalBuildingTCL = buildingLoads.reduce((sum, cat) => sum + cat.totalTCL, 0);
    const totalSocietyTCL = societyLoads.reduce((sum, cat) => sum + cat.totalTCL, 0);
    
    return {
      totalBuildingTCL: totalBuildingTCL * numberOfBuildings,
      totalSocietyTCL: totalSocietyTCL,
      grandTotalTCL: (totalBuildingTCL * numberOfBuildings) + totalSocietyTCL,
      
      totalMaxDemand: buildingLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0) * numberOfBuildings 
                    + societyLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0),
      
      totalEssential: buildingLoads.reduce((sum, cat) => sum + cat.totalEssential, 0) * numberOfBuildings 
                    + societyLoads.reduce((sum, cat) => sum + cat.totalEssential, 0),
      
      totalFire: buildingLoads.reduce((sum, cat) => sum + cat.totalFire, 0) * numberOfBuildings 
               + societyLoads.reduce((sum, cat) => sum + cat.totalFire, 0),
      
      // Transformer sizing (kVA at 0.9 PF)
      transformerSizeKVA: Math.ceil(
        (buildingLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0) * numberOfBuildings 
       + societyLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0)) / 0.9
      )
    };
  }
}

module.exports = new ElectricalLoadCalculator();
```

---

## 📡 API Endpoints

### 1. Create Calculation

```javascript
// POST /api/electrical-load-calculations
router.post('/electrical-load-calculations', async (req, res) => {
  try {
    const {
      projectId,
      calculationName,
      selectedBuildings,
      inputParameters,
      status,
      remarks
    } = req.body;
    
    // Calculate loads
    const results = await electricalLoadService.calculate(
      inputParameters,
      selectedBuildings
    );
    
    // Save to database
    const result = await db.query(`
      INSERT INTO electrical_load_calculations (
        project_id,
        calculation_name,
        selected_buildings,
        input_parameters,
        building_ca_loads,
        society_ca_loads,
        total_loads,
        total_connected_load_kw,
        maximum_demand_kw,
        essential_demand_kw,
        fire_demand_kw,
        status,
        calculated_by,
        remarks,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      projectId,
      calculationName,
      JSON.stringify(selectedBuildings),
      JSON.stringify(inputParameters),
      JSON.stringify(results.buildingCALoads),
      JSON.stringify(results.societyCALoads),
      JSON.stringify(results.totals),
      results.totals.grandTotalTCL,
      results.totals.totalMaxDemand,
      results.totals.totalEssential,
      results.totals.totalFire,
      status || 'Draft',
      req.user.email,
      remarks,
      req.user.email
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating electrical load calculation:', error);
    res.status(500).json({ error: 'Failed to create calculation' });
  }
});
```

### 2. Get All Calculations

```javascript
// GET /api/electrical-load-calculations?projectId=123
router.get('/electrical-load-calculations', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const result = await db.query(`
      SELECT * FROM electrical_load_calculations
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calculations' });
  }
});
```

### 3. Get Single Calculation

```javascript
// GET /api/electrical-load-calculations/:id
router.get('/electrical-load-calculations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT * FROM electrical_load_calculations
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calculation' });
  }
});
```

### 4. Update Calculation

```javascript
// PUT /api/electrical-load-calculations/:id
router.put('/electrical-load-calculations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      calculationName,
      inputParameters,
      status,
      remarks,
      verifiedBy
    } = req.body;
    
    // Recalculate if inputs changed
    let results = null;
    if (inputParameters) {
      const calc = await db.query('SELECT * FROM electrical_load_calculations WHERE id = $1', [id]);
      results = await electricalLoadService.calculate(
        inputParameters,
        calc.rows[0].selected_buildings
      );
    }
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (calculationName) {
      updateFields.push(`calculation_name = $${paramIndex++}`);
      values.push(calculationName);
    }
    
    if (inputParameters) {
      updateFields.push(`input_parameters = $${paramIndex++}`);
      values.push(JSON.stringify(inputParameters));
      
      updateFields.push(`building_ca_loads = $${paramIndex++}`);
      values.push(JSON.stringify(results.buildingCALoads));
      
      updateFields.push(`society_ca_loads = $${paramIndex++}`);
      values.push(JSON.stringify(results.societyCALoads));
      
      updateFields.push(`total_loads = $${paramIndex++}`);
      values.push(JSON.stringify(results.totals));
      
      updateFields.push(`total_connected_load_kw = $${paramIndex++}`);
      values.push(results.totals.grandTotalTCL);
      
      updateFields.push(`maximum_demand_kw = $${paramIndex++}`);
      values.push(results.totals.totalMaxDemand);
      
      updateFields.push(`essential_demand_kw = $${paramIndex++}`);
      values.push(results.totals.totalEssential);
      
      updateFields.push(`fire_demand_kw = $${paramIndex++}`);
      values.push(results.totals.totalFire);
    }
    
    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    
    if (remarks) {
      updateFields.push(`remarks = $${paramIndex++}`);
      values.push(remarks);
    }
    
    if (verifiedBy) {
      updateFields.push(`verified_by = $${paramIndex++}`);
      values.push(verifiedBy);
    }
    
    updateFields.push(`updated_by = $${paramIndex++}`);
    values.push(req.user.email);
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(id);
    
    const result = await db.query(`
      UPDATE electrical_load_calculations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update calculation' });
  }
});
```

### 5. Delete Calculation

```javascript
// DELETE /api/electrical-load-calculations/:id
router.delete('/electrical-load-calculations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(`
      DELETE FROM electrical_load_calculations
      WHERE id = $1
    `, [id]);
    
    res.json({ message: 'Calculation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete calculation' });
  }
});
```

---

## 🎯 Frontend UI Components

### Main Calculation Page

```jsx
// /src/pages/calculations/ElectricalLoadCalculation.jsx

export default function ElectricalLoadCalculation() {
  const { projectId, calculationId } = useParams();
  const [currentStep, setCurrentStep] = useState(1); // 1: Select, 2: Input, 3: Results
  
  // State
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [inputParameters, setInputParameters] = useState({
    // Project level
    projectCategory: 'GOLD 2',
    buildingNumbersPerSociety: 2,
    
    // Building parameters
    buildingHeight: 90,
    numberOfFloors: 38,
    gfEntranceLobby: 100,
    typicalFloorLobby: 30,
    // ... ~100 more fields
  });
  
  const [calculationResults, setCalculationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Handlers
  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/electrical-load-calculations/calculate', {
        method: 'POST',
        body: JSON.stringify({
          inputParameters,
          selectedBuildings
        })
      });
      
      const results = await response.json();
      setCalculationResults(results);
      setCurrentStep(3);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    // Save calculation to database
    // Similar to water demand save
  };
  
  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-6">
          <StepIndicator currentStep={currentStep} />
        </div>
        
        {/* Step 1: Building Selection */}
        {currentStep === 1 && (
          <BuildingSelectionGrid
            buildings={buildings}
            selected={selectedBuildings}
            onSelect={setSelectedBuildings}
            onNext={() => setCurrentStep(2)}
          />
        )}
        
        {/* Step 2: Input Parameters */}
        {currentStep === 2 && (
          <InputParametersForm
            inputs={inputParameters}
            onChange={setInputParameters}
            onCalculate={handleCalculate}
            onBack={() => setCurrentStep(1)}
            loading={loading}
          />
        )}
        
        {/* Step 3: Results Display */}
        {currentStep === 3 && calculationResults && (
          <ResultsDisplay
            results={calculationResults}
            onSave={handleSave}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </div>
    </Layout>
  );
}
```

### Input Form Component

```jsx
// Components for input forms
function InputParametersForm({ inputs, onChange, onCalculate, onBack, loading }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Building & System Configuration</h2>
      
      {/* Collapsible Sections */}
      <Accordion>
        {/* Section 1: Project Info */}
        <AccordionItem title="Project Information">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Project Category">
              <select
                value={inputs.projectCategory}
                onChange={(e) => onChange({ ...inputs, projectCategory: e.target.value })}
              >
                <option>GOLD 1</option>
                <option>GOLD 2</option>
                <option>GOLD 3</option>
                <option>Platinum</option>
                <option>Diamond</option>
              </select>
            </FormField>
            
            <FormField label="Buildings Per Society">
              <select
                value={inputs.buildingNumbersPerSociety}
                onChange={(e) => onChange({ ...inputs, buildingNumbersPerSociety: +e.target.value })}
              >
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
              </select>
            </FormField>
          </div>
        </AccordionItem>
        
        {/* Section 2: Building Specs */}
        <AccordionItem title="Building Specifications">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Building Height (m)">
              <select
                value={inputs.buildingHeight}
                onChange={(e) => onChange({ ...inputs, buildingHeight: +e.target.value })}
              >
                <option>60</option>
                <option>70</option>
                <option>90</option>
                <option>100</option>
                <option>110</option>
                <option>120</option>
                <option>130</option>
                <option>140</option>
                <option>150</option>
              </select>
            </FormField>
            
            <FormField label="Number of Floors">
              <select
                value={inputs.numberOfFloors}
                onChange={(e) => onChange({ ...inputs, numberOfFloors: +e.target.value })}
              >
                <option>15</option>
                <option>20</option>
                <option>25</option>
                <option>30</option>
                <option>33</option>
                <option>35</option>
                <option>38</option>
                <option>39</option>
                <option>43</option>
                <option>45</option>
                <option>50</option>
              </select>
            </FormField>
            
            <FormField label="GF Entrance Lobby (sq.m)">
              <input
                type="number"
                value={inputs.gfEntranceLobby}
                onChange={(e) => onChange({ ...inputs, gfEntranceLobby: +e.target.value })}
              />
            </FormField>
            
            {/* ... Continue for all ~100 fields */}
          </div>
        </AccordionItem>
        
        {/* Section 3: Lift Configuration */}
        <AccordionItem title="Lift Systems">
          {/* Lift fields */}
        </AccordionItem>
        
        {/* Section 4: HVAC */}
        <AccordionItem title="HVAC & Ventilation">
          {/* HVAC fields */}
        </AccordionItem>
        
        {/* Section 5: Fire Fighting */}
        <AccordionItem title="Fire Fighting Systems">
          {/* FF fields */}
        </AccordionItem>
        
        {/* Section 6: PHE */}
        <AccordionItem title="Plumbing & Hydraulic Equipment">
          {/* PHE fields */}
        </AccordionItem>
      </Accordion>
      
      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
          Back
        </button>
        <button
          onClick={onCalculate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate Electrical Load'}
        </button>
      </div>
    </div>
  );
}
```

### Results Display Component

```jsx
function ResultsDisplay({ results, onSave, onBack }) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-yellow-400">
        <h2 className="text-2xl font-bold mb-4">Total Electrical Load Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Connected Load</div>
            <div className="text-3xl font-bold text-gray-900">
              {results.totals.grandTotalTCL.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Maximum Demand</div>
            <div className="text-3xl font-bold text-blue-600">
              {results.totals.totalMaxDemand.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Essential Load</div>
            <div className="text-3xl font-bold text-green-600">
              {results.totals.totalEssential.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Fire Load</div>
            <div className="text-3xl font-bold text-red-600">
              {results.totals.totalFire.toFixed(2)} kW
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-yellow-300">
          <div className="text-sm text-gray-600">Recommended Transformer Size</div>
          <div className="text-2xl font-bold text-purple-600">
            {results.totals.transformerSizeKVA} kVA
          </div>
          <div className="text-xs text-gray-500">Based on 0.9 power factor</div>
        </div>
      </div>
      
      {/* Building CA Loads Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Building Common Area Loads</h3>
        {results.buildingCALoads.map((category, idx) => (
          <LoadCategoryTable key={idx} category={category} />
        ))}
      </div>
      
      {/* Society CA Loads Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Society Common Area Loads</h3>
        {results.societyCALoads.map((category, idx) => (
          <LoadCategoryTable key={idx} category={category} />
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
          Modify Inputs
        </button>
        <button onClick={onSave} className="px-4 py-2 bg-green-600 text-white rounded">
          Save Calculation
        </button>
      </div>
    </div>
  );
}

function LoadCategoryTable({ category }) {
  return (
    <div className="mb-6">
      <h4 className="font-semibold text-lg mb-2">{category.category}</h4>
      <table className="w-full border-collapse border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Description</th>
            <th className="border p-2 text-right">Nos</th>
            <th className="border p-2 text-right">TCL (kW)</th>
            <th className="border p-2 text-right">Max Demand (kW)</th>
            <th className="border p-2 text-right">Essential (kW)</th>
            <th className="border p-2 text-right">Fire (kW)</th>
          </tr>
        </thead>
        <tbody>
          {category.items.map((item, idx) => (
            <tr key={idx}>
              <td className="border p-2">{item.description}</td>
              <td className="border p-2 text-right">{item.nos || '-'}</td>
              <td className="border p-2 text-right">{item.tcl.toFixed(2)}</td>
              <td className="border p-2 text-right">{item.maxDemandKW.toFixed(2)}</td>
              <td className="border p-2 text-right">{item.essentialKW.toFixed(2)}</td>
              <td className="border p-2 text-right">{item.fireKW.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-blue-50 font-bold">
          <tr>
            <td className="border p-2" colSpan="2">Subtotal - {category.category}</td>
            <td className="border p-2 text-right">{category.totalTCL.toFixed(2)}</td>
            <td className="border p-2 text-right">{category.totalMaxDemand.toFixed(2)}</td>
            <td className="border p-2 text-right">{category.totalEssential.toFixed(2)}</td>
            <td className="border p-2 text-right">{category.totalFire.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Backend (Week 1-2)

- [ ] Create database schema
  - [ ] `electrical_load_calculations` table
  - [ ] `electrical_load_lookup_tables` table
  - [ ] Seed lookup data from Excel "Data" sheet
- [ ] Build calculation service
  - [ ] Implement calculation engine
  - [ ] Port Excel formulas to JavaScript
  - [ ] Create VLOOKUP equivalents
  - [ ] Demand factor logic
- [ ] Create API endpoints
  - [ ] POST /api/electrical-load-calculations
  - [ ] GET /api/electrical-load-calculations
  - [ ] GET /api/electrical-load-calculations/:id
  - [ ] PUT /api/electrical-load-calculations/:id
  - [ ] DELETE /api/electrical-load-calculations/:id
- [ ] Add unit tests

### Phase 2: Frontend Components (Week 3-4)

- [ ] Create main calculation page
- [ ] Build building selection grid (reuse from water demand)
- [ ] Create input parameter form
  - [ ] 26 dropdown validations
  - [ ] ~100 input fields organized in collapsible sections
  - [ ] Real-time validation
- [ ] Build results display
  - [ ] Summary cards
  - [ ] Detailed breakdown tables
  - [ ] Charts/visualizations (optional)
- [ ] Implement save functionality

### Phase 3: Integration (Week 5)

- [ ] Add to Design Calculations page
- [ ] Update routing
- [ ] Add to navigation
- [ ] Enable "Quick Calculator" button
- [ ] Test end-to-end flow

### Phase 4: Testing & Documentation (Week 6)

- [ ] Test calculations against Excel
- [ ] Verify all formulas match Excel results
- [ ] Create user guide
- [ ] Add help tooltips
- [ ] Performance testing

---

## 🎓 Key Learnings from Water Demand Pattern

### What Worked Well (Replicate)
1. ✅ JSONB storage for flexible data structures
2. ✅ Separate table for calculations (not in design_calculations)
3. ✅ Multi-step wizard UI
4. ✅ Save draft → Edit → Finalize workflow
5. ✅ Integration with main Design Calculations list

### Areas for Improvement
1. 🔄 More input validation (26 dropdowns help enforce this)
2. 🔄 Better error handling
3. 🔄 Add calculation history/versioning
4. 🔄 Export to Excel/PDF functionality

---

## 📊 Data Flow Diagram

```
User Action                  Frontend                Backend                  Database
───────────                  ────────                ───────                  ────────

1. Select Buildings     →    BuildingGrid         
                              ↓
2. Fill Inputs          →    InputForm
                              ↓
3. Click "Calculate"    →    API Call            → ElectricalLoadService
                                                    ├─ Calculate Building CA
                                                    ├─ Calculate Society CA
                                                    ├─ VLOOKUP equipment    → lookup_tables
                                                    ├─ Apply demand factors
                                                    └─ Aggregate totals
                              ↓
4. View Results         ←    Results JSON
                              ↓
5. Click "Save"         →    Save API Call       → INSERT INTO            → electrical_load_calculations
                              ↓
6. Confirmation         ←    Success Response
```

---

## 🔧 Configuration & Settings

### Environment Variables
```env
# No new env vars needed - uses existing database connection
```

### Lookup Table Seed Script
```sql
-- /scripts/seed-electrical-lookup-tables.sql

INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit) VALUES
-- Lift power by building height
('lift_power', 'building_height', '60', 12.0, 'kW'),
('lift_power', 'building_height', '70', 14.0, 'kW'),
('lift_power', 'building_height', '90', 15.0, 'kW'),
-- ... (continue from Excel Data sheet)

-- PHE pump power by flow
('phe_pump', 'flow_lpm', '100', 0.75, 'kW'),
('phe_pump', 'flow_lpm', '200', 1.1, 'kW'),
-- ... etc

-- AC sizing by area
('ac_sizing', 'area_sqft', '150', 1.0, 'TR'),
-- ... etc
;
```

---

## 📝 Summary

### Effort Estimate

| Component | Effort | Team |
|-----------|--------|------|
| Database Schema | 2 days | Backend |
| Lookup Table Seeding | 1 day | Backend |
| Calculation Service | 5 days | Backend |
| API Endpoints | 2 days | Backend |
| Frontend - Building Selection | 1 day | Frontend (reuse existing) |
| Frontend - Input Forms | 7 days | Frontend |
| Frontend - Results Display | 3 days | Frontend |
| Integration & Testing | 4 days | Full Team |
| Documentation | 2 days | Technical Writer |
| **Total** | **~5-6 weeks** | 2-3 developers |

### Complexity Level: **High**
- Excel has 1000+ formulas
- Complex interconnected calculations
- ~100 input parameters
- Multiple demand factors
- Equipment sizing lookups

### Success Criteria
1. ✅ Calculations match Excel within 1% accuracy
2. ✅ All 26 dropdowns working with validation
3. All ~100 inputs captured
4. ✅ Building + Society loads calculated correctly
5. ✅ Demand factors (MDF, EDF, FDF) applied properly
6. ✅ Results saved and retrievable
7. ✅ Integrated into Design Calculations page
8. ✅ Performant (<2s calculation time)

---

## 🚀 Next Steps

1. **Review this plan** with the team
2. **Decide on phased rollout** or full implementation
3. **Create detailed technical specs** for each component
4. **Set up development environment** (database tables, API stubs)
5. **Start with Phase 1** (Backend foundation)
6. **Iterative development** with frequent testing against Excel

---

## 📞 Questions to Address Before Implementation

1. **Scope**: Full Excel replication or MVP with core features first?
2. **External Files**: How to handle external workbook references (C1-PHE sheet)?
3. **Multiple Buildings**: Calculate separately or aggregate across all selected buildings?
4. **Templates**: Should we store "templates" for common building configurations?
5. **Export**: Need to export results back to Excel format for MSEDCL submission?
6. **Validation**: Who verifies calculations before "Approved" status?
7. **Updates**: How to handle future updates to codes (NBC, EcoNiwas Samhita)?

---

End of Implementation Plan
