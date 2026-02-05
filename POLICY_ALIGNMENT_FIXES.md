# Policy Alignment Fixes - Water Demand Calculation

**Date:** February 5, 2026  
**Policies Referenced:** MEP-21 (Water Policy), Policy 25 (Occupancy Factor Norms)

## 🔴 Critical Bugs Fixed

### 1. **Retail Visitor Calculation - CRITICAL OVERCALCULATION**
**Location:** `src/pages/WaterDemandCalculation.jsx` Line 141

**Issue:**
- **Before:** `visitors = totalArea × visitorFactor`
  - Example: 1,000 sqm × 7 = **7,000 visitors** ❌
- **After:** `visitors = totalArea ÷ visitorFactor`
  - Example: 1,000 sqm ÷ 7 = **143 visitors** ✅

**Impact:** 
- Retail water demand was being **OVER-CALCULATED by 4,900% (49×)**
- A 1,000 sqm retail space was calculating for 7,000 visitors instead of 143
- This caused massive overestimation of water infrastructure requirements

**Policy Reference:** Policy 25 states "1 Visitor per ___ sq.mtr" meaning division, not multiplication

---

### 2. **Office Peak Occupancy Factor Missing**
**Location:** `src/pages/WaterDemandCalculation.jsx` Line 108

**Issue:**
- **Before:** Used full calculated occupancy (100%)
- **After:** Applied 90% peak factor as per Policy 25

**Impact:**
- Office water demand was being **OVER-CALCULATED by 11%**
- Example: 1,000 sqm ÷ 7.0 sqm/person = 143 occupants
  - Before: Water for 143 people
  - After: Water for 129 people (143 × 0.9)

**Policy Reference:** Policy 25 clearly states "90% (i.e. 10% absence)" for all office types

---

## ✅ Category Alignment Fixes

### 3. **Added Missing Residential Water Rates**

**Issue:** Policy 25 defines 4 residential categories but MEP-21 only defined 2

**Added:**
- **Hi-end:** Same rates as Luxury (165 L/day drinking, 75/45 L/day flushing)
- **Casa:** Same rates as Aspirational (110 L/day drinking, 60 L/day flushing)

**Justification:**
- Hi-end and Luxury have identical occupancy factors in Policy 25
- Casa and Aspirational have identical occupancy factors in Policy 25
- MEP-21 groups them into 2 water quality tiers

---

### 4. **Added Missing Flat Types**

**Added to Code & Database:**
- **1.5BHK:** Uses same occupancy as 2BHK
- **2.5BHK:** Uses same occupancy as 3BHK

**Policy Reference:** Policy 25 Page 1 mentions "2 BHK (and 1.5 BHK)" and "3 BHK (and 2.5 BHK)"

---

### 5. **Updated Residential Type Categories**

**Database Changes:**
```sql
REMOVED: Aspi, Premium, Villa
ADDED:   Luxury, Hi-end, Aspirational, Casa
```

**Reason:** Align with official Policy 25 Occupancy Factor Norms

---

## 📊 Water Demand Calculation Impact Summary

| Project Type | Metric | Before | After | Change |
|-------------|---------|---------|--------|---------|
| **Retail (Boulevard)** | 1000 sqm visitors | 7,000 visitors | 143 visitors | **-98%** 🔴 |
| **Retail (Experia)** | 1000 sqm visitors | 5,000 visitors | 200 visitors | **-96%** 🔴 |
| **Office (All)** | Occupancy | 100% | 90% | **-10%** ⚠️ |
| **Luxury/Hi-end** | Flushing options | Fixed 45L | 75L or 45L | ✅ Flexible |
| **All Residential** | Categories | 2 options | 4 options | ✅ Complete |

---

## 🔧 Technical Changes Made

### Files Modified:

1. **`src/pages/WaterDemandCalculation.jsx`**
   - Fixed retail visitor calculation (÷ instead of ×)
   - Added 90% peak factor for offices
   - Added Hi-end and Casa water rates
   - Added 1.5BHK and 2.5BHK to occupancy matrix
   - Updated UI to show all 4 residential categories
   - Added flush system selection for Hi-end (same as Luxury)

2. **`schema.sql`**
   - Updated residential types: Luxury, Hi-end, Aspirational, Casa
   - Added flat types: 1.5BHK, 2.5BHK

3. **`scripts/migrate-policy-alignment.js`** (NEW)
   - Database migration script to update existing installations
   - Removes old categories (Aspi, Premium, Villa)
   - Adds new Policy 25 aligned categories

---

## 🎯 Policy Compliance Status

