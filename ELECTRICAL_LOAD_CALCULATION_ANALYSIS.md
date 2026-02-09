# Electrical Load Calculation - MSEDCL Analysis

## Overview
This Excel spreadsheet is a comprehensive **Electrical Load Calculation** tool for MSEDCL (Maharashtra State Electricity Distribution Co. Ltd.) designed for high-rise residential building projects. It calculates electrical demand for building common areas, apartments, and society-level infrastructure.

## 🔑 Key Features

### 1. **Data Validation & Dropdown Lists**
- **26 dropdown lists** in the Inputs sheet ensure data consistency
- Prevents invalid entries (e.g., only standard building heights, pump configurations)
- Covers: Project categories, equipment configs, pump types, ventilation modes, etc.

### 2. **Cross-Sheet Linking**
- **76+ cross-sheet cell references** create dynamic calculations
- **Inputs sheet** ↔ All calculation sheets (automatic updates)
- **Data sheet** ↔ Equipment sizing via VLOOKUP
- **External file links** for detailed PHE calculations
- Changes in one place propagate throughout the workbook

### 3. **Calculation Complexity**
- ~100 input parameters
- 10+ lookup tables
- 1000+ formulas
- Automatic demand factor applications
- Compliance with Indian building codes

---

## File Structure

### Sheets Overview
The workbook contains **10 sheets**:

1. **Inputs** - All project parameters and user inputs
2. **Building CA LOAD** - Building Common Area electrical loads
3. **Society CA LOAD** - Society-level electrical loads
4. **Data** - Lookup tables and reference data
5. **C1-HVAC** - HVAC electrical load calculations
6. **C1-PHE ELE LOAD** - Plumbing & Hydraulic Equipment loads
7. **ASPI CA- Lighting** - ASPI building lighting calculations
8. **ASPI-UPS Sizing Calculation** - UPS sizing for emergency power
9. **C1-FF Load** - Fire Fighting system loads
10. **A-FSI** - Floor Space Index and unit distribution

---

## 1. INPUTS Sheet

### Purpose
Central input sheet where all project parameters are entered. All other sheets reference these values.

### **🔽 DROPDOWN LISTS (Data Validation)**

The Inputs sheet contains **26 dropdown lists** for user selection to ensure data consistency:

| Cell | Parameter | Options |
|------|-----------|---------|
| **B3** | Project Category | `GOLD 1, GOLD 2, GOLD 3, Platinum, Diamond` |
| **B5** | Building Numbers Per Society | `1, 2, 3, 4, 5` |
| **B9** | Building Height | `60, 70, 90, 100, 110, 120, 130, 140, 150` meters |
| **B10** | No of Floors | `15, 20, 25, 30, 33, 35, 38, 39, 43, 45, 50` |
| **B16** | Refuger Floor | `1, 2, 3, 4, 5, 6, 7` |
| **B19** | Service Floor | `1, 2` |
| **B21-B22** | Lobby Type | `Nat. Vent, Mech. Vent, AC` |
| **B23-B24** | Staircase Type | `Nat. Vent, Pressurized` |
| **B26** | No of Passenger Lifts | `2, 3, 4, 5, 6` |
| **B27-B28** | Fire/Service Lifts | `1, 2, 3` |
| **B30** | Wet Services Shaft (Single) | `1, 2, 3, 4, 5, 6` |
| **B31** | Wet Services Shaft (Two) | `1, 2, 3, 4` |
| **B32** | Meter Rooms at GF | `1, 2, 3, 4, 5, Bus-Duct System` |
| **B42** | FF Pump Set Type | `End Suction, MSMO` |
| **B43** | UGT FF Set | `Separate, Combined` |
| **B44** | FF Standby Type | `Electric, Diesel` |
| **B45** | Main Pump Flow | `2280, 2850, 3200` LPM |
| **B48** | FBT Pump Set Type | `Main+SBY+Jky, 2 Main+SBY+Jky` |
| **B49, B51** | FF Pump Flow | `900, 450` LPM |
| **B50** | FF Booster Pump Set | `1, 2, 3` |
| **B53, B56** | PHE Transfer Flow | `100, 200, 300, 400, 500` LPM |
| **B55, B58** | PHE Transfer Config | `1W+1S, 2W+1S, 3W+1S` |
| **B59** | Irrigation Pump Set | `1, 2, 3` |
| **B60** | Irrigation Flow | `60, 90, 150, 180` LPM |
| **B61** | Sump Pump Nos | `1, 2, 3` |
| **B62** | Sump Pump Head | `20, 35` meters |
| **B63** | Booster Pump Set | `1, 2, 3` |
| **B64** | Booster Flow | `100, 200, 300, 400` LPM |
| **B66** | UGT Pump Room Area | `50, 75, 100, ..., 300` sq.m |
| **B67** | STP Capacity | `50, 75, 100, ..., 500` KLD |

**Note:** These dropdowns ensure only valid values are entered, preventing calculation errors and maintaining data integrity.

### Key Input Categories

#### A. Project Level Data
- **Project Name**: Project identifier
- **Project Category**: GOLD 2
- **Project Location**: Location details
- **Building Numbers Per Society**: 2 buildings

#### B. Building Parameters (Per Building)

**General:**
- Building Height: `90.0 m`
- No of Floors: `38` (excluding ground)
- Floor to Floor Height: `=ROUNDUP(B9/B10, 2)` → Calculated as 2.37m
- Ground Floor Entrance Lobby: `100 sq.m`
- Typical Floor Lift Lobby: `30 sq.m`
- Fire Lift Lobby: `8 sq.m`
- Terrace Area: `800 sq.m`
- Refuge Floors: `5` nos
- Refuge Floor Area: `90 sq.m` each
- Landscape Area per Tower: `500 sq.m`
- Service Floor: `1` no, `1200 sq.m`

**Lobby & Staircase Types:**
- Typical Floor Lobby: Natural Ventilation
- Fire Lift Lobby: Natural Ventilation  
- Staircase 1 & 2: Natural Ventilation

**Lifts:**
- Passenger Lifts: `2` nos
- Passenger Lift (Fire case): `1` no
- Firemen Evac/Service/Stretcher Lift: `1` no

**HVAC & Rooms:**
- Enclosed Wet Services Shaft (Single Toilet): `4` nos
- Enclosed Wet Services Shaft (Two Toilets): `2` nos
- Meter Room at GF: `3` nos, avg `15 sq.m`
- Electrical Panel Room: `25 sq.m`
- IBS Room: `15 sq.m`
- OWC Room: `50 sq.m`
- FCC Room: `30 sq.m`
- Lift Machine Room: `20 sq.m`

#### C. Society Level Parameters

