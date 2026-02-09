# Electrical Load Calculation - Implementation Summary

## ✅ Implementation Complete

The electrical load calculation feature has been successfully implemented and integrated into the MEP project management system.

---

## 📦 What Was Implemented

### 1. Database Schema ✓
- **Table**: `electrical_load_calculations`
  - Stores calculation inputs, results, and metadata
  - JSONB fields for flexible data storage
  - Summary fields for quick queries (TCL, Max Demand, Essential, Fire loads)
  - Transformer sizing recommendation

- **Table**: `electrical_load_lookup_tables`
  - Equipment sizing lookup data (replaces Excel VLOKUPs)
  - 12 categories with 57 total lookup entries
  - Categories: lift_power, phe_pump, ff_main_pump, ff_sprinkler_pump, ff_jockey_pump, ac_sizing, ac_power, ventilation_fan, pressurization_fan, sewage_pump, stp_power, ev_charger

**Migration File**: `/migrations/0010_electrical_load_calculations.sql`

---

### 2. Backend Services ✓

#### Calculation Service
**File**: `/server/services/electricalLoadService.js`

**Features**:
- Complete electrical load calculation engine
- Mirrors Excel formula logic from MSEDCL spreadsheet
- Calculates:
  - Building Common Area Loads (Lighting, Lifts, HVAC, Pressurization, PHE, FF)
  - Society Common Area Loads (Main FF system, PHE transfer, Infrastructure)
  - Demand factors (MDF, EDF, FDF)
  - Total loads and transformer sizing

**Key Functions**:
```javascript
- calculate()                    // Main calculation orchestrator
- calculateBuildingCALoads()     // Building-level loads
- calculateSocietyCALoads()      // Society-level loads
- calculateLighting()            // Lighting & small power
- calculateLifts()               // Lift systems
- calculateHVAC()                // HVAC & ventilation
- calculatePressurization()      // Pressurization systems
- calculateBuildingPHE()         // PHE equipment
- calculateFFPumps()             // Fire fighting pumps
- applyDemandFactors()           // Apply MDF, EDF, FDF
- aggregateLoads()               // Sum up all loads
- lookupValue()                  // Database lookup for equipment sizing
```

#### API Endpoints
**File**: `/server/index.js` (lines 4090-4315)

**Endpoints**:
- `POST /api/electrical-load-calculations` - Create new calculation
- `GET /api/electrical-load-calculations?projectId=X` - List all calculations
- `GET /api/electrical-load-calculations/:id` - Get single calculation
- `PUT /api/electrical-load-calculations/:id` - Update calculation
- `DELETE /api/electrical-load-calculations/:id` - Delete calculation

---

### 3. Frontend Components ✓

#### Main Component
**File**: `/src/pages/calculations/ElectricalLoadCalculation.jsx`

**Features**:
- Multi-step wizard interface
  - Step 1: Building selection
  - Step 2: Input parameters form
  - Step 3: Results display and save
- Collapsible input sections
- Real-time calculation
- Results breakdown by category
- Save calculations with status workflow

**Input Sections**:
1. Project Information
2. Building Specifications
3. Lift Systems
4. HVAC & Ventilation
5. Pressurization Systems
6. PHE (Building Level)
7. Fire Fighting (Society Level)
8. Society Infrastructure

**Results Display**:
- Summary card with 4 load types (TCL, Max Demand, Essential, Fire)
- Transformer size recommendation
- Building CA loads breakdown table
- Society CA loads breakdown table
- Save form (name, status, remarks)

---

### 4. Integration ✓

**File**: `/src/pages/DesignCalculations.jsx` (line 443-453)

- Electrical Load button enabled in "Quick Calculators" section
- Navigation to `/projects/:projectId/calculations/electrical-load/new`
- Button styled with yellow/gold theme (matches electrical theme)
- Descriptive subtitle: "Auto-calculate from parameters"

---

## 🎯 Features Implemented

### Input Parameters (~100 fields)
✓ Project category (GOLD 1-3, Platinum, Diamond)  
✓ Building specifications (height, floors, lobby areas)  
✓ Lift configuration (passenger, fire, service lifts)  
✓ HVAC & ventilation systems  
✓ Staircase & lobby pressurization  
✓ PHE equipment (booster pumps, sewage pumps)  
✓ Fire fighting systems (hydrant, sprinkler pumps)  
✓ Society infrastructure (STP, clubhouse, EV chargers, street lighting)  

### Calculations
✓ Building Common Area Loads  
✓ Society Common Area Loads  
✓ Demand factor applications (MDF, EDF, FDF)  
✓ Total Connected Load (kW)  
✓ Maximum Demand (kW)  
✓ Essential Load (kW)  
✓ Fire Load (kW)  
✓ Transformer sizing (kVA @ 0.9 PF)  

### Workflow
✓ Draft → Under Review → Approved status  
✓ Save calculations with name and remarks  
✓ Edit existing calculations  
✓ Recalculate on input changes  
✓ Delete calculations  

---

## 📊 Database Seeding

**Lookup Tables Seeded**:
```
lift_power: 9 entries (by building height)
phe_pump: 8 entries (by flow rate LPM)
ff_main_pump: 4 entries (by flow rate LPM)
ff_sprinkler_pump: 4 entries (by flow rate LPM)
ff_jockey_pump: 1 entry (standard)
ac_sizing: 5 entries (by area sqft)
ac_power: 5 entries (by tonnage TR)
ventilation_fan: 5 entries (by CFM)
pressurization_fan: 2 entries (staircase, lobby)
sewage_pump: 4 entries (by capacity LPM)
stp_power: 6 entries (by capacity KLD)
ev_charger: 4 entries (by type: slow, fast, rapid, ultra-fast)
```

