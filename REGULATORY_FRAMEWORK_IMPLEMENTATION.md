# Regulatory Framework System - Implementation Complete

## Overview

A **document-driven, database-powered regulatory framework system** has been implemented that allows electrical load calculations to follow different utility regulations (MSEDCL, NBC, Gujarat DGVCL, etc.) without requiring code changes.

## What Was Built

### 1. **Database Schema (12 Tables)**

All regulatory guidelines are now stored in database tables:

- `electrical_regulation_frameworks` - Registry of all regulation documents
- `regulation_area_types` - Rural, Urban, Metro, Major Cities definitions
- `regulation_load_standards` - Minimum load requirements (75/150/200 W/sq.m)
- `regulation_dtc_thresholds` - DTC capacity thresholds by area type
- `regulation_sanctioned_load_limits` - Max load limits (160kW/480kW)
- `regulation_power_factors` - Power factor standards (0.8/0.9)
- `regulation_substation_requirements` - Substation sizing rules
- `regulation_land_requirements` - Land area requirements for infrastructure
- `regulation_lease_terms` - Lease agreement terms (99 years, Rs. 1/year)
- `regulation_infrastructure_specs` - Technical specifications
- `regulation_definitions` - Glossary of terms
- `project_regulation_selection` - Which framework applies to which project

### 2. **MSEDCL 2016 Framework Pre-loaded**

Complete MSEDCL circular data has been extracted and stored:

✅ **4 Area Types**: Rural, Urban, Metro, Major Cities (with Mumbai, Pune, etc.)
✅ **4 Load Standards**: Residential (75), Commercial AC (200), Commercial (150), EV Charging
✅ **4 DTC Thresholds**: 25/75/250 kVA based on area type
✅ **2 Sanctioned Limits**: 160 kW single, 480 kW  cumulative
✅ **3 Power Factors**: Sanctioned (0.8), Load After DF (0.9), Transformer (0.9)
✅ **5 Substation Requirements**: By area and load range (3-20 MVA)
✅ **12 Land Requirements**: DTC, Substation types with sq.m requirements
✅ **1 Lease Terms**: 99 years @ Rs. 1/year
✅ **7 Infrastructure Specs**: Ring main, individual transformers, cable specs
✅ **22 Definitions**: Consumer, Power Factor, Diversity Factor, etc.

### 3. **Enhanced Calculation Service**

`electricalLoadService.js` now includes:

```javascript
// Load regulations for a project
await calculator.loadRegulations(projectId);

// Calculate minimum load per regulations
const msedclMin = calculator.calculateMinimumLoad(carpetArea, 'RESIDENTIAL');

// Get power factor from regulations
const pf = calculator.getPowerFactor('SANCTIONED_LOAD'); // 0.8

// Check DTC requirements
const dtc = calculator.calculateDTCRequirements(loadKW, 'METRO');

// Validate sanctioned load limits
const validation = calculator.validateSanctionedLoad(loadKW, loadKVA);

// Get substation requirements
const substation = calculator.calculateSubstationRequirements(loadKW, 'URBAN');
```

### 4. **New Calculation Outputs**

Calculations now return `regulatoryCompliance` object with:

**A. MSEDCL Minimum Load**
```javascript
msedclMinimum: {
  requiredKW: 90.00,
  carpetArea: 1200,
  standard: '75 W/sq.m (MSEDCL)',
  applied: true
}
```

**B. Sanctioned Load (for billing)**
```javascript
sanctionedLoad: {
  totalConnectedLoadKW: 1250.00,
  sanctionedLoadKW: 1250.00,
  sanctionedLoadKVA: 1562.50,
  powerFactor: 0.8,
  note: 'Without diversity factor - for quotation and billing'
}
```

**C. Load After DF (for infrastructure)**
```javascript
loadAfterDF: {
  maxDemandKW: 625.00,
  maxDemandKVA: 694.44,
  essentialKW: 312.50,
  fireKW: 125.00,
  powerFactor: 0.9,
  note: 'ONLY for deciding DTC capacity, NOT for quotation'
}
```

**D. DTC Requirements**
```javascript
dtc: {
  needed: true,
  threshold: 250,
  loadAfterDF_KVA: 694.44,
  dtcCount: 2,
  totalCapacity: 1000,
  landRequired: 40,
  individualTransformerRequired: true,
  ringMainRequired: true
}
```

**E. Substation Requirements**
```javascript
substation: {
  needed: true,
  loadAfterDF_MVA: 4.2,
  substationType: '33/11 kV or 22/11 kV Substation',
  incomingFeeders: 2,
  feederCapacity: 20,
  specialRequirements: ['Ring Main System', 'Individual transformers per building'],
  landRequired: 1000
}
```

**F. Validation Warnings**
```javascript
validation: {
  valid: false,
  exceedsKWLimit: true,
  exceedsKVALimit: false,
  maxKW: 160,
  maxKVA: 200,
  warnings: ['Sanctioned load 180 kW exceeds limit of 160 kW']
}
```

### 5. **New API Endpoints**