**Fire Fighting:**
- FF Pump Set Type: End Suction
- UGT FF Set: Separate
- FF Standby Type: Diesel
- Main Pump Flow: `2850 LPM`
- Main Pump Head: `=B9 + B9*0.1` → 99m (building height + 10%)
- FF Pressure Breaking Tank Set: `=IF(B9>90, CEILING(B9/65,1)-1, "0")*B5` → Calculated based on height
- FBT Pump Set Type: Main+SBY+Jky
- FBT Pump Flow: `900 LPM`
- FF Booster Pump Set: `1` no
- FF Booster Pump Flow: `900 LPM`

**Plumbing & Hydraulic Equipment (PHE):**
- UGT Domestic Transfer Flow: `200 LPM`
- UGT Domestic Transfer Head: `99m` (building height + 10%)
- UGT Domestic Transfer Config: 1W+1S (1 Working + 1 Standby)
- UGT Flushing Transfer Flow: `300 LPM`
- UGT Flushing Transfer Head: `99m`
- UGT Flushing Transfer Config: 2W+1S (2 Working + 1 Standby)
- Irrigation Pump Set: `1` no, `150 LPM`
- Sump Pump: `3` nos, `35m` head
- Booster Pump Set: `1` no, `300 LPM`

**Other:**
- UGT Pump Room Area: `200 sq.m`
- STP Capacity: `275 KLD`

---

## 2. BUILDING CA LOAD Sheet

### Purpose
Calculates electrical loads for **Building Common Areas** (not apartments).

### Column Structure

| Column | Parameter | Description |
|--------|-----------|-------------|
| A | S.NO. | Serial number |
| B | Description | Load category |
| C | Details | Specific location/component |
| D | Carpet Area (sqm) | Area in square meters |
| E | Carpet Area (sqft) | `=D*10.76` (conversion) |
| F | Watt per sqft | Power density |
| G | Nos. | Number of units |
| H | TCL per unit (KW) | Total Connected Load per unit |
| I | TCL (kW) | `=H*G` Total Connected Load |
| J | MDF | Maximum Demand Factor |
| K | Maximum Demand (KW) | `=J*I` |
| L | EDF | Essential Demand Factor |
| M | Essential Demand (KW) | `=L*I` |
| N | FDF | Fire Demand Factor |
| O | Fire Demand (KW) | `=N*I` |
| P | Remarks | Notes/standards |

### Load Categories & Calculations

#### 1. Lighting & Small Power

**GF Entrance Lobby:**
```
Area: =Inputs!B12 (100 sqm)
Area in sqft: =D2*10.76 (1076 sqft)
Power Density: 0.3 W/sqft
TCL: =(0.3 * 1076)/1000 = 0.32 kW
Max Demand: =0.6 * 0.32 = 0.19 kW
Essential: =0.6 * 0.32 = 0.19 kW
Fire: =0.25 * 0.32 = 0.08 kW
Standard: EcoNiwas Samhita 3W/sq.m
```

**Typical Floor Lobby:**
```
Area: =Inputs!B13 (30 sqm)
Nos: =Inputs!B10 (38 floors)
Power Density: 0.3 W/sqft
TCL: =(0.3 * 323)/1000 * 38 = 3.68 kW
```

**Staircase:**
```
Nos: =Inputs!B10*2*2 (38 floors * 2 staircases * 2 landings = 152)
Per Fixture: 20W
TCL: =0.02 * 152 = 3.04 kW
MDF: 0.6, EDF: 0.6, FDF: 1.0 (full load during fire)
```

**Refuge Floor:**
```
Area: =Inputs!B17 (90 sqm per floor)
Nos: =Inputs!B16 (5 floors)
Calculation: =(Area_sqft/50) * 20W/1000 * Nos
Logic: 1 fixture per 50 sqft, 20W per fixture
```

**Service Floor:**
```
Area: =Inputs!B20 (1200 sqm)
Nos: =Inputs!B19 (1)
Power Density: 0.3 W/sqft
```

**External (Facade):**
```
Fixed: 5 kW
Based on building height
MDF: 0.6, EDF: 0.25
```

**Landscape:**
```
Area: =Inputs!B18 (500 sqm)
Power Density: 0.8 W/sqft
MDF: 0.6, EDF: 0.25
```

#### 2. Lifts

**Load Calculation:**
```
TCL per lift: =VLOOKUP(Inputs!$B$9, Data!$A$3:$B$11, 2, 0)
```

**VLOOKUP Reference (Data Sheet):**
- Building Height 60m → 12 kW
- Building Height 70m → 14 kW
- Building Height 90m → **15 kW** ✓
- Building Height 100m → 18 kW
- Building Height 110m → 20 kW
- Building Height 120m → 20 kW
- Building Height 130m → 22 kW
- Building Height 140m → 25 kW
- Building Height 150m → 27 kW

**Passenger Lifts:**
```
Nos: =Inputs!B26 (2)
Per Lift: 15 kW
Total: 30 kW
MDF: 0.6 → 18 kW
EDF: 0.6 → 18 kW
FDF: 0.0 (not used in fire)
```

**Passenger + Fire Lift:**
```
Nos: =Inputs!B27 (1)
Per Lift: 15 kW
Total: 15 kW
FDF: 1.0 → 15 kW (full load during fire)
```

**Firemen Evac/Service Lift:**
```
Nos: =Inputs!B28 (1)
Per Lift: 15 kW
Total: 15 kW
FDF: 1.0 → 15 kW
```

#### 3. HVAC & Ventilation

**Meter Room (Exhaust Fan):**
```
Area: =Inputs!B33 (15 sqm)
Nos: =IF(Inputs!B32="Bus-Duct System", 0, Inputs!B32) (3 nos)
Fan Selection: Uses array formula based on Data sheet
Reference: 12 ACPH (Air Changes Per Hour)
Calculation:
  Room Volume = Area * Height (assume 10.33 ft)
  CFM = Volume * 12 ACPH / 60
  Fan KW from lookup table
```

**Electrical Room (Exhaust Fan):**
```
Area: =Inputs!B34 (25 sqm)
Nos: 1
Similar calculation as Meter Room
```

**IBS Room (Exhaust Fan):**
```
Area: =Inputs!B35 (15 sqm)
Nos: 2 (1+1 configuration)
```

**OWC Room (Exhaust Fan):**
```
Area: =Inputs!B36 (50 sqm)
Nos: 1
```

**FCC Room (AC):**
```
Area: =Inputs!B37 (30 sqm)
Uses array formula for AC sizing
TR Calculation: Area/150 sqft = TR requirement
AC Selection: Based on TR range (1, 1.5, or 1.8 TR units)
Total KW: Nos * TR * 0.8
```

**Lift Machine Room (AC):**
```
Area: =Inputs!B38 (20 sqm)
Nos: Calculated based on number of lifts
AC calculation similar to FCC Room
```

**Lift Machine Room (Exhaust Fan):**
```
Same area, but exhaust fan instead
FDF: 1.0 (required during fire)
```

#### 4. Pressurization

**Calculation Logic:**
```
IF lobby/staircase type = "Nat. Vent" THEN 0 lifts/fans ELSE 1
```