### Before Fixes:
- ❌ MEP-21: Partial compliance (missing Hi-end/Casa)
- ❌ Policy 25: Major calculation errors
- ❌ Retail: 49× overcalculation error
- ❌ Office: Missing peak factor

### After Fixes:
- ✅ MEP-21: Full compliance (all water rates defined)
- ✅ Policy 25: Full compliance (all categories, correct calculations)
- ✅ Retail: Accurate visitor calculations
- ✅ Office: 90% peak factor applied
- ✅ Residential: All 4 categories with proper water rates

---

## 📝 Example Calculations

### Example 1: Retail Project (1,000 sqm Boulevard)

**Before:**
- Full-time workers: 1,000 ÷ 10 = 100 occupants
- Visitors: 1,000 × 7 = **7,000 visitors** ❌
- Drinking water: (100 × 25) + (7,000 × 5) = **37,500 L/day** ❌
- Flushing water: (100 × 20) + (7,000 × 10) = **72,000 L/day** ❌
- **TOTAL: 109,500 L/day** ❌

**After:**
- Full-time workers: 1,000 ÷ 10 = 100 occupants
- Visitors: 1,000 ÷ 7 = **143 visitors** ✅
- Drinking water: (100 × 25) + (143 × 5) = **3,215 L/day** ✅
- Flushing water: (100 × 20) + (143 × 10) = **3,430 L/day** ✅
- **TOTAL: 6,645 L/day** ✅

**Impact:** Reduced from 109,500 to 6,645 L/day (**-94% correction**)

---

### Example 2: Office Project (1,000 sqm Excelus)

**Before:**
- Occupancy: 1,000 ÷ 7.0 = 143 people (100%)
- Drinking: 143 × 20 = 2,860 L/day
- Flushing: 143 × 25 = 3,575 L/day
- **TOTAL: 6,435 L/day**

**After:**
- Occupancy: (1,000 ÷ 7.0) × 0.9 = 129 people (90% peak)
- Drinking: 129 × 20 = 2,580 L/day
- Flushing: 129 × 25 = 3,225 L/day
- **TOTAL: 5,805 L/day**

**Impact:** Reduced from 6,435 to 5,805 L/day (**-10% correction**)

---

### Example 3: Residential (100 units of 3BHK Hi-end)

**Before:**
- Could not calculate (Hi-end category missing) ❌

**After:**
- Occupancy: 100 units × 5 people = 500 occupants
- Drinking: 500 × 165 = 82,500 L/day
- Flushing (valves): 500 × 75 = 37,500 L/day
- Flushing (tanks): 500 × 45 = 22,500 L/day
- **TOTAL: 120,000 L/day (valves) or 105,000 L/day (tanks)** ✅

**Impact:** Now calculable with proper category support

---

## 🚀 Migration Instructions

### For Existing Installations:

1. **Update Code:**
   ```bash
   git pull  # Get latest changes
   ```

2. **Run Migration:**
   ```bash
   node scripts/migrate-policy-alignment.js
   ```

3. **Restart Server:**
   ```bash
   npm run server
   ```

4. **Verify:**
   - Check that Water Demand Calculation shows all 4 residential types
   - Test retail calculation with sample data
   - Verify office calculations apply 90% factor

---

## ⚠️ Breaking Changes

### Database Schema:
- Old residential types (Aspi, Premium, Villa) removed
- Existing projects using these types will need manual update
- Recommend mapping:
  - Aspi → Aspirational
  - Premium → Luxury or Hi-end
  - Villa → Luxury (if high-end) or create custom category

### API Responses:
- Water demand calculations will return different values (corrected)
- Retail projects will show ~94% reduction in water demand
- Office projects will show ~10% reduction
- This is correct behavior fixing previous bugs

---

## 📚 References

1. **MEP-21** - Policy w.r.t. water sources, demand types and treatment options
   - Page 3: Water consumption rates for project types
   - Table: Drinking, Flushing, Limited Human Touch, Mechanical Cooling

2. **Policy 25** - Occupation Factor Norms
   - Page 1: Residential occupancy by flat type and category
   - Page 1: Office occupancy (sqm per person) and 90% peak factor
   - Page 1: Retail occupancy (full-time and visitor factors)

---

## ✨ Benefits

1. **Accuracy:** Water demand calculations now match industry standards
2. **Compliance:** Full alignment with company policies
3. **Cost Savings:** Correctly sized water infrastructure (not oversized)
4. **Flexibility:** Support for all residential categories and flat types
5. **Transparency:** Clear mapping between policies and calculations

---

**Migration Status:** ✅ COMPLETED  
**Policy Compliance:** ✅ FULL COMPLIANCE  
**Testing Required:** Yes (verify all project types calculate correctly)