**Regulatory Frameworks Management:**
- `GET /api/regulatory-frameworks` - List all frameworks
- `GET /api/regulatory-frameworks/:id` - Get framework with all details
- `POST /api/regulatory-frameworks` - Create new framework (L0 only)
- `PUT /api/regulatory-frameworks/:id` - Update framework (L0 only)

**Project Framework Selection:**
- `GET /api/projects/:projectId/regulatory-framework` - Get project's framework
- `POST /api/projects/:projectId/regulatory-framework` - Set project's framework

### 6. **Database Fields Added**

**Projects Table:**
- `area_type` - RURAL, URBAN, METRO, MAJOR_CITIES
- `total_carpet_area` - Total carpet area in sq.m
- `framework_id` - Selected regulatory framework

**Buildings Table:**
- `total_carpet_area` - Building carpet area

**Flats Table:**
- `carpet_area` - Flat carpet area

**Electrical Load Calculations Table:**
- `framework_ids[]` - Array of frameworks used
- `area_type` - Area classification
- `total_carpet_area` - Total carpet area
- `sanctioned_load_kw` - Sanctioned load (without DF)
- `sanctioned_load_kva` - Sanctioned load in kVA
- `msedcl_minimum_kw` - MSEDCL minimum requirement
- `load_method_applied` - NBC or MSEDCL Minimum
- `load_after_df_kw` - Load after diversity factor
- `load_after_df_kva` - Load after DF in kVA
- `dtc_needed` - Boolean
- `dtc_type`, `dtc_capacity_kva`, `dtc_count`, `dtc_land_sqm`
- `substation_needed` - Boolean
- `substation_type`, `substation_land_sqm`
- `exceeds_single_consumer_limit` - Boolean
- `exceeds_cumulative_limit` - Boolean
- `validation_warnings[]` - Array of warnings
- `calculation_metadata` - JSONB with full compliance data

## How to Add New Regulatory Framework

When a new utility document arrives (e.g., Gujarat DGVCL 2024):

### Step 1: Create Framework Entry (L0 User)
```javascript
POST /api/regulatory-frameworks
{
  "framework_code": "DGVCL_2024",
  "framework_name": "Gujarat DGVCL Load Calculation Guidelines 2024",
  "issuing_authority": "Dakshin Gujarat Vij Company Limited",
  "state": "Gujarat",
  "circular_number": "DGVCL/Tech/2024/01",
  "issue_date": "2024-01-01",
  "effective_date": "2024-01-01",
  "document_url": "https://example.com/dgvcl_circular.pdf",
  "is_default": false,
  "notes": "Gujarat electrical load calculation standards"
}
```

### Step 2: Add Regulation Data

Insert data into each table with the new `framework_id`:

```sql
-- Area types
INSERT INTO regulation_area_types (framework_id, area_type_code, area_type_name, description) VALUES
  (2, 'RURAL', 'Rural Gujarat', 'Villages and rural areas'),
  (2, 'URBAN', 'Urban Gujarat', 'Cities like Surat, Vadodara');

-- Load standards (might be different from MSEDCL)
INSERT INTO regulation_load_standards (framework_id, premise_type, minimum_load_w_per_sqm) VALUES
  (2, 'RESIDENTIAL', 80.00),  -- Gujarat might require 80 W/sq.m
  (2, 'COMMERCIAL_AC', 220.00);

-- DTC thresholds (could be different)
INSERT INTO regulation_dtc_thresholds (framework_id, area_type_code, threshold_kva) VALUES
  (2, 'RURAL', 30.00),  -- Gujarat might have 30 kVA threshold
  (2, 'URBAN', 100.00);

-- ... Continue for all regulation tables
```

### Step 3: Project Selects Framework

```javascript
POST /api/projects/123/regulatory-framework
{
  "frameworkId": 2,  // DGVCL_2024
  "notes": "This project follows Gujarat DGVCL guidelines"
}
```

### Step 4: Calculations Automatically Use New Framework

When calculating for this project:
```javascript
const results = await calculator.calculate(inputs, buildings, projectId);
// Will use DGVCL 2024 rules automatically
```

## Key Features

### 1. **No Code Changes Required**
- New regulations = new database rows
- No redeployment needed
- L0 users can manage everything

### 2. **Multi-Framework Support**
- Projects can select which framework to follow
- Same codebase handles MSEDCL, NBC, DGVCL, etc.
- Can even combine multiple frameworks if needed

### 3. **Historical Versioning**
- Old calculations remain valid with their original framework
- `framework_ids[]` tracks which regulations were used
- Can supersede frameworks using `superseded_date`

### 4. **Compliance Validation**
- Automatic checking against regulatory limits
- Clear warnings when limits exceeded
- Detailed explanations from the regulations

### 5. **Document-Driven**
- All numbers come from official circulars
- Definitions stored from regulatory glossaries
- Lease terms, land requirements all traceable to source

## UI Integration Next Steps

### Add Framework Selection to Project Settings

```jsx
// In project settings page
<Select label="Regulatory Framework" value={project.framework_id}>
  <option value="1">MSEDCL 2016 (Maharashtra)</option>
  <option value="2">Gujarat DGVCL 2024</option>
  <option value="3">NBC 2016 National</option>
</Select>
```