**Components:**
- Typical Floor Lift Lobby: `=IF(Inputs!$B$21="Nat. Vent", 0, 1)` → 0
- Fire Lift Lobby: `=IF(Inputs!$B$22="Nat. Vent", 0, 1)` → 0
- Staircase 1: `=IF(Inputs!$B$23="Nat. Vent", 0, 1)` → 0
- Staircase 2: `=IF(Inputs!$B$24="Nat. Vent", 0, 1)` → 0
- Lift Well: `=G12+G13` (sum of fire lifts)

#### 5. PHE (Plumbing & Hydraulic Equipment)

**Booster Pump:**
```
Nos: =Inputs!B63 (1)
KW: =VLOOKUP(Inputs!$B$64, Data!G17:H20, 2, 0)
Flow: 300 LPM → 2.2 kW
MDF: 0.6, EDF: 0.6, FDF: 1.0
```

#### 6. Fire Fighting

**Booster Pump:**
```
Nos: =Inputs!B50 (1)
KW: =VLOOKUP(Inputs!B51, Data!M39:N40, 2, 0)
Flow: 900 LPM → Lookup result
FDF: 1.0
```

### Demand Factors

| Factor | Typical Value | Meaning |
|--------|---------------|---------|
| MDF | 0.6 | 60% of connected load runs simultaneously |
| EDF | 0.25-0.6 | Essential loads during power failure |
| FDF | 0-1.0 | Fire loads (1.0 = full capacity during fire) |

---

## 3. SOCIETY CA LOAD Sheet

### Purpose
Society-level infrastructure serving all buildings.

### **🔽 DROPDOWN LISTS**

This sheet includes **dynamic dropdown lists** for adding custom loads:

| Cell Range | Parameter | Options |
|------------|-----------|---------|
| **B2:B20** | Load Category | `PHE, FF` |

**Data Validation Rules:**
- Column A (S.NO.): Custom validation to ensure numeric entries only (not dates)
- Allows users to add additional PHE or FF equipment loads as needed

### Key Components

#### PHE Systems

**UGT Domestic Transfer Pump:**
```
Nos: =IFS(Inputs!B55="1W+1S", 1, Inputs!B55="2W+1S", 2, 1, 3)
KW: =VLOOKUP(Inputs!$B$53, Data!$J$24:$K$29, 2, 0)
Flow 200 LPM → 3.0 kW per pump
```

**UGT Flushing Transfer Pump:**
```
Config: 2W+1S → 2 working pumps
Flow 300 LPM → lookup from Data sheet
```

**Irrigation Pump:**
```
Nos: =Inputs!B59 (1)
Flow: =Inputs!B60 (150 LPM)
KW: =VLOOKUP(Flow, Data!J17:K20, 2, 0)
150 LPM → 2.2 kW
```

**Sump Pump:**
```
Nos: =Inputs!B61 (3)
Head: =Inputs!B62 (35m)
KW: =VLOOKUP(Head, Data!G24:H25, 2, 0)
35m → 2.2 kW per pump
```

#### Fire Fighting Systems

**Main Hydrant Pump:**
```
Nos: =IFS(Inputs!$B$48="Main+SBY+jky", 1, Inputs!$B$48="2 Main+SBY+jky", 2)
Flow: =Inputs!$B$45 (2850 LPM)
KW: =VLOOKUP(Flow, Data!$N$29:$O$31, 2, 0)
```

**Main Sprinkler Pump:**
```
Similar configuration
Separate pump for sprinkler system
```

**Jockey Pumps:**
```
Hydrant Jockey: Maintains pressure
Sprinkler Jockey: Maintains pressure
Lower capacity, constant operation
```

**Electric Standby:**
```
Backup for diesel pump
Same capacity as main pump
```

---

## 4. DATA Sheet

### Purpose
Lookup tables and reference data for formulas.

### Lookup Tables

#### A. Lift Power vs Building Height

| Building Height (m) | Lift Power (kW) |
|---------------------|-----------------|
| 60 | 12 |
| 70 | 14 |
| 90 | 15 |
| 100 | 18 |
| 110 | 20 |
| 120 | 20 |
| 130 | 22 |
| 140 | 25 |
| 150 | 27 |

#### B. MEP Room AC Sizing

```
Formula: TR/Sq.ft = Area / 150
AC TR Selection: IF(TR < 1.01, 1, IF(TR > 1.5, 1.8, 1.5))
AC Total KW: Nos * TR * 0.8
```

**Example:**
- 200 sqft room
- TR = 200/150 = 1.33
- AC Selected: 1.5 TR
- Nos: 1
- Total KW: 1 * 1.5 * 0.8 = 1.2 kW

#### C. Electrical Room Ventilation (12 ACPH)

| Area (sqft) | Room Volume (cuft) | CFM @ 12 ACPH | Fan CFM | Fan KW |
|-------------|-------------------|---------------|---------|--------|
| 50 | 516.5 | 103 | 200 | 0.3 |
| 100 | 1033 | 207 | 300 | 0.5 |
| 150 | 1549.5 | 310 | 400 | 0.6 |
| 200 | 2066 | 413 | 500 | 0.7 |
| ... | ... | ... | ... | ... |

**Calculation:**
```
Room Volume = Area * Ceiling Height (10.33 ft assumed)
CFM = Volume * 12 ACPH / 60 minutes
```

#### D. PHE Pump Capacities

**Booster Pump:**
| Flow (LPM) | KW |
|------------|-----|
| 100 | 0.75 |
| 200 | 1.1 |
| 300 | 2.2 |
| 400 | 2.2 |

**Irrigation Pump:**
| Flow (LPM) | KW |
|------------|-----|
| 60 | 0.75 |
| 90 | 1.1 |
| 150 | 2.2 |
| 180 | 2.2 |

**Sump Pump:**
| Head (m) | KW |
|----------|-----|
| 20 | 1.1 |
| 35 | 2.2 |

**Transfer Pump:**
| Flow (LPM) | KW |
|------------|-----|
| 100 | 3.0 |
| 150 | 0.0 |
| 200 | 7.5 |
| 300 | 9.3 |
| 400 | 15.0 |
| 500 | 18.0 |

#### E. FF Main Pump (End Suction)

| Head (m) | Flow (LPM) | KW |
|----------|------------|-----|
| 75 | 2280 | 75 |
| 75 | 2850 | 0 |
| 75 | 3200 | 0 |
| 90 | 2280 | 75 |
| 90 | 2850 | 0 |
| 90 | 3200 | 0 |
| 100 | 2280 | 75 |
| 100 | 2850 | 90 |
| 100 | 3200 | 0 |
| 120 | 2280 | 75 |
| 120 | 2850 | 110 |
| 120 | 3200 | 115 |
| 130 | 2280 | 90 |
| 130 | 2850 | 110 |

---

## 5. C1-HVAC Sheet

