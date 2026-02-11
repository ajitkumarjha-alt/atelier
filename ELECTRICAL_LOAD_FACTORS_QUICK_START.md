# Electrical Load Factors - Quick Start Guide

## 🎯 What Was Built

A **complete editable standards table** for electrical load calculations with support for multiple guidelines (MSEDCL, NBC, etc.)

---

## 📍 Where to Find It

**Navigation Path:**
```
Main Menu → Project Standards Management → Calculation Standards Tab
→ Select "Electrical" → Select "Electrical Load"
```

---

## 🖼️ UI Overview

### Main Interface Components:

```
┌─────────────────────────────────────────────────────────────────┐
│  Project Standards Management                                   │
├─────────────────────────────────────────────────────────────────┤
│  [Standards] [Calculations] [Documents]                         │
├──────────────┬──────────────┬─────────────────────────────────┐│
│              │              │  Electrical Load Factors        ││
│ Disciplines  │   Modules    │                                 ││
│              │              │  Guidelines: [MSEDCL 2016 ▼]   ││
│ ▶ Electrical │              │  [+ Add Factor]                 ││
│   PHE        │ Electrical   │                                 ││
│   Fire Fight │ Load         │ ┌──────────────────────────────┐││
│   LV         │              │ │ Use Type  │ W/sqm │ MDF│EDF ││││
│   HVAC       │ Cable Select │ ├───────────┼───────┼────┼────┤││
│              │              │ │ Flat      │ 25.00 │0.4 │0.1 ││││
│              │ Transformers │ │ Lobby     │  3.00 │0.6 │0.6 ││││
│              │              │ │ Terrace   │  2.00 │0.6 │0.6 ││││
│              │ Earthing     │ │ [Edit] [Delete]             ││││
│              │              │ └──────────────────────────────┘││
│              │ LPS          │                                 ││
└──────────────┴──────────────┴─────────────────────────────────┘│
```

---

## 🔧 Key Features

### 1. **Guideline Selector**
- Dropdown shows all available guidelines
- Filter factors by standard (MSEDCL 2016, NBC 2016, etc.)
- Create new guidelines on the fly

### 2. **Factors Table**
Shows for each factor:
- **Use Type**: Description (e.g., "Residential Flat", "Commercial with AC")
- **W/sq.m**: Power density (watt per square meter)
- **MDF**: Maximum Demand Factor (diversity)
- **EDF**: Essential Demand Factor
- **FDF**: Fire Demand Factor
- **Notes**: Reference documentation
- **Actions**: Edit and Delete buttons

### 3. **Add/Edit Factor Modal**
Fields available:
```
┌────────────────────────────────────────────┐
│  Add Electrical Load Factor                │
├────────────────────────────────────────────┤
│  Category: [RESIDENTIAL ▼]                 │
│  Sub-Category: [FLAT________]              │
│  Description: [Residential Flat Load____]  │
│  Watt per sq.m: [25.00_____]              │
│  Guideline: [MSEDCL 2016___]              │
│  MDF: [0.6000_]  EDF: [0.6000_]           │
│  FDF: [0.0000_]                            │
│  Notes: [________________________]         │
│                                            │
│         [Cancel]  [Create Factor]          │
└────────────────────────────────────────────┘
```

---

## 📝 Example Use Cases

### Adding a New Standard (NBC 2016)

1. Click **"Add Factor"** button
2. Fill in:
   - Category: `RESIDENTIAL`
   - Sub-Category: `FLAT`
   - Description: `Residential Flat as per NBC 2016`
   - Watt per sq.m: `20`
   - Guideline: `NBC 2016` *(new guideline)*
   - MDF: `0.5`
3. Click **"Create Factor"**
4. The `NBC 2016` guideline now appears in the dropdown

### Adding Commercial Load Type

1. Click **"Add Factor"**
2. Fill in:
   - Category: `COMMERCIAL`
   - Sub-Category: `OFFICE_AC`
   - Description: `Commercial Office with AC`
   - Watt per sq.m: `45`
   - Guideline: `MSEDCL 2016`
   - MDF: `0.7`, EDF: `0.3`, FDF: `0.0`
3. Save

### Adding Equipment-Based Load (No W/sq.m)

1. Click **"Add Factor"**
2. Fill in:
   - Category: `LIFTS`
   - Sub-Category: `PASSENGER`
   - Description: `Passenger Lift`
   - Watt per sq.m: *(leave empty)*
   - MDF: `0.5`, EDF: `0.5`, FDF: `0.0`
3. Save

---

## 🎯 Pre-Populated Data

The system comes with **25+ standard factors** based on MSEDCL 2016:

### Residential
- Residential Flat Load (25 W/sq.m)

### Lighting
- GF Entrance Lobby (3 W/sq.m)
- Typical Floor Lobby (3 W/sq.m)
- Terrace Lighting (2 W/sq.m)
- Landscape Lighting (2 W/sq.m)
- Street Lighting (2 W/sq.m)

### Lifts
- Passenger Lift (MDF: 0.5)
- Passenger cum Fire Lift (FDF: 1.0)
- Firemen Lift (FDF: 1.0)

### PHE (Pumps)
- Booster Pump
- Sewage Pump
- Fire Fighting Main Pump
- Sprinkler Pump

### Infrastructure
- STP (Sewage Treatment Plant)
- Clubhouse
- EV Charger

...and more

---

## 💡 Understanding Diversity Factors

### MDF (Maximum Demand Factor)
- Applied to total connected load for normal operation
- Example: 0.6 means only 60% of loads run simultaneously

### EDF (Essential Demand Factor)
- Loads that run during power outage (on DG/backup)
- Example: 0.1 means only 10% of flat load is essential

### FDF (Fire Demand Factor)
- Loads that run during fire emergency
- Example: 1.0 means full load, 0.0 means not needed in fire

---

## 🔄 How It's Used

When you run an **Electrical Load Calculation**:

1. Service loads factors from database
2. Filters by active guideline
3. Applies appropriate factors to your inputs:
   - **Area-based**: Uses W/sq.m × area
   - **Equipment-based**: Uses equipment power
4. Applies diversity factors (MDF, EDF, FDF)
5. Generates load summary

**Result**: Compliant electrical load calculations based on your selected standard.

---

## ✅ What You Can Do Now

- ✅ View all electrical load factors for any guideline
- ✅ Add new factors (use types)
- ✅ Edit existing factors
- ✅ Delete/deactivate factors
- ✅ Create new guidelines (just enter a new name)
- ✅ Switch between guidelines using dropdown
- ✅ Manage MSEDCL, NBC, or custom standards

---

## 🚀 Next Steps

**Ready to Use:**
- Go to Project Standards Management
- Navigate to Calculation Standards → Electrical → Electrical Load
- Start adding/editing factors!

**For Calculations:**
- Factors are automatically used in Electrical Load Calculation page
- Service pulls active factors based on guideline

---

## 📞 Need Help?

**Common Questions:**

**Q: Can I delete a factor?**  
A: Yes, click the trash icon. It's a soft delete, so it can be restored from database if needed.

**Q: Can I have multiple guidelines?**  
A: Yes! Create as many as you need. Each guideline is independent.

**Q: What if I want to use NBC instead of MSEDCL?**  
A: Add all NBC factors with guideline = "NBC 2016", then select NBA 2016 from dropdown.

**Q: Can other users see/edit these?**  
A: Only L0 (Super Admin) users can edit. Other users will use these factors in calculations (read-only).

---

**Quick Access**: Main Menu → Project Standards → Calculation Standards → Electrical → Electrical Load

**Status**: ✅ Live and Ready to Use!
