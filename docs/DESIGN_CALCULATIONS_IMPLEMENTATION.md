# Design Calculations - Implementation Summary

## Overview
Individual calculation pages have been created as placeholders for each type of design calculation. These pages will eventually allow users to confirm data from building details, company policies, and by-laws, generate calculations, and download results.

## Created Files

### Calculation Pages (src/pages/calculations/)
1. **ElectricalLoadCalculation.jsx** - Electrical load calculations
2. **WaterDemandCalculation.jsx** - Water demand calculations
3. **CableSelectionSheet.jsx** - Cable selection calculations
4. **RisingMainDesign.jsx** - Rising main design calculations
5. **DownTakeDesign.jsx** - Down take design calculations
6. **BusRiserDesign.jsx** - Bus riser design calculations
7. **LightingLoadCalculation.jsx** - Lighting load calculations
8. **HVACLoadCalculation.jsx** - HVAC load calculations
9. **FirePumpCalculation.jsx** - Fire pump calculations
10. **PlumbingFixtureCalculation.jsx** - Plumbing fixture calculations
11. **EarthingLightningCalculation.jsx** - Earthing & lightning calculations
12. **PanelSchedule.jsx** - Panel schedule calculations

### Routes (App.jsx)
Routes have been added for all calculation pages with the following pattern:
```
/projects/:projectId/calculations/{slug}/:calculationId?
```

URL Slugs mapping:
- Electrical Load Calculation → electrical-load
- Water Demand Calculation → water-demand
- Cable Selection Sheet → cable-selection
- Rising Main Design → rising-main
- Down Take Design → down-take
- Bus Riser Design → bus-riser
- Lighting Load Calculation → lighting-load
- HVAC Load Calculation → hvac-load
- Fire Pump Calculation → fire-pump
- Plumbing Fixture Calculation → plumbing-fixture
- Earthing & Lightning Calculation → earthing-lightning
- Panel Schedule → panel-schedule

## Current Features

### Placeholder Page Structure
Each calculation page includes:
- Header with back navigation to Design Calculations list
- Calculation type title
- Calculation ID display
- "Coming Soon" message with feature preview
- List of upcoming features:
  - Data confirmation from building details
  - Company policy and by-laws integration
  - Automated calculation generation
  - PDF and Excel export options

### Navigation
- Users can click on any calculation row in the Design Calculations list to view the individual page
- Each calculation has a "View" button for explicit navigation
- Back button returns to the Design Calculations list

## Access Control
Currently, all logged-in users can view calculation pages. The final implementation should enforce:
- **L2 and above**: Can create, edit, and generate calculations
- **L3, L4, Vendors**: Can only view and download calculations

## Future Implementation Requirements

### 1. Data Confirmation Section
- Display building details (area, floors, occupancy, etc.)
- Show applicable company policies
- Display relevant by-laws and standards
- Allow user to review and confirm data before calculation

### 2. Calculation Engine
- Implement calculation logic for each type
- Pull data from:
  - Building details (from database)
  - Company policies (configurable)
  - By-laws (configurable standards)
- Generate results in standardized format

### 3. Results Display
- Show calculated values in organized format
- Display formulas and assumptions used
- Include diagrams or tables as needed
- Show compliance status with standards

### 4. Export Functionality
- Generate PDF reports with company branding
- Export to Excel with formulas intact
- Include all source data and assumptions
- Add digital signatures for verified calculations

### 5. Version Control
- Track calculation revisions
- Store previous versions
- Show change history
- Allow rollback if needed

### 6. Review Workflow
- Submit for review/approval
- Add reviewer comments
- Track approval status
- Notification system for stakeholders

## Database Requirements

### Additional Tables Needed
- `calculation_versions` - Track revisions
- `calculation_approvals` - Approval workflow
- `company_policies` - Configurable policies
- `by_laws` - Standards and regulations
- `calculation_templates` - Pre-defined formats

### Fields to Add to design_calculations
- `data_confirmed` (boolean)
- `calculated_data` (JSON - store calculation results)
- `version` (integer)
- `approved_by` (string)
- `approved_at` (timestamp)

## File Structure
```
src/pages/calculations/
├── index.js                           # Export all components
├── ElectricalLoadCalculation.jsx
├── WaterDemandCalculation.jsx
├── CableSelectionSheet.jsx
├── RisingMainDesign.jsx
├── DownTakeDesign.jsx
├── BusRiserDesign.jsx
├── LightingLoadCalculation.jsx
├── HVACLoadCalculation.jsx
├── FirePumpCalculation.jsx
├── PlumbingFixtureCalculation.jsx
├── EarthingLightningCalculation.jsx
└── PanelSchedule.jsx
```

## Next Steps
1. Design detailed UI/UX for each calculation type
2. Define calculation formulas and logic
3. Create calculation templates
4. Implement data confirmation workflow
5. Build calculation engines
6. Add PDF/Excel generation
7. Implement access control based on user level
8. Add review and approval workflow