**Total**: 57 lookup entries

---

## 🚀 How to Use

### For Users:

1. **Navigate to Design Calculations**
   - Go to Project → Design Calculations
   - Click "Quick Calculators" → "Electrical Load" button

2. **Select Buildings**
   - Choose one or more buildings for calculation
   - Click "Next: Input Parameters"

3. **Input Building Parameters**
   - Fill in building specifications (height, floors, areas)
   - Configure lift systems
   - Set HVAC/ventilation parameters
   - Configure fire fighting and PHE systems
   - Click "Calculate Electrical Load"

4. **Review Results**
   - View total loads summary (TCL, Max Demand, Essential, Fire)
   - Review transformer sizing recommendation
   - Check detailed breakdown by category
   - Enter calculation name and remarks
   - Click "Save Calculation"

5. **Manage Calculations**
   - View saved calculations in Design Calculations list
   - Edit or delete as needed
   - Change status: Draft → Under Review → Approved

### For Developers:

**To extend the feature**:
1. Add new input parameters in `ElectricalLoadCalculation.jsx`
2. Update calculation logic in `electricalLoadService.js`
3. Add new lookup data via `seed-electrical-lookup-tables.sql`
4. Test calculations against Excel validation

**To modify formulas**:
- Edit `/server/services/electricalLoadService.js`
- Each calculation function (lighting, lifts, HVAC, etc.) is modular
- Lookup values come from database, easy to update

---

## 📁 Files Created/Modified

### Created Files:
1. `/migrations/0010_electrical_load_calculations.sql`
2. `/scripts/seed-electrical-lookup-tables.sql`
3. `/scripts/seed-electrical-lookups.js`
4. `/server/services/electricalLoadService.js`

### Modified Files:
1. `/server/index.js` - Added API endpoints and service import
2. `/src/pages/calculations/ElectricalLoadCalculation.jsx` - Full implementation
3. `/src/pages/DesignCalculations.jsx` - Enabled electrical load button
4. `/ELECTRICAL_LOAD_IMPLEMENTATION_PLAN.md` - Implementation plan document

---

## 🧪 Testing

### Manual Testing Steps:
1. ✓ Database tables created successfully
2. ✓ Lookup data seeded (57 entries across 12 categories)
3. ✓ API endpoints accessible
4. ✓ Frontend loads without errors
5. ✓ Building selection works
6. ✓ Input form fields functional
7. ⏳ Calculation executes (needs frontend testing)
8. ⏳ Results display correctly (needs frontend testing)
9. ⏳ Save functionality works (needs frontend testing)

### Validation Against Excel:
- Calculation formulas mirror Excel logic
- Demand factors match MSEDCL standards
- Lookup tables populated from Excel "Data" sheet
- **Recommended**: Test calculated values against Excel for accuracy

---

## 🎓 Technical Details

### Architecture Pattern:
- Follows existing Water Demand Calculation pattern
- Multi-step wizard UI
- JSONB storage for flexibility
- RESTful API endpoints
- Modular calculation service

### Demand Factors (as per MSEDCL):
- **MDF (Maximum Demand Factor)**: 0.6 (typically)
- **EDF (Essential Demand Factor)**: 0.6 (typically)
- **FDF (Fire Demand Factor)**: 0.0 - 1.0 (varies by equipment)

### Transformer Sizing:
```
Transformer kVA = Maximum Demand (kW) / Power Factor (0.9)
Rounded up to nearest 100 kVA
```

---

## 📌 Next Steps (Optional Enhancements)

### Short-term:
- [ ] Test calculations against Excel validation data
- [ ] Add more input validation and error handling
- [ ] Implement export to PDF/Excel functionality
- [ ] Add calculation history/versioning

### Medium-term:
- [ ] Add calculation templates for common building types
- [ ] Implement comparison between multiple calculations
- [ ] Add graphical load distribution charts
- [ ] Support for external file references (PHE Load Calculation, Booster pump DWS)

### Long-term:
- [ ] AI-powered recommendations for equipment sizing
- [ ] Integration with MSEDCL submission portal
- [ ] Compliance checking against NBC/EcoNiwas Samhita
- [ ] Multi-building optimization

---

## 🔧 Maintenance

### Updating Equipment Lookup Data:
1. Edit `/scripts/seed-electrical-lookup-tables.sql`
2. Add/modify INSERT statements
3. Run: `node scripts/seed-electrical-lookups.js`

### Updating Calculation Logic:
1. Edit `/server/services/electricalLoadService.js`
2. Modify relevant calculation functions
3. Test against known values
4. Restart server

### Updating UI:
1. Edit `/src/pages/calculations/ElectricalLoadCalculation.jsx`
2. Add/modify input sections or results display
3. Refresh frontend to see changes

---

## ✨ Success Metrics

✅ Database schema created  
✅ 57 equipment sizing lookup entries seeded  
✅ Calculation engine implemented with ~20 calculation functions  
✅ 5 RESTful API endpoints created  
✅ Full frontend wizard UI implemented  
✅ Feature integrated into Design Calculations page  
✅ Follows existing design patterns  
✅ Ready for user testing  

---

## 📞 Support

For questions or issues:
1. Check implementation plan: `/ELECTRICAL_LOAD_IMPLEMENTATION_PLAN.md`
2. Review Excel analysis: `/ELECTRICAL_LOAD_CALCULATION_ANALYSIS.md`
3. Check calculation service code: `/server/services/electricalLoadService.js`
4. Verify database data: Query `electrical_load_lookup_tables`

---

**Implementation Date**: February 6, 2026  
**Status**: ✅ Complete and Ready for Testing  
**Next Action**: Frontend testing and Excel validation
