# Policy Management System - Quick Test Guide

## Pre-Test Checklist

### Servers Running
✅ Backend: http://localhost:5175
✅ Frontend: http://localhost:5174

### Database Status
✅ Policy tables created: policy_versions, water_consumption_rates, occupancy_factors, calculation_parameters, policy_change_log, ai_extraction_sessions
✅ Default policy populated (ID: 1)
✅ 28 water rates loaded
✅ 34 occupancy factors loaded  
✅ 5 calculation parameters loaded

## Test Scenarios

### Test 1: View Water Demand Calculation Page

1. **Access the page:**
   - Navigate to a project's design calculations
   - Click "New Calculation" → "Water Demand"
   - Or direct URL: `http://localhost:5174/water-demand-calculation/{projectId}`

2. **Expected behavior:**
   - ✅ Policy banner displays at top of form
   - ✅ Shows: "MEP-21 Water Policy + Policy 25 Occupancy Norms (Current)"
   - ✅ Version badge: "MEP-21 + Policy 25 Rev Current"
   - ✅ "Default" badge visible
   - ✅ Effective date: "2/22/2018"
   - ✅ No loading spinner (policy loaded successfully)

3. **Browser Console Check:**
   ```javascript
   // Should see no errors
   // Should see policy data cached
   ```

### Test 2: Perform Water Demand Calculation

1. **Fill in form:**
   - Project Type: Residential
   - Sub Type: Luxury
   - Add units (e.g., 10x 2BHK, 5x 3BHK)
   - Click "Calculate"

2. **Expected behavior:**
   - ✅ Calculation completes successfully
   - ✅ Results display with drinking, flushing, total water demand
   - ✅ Treatment recommendations appear

3. **Save calculation:**
   - Click "Save" button
   - Navigate back after save

4. **Verify saved data:**
   - Check database for saved calculation:
   ```sql
   SELECT input_data->>'policy_version_id' as policy_id,
          input_data->>'policy_name' as policy_name,
          input_data->>'policy_number' as policy_number,
          input_data->>'policy_revision' as policy_revision
   FROM design_calculations 
   WHERE calculation_type = 'water-demand'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - ✅ Should show policy_version_id: "1"
   - ✅ Should show policy_name, policy_number, policy_revision

### Test 3: Policy Management UI

1. **Access policy management:**
   - Login as L0, L1, L2, or SUPER_ADMIN user
   - Navigate to `/policy-management`

2. **Expected behavior:**
   - ✅ Policy table displays with 1 row
   - ✅ Shows policy name, status (Active), default badge
   - ✅ Shows counts: 28 water rates, 34 occupancy factors, 5 calc params
   - ✅ "View Details" button visible

3. **View policy details:**
   - Click "View Details"
   - ✅ Accordion sections appear:
     - Water Consumption Rates (collapsed by default)
     - Occupancy Factors (collapsed by default)  
     - Calculation Parameters (collapsed by default)
   - Click to expand each section
   - ✅ All 28 water rates listed
   - ✅ All 34 occupancy factors listed
   - ✅ All 5 calculation parameters listed

### Test 4: API Endpoints

**Test from browser console or terminal:**

```bash
# List all policies
curl http://localhost:5175/api/policy-versions

# Get policy details
curl http://localhost:5175/api/policy-versions/1

# Get water rates
curl http://localhost:5175/api/policy-versions/1/water-rates

# Get occupancy factors
curl http://localhost:5175/api/policy-versions/1/occupancy-factors

# Get calculation parameters
curl http://localhost:5175/api/policy-versions/1/calculation-parameters
```

**Expected:**
- ✅ All endpoints return 200 OK
- ✅ Data matches database values
- ✅ No authentication errors (using dev bypass)

### Test 5: Policy Caching

1. **Open browser DevTools → Network tab**
2. Navigate to water demand calculation page
3. Wait 30 seconds
4. Refresh the page
5. Check network requests:
   - ✅ First load: 1 request to `/api/policy-versions/1`
   - ✅ Subsequent loads (within 5 min): No duplicate requests (cached)
   - ✅ After 5 minutes: New request fetches fresh data

### Test 6: Different Building Types

Test calculations with each project type to verify policy data loading:

1. **Residential:**
   - Luxury, Hi-end, Aspirational, Casa
   - ✅ All water rates load correctly
   - ✅ Flush valves vs tanks selector works for luxury/hi-end

2. **Office:**
   - Excelus, Supremus, iThink
   - ✅ Sqm per person factors load correctly
   - ✅ 90% peak occupancy applied

3. **Retail:**
   - Experia, Boulevard
   - ✅ Full-time and visitor factors load
   - ✅ Visitor calculation divides (not multiplies)

4. **Multiplex:**
   - ✅ Drinking: 5L/seat
   - ✅ Flushing: 10L/seat

5. **School:**
   - ✅ Drinking: 25L/head
   - ✅ Flushing: 20L/head

### Test 7: Calculation Parameters

Test special features that use CALC_PARAMS:

1. **Pool evaporation:**
   - Enable pool, enter area (e.g., 100 sqm)
   - Calculate
   - ✅ Limited Human Touch = 800L (100 × 8mm/day)

2. **Landscape irrigation:**
   - Enable landscape, enter area (e.g., 500 sqm)
   - Calculate
   - ✅ Limited Human Touch includes 2,500L (500 × 5L/sqm)

3. **Cooling tower:**
   - Enable cooling tower, enter capacity (e.g., 100 TR)
   - Calculate
   - ✅ Mechanical = 24,000L (100 × 10 × 24 hours)

## Troubleshooting

### Issue: Policy banner shows loading forever
**Solution:**
- Check browser console for errors
- Verify backend is running: `curl http://localhost:5175/health`
- Check if policy API returns data: `curl http://localhost:5175/api/policy-versions`

### Issue: "No active default policy found" error
**Solution:**
```sql
-- Verify policy exists and is default
SELECT id, name, status, is_default FROM policy_versions;

-- If not default, set it:
UPDATE policy_versions SET is_default = true WHERE id = 1;
```

### Issue: Calculation uses wrong values
**Solution:**
- Clear policy cache in browser console:
  ```javascript
  // In console
  import { clearPolicyCache } from './src/services/policyService.js';
  clearPolicyCache();
  ```
- Refresh page

### Issue: Can't access Policy Management page
**Solution:**
- Verify user level is L0, L1, L2, or SUPER_ADMIN
- Check route is added to App.jsx:
  ```bash
  grep -n "policy-management" src/App.jsx
  ```

## Success Criteria

All tests pass ✅:
- [ ] Policy banner displays correctly
- [ ] Calculations complete successfully  
- [ ] Policy data saves with calculations
- [ ] Policy Management UI loads
- [ ] All API endpoints work
- [ ] Caching prevents excessive requests
- [ ] All building types calculate correctly
- [ ] Pool/landscape/cooling tower use correct parameters

## Next Steps After Testing

Once all tests pass:

1. **Phase 2: AI Policy Extraction**
   - Implement PDF upload
   - Integrate Gemini Vision API
   - Build review/correction interface

2. **Phase 3: Policy Comparison**
   - Create multiple policy versions
   - Build diff view
   - Implement re-calculation feature

3. **Phase 4: Parameter Editing**
   - In-app table editor
   - Validation rules
   - Live preview

---

**Testing Date:** February 5, 2026  
**Tester:** _____________  
**Status:** Pending Testing  
**Notes:**
