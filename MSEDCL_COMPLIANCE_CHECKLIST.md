# MSEDCL 2016 Compliance Checklist

## Issues Found in Current Calculation

### ❌ Non-Compliant Items

1. **Residential Flat Loads - TOO LOW**
   - Current: 25 W/sqm (NBC Standard)
   - **MSEDCL Minimum Required: 75 W/sqm**
   - Gap: 66% below regulatory minimum
   - Fix: System will now auto-apply MSEDCL minimum when carpet area is provided

2. **Common Area Loads** - **NBC Standards Being Used**
   - Entrance Lobby: 3.0 W/sqm (basic lighting only)
   - Typical Floor Lobby: 3.0 W/sqm (basic lighting only)
   - Issue: Modern buildings have AC, smart features, higher lighting levels
   - MSEDCL Impact: These contribute to total load which must meet minimums

3. **Total Carpet Area Not Calculated**
   - **Fixed**: System now auto-calculates from selected buildings
   - Multiplies each flat type area × count × 0.092903 (convert sqft to sqm)
   - Displays MSEDCL minimum required load in real-time

## How MSEDCL Compliance Works Now

### Automatic Calculations

When you select buildings, the system:

1. **Auto-calculates Total Carpet Area**
   ```
   Carpet Area = Σ (Flat Area × Flat Count) for all flats in all buildings
   ```

2. **Calculates MSEDCL Minimum Load**
   ```
   Residential: 75 W/sqm × Carpet Area
   Commercial (No AC): 150 W/sqm × Carpet Area
   Metro/Major Cities: 200 W/sqm × Carpet Area
   ```

3. **Applies Whichever is Higher**
   ```
   Sanctioned Load = MAX(NBC Calculated Load, MSEDCL Minimum)
   ```

### Two Different Loads (Important!)

#### 1. Sanctioned Load (Contract Demand) 
- **Used For:** Quotation, billing, connection application
- **Power Factor:** 0.8 (as per MSEDCL billing practice)
- **Diversity Factor:** NOT APPLIED (full load)
- **Formula:** `MAX(Total Connected Load, MSEDCL Minimum)`

#### 2. Load After Diversity Factor
- **Used For:** DTC sizing, infrastructure design ONLY
- **Power Factor:** 0.9 (for infrastructure calculations)
- **Diversity Factor:** APPLIED (realistic usage)
- **Formula:** Based on maximum demand, essential, fire loads
- **⚠️ WARNING:** NEVER use this for quotation or billing!

## MSEDCL Minimum Load Standards

| Premise Type | Minimum (W/sq.m) | Example (1000 sqm) |
|--------------|------------------|-------------------|
| Residential | 75 | 75 kW |
| Commercial (No AC) | 150 | 150 kW |
| Metro/Major Cities Commercial | 200 | 200 kW |

## Area Type Impact on DTC Requirements

### DTC Thresholds (Based on Load After DF)

| Area Type | Threshold (kVA) | Example |
|-----------|----------------|---------|
| RURAL | 25 kVA | Small developments |
| URBAN | 75 kVA | Standard residential |
| METRO | 250 kVA | High-density areas |
| MAJOR_CITIES | 250 kVA | Mumbai, Pune, etc. |

**Metro/Major Cities Special Requirements:**
- Ring Main System mandatory
- Individual transformer per building (for large buildings)
- Higher infrastructure standards

## Current Calculation Example

Given the screenshot values:
- **Total Connected Load Calculated:** 1,842.88 kW (NBC standards)
- **4BHK Example:** 23.2 sqm × 25 W/sqm × 74 flats = 42.97 kW

### What Should Happen (If Carpet Area = 10,000 sqm)

