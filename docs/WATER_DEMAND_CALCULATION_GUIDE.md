# Water Demand Calculation Feature - Implementation Guide

## Overview

The Water Demand Calculation feature allows users to calculate water requirements for selected buildings in a project based on building type, occupancy, and industry-standard water consumption rates.

## Features Implemented

### 1. Database Schema

A new table `water_demand_calculations` has been created with the following structure:

```sql
CREATE TABLE water_demand_calculations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    calculation_name VARCHAR(500) NOT NULL,
    selected_buildings JSONB NOT NULL,
    calculation_details JSONB NOT NULL,
    total_water_demand DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'Draft',
    calculated_by VARCHAR(255) NOT NULL,
    verified_by VARCHAR(255),
    remarks TEXT,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
```

### 2. API Endpoints

The following REST API endpoints have been implemented:

#### Create Water Demand Calculation
- **POST** `/api/water-demand-calculations`
- **Request Body:**
  ```json
  {
    "projectId": 1,
    "calculationName": "Water Demand - Phase 1",
    "selectedBuildings": [1, 2, 3],
    "calculationDetails": [...],
    "totalWaterDemand": 50000,
    "status": "Draft",
    "remarks": "Initial calculation"
  }
  ```

#### Get All Calculations for a Project
- **GET** `/api/water-demand-calculations?projectId=1`

#### Get Specific Calculation
- **GET** `/api/water-demand-calculations/:id`

#### Update Calculation
- **PUT** `/api/water-demand-calculations/:id`

#### Delete Calculation
- **DELETE** `/api/water-demand-calculations/:id`

#### Get Buildings with Details
- **GET** `/api/projects/:projectId/buildings-detailed`
- Returns buildings with complete floor and flat information

### 3. Water Demand Calculation Logic

#### Residential Buildings

**Occupancy Calculation:**
- Studio: 1 person
- 1BHK: 2 persons
- 2BHK: 3 persons
- 3BHK: 4 persons
- 4BHK: 5 persons

**Water Demand Rates (LPCD - Liters Per Capita Per Day):**
- Base Rate: 135 LPCD
- Residential Type Multipliers:
  - Aspi: 1.0x (135 LPCD)
  - Casa: 1.1x (148.5 LPCD)
  - Premium: 1.2x (162 LPCD)
  - Villa: 1.3x (175.5 LPCD)

**Formula:**
```
Total Water Demand = Total Occupancy × LPCD × Type Multiplier
```

#### Villa Buildings

**Calculation:**
- Default Occupancy: 4 persons per villa (3BHK equivalent)
- LPCD: 175.5 (Villa multiplier × base rate)
- Formula: `Villa Count × Occupancy Per Villa × Villa LPCD`

#### Non-Residential Buildings

**Fixed Rates:**
- Clubhouse: 70 LPCD (per person)
- MLCP: 10 LPCD (per parking space)
- Commercial: 45 LPCD (per person)
- Institute: 45 LPCD (per person)
- Industrial: 45 LPCD (per person)
- Hospital: 340 LPCD (per bed)
- Hospitality: 180 LPCD (per room)
- Data Center: 5 LPCD (per sqft)

**Formula:**
```
Total Water Demand = Estimated Capacity × Rate Per Unit
```

### 4. User Interface Features

#### Step 1: Building Selection
- Grid view of all buildings in the project
- Visual selection with checkboxes
- Shows building type, residential type, and floor count
- Multi-select capability

#### Step 2: Calculate
- Click "Calculate Water Demand" button
- System automatically:
  - Determines building type
  - Calculates occupancy based on flat types
  - Applies appropriate LPCD rates
  - Applies residential type multipliers
  - Aggregates total demand

#### Step 3: Review Results
- Detailed breakdown per building
- Floor-by-floor occupancy details for residential
- Calculation methodology shown
- Total water demand in Liters/day and KL/day
- Monthly estimate

#### Step 4: Save
- Add calculation name
- Set status (Draft, Under Review, Approved, Revised)
- Add remarks/notes
- Save to database

