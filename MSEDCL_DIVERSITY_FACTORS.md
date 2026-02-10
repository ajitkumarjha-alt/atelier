# MSEDCL Diversity Factors for Maximum Demand Calculation

## MSEDCL 2016 Guidelines Summary

### Key Principle: Two Different Load Values

MSEDCL guidelines distinguish between:

1. **Sanctioned Load (Contract Demand)**
   - **No diversity factor applied**
   - Full connected load calculated at minimum 75 W/sq.m carpet area
   - Power Factor: 0.8
   - **Used for**: Quotation, billing, connection application
   - Formula: `Sanctioned Load (kW) = MAX(Total Connected Load, Carpet Area × 75 W/sq.m / 1000)`

2. **Load After Diversity Factor**
   - **Diversity factor IS applied**
   - Realistic usage pattern
   - Power Factor: 0.9
   - **Used for**: DTC capacity sizing, infrastructure design ONLY
   - ⚠️ **Never use for quotation or billing**

## Diversity Factor Definition (MSEDCL)

> "The ratio of the sum of the maximum demands of the various part of a system to the coincident maximum demand of the whole system."

**In simple terms**: Not all electrical loads run at maximum simultaneously. Diversity factor accounts for this realistic usage pattern.

## Current Implementation Status

### ✅ What's Correct

1. **Base Load Calculation**: Using 75 W/sq.m for residential (MSEDCL minimum) ✓
2. **Two Load Types**: Sanctioned Load (no DF) and Load After DF (with DF) ✓
3. **Power Factors**: 0.8 for sanctioned, 0.9 for load after DF ✓

### ⚠️ Current Diversity Factors (May Need Adjustment)

Currently using NBC/EcoNiwas Samhita values:

| Load Category | Current MDF | Notes |
|--------------|-------------|-------|
| Residential Flat Loads | 0.40 (40%) | Conservative for large complexes (50+ units) |
| Lighting (Lobbies) | 0.60 (60%) | Standard |
| Lifts | 0.50 (50%) | Standard |
| HVAC/Ventilation | 0.70 (70%) | Standard |
| Water Supply | 0.60 (60%) | Standard |

## Electrical Engineering Best Practice

### Residential Load Diversity by Number of Units

According to NBC 2016, IEEE, and electrical engineering standards:

| Number of Units | Recommended MDF | Typical Load Pattern |
|----------------|-----------------|---------------------|
| 1 unit | 1.00 (100%) | Single family - all loads possible |
| 2-5 units | 0.70-0.80 | Small apartment building |
| 6-10 units | 0.60-0.70 | Medium apartment building |
| 11-20 units | 0.50-0.60 | Large apartment building |
| 21-50 units | 0.45-0.55 | High-rise residential |
| 51-100 units | 0.40-0.50 | Large complex |
| 100+ units | 0.35-0.45 | Very large complex |

**Reasoning**: As the number of units increases, the probability of all units using maximum load simultaneously decreases.

### Example Calculation

**Building**: 50 residential flats
**Per flat load**: 5 kW
**Total connected load**: 50 × 5 = 250 kW

**Sanctioned Load**:
- No diversity applied
- Sanctioned Load = 250 kW
- Sanctioned Load (kVA) = 250 / 0.8 = 312.5 kVA
- **Use this for quotation and billing**

**Load After Diversity Factor**:
- For 50 units: MDF = 0.45-0.50 (say 0.48)
- Maximum Demand = 250 × 0.48 = 120 kW
- Maximum Demand (kVA) = 120 / 0.9 = 133.3 kVA
- **Use this for DTC capacity sizing**

**DTC Selection**:
- Required: 133.3 kVA
- Select: 160 kVA or 200 kVA DTC based on area type

## Recommendation: Implement Variable Diversity

### Option 1: Keep Current Conservative Value (0.40)
- Pros: Safe, covers worst case
- Cons: May oversize infrastructure, higher costs

### Option 2: Variable Diversity Based on Unit Count
- Pros: More accurate, optimized infrastructure
- Cons: Requires calculation logic update

### Option 3: Make Diversity Factor Configurable
- Add to electrical_load_factors table
- Allow L0 users to adjust per project
- Can set conservative (0.40) or optimized values

## MSEDCL Compliance Checklist

When calculating electrical loads for MSEDCL compliance:

- [ ] Use minimum 75 W/sq.m for residential carpet area
- [ ] Calculate Total Connected Load from all sources
- [ ] Sanctioned Load = MAX(TCL, MSEDCL minimum)
- [ ] Apply PF 0.8 to get Sanctioned Load in kVA
- [ ] **For quotation**: Use Sanctioned Load (no diversity)
- [ ] **For DTC sizing**: Apply diversity factor to get Maximum Demand
- [ ] Apply PF 0.9 to get Load After DF in kVA
- [ ] Select DTC based on Load After DF and area type thresholds
- [ ] Never use Load After DF for billing purposes

## References

1. MSEDCL Circular - Infrastructure Development Guidelines 2016
2. National Building Code (NBC) 2016 - Part 8: Electrical Installations
3. EcoNiwas Samhita 2018 - Residential Energy Code
4. IEEE Std 399 - Power System Analysis
5. IS 732:2019 - Code of Practice for Electrical Wiring Installations

## Current vs MSEDCL Requirements

| Aspect | Current Implementation | MSEDCL Requirement | Status |
|--------|----------------------|-------------------|--------|
| Base load (W/sq.m) | 75 (MSEDCL) | 75 (Residential) | ✅ Compliant |
| Sanctioned Load DF | No DF applied | No DF | ✅ Correct |
| Load After DF | MDF 0.40 applied | DF applied (value not specified) | ✅ Compliant |
| Power Factor (Sanctioned) | 0.8 | 0.8 | ✅ Correct |
| Power Factor (Load After DF) | 0.9 | 0.9 | ✅ Correct |
| Diversity value | 0.40 (conservative) | Not specified by MSEDCL | ⚠️ Could optimize |

## Conclusion

**Current implementation is MSEDCL compliant**. The diversity factor of 0.40 (40%) is conservative and safe for large residential complexes. 

**Optional improvement**: Implement variable diversity factors based on number of residential units for more accurate infrastructure sizing and cost optimization.