### Purpose
Detailed HVAC calculations for basement parking ventilation.

### Components

**Parking Ventilation:**
- Tube Axial Fans: 65,000 CFM, 30 kW (Fire mode)
- Tube Axial Fans: 32,500 CFM, 11 kW (Normal mode - 50% capacity)
- Jet Fans: 3,640 CFM, 1.5 kW (Fire mode)
- Jet Fans: 2,450 CFM, 0.55 kW (Normal mode)

**Calculation:**
```
Air Volume CFM = Area (sqft) * Height (ft) * Air Changes/hr / 60
Fire Mode: 6 air changes/hour at full fan capacity
Normal Mode: 6 air changes/hour at 50% fan capacity
```

---

## 6. C1-PHE ELE LOAD Sheet

### Purpose
Detailed PHE equipment electrical loads for specific building (CASA 1).

### Equipment List

```
1 hp = 0.746 kW (conversion factor)
```

**Domestic Water Lift Pumps:**
- Flow: 2.5 LPS, Head: 160m
- Type: Mono block
- Pumps: 2 Working + 1 Standby (2 sets)

**Filter Feed Pump (Rainwater):**
- Flow: 2 LPS, Head: 35m
- Pumps: 1 Working + 1 Standby

**De-watering Pumps:**
- Flow: 4-12 LPS, Head: 25m
- Type: Submersible
- Multiple sumps

**Sewage Transfer Pumps:**
- Head: 25m
- 1.76 HP → 1.31 kW

**Booster Pump (Domestic Supply):**
- Flow: 8 LPS, Head: 30m
- References: `[1]Booster pump DWS'!C21`

**OWC:**
- 12 HP → 8.95 kW

---

## 7. ASPI CA- Lighting Sheet

### Purpose
Lighting load calculations for ASPI building common areas.

### Floor-wise Breakdown

**Typical Floor:**
- Normal Lights: 4 nos × 15W
- Emergency Lights: 1 no × 15W
- Total: 75W per floor

**Refuge Floors:**
- Emergency Lights: 5 nos × 20W
- Total: 100W per refuge floor

**Stilt:**
- Normal: 15 nos × 20W
- Emergency: 5 nos × 20W
- Total: 400W

### Calculations

```
Total Load (W) = Lights × Wattage
Emergency Load = (Normal + EM) × Wattage
```

---

## 8. ASPI-UPS Sizing Calculation Sheet

### Purpose
Calculate UPS capacity for emergency loads.

### Calculation Steps

```
1. Emergency Lighting Load = ASPI EM + Basement EM
2. FPS & HVAC Damper = Assumed power points
3. Total Connected Load = Sum of above
4. Diversity Factor = 0.8
5. Total Demand Load = Connected × Diversity
6. Power Factor = 0.9
7. Total Demand (kVA) = Demand (kW) / PF
8. UPS Required @ 90% Loading = Demand (kVA) / 0.9
9. UPS Selected = Next standard size
```

**Example:**
```
Connected Load: 5 kW
Demand: 5 × 0.8 = 4 kW
kVA: 4 / 0.9 = 4.44 kVA
UPS Required: 4.44 / 0.9 = 4.94 kVA
UPS Selected: 10 kVA (standard size)
```

---

## 9. C1-FF Load Sheet

### Purpose
Fire Fighting pump loads summary.

### Equipment

**Main Pumps:**
- Hydrant Electric Pump: 2850 LPM, 170m head, 200 HP → 149.2 kW
- Sprinkler Electric Pump: 2850 LPM, 170m head, 200 HP → 149.2 kW

**Jockey Pumps:**
- Hydrant Jockey: 180 LPM, 170m head, 12.5 HP → 9.33 kW (working)
- Sprinkler Jockey: 180 LPM, 170m head, 12.5 HP → 9.33 kW (working)

**Booster Pump:**
- Hydrant Booster: 900 LPM, 35m head, 12.5 HP → 9.33 kW

**Total Panel Load:**
- Working Pumps: 19 HP
- Total Requirement: 308 kW

---

## 10. A-FSI Sheet

### Purpose
Floor Space Index calculations and apartment unit distribution.

### Building Configuration

**Towers:** A1-A6
**Floor Types:**
- Typical (Typ)
- Refuge
- Ground

**Unit Types:**
- 2 BHK
- 2.5 BHK (806 sqft, 852 sqft variants)
- 3 BHK (1015 sqft, 1026 sqft variants - T-shaped, Linear)
- 3.5 BHK (1130 sqft)

### Area Calculations

```
FSI Area = RCA (Rug Carpet Area) × FSI Factor
BUA (Built-up Area) > RCA
Total = Sum across all floors and towers

Phase-wise distribution included
Car parking allocation based on unit type
```

**Formulas:**
- FSI Area Sub Total = Tower × FSI/LVL × Levels
- Unit Nos = Levels × Units per level
- Car Parking = Unit Nos × Factor (1.25 for 2.5BHK, 2 for 3BHK)

---

## Key Calculation Concepts

### 1. Area Conversions
```
1 sq.m = 10.76 sq.ft
Area (sqft) = Area (sqm) × 10.76
```

### 2. Power Density Method
```
Total Load (kW) = Area (sqft) × Power Density (W/sqft) / 1000
```

**Standards:**
- EcoNiwas Samhita: 3 W/sq.m for lighting
- Converted: 3/10.76 ≈ 0.28 W/sqft ≈ 0.3 W/sqft (used in calculations)
- Landscape: 0.8 W/sqft

### 3. Demand Factors
```
Maximum Demand = Total Connected Load × MDF
Essential Demand = Total Connected Load × EDF
Fire Demand = Total Connected Load × FDF
```

**Purpose:**
- Not all loads run simultaneously
- Diversity in usage patterns
- Fire loads are critical and often FDF = 1.0

### 4. VLOOKUP for Equipment Sizing
```
=VLOOKUP(lookup_value, table_range, column_index, [range_lookup])
```

**Example:**
```
=VLOOKUP(Inputs!$B$9, Data!$A$3:$B$11, 2, 0)
Lookup building height (90m) in column A
Return lift power (15 kW) from column 2
Exact match (0)
```

### 5. HVAC Ventilation
```
Room Volume = Area × Ceiling Height
CFM = Volume × Air Changes Per Hour / 60
```

**Standard:** 12 ACPH for electrical rooms

### 6. Pump Power Estimation
```
Hydraulic Power (kW) = (Flow × Head × Density × g) / (3600000 × Efficiency)
Motor HP = Hydraulic Power / (0.746 × Efficiency)
```

Simplified: Use lookup tables based on flow and head

### 7. UPS Sizing
```
Connected Load (kW)
↓ × Diversity Factor
Demand Load (kW)
↓ ÷ Power Factor
Demand Load (kVA)
↓ ÷ Loading Factor (90%)
UPS Capacity Required (kVA)
```