### Add Area Type Field

```jsx
<Select label="Area Type" value={inputs.areaType}>
  <option value="RURAL">Rural Area</option>
  <option value="URBAN">Urban Area</option>
  <option value="METRO">Metropolitan Area</option>
  <option value="MAJOR_CITIES">Major Cities</option>
</Select>
```

### Add Carpet Area Input

```jsx
<Input
  type="number"
  label="Total Carpet Area (sq.m)"
  value={inputs.totalCarpetArea}
  onChange={(e) => setInputs({...inputs, totalCarpetArea: e.target.value})}
  helpText="Carpet area for MSEDCL minimum load calculation (75 W/sq.m)"
/>
```

### Display Regulatory Compliance Results

```jsx
{results.regulatoryCompliance && (
  <div className="regulatory-compliance">
    <h3>Regulatory Compliance - {results.regulatoryFramework.framework_name}</h3>
    
    {/* Sanctioned Load */}
    <div className="sanctioned-load">
      <h4>Sanctioned Load (Contract Demand)</h4>
      <p>Total Connected Load: {compliance.sanctionedLoad.totalConnectedLoadKW} kW</p>
      <p>Sanctioned Load: {compliance.sanctionedLoad.sanctionedLoadKW} kW / {compliance.sanctionedLoad.sanctionedLoadKVA} kVA</p>
      <small>{compliance.sanctionedLoad.note}</small>
    </div>

    {/* Load After DF */}
    <div className="load-after-df">
      <h4>Load After Diversity Factor (For DTC Sizing Only)</h4>
      <p>Max Demand: {compliance.loadAfterDF.maxDemandKW} kW / {compliance.loadAfterDF.maxDemandKVA} kVA</p>
      <small>{compliance.loadAfterDF.note}</small>
    </div>

    {/* DTC Requirements */}
    {compliance.dtc.needed && (
      <div className="dtc-requirements">
        <h4>DTC Requirements</h4>
        <p>Area Type: {results.areaType}</p>
        <p>Threshold: {compliance.dtc.threshold} kVA</p>
        <p>Load After DF: {compliance.dtc.loadAfterDF_KVA} kVA</p>
        <p>Required: {compliance.dtc.dtcCount} DTC(s) @ {compliance.dtc.dtcCapacityPerUnit} kVA each</p>
        <p>Total Capacity: {compliance.dtc.totalCapacity} kVA</p>
        <p>Land Required: {compliance.dtc.landRequired} sq.m</p>
        {compliance.dtc.ringMainRequired && <p>⚠️ Ring Main System Required</p>}
        {compliance.dtc.individualTransformerRequired && <p>⚠️ Individual Transformer Per Building Required</p>}
      </div>
    )}

    {/* Validation Warnings */}
    {compliance.warnings.length > 0 && (
      <div className="warnings">
        <h4>⚠️ Regulatory Warnings</h4>
        {compliance.warnings.map((warning, i) => (
          <p key={i} className="text-red-600">{warning}</p>
        ))}
      </div>
    )}
  </div>
)}
```

## Files Modified/Created

### Created:
1. `/migrations/0010_regulatory_framework.sql` - Complete database schema
2. `/scripts/run-regulatory-migration.js` - Migration runner

### Modified:
1. `/server/services/electricalLoadService.js` - Added regulation loading and compliance
2. `/server/index.js` - Updated POST endpoint, added 6 new API endpoints

## Migration Status

✅ **Migration Complete!**
- 12 tables created
- 1 framework loaded (MSEDCL 2016)
- 4 area types defined
- 4 load standards populated
- 4 DTC thresholds configured
- View created for easy querying

## Testing the System

```javascript
// 1. Get available frameworks
GET /api/regulatory-frameworks

// 2. Select framework for project
POST /api/projects/9/regulatory-framework
{ "frameworkId": 1, "notes": "Using MSEDCL 2016" }

// 3. Run calculation with area type and carpet area
POST /api/electrical-load-calculations
{
  "projectId": 9,
  "inputParameters": {
    "areaType": "METRO",
    "totalCarpetArea": 1200,
    ... other inputs
  },
  ...
}

// 4. View regulatory compliance in results
// - sanctionedLoad (for billing)
// - loadAfterDF (for DTC sizing)
// - dtc requirements
// - substation requirements
// - validation warnings
```

## Summary

✨ **You now have a fully document-driven regulatory framework system.**

When a new utility regulation document arrives:
1. L0 user creates new framework entry via API
2. L0 user uploads regulation data (or uses a parsing tool)
3. Projects select which framework to follow
4. Calculations automatically comply with selected regulations
5. No code changes, no redeployment needed

This architecture supports:
- Multiple states (Maharashtra MSEDCL, Gujarat DGVCL, Karnataka BESCOM, etc.)
- Multiple versions (MSEDCL 2016, MSEDCL 2024, etc.)
- Multiple standards (NBC, EcoNiwas, local bylaws, etc.)
- Combination of frameworks (NBC + MSEDCL together)
- Historical tracking (know which regulation produced which result)