```
MSEDCL Minimum = 10,000 × 75 / 1000 = 750 kW

Sanctioned Load = MAX(1842.88 kW, 750 kW) = 1,842.88 kW ✓
Sanctioned Load (kVA) = 1842.88 / 0.8 = 2,303.6 kVA

Load After DF = 1,062.97 kW (from max demand)
Load After DF (kVA) = 1062.97 / 0.9 = 1,181.08 kVA

DTC Capacity Required = Based on 1,181.08 kVA (NOT 2,303.6 kVA!)
```

In this case, NBC calculation already exceeds MSEDCL minimum, so it's compliant.

### What Happens If NBC Calculated Load is Low

```
Example: Small building, NBC calculates 500 kW
Carpet Area: 10,000 sqm
MSEDCL Minimum: 750 kW

Sanctioned Load = MAX(500, 750) = 750 kW ✓ MSEDCL minimum applied
```

## Regulatory Limits

### Single Consumer Limits (Without NOC)
- Maximum: 160 kW / 200 kVA
- If exceeded: Requires NOC from building owner

### Cumulative Limits (With NOC)
- Maximum: 480 kW / 600 kVA  
- If exceeded: Different connection type/approval needed

## Substation Requirements

| Load Range (MVA) | Requirement |
|------------------|-------------|
| 3 - 5 MVA | Internal substation (within premises) |
| 5 - 10 MVA | Boundary substation |
| 10 - 20 MVA | Dedicated substation (separate) |
| > 20 MVA | Contact MSETCL |

## Land & Lease Requirements

### DTC Land Requirements
- Rural: 10 sqm per DTC
- Urban: 18 sqm per DTC  
- Metro: 25 sqm per DTC
- Major Cities: 32 sqm per DTC

### Lease Terms (30-Year Agreement)
- **Annual Rent:** ₹100 per sqm
- **Upfront Payment:** ₹3,000 per sqm (30 years × ₹100)
- **Requirements:**
  - Encumbrance-free land
  - Registered lease deed
  - 12-month notice for surrender
  - No structures/trees on land
  - Clear access for MSEDCL vehicles

## How to Use New Features

### Step 1: Select Buildings
- System auto-calculates total carpet area from flat data
- Green background field shows it's auto-calculated
- You can manually override if needed

### Step 2: Select Area Type
- RURAL: Villages, small towns
- URBAN: Cities, standard residential areas
- METRO: High-density metro areas  
- MAJOR_CITIES: Mumbai, Pune, Nagpur (special requirements)

### Step 3: Calculate
- System computes both NBC and MSEDCL standards
- Takes maximum for sanctioned load
- Applies diversity factor for infrastructure sizing

### Step 4: Review Results
New sections will show:
1. **MSEDCL Minimum Load Check** - Did NBC meet minimum?
2. **Sanctioned Load** - What to show in quotation/application
3. **Load After DF** - What to use for DTC sizing
4. **DTC Requirements** - How many DTCs, capacity, land
5. **Substation Requirements** - If load > 3 MVA
6. **Land & Lease** - Total land needed, lease terms
7. **Validation Warnings** - If limits exceeded

## Common Questions

**Q: Why is Sanctioned Load higher than Load After DF?**
- Sanctioned Load = Full connected load (no diversity)
- Load After DF = Realistic usage (with diversity factor)
- Use Sanctioned Load for billing, Load After DF for DTC sizing

**Q: Which power factor to use?**
- 0.8 for sanctioned load (billing calculations)
- 0.9 for load after DF (infrastructure sizing)

**Q: Can I use NBC standards instead of MSEDCL?**
- System uses whichever is HIGHER
- If your NBC calculation exceeds MSEDCL minimum, that's fine
- MSEDCL sets the floor, not the ceiling

**Q: What if I have mixed use (residential + commercial)?**
- System will apply appropriate minimums to each
- Future enhancement: Separate carpet area inputs by type

## References

- MSEDCL Infrastructure Development Guidelines 2016
- Circular dated 01.04.2016
- Load calculation standards per NBC & MSEDCL

---

**Updated:** February 9, 2026  
**System Version:** With Auto-Calculated Carpet Area & MSEDCL Compliance