### 8. Building Height-Based Calculations
```
Floor-to-Floor Height = ROUNDUP(Building Height / Number of Floors, 2)
Pump Head = Building Height + 10% (safety margin)
Pressure Breaking Tanks = IF(Height > 90, CEILING(Height/65, 1) - 1, 0)
```

---

## Inter-Sheet Dependencies

### Flow of Calculations

```
INPUTS (User enters all parameters)
   ↓
   ├→ Building CA LOAD (References Inputs, Data)
   │     ↓
   │     └→ Calculates building common area loads
   │
   ├→ Society CA LOAD (References Inputs, Data)
   │     ↓
   │     └→ Calculates society infrastructure loads
   │
   ├→ C1-HVAC (Specific building HVAC)
   │
   ├→ C1-PHE ELE LOAD (Specific building PHE)
   │
   ├→ ASPI CA-Lighting (Specific building lighting)
   │     ↓
   │     └→ ASPI-UPS Sizing (References ASPI Lighting)
   │
   ├→ C1-FF Load (Fire fighting summary)
   │
   └→ A-FSI (Unit distribution and FSI)
```

### **🔗 CROSS-SHEET REFERENCES (Linked Cells)**

The workbook uses extensive cross-sheet linking to maintain data integrity:

#### **Building CA LOAD Sheet** → References from other sheets
- **40 total cross-sheet references**
- **35 references to 'Inputs' sheet:**
  - `D2: =Inputs!B12` (GF Entrance Lobby area)
  - `D3: =Inputs!B13` (Typical Floor lobby area)
  - `G3: =Inputs!B10` (Number of floors)
  - `G4: =Inputs!B10*2*2` (Staircase landings calculation)
  - `D5: =Inputs!B15` (Terrace area)
  - `D6: =Inputs!B14` (Fire lift lobby area)
  - `G6: =Inputs!B10+1` (Fire lift lobby count)
  - `D7: =Inputs!B17` (Refuge floor area)
  - `G7: =Inputs!B16` (Refuge floor count)
  - `D8: =Inputs!B20` (Service floor area)
  - `G8: =Inputs!B19` (Service floor count)
  - `D10: =Inputs!B18` (Landscape area)
  - `G11: =Inputs!B26` (Passenger lifts)
  - `G12: =Inputs!B27` (Pass+Fire lifts)
  - `G13: =Inputs!B28` (Firemen lifts)
  - `D14: =Inputs!B33` (Meter room area)
  - `G14: =IF(Inputs!B32="Bus-Duct System",0,Inputs!B32)` (Meter room count)
  - ... and more

- **5 references to 'Data' sheet (for equipment sizing):**
  - `H11: =VLOOKUP(Inputs!$B$9,Data!$A$3:$B$11,2,0)` (Lift power lookup)
  - `H12: =VLOOKUP(Inputs!$B$9,Data!$A$3:$B$11,2,0)` (Lift power lookup)
  - `H13: =VLOOKUP(Inputs!$B$9,Data!$A$3:$B$11,2,0)` (Lift power lookup)
  - `H26: =VLOOKUP(Inputs!$B$64,Data!G17:H20,2,0)` (PHE Booster pump power)
  - `H27: =VLOOKUP(Inputs!B51,Data!M39:N40,2,0)` (FF Booster pump power)

#### **Society CA LOAD Sheet** → References from other sheets
- **28 total cross-sheet references**
- **15 references to 'Inputs' sheet:**
  - `G2: =IFS(Inputs!B55="1W+1S",1, Inputs!B55="2W+1S",2,1,3)` (DOM transfer pump count)
  - `H2: =VLOOKUP(Inputs!$B$53,Data!$J$24:$K$29,2,0)` (DOM transfer pump power)
  - `G3: =IFS(Inputs!B58="1W+1S",1, Inputs!B58="2W+1S",2,1,3)` (FLU transfer pump count)
  - `H3: =VLOOKUP(Inputs!$B$56,Data!$J$24:$K$29,2,0)` (FLU transfer pump power)
  - `G4: =Inputs!B59` (Irrigation pump nos)
  - `H4: =VLOOKUP(Inputs!B60,Data!J17:K20,2,0)` (Irrigation pump power)
  - `G5: =Inputs!B61` (Sump pump nos)
  - `H5: =VLOOKUP(Inputs!B62,Data!G24:H25,2,0)` (Sump pump power)
  - `G6: =IFS(Inputs!$B$48="Main+SBY+jky",1, Inputs!$B$48="2 Main+SBY+jky",2)` (Hydrant pump count)
  - `H6: =VLOOKUP(Inputs!$B$45,Data!$N$29:$O$31,2,0)` (Hydrant pump power)
  - ... and more

- **6 references to 'Data' sheet (for pump sizing):**
  - Transfer pumps, irrigation, sump pumps, FF pumps

#### **C1-PHE ELE LOAD Sheet** → External workbook references
- **5 total cross-sheet references**
- **4 references to external file '[1]PHE Load Calculation':**
  - `F6: ='[1]PHE Load Calculation'!D15` (Domestic water lift pump HP)
  - `F7: ='[1]PHE Load Calculation'!C15` (Filter feed pump HP)
  - `F8: ='[1]PHE Load Calculation'!F15` (De-watering pump HP)
  - `F10: ='[1]PHE Load Calculation'!E15` (De-watering UG pump HP)

- **1 reference to external file '[1]Booster pump DWS':**
  - `F12: ='[1]Booster pump DWS'!C21` (Booster pump HP)

**⚠️ Note:** These external references will break if the linked files are not present.

#### **ASPI-UPS Sizing Calculation Sheet** → Internal references
- **2 total cross-sheet references**
- **References to 'ASPI CA- Lighting' sheet:**
  - `C3: ='ASPI CA- Lighting '!G54` (ASPI emergency lighting load)
  - `C4: ='ASPI CA- Lighting '!G66` (Basement emergency lighting load)

#### **A-FSI Sheet** → Has broken reference
- **1 broken reference:**
  - `N78: =N70/#REF!` ⚠️ Error - referenced sheet/cell not found

### Reference Patterns

**1. Direct Cell References:**
```excel
=Inputs!B12
```
Directly pulls value from Inputs sheet, cell B12

**2. Nested VLOOKUP with Input Reference:**
```excel
=VLOOKUP(Inputs!$B$9, Data!$A$3:$B$11, 2, 0)
```
Looks up building height from Inputs (B9), searches in Data sheet table, returns column 2

**3. Conditional Logic with Multiple Sheet References:**
```excel
=IFS(Inputs!B55="1W+1S", 1, Inputs!B55="2W+1S", 2, 1, 3)
```
Checks pump configuration from Inputs and returns appropriate count

**4. Formula Arrays Referenced Across Sheets:**
```excel
=IF(Inputs!B32="Bus-Duct System", 0, Inputs!B32)
```
Conditional logic based on Input values