### 5. Calculation Display

For each selected building, the system shows:

**Residential Buildings:**
- Building name and type
- Total occupancy (persons)
- LPCD rate with type multiplier
- Floor-wise breakdown table:
  - Floor number/name
  - Flat type
  - Number of units
  - Occupancy per unit
  - Total occupancy
- Total water demand (L/day and KL/day)

**Non-Residential Buildings:**
- Building name and type
- Estimated capacity
- Rate per unit
- Total water demand (L/day and KL/day)

**Summary Card:**
- Total water demand for all selected buildings
- Daily demand (Liters and KL)
- Monthly estimate

## Usage Example

### Scenario: Calculate water demand for a residential tower

1. **Select Building:** "Tower A - Residential (Premium)"
   - 20 floors
   - Each floor has: 2×2BHK (1200 sqft) and 2×3BHK (1800 sqft)

2. **Calculation:**
   ```
   Occupancy per floor = (2 × 3) + (2 × 4) = 14 persons
   Total occupancy = 14 × 20 = 280 persons
   LPCD = 135 × 1.2 (Premium multiplier) = 162 LPCD
   Water demand = 280 × 162 = 45,360 L/day = 45.36 KL/day
   Monthly = 45.36 × 30 = 1,360.8 KL/month
   ```

3. **Result:**
   - System displays detailed breakdown
   - Shows 45,360 L/day
   - User clicks "Confirm and Save"
   - Calculation stored in database

## Technical Implementation

### Frontend Component
- **File:** `/src/pages/calculations/WaterDemandCalculation.jsx`
- **State Management:** React hooks (useState, useEffect)
- **API Integration:** Fetch API with JWT authentication

### Backend API
- **File:** `/server/index.js`
- **Authentication:** JWT token verification
- **Database:** PostgreSQL with prepared statements
- **JSON Storage:** Building selection and calculation details stored as JSONB

### Database Migration
- New table automatically created on server startup
- No manual migration required
- Existing data preserved

## Standards Reference

The water demand rates are based on:
- NBC (National Building Code) guidelines
- CPHEEO (Central Public Health and Environmental Engineering Organisation) Manual
- Industry best practices for residential and commercial buildings
- Lodha Group internal standards

## Future Enhancements

Potential improvements:
1. PDF export of calculation reports
2. Comparison between multiple calculations
3. Water storage tank sizing recommendations
4. Peak demand factor calculations
5. Pressure boosting requirements
6. Rainwater harvesting integration
7. Custom rate configuration per project
8. Historical data analysis
9. Water conservation measures suggestions

## API Testing

### Create a Calculation
```bash
curl -X POST http://localhost:5175/api/water-demand-calculations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "calculationName": "Test Calculation",
    "selectedBuildings": [1],
    "calculationDetails": [],
    "totalWaterDemand": 10000,
    "status": "Draft"
  }'
```

### Get Calculations
```bash
curl -X GET "http://localhost:5175/api/water-demand-calculations?projectId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Buildings with Details
```bash
curl -X GET "http://localhost:5175/api/projects/1/buildings-detailed" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Issue: Buildings not loading
- **Check:** Ensure buildings exist in the database for the project
- **Solution:** Add buildings through the project details page first

### Issue: Calculation not saving
- **Check:** Ensure calculation name is provided
- **Check:** Verify at least one building is selected
- **Check:** Check browser console for API errors

### Issue: Incorrect water demand values
- **Check:** Verify building type is set correctly
- **Check:** Ensure flat types and counts are accurate
- **Check:** Review residential type multiplier

## Security

- All endpoints require JWT authentication
- Only authenticated users can create/view calculations
- Project-level access control maintained
- SQL injection prevention through prepared statements
- Input validation on both frontend and backend

## Performance

- Efficient JSONB storage for calculation details
- Indexed foreign keys for fast queries
- Optimized building data fetch with single query
- Client-side calculation for instant feedback
- Minimal database writes (only on save)
