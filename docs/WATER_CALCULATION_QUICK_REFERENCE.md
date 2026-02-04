# Water Demand Calculation - Quick Reference

## How It Works

1. **Navigate to Water Calculation Page**
   - Go to Project → Design Calculations → Water Demand Calculation

2. **Enter Calculation Name**
   - Give your calculation a descriptive name
   - Example: "Phase 1 - Residential Towers A & B"

3. **Select Buildings**
   - Click on buildings to include in calculation
   - Selected buildings show blue border with checkmark
   - Can select multiple buildings

4. **Click "Calculate Water Demand"**
   - System automatically:
     - Identifies building types
     - Counts flats and calculates occupancy
     - Applies correct LPCD rates
     - Shows detailed breakdown

5. **Review Results**
   - See floor-wise breakdown for residential
   - View occupancy and water demand per building
   - Check total water demand summary

6. **Confirm and Save**
   - Review all details
   - Add remarks if needed
   - Set status (Draft/Under Review/Approved)
   - Click "Confirm and Save"

## Water Demand Rates (LPCD)

### Residential
- **Base Rate:** 135 LPCD
- **Aspi Type:** 135 LPCD (1.0x)
- **Casa Type:** 148.5 LPCD (1.1x)
- **Premium Type:** 162 LPCD (1.2x)
- **Villa Type:** 175.5 LPCD (1.3x)

### Occupancy per Flat
- Studio: 1 person
- 1BHK: 2 persons
- 2BHK: 3 persons
- 3BHK: 4 persons
- 4BHK: 5 persons

### Non-Residential
- Clubhouse: 70 LPCD
- Commercial: 45 LPCD
- Hospital: 340 LPCD per bed
- Hospitality: 180 LPCD per room
- MLCP: 10 LPCD per space

## Example Calculation

**Building:** Premium Tower - 15 floors
**Each Floor:** 2×2BHK + 1×3BHK

**Calculation:**
- Occupancy/floor = (2×3) + (1×4) = 10 persons
- Total occupancy = 10 × 15 = 150 persons
- LPCD = 135 × 1.2 = 162 LPCD
- **Water Demand = 150 × 162 = 24,300 L/day**
- **= 24.3 KL/day or ~729 KL/month**

## API Endpoints

- `POST /api/water-demand-calculations` - Create new
- `GET /api/water-demand-calculations?projectId=X` - List all
- `GET /api/water-demand-calculations/:id` - Get one
- `PUT /api/water-demand-calculations/:id` - Update
- `DELETE /api/water-demand-calculations/:id` - Delete
- `GET /api/projects/:id/buildings-detailed` - Get buildings with floors/flats