### DATA Sheet Usage
```
DATA sheet provides lookup tables for:
- Lift power based on building height
- AC sizing based on room area
- Fan sizing based on room volume
- Pump power based on flow/head
- All other equipment sizing
```

**Total lookup references:** Hundreds of VLOOKUP and IFS formulas reference the Data sheet

### Critical Dependencies

**If you change Inputs sheet, these sheets auto-update:**
1. Building CA LOAD (35 cells)
2. Society CA LOAD (15 cells)
3. All calculation sheets

**If you modify Data sheet lookup tables:**
- All equipment sizing calculations will change
- Verify all VLOOKUP ranges remain valid

**External file dependencies:**
- C1-PHE ELE LOAD requires:
  - `[1]PHE Load Calculation.xlsx`
  - `[1]Booster pump DWS.xlsx`
- These files must be in the same directory or links will break

---

## Key Formula Patterns

### 1. Conditional Equipment Count
```excel
=IF(Inputs!$B$21="Nat. Vent", 0, 1)
If naturally ventilated → no mechanical fan
Otherwise → 1 fan required
```

### 2. Configuration-Based Pump Count
```excel
=IFS(
  Inputs!B55="1W+1S", 1,
  Inputs!B55="2W+1S", 2,
  1, 3
)
1W+1S → 1 working pump
2W+1S → 2 working pumps
Default → 3 pumps
```

### 3. Array Formulas
```excel
Used for complex AC/Fan sizing
Evaluates multiple conditions simultaneously
Returns equipment specifications
```

### 4. Dynamic Height-Based Calculations
```excel
Pump Head = =$B$9+$B$9*0.1
Building height + 10% safety margin
Absolute reference ensures consistent lookup value
```

---

## Standards & References

### 1. EcoNiwas Samhita
- Lighting: 3 W/sq.m
- Used for common area lighting calculations

### 2. NBC (National Building Code)
- Referenced for fire safety requirements
- Pump configurations

### 3. CFO (Chief Fire Officer) NOC
- Fire lift requirements
- Passenger lift conversion during fire
- Pump set configurations

### 4. MSEDCL Guidelines
- Overall electrical load calculation methodology
- Demand factor applications

---

## Output Summary (Based on Inputs)

### Building Common Area Loads (Sample from Sheet)

| Component | TCL (kW) | Max Demand (kW) | Essential (kW) | Fire (kW) |
|-----------|----------|-----------------|----------------|-----------|
| GF Entrance Lobby | 0.32 | 0.19 | 0.19 | 0.08 |
| Typical Floor Lobbies | 3.68 | 2.21 | 2.21 | 0.92 |
| Staircases | 3.04 | 1.82 | 1.82 | 3.04 |
| Terrace | 2.58 | 1.55 | 1.55 | 0.65 |
| Fire Lift Lobby | 1.01 | 0.60 | 0.60 | 0.25 |
| Refuge Floors | 1.94 | 1.16 | 1.16 | 0.48 |
| Service Floor | 3.87 | 2.32 | 2.32 | 0.97 |
| External Facade | 5.00 | 3.00 | 1.25 | 0.00 |
| Landscape | 4.30 | 2.58 | 1.08 | 0.00 |
| Passenger Lifts (2) | 30.00 | 18.00 | 18.00 | 0.00 |
| Pass. + Fire Lift (1) | 15.00 | 9.00 | 9.00 | 15.00 |
| Firemen Lift (1) | 15.00 | 9.00 | 9.00 | 15.00 |
| HVAC - Meter Room | 2.10 | 1.26 | 1.26 | 1.26 |
| HVAC - Elec Room | 0.90 | 0.54 | 0.54 | 0.54 |
| HVAC - IBS Room | 1.40 | 0.84 | 0.84 | 0.84 |
| HVAC - OWC Room | 2.50 | 1.50 | 1.50 | 0.00 |
| HVAC - FCC Room (AC) | 3.20 | 1.92 | 1.92 | 0.00 |
| HVAC - Lift Mach (AC) | 1.20 | 0.72 | 0.72 | 0.00 |
| HVAC - Lift Mach (Fan) | 0.80 | 0.48 | 0.48 | 0.80 |
| PHE Booster Pump | 2.20 | 1.32 | 1.32 | 2.20 |
| FF Booster Pump | 11.00 | 6.60 | 6.60 | 11.00 |

**Note:** Full totals would be calculated at the bottom of the sheet

---

## Usage Instructions

### To Use This Calculator:

1. **Open Inputs Sheet**
   - Enter all project-specific parameters
   - Ensure all required fields are filled

2. **Review Data Sheet**
   - Verify lookup tables match your standards
   - Update if necessary for local requirements

3. **Check Building CA LOAD**
   - Formulas auto-calculate based on inputs
   - Review TCL, Maximum Demand, Essential, Fire columns
   - Verify totals at bottom

4. **Check Society CA LOAD**
   - Review society-level infrastructure loads
   - Verify pump configurations

5. **Review Specific Building Sheets**
   - C1-HVAC, C1-PHE, etc.
   - Ensure they match your building specifics

6. **Calculate Totals**
   - Sum Building CA + Society CA + Apartments
   - Apply diversity factors
   - Size transformers and DG sets

---

## Important Notes

1. **All formulas reference the Inputs sheet** - Change inputs in one place, all calculations update automatically

2. **VLOOKUP dependencies** - Critical equipment sizing depends on Data sheet lookup tables

3. **Demand factors are assumptions** - MDF, EDF, FDF values should be verified with local standards

4. **Building-specific sheets** - Some sheets (C1-*, ASPI-*) are for specific buildings; duplicate and modify for additional buildings

5. **Fire loads critical** - FDF calculations ensure adequate capacity during fire emergencies

6. **Unit conversions** - Be careful with sq.m ↔ sq.ft conversions (factor: 10.76)

7. **Standard references** - EcoNiwas Samhita, NBC, CFO requirements embedded in calculations

8. **Array formulas** - Some complex equipment sizing uses array formulas; handle with care when editing

---

## Recommendations for Implementation

If implementing this in a web application:

### 1. **Input Forms with Dropdown Lists**
Replicate all 26 dropdown validations:
```javascript
// Example: Building Height dropdown
const buildingHeightOptions = [60, 70, 90, 100, 110, 120, 130, 140, 150];

// Project Category dropdown
const projectCategories = ['GOLD 1', 'GOLD 2', 'GOLD 3', 'Platinum', 'Diamond'];

// Lobby Type dropdown
const lobbyTypes = ['Nat. Vent', 'Mech. Vent', 'AC'];

// Pump Configuration dropdown
const pumpConfigs = ['1W+1S', '2W+1S', '3W+1S'];
```

### 2. **Lookup Tables as Database/Configuration**
Store Data sheet tables:
```javascript
// Lift power lookup
const liftPowerByHeight = {
  60: 12, 70: 14, 90: 15, 100: 18, 110: 20,
  120: 20, 130: 22, 140: 25, 150: 27
};

// PHE pump power lookup
const phePumpPower = {
  100: 0.75, 200: 1.1, 300: 2.2, 400: 2.2
};

// AC sizing formula
function calculateAC(areaSqft) {
  const TR = areaSqft / 150;
  const acTR = TR < 1.01 ? 1 : (TR > 1.5 ? 1.8 : 1.5);
  const nos = Math.ceil(acTR);
  return nos * acTR * 0.8; // kW
}
```

### 3. **Replicate Cross-Sheet Formulas**
Implement reactive calculations:
```javascript
// Example: Building CA LOAD calculations
function calculateBuildingLoads(inputs) {
  const loads = {};
  
  // GF Entrance Lobby
  loads.gfLobby = {
    areaSqm: inputs.gfEntranceLobby,
    areaSqft: inputs.gfEntranceLobby * 10.76,
    wattPerSqft: 0.3,
    tcl: (inputs.gfEntranceLobby * 10.76 * 0.3) / 1000,
    maxDemand: null, // Calculate with MDF
    essential: null, // Calculate with EDF
    fire: null // Calculate with FDF
  };
  
  // Apply demand factors
  loads.gfLobby.maxDemand = loads.gfLobby.tcl * 0.6; // MDF
  loads.gfLobby.essential = loads.gfLobby.tcl * 0.6; // EDF
  loads.gfLobby.fire = loads.gfLobby.tcl * 0.25; // FDF
  
  // Typical Floor Lobbies (multiple floors)
  loads.typicalLobbies = {
    areaSqm: inputs.typicalFloorLobby,
    areaSqft: inputs.typicalFloorLobby * 10.76,
    nos: inputs.numberOfFloors,
    wattPerSqft: 0.3,
    tclPerUnit: (inputs.typicalFloorLobby * 10.76 * 0.3) / 1000,
    tcl: null
  };
  loads.typicalLobbies.tcl = loads.typicalLobbies.tclPerUnit * loads.typicalLobbies.nos;
  
  // Lifts - with VLOOKUP equivalent
  const liftPowerPerUnit = liftPowerByHeight[inputs.buildingHeight] || 15;
  loads.passengerLifts = {
    nos: inputs.passengerLifts,
    kwPerLift: liftPowerPerUnit,
    tcl: inputs.passengerLifts * liftPowerPerUnit,
    maxDemand: inputs.passengerLifts * liftPowerPerUnit * 0.6,
    essential: inputs.passengerLifts * liftPowerPerUnit * 0.6,
    fire: 0
  };
  
  return loads;
}

// Reactive recalculation when inputs change
inputs.onChange = () => {
  const buildingLoads = calculateBuildingLoads(inputs);
  const societyLoads = calculateSocietyLoads(inputs);
  const totals = sumAllLoads(buildingLoads, societyLoads);
  updateUI(totals);
};
```

### 4. **Conditional Logic & IFS Replication**
```javascript
// Replicate IFS formulas
function getPumpCount(config) {
  if (config === '1W+1S') return 1;
  if (config === '2W+1S') return 2;
  if (config === '3W+1S') return 3;
  return 0;
}

// Replicate IF with sheet checks
function getMeterRoomCount(meterRoomConfig) {
  if (meterRoomConfig === 'Bus-Duct System') return 0;
  return parseInt(meterRoomConfig) || 0;
}

// Complex conditional for pump selection
function getFFPumpCount(pumpSetType) {
  const mapping = {
    'Main+SBY+Jky': 1,
    '2 Main+SBY+Jky': 2
  };
  return mapping[pumpSetType] || 0;
}
```

### 5. **Summary Reports** 
Generate formatted output showing:
- TCL (Total Connected Load)
- Maximum Demand
- Essential Demand
- Fire Demand

### 6. **Export Functionality**
- PDF/Excel for MSEDCL submissions
- Include all calculations and formulas

### 7. **Version Control**
- Support different building codes (NBC, EcoNiwas Samhita)
- Regional standards (MSEDCL, other DISCOMs)

### 8. **Validation Rules**
```javascript
// Dropdown validation
const validators = {
  buildingHeight: (val) => [60, 70, 90, 100, 110, 120, 130, 140, 150].includes(val),
  numberOfFloors: (val) => val >= 15 && val <= 50,
  projectCategory: (val) => ['GOLD 1', 'GOLD 2', 'GOLD 3', 'Platinum', 'Diamond'].includes(val),
  lobbyType: (val) => ['Nat. Vent', 'Mech. Vent', 'AC'].includes(val)
};

// Cross-validation
function validateInputs(inputs) {
  const errors = [];
  
  if (inputs.buildingHeight / inputs.numberOfFloors < 2) {
    errors.push('Floor-to-floor height too small');
  }
  
  if (inputs.refugeFloors >= inputs.numberOfFloors) {
    errors.push('Refuge floors exceed total floors');
  }
  
  return errors;
}
```

### 9. **Unit Toggles**
```javascript
const SQFT_TO_SQM = 0.092903;
const SQM_TO_SQFT = 10.76;

function convertArea(value, fromUnit, toUnit) {
  if (fromUnit === 'sqm' && toUnit === 'sqft') return value * SQM_TO_SQFT;
  if (fromUnit === 'sqft' && toUnit === 'sqm') return value * SQFT_TO_SQM;
  return value;
}
```

### 10. **Handle External References**
For sheets like C1-PHE ELE LOAD with external file links:
```javascript
// Option 1: Embed the data
const externalPHEData = {
  domesticLiftPump: 15.2, // HP from [1]PHE Load Calculation
  filterPump: 3.5,
  // ... etc
};

// Option 2: Allow file upload
async function importExternalPHEData(file) {
  const data = await parseExcelFile(file);
  return {
    domesticLiftPump: data.getCell('D15'),
    filterPump: data.getCell('C15'),
    // ... etc
  };
}
```

### 11. **Error Handling for Broken References**
```javascript
// Handle #REF! errors like in A-FSI sheet
function safeReference(value, fallback = 0) {
  return (value === null || value === undefined || isNaN(value)) ? fallback : value;
}
```

### 12. **Database Schema Suggestion**
```sql
-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  category VARCHAR(50), -- GOLD 1, GOLD 2, etc.
  location VARCHAR(255),
  created_at TIMESTAMP
);

-- Building inputs
CREATE TABLE building_inputs (
  project_id INT REFERENCES projects(id),
  building_height DECIMAL(10,2),
  number_of_floors INT,
  gf_entrance_lobby DECIMAL(10,2),
  typical_floor_lobby DECIMAL(10,2),
  -- ... all 100+ input fields
);

-- Lookup tables
CREATE TABLE lift_power_lookup (
  building_height INT PRIMARY KEY,
  lift_kw DECIMAL(10,2)
);

-- Calculated loads
CREATE TABLE building_loads (
  project_id INT,
  component VARCHAR(100),
  tcl_kw DECIMAL(10,2),
  max_demand_kw DECIMAL(10,2),
  essential_kw DECIMAL(10,2),
  fire_kw DECIMAL(10,2)
);
```

---

## Conclusion

This is a comprehensive electrical load calculation tool that:
- Takes ~100 input parameters
- Uses 10+ lookup tables
- Performs 1000+ calculations
- Outputs detailed load schedules
- Complies with Indian building codes (NBC, EcoNiwas Samhita)
- Suitable for MSEDCL electrical connection applications

The interconnected nature ensures consistency, while the modular structure allows customization for different building types and configurations.

---

## Quick Reference Tables

### Complete List of Dropdown Options (Inputs Sheet)

| Input Parameter | Cell | Options | Default/Example |
|-----------------|------|---------|-----------------|
| Project Category | B3 | GOLD 1, GOLD 2, GOLD 3, Platinum, Diamond | GOLD 2 |
| Building Numbers | B5 | 1, 2, 3, 4, 5 | 2 |
| Building Height (m) | B9 | 60, 70, 90, 100, 110, 120, 130, 140, 150 | 90 |
| No of Floors | B10 | 15, 20, 25, 30, 33, 35, 38, 39, 43, 45, 50 | 38 |
| Refuger Floors | B16 | 1, 2, 3, 4, 5, 6, 7 | 5 |
| Service Floor | B19 | 1, 2 | 1 |
| Typical Lobby Type | B21 | Nat. Vent, Mech. Vent, AC | Nat. Vent |
| Fire Lobby Type | B22 | Nat. Vent, Mech. Vent, AC | Nat. Vent |
| Staircase 1 Type | B23 | Nat. Vent, Pressurized | Nat. Vent |
| Staircase 2 Type | B24 | Nat. Vent, Pressurized | Nat. Vent |
| Passenger Lifts | B26 | 2, 3, 4, 5, 6 | 2 |
| Pass. Lift Fire | B27 | 1, 2, 3 | 1 |
| Firemen Lift | B28 | 1, 2, 3 | 1 |
| Wet Shaft (1 Toilet) | B30 | 1, 2, 3, 4, 5, 6 | 4 |
| Wet Shaft (2 Toilets) | B31 | 1, 2, 3, 4 | 2 |
| Meter Rooms | B32 | 1, 2, 3, 4, 5, Bus-Duct System | 3 |
| FF Pump Type | B42 | End Suction, MSMO | End Suction |
| UGT FF Set | B43 | Separate, Combined | Separate |
| FF Standby Type | B44 | Electric, Diesel | Diesel |
| Main Pump Flow (LPM) | B45 | 2280, 2850, 3200 | 2850 |
| FBT Pump Type | B48 | Main+SBY+Jky, 2 Main+SBY+Jky | Main+SBY+Jky |
| FBT Flow (LPM) | B49 | 900, 450 | 900 |
| FF Booster Set | B50 | 1, 2, 3 | 1 |
| FF Booster Flow | B51 | 900, 450 | 900 |
| DOM Transfer Flow | B53 | 100, 200, 300, 400, 500 | 200 |
| DOM Config | B55 | 1W+1S, 2W+1S, 3W+1S | 1W+1S |
| FLU Transfer Flow | B56 | 100, 200, 300, 400, 500 | 300 |
| FLU Config | B58 | 1W+1S, 2W+1S, 3W+1S | 2W+1S |
| Irrigation Set | B59 | 1, 2, 3 | 1 |
| Irrigation Flow | B60 | 60, 90, 150, 180 | 150 |
| Sump Pumps | B61 | 1, 2, 3 | 3 |
| Sump Head (m) | B62 | 20, 35 | 35 |
| Booster Set | B63 | 1, 2, 3 | 1 |
| Booster Flow | B64 | 100, 200, 300, 400 | 300 |
| UGT Pump Area | B66 | 50, 75, 100, ..., 300 | 200 |
| STP (KLD) | B67 | 50, 75, 100, ..., 500 | 275 |

### Cross-Sheet Reference Summary

| Source Sheet | References | Target Sheet(s) | Count | Purpose |
|--------------|-----------|-----------------|-------|---------|
| Building CA LOAD | Inputs | Inputs | 35 | Pull input parameters |
| Building CA LOAD | Data | Data | 5 | Equipment sizing (VLOOKUP) |
| Society CA LOAD | Inputs | Inputs | 15 | Pull pump configs |
| Society CA LOAD | Data | Data | 6 | Pump power lookup |
| C1-PHE ELE LOAD | External | [1]PHE Load Calc | 4 | External pump data |
| C1-PHE ELE LOAD | External | [1]Booster DWS | 1 | External booster data |
| ASPI-UPS Sizing | ASPI Lighting | ASPI CA-Lighting | 2 | Emergency load calc |
| A-FSI | Broken | #REF! | 1 | ⚠️ Error reference |

### Key Formula Patterns Used

| Pattern | Example | Purpose |
|---------|---------|---------|
| **Direct Reference** | `=Inputs!B12` | Pull single value |
| **VLOOKUP** | `=VLOOKUP(Inputs!$B$9,Data!$A$3:$B$11,2,0)` | Equipment sizing |
| **IF Conditional** | `=IF(Inputs!B32="Bus-Duct System",0,Inputs!B32)` | Conditional logic |
| **IFS Multi-condition** | `=IFS(Inputs!B55="1W+1S",1, Inputs!B55="2W+1S",2,1,3)` | Multiple conditions |
| **Area Conversion** | `=D2*10.76` | sq.m to sq.ft |
| **Power Calculation** | `=F2*E2/1000` | W to kW |
| **Demand Factor** | `=J2*I2` | Apply diversity |
| **Count Calculation** | `=Inputs!B10*2*2` | Floors × Stairs × Landings |

### Validation Rules in Use

| Type | Location | Rule |
|------|----------|------|
| List | Inputs B3-B67 | 26 dropdown lists |
| Custom | Society A2:A20 | Number validation (not dates) |
| Custom | Society I2:O20 | Number validation (not dates) |
| List | Society B2:B20 | PHE/FF category selection |

---

## Implementation Checklist

When building a web application based on this Excel:

- [ ] Create 26 dropdown inputs matching validation lists
- [ ] Implement all 100+ input fields
- [ ] Build lookup tables (Data sheet) in database
- [ ] Code ~50 calculation formulas
- [ ] Implement VLOOKUP equivalents
- [ ] Add conditional logic (IF, IFS)
- [ ] Create demand factor multipliers
- [ ] Build cross-sheet reactive updates
- [ ] Add area unit conversions (sq.m ↔ sq.ft)
- [ ] Generate summary reports (TCL, Max, Essential, Fire)
- [ ] Implement PDF/Excel export
- [ ] Handle external file references
- [ ] Add input validation & error messages
- [ ] Test with sample building (90m, 38 floors)
- [ ] Verify against MSEDCL requirements
- [ ] Document all formulas and standards

---
