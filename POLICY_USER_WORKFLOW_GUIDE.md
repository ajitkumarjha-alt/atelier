# Policy Upload and Testing Workflow for L0/L1/L2 Users

## Overview

This guide explains how L0, L1, and L2 users can upload new policies, test their impact on water demand calculations, and activate them for use across the platform.

## User Roles

- **L0 / L1**: Can create, activate, and archive policies
- **L2**: Can create and view policies, but cannot activate or archive
- **SUPER_ADMIN**: Full access to all policy operations

---

## Complete Workflow

### Step 1: Create a New Policy

#### Option A: Manual Entry (Currently Available)

1. **Navigate to Policy Management**
   - Go to `/policy-management` in the application
   - Or click "Policy Management" from the main menu

2. **Click "Create New Policy"**
   - Click the gold "Create New Policy" button in the top right
   - A policy creation wizard will open

3. **Fill in Basic Information** (Step 1 of 5)
   - **Policy Name**: Descriptive name (e.g., "MEP-21 Water Policy Rev 5")
   - **Policy Number**: Official policy identifier (e.g., "MEP-21")
   - **Revision Number**: Version identifier (e.g., "Rev 5")
   - **Effective Date**: When this policy takes effect
   - **Document URL** (optional): Link to the official PDF
   - **Description**: Brief explanation of what changed in this revision
   - Click "Next →"

4. **Add Water Consumption Rates** (Step 2 of 5)
   - Click "+ Add Rate" to add each water consumption rate
   - For each rate, specify:
     - **Project Type**: Residential, Office, Retail, Multiplex, or School
     - **Sub Type**: Luxury, Hi-end, Aspirational, Casa, etc.
     - **Usage Category**: drinking, flushing, flushValves, flushTanks, etc.
     - **Rate Value**: Numeric value (e.g., 165 for 165 L/occupant/day)
     - **Unit**: L/occupant/day, L/seat, etc.
     - **Notes** (optional): Source reference (e.g., "MEP-21 Page 3")
   - Click "Next →"

5. **Add Occupancy Factors** (Step 3 of 5)
   - Click "+ Add Factor" to add each occupancy factor
   - For each factor, specify:
     - **Project Type**: Residential, Office, or Retail
     - **Sub Type**: Luxury, Hi-end, Aspirational, etc.
     - **Unit Type**: 1BHK, 2BHK, 3BHK, etc. (for residential)
     - **Factor Type**: 
       - `occupants_per_unit` (for residential)
       - `sqm_per_person` (for office/retail)
       - `visitor_sqm` (for retail visitor calculation)
       - `peak_factor` (for office peak occupancy)
     - **Factor Value**: Numeric value
     - **Unit**: occupants, sqm, etc.
   - Click "Next →"

6. **Add Calculation Parameters** (Step 4 of 5)
   - Click "+ Add Parameter" to add each calculation parameter
   - Common parameters:
     - `pool_evaporation_rate` - Pool evaporation (default: 8 mm/day)
     - `landscape_water_rate` - Landscape irrigation (default: 5 L/sqm/day)
     - `cooling_tower_makeup_rate` - Cooling tower makeup (default: 10 L/hr/TR)
     - `storage_buffer_factor` - Storage buffer (default: 1.2 = 20% extra)
   - For each parameter:
     - **Parameter Name**: Technical name (use snake_case)
     - **Value**: Numeric value
     - **Unit**: mm/day, L/sqm/day, L/hr/TR, etc.
     - **Description**: What this parameter controls
   - Click "Next →"

7. **Review and Create** (Step 5 of 5)
   - Review all entered information
   - Check the summary:
     - Number of water rates
     - Number of occupancy factors
     - Number of calculation parameters
   - Click "Create Policy" to save
   - ✅ Policy is created in **DRAFT** status

#### Option B: AI-Powered Upload (Coming Soon)

1. Click "Upload PDF (AI)" button
2. Upload the policy PDF document
3. AI will extract tables and parameters
4. Review and correct any extraction errors
5. Save as draft policy

---

### Step 2: Test the New Policy

Before activating a policy, test it with real calculations to see its impact.

1. **Navigate to a Water Demand Calculation**
   - Go to any project
   - Open Design Calculations
   - Click "New Calculation" → "Water Demand Calculation"

2. **Select the New Policy**
   - At the top of the form, you'll see the current policy banner
   - If multiple policies exist, a "Switch Policy" dropdown appears
   - Select your new draft policy from the dropdown
   - 🔶 Banner shows "Testing" badge (draft policies can be tested)

3. **Perform Calculation**
   - Fill in all project details (units, areas, etc.)
   - Click "Calculate"
   - Review the results:
     - Drinking water demand
     - Flushing water demand
     - Pool/landscape/cooling tower demands
     - Total water demand
     - Treatment recommendations

4. **Compare with Previous Policy**
   - Note the results
   - Switch back to the default policy using the dropdown
   - Recalculate with the same inputs
   - Compare the differences:
     - Is total demand higher or lower?
     - Which categories changed the most?
     - Are the changes expected?

5. **Test Multiple Scenarios**
   - Try different building types (Residential, Office, Retail, etc.)
   - Test various unit configurations
   - Verify pool, landscape, and cooling tower calculations
   - Ensure all rates are applied correctly

**Important Notes:**
- ⚠️ Calculations with draft policies can be tested but **cannot be saved**
- 💡 This is intentional to prevent draft calculations in the database
- ✅ Switch to an active policy to save calculations

---

### Step 3: Activate the Policy (L0/L1 Only)

Once testing confirms the policy is correct, L0 or L1 can activate it.

1. **Return to Policy Management**
   - Navigate to `/policy-management`

2. **Locate the Draft Policy**
   - Find your policy in the list
   - Status shows 🟡 "DRAFT" badge

3. **Review Policy Details**
   - Click the 👁️ "View" icon to see full details
   - Verify all water rates are correct
   - Verify all occupancy factors are correct
   - Verify all calculation parameters are correct

4. **Activate the Policy**
   - Click the ✅ green checkmark "Activate" button
   - Confirm activation in the popup dialog
   - Policy status changes to 🟢 "ACTIVE"

5. **Set as Default (Optional)**
   - Only one policy can be "default" at a time
   - The default policy is automatically used for new calculations
   - To make your policy the default:
     - System will ask if you want to set it as default during activation
     - Or manually set it later via the UI

**What Happens After Activation:**
- ✅ Policy becomes available for use in all calculations
- ✅ If set as default, new calculations automatically use this policy
- ✅ Old calculations still reference their original policy (immutable)
- 📝 Change log records the activation (who, when, why)

---

### Step 4: Monitor Impact

After activation, monitor how the new policy affects calculations.

1. **View Policy Usage**
   - In Policy Management, see how many calculations use each policy
   - (Feature coming soon: Usage analytics dashboard)

2. **Compare Historical Data**
   - Run the same calculation with old and new policies
   - Generate comparison reports
   - (Feature coming soon: Side-by-side comparison tool)

3. **Audit Trail**
   - Every calculation saves the policy_version_id
   - You can always trace which policy was used
   - Change log shows policy history

---

## Advanced Workflows

### Creating Policy Variations

To create a variation of an existing policy:

1. Go to Policy Management
2. View the existing policy details
3. Click "Create New Policy"
4. Manually copy values from the existing policy
5. Modify the values that need to change
6. Save as a new draft
7. Test and activate

*(Coming soon: "Clone Policy" feature to auto-copy existing values)*

### Rolling Back to Previous Policy

If a new policy causes issues:

1. Navigate to Policy Management
2. Find the previous policy (should still be active)
3. Click to set it as default
4. New calculations will use the previous policy
5. Optionally archive the problematic policy

### Archiving Old Policies (L0/L1 Only)

To clean up old policies:

1. Ensure the policy is not the default
2. Ensure no recent calculations use it
3. Click the 📦 "Archive" button
4. Policy status changes to "ARCHIVED"
5. Archived policies are retained for historical reference
6. They cannot be used for new calculations

---

## Common Scenarios

### Scenario 1: New MEP Revision Released

**Problem:** MEP-21 Rev 5 is released with new water rates.

**Solution:**
1. Create new policy: "MEP-21 Water Policy Rev 5"
2. Enter all water rates from the new revision
3. Keep occupancy factors same (unchanged)
4. Keep calc parameters same (unchanged)
5. Test with sample projects
6. Compare results with Rev 4
7. Activate when validated
8. Set as default

### Scenario 2: Policy 25 Occupancy Updates

**Problem:** Policy 25 has updated occupancy factors for residential units.

**Solution:**
1. Create new policy: "Policy 25 Occupancy Norms Rev 11"
2. Keep water rates same (unchanged)
3. Update occupancy factors with new values
4. Keep calc parameters same (unchanged)
5. Test residential calculations
6. Compare impact with Rev 10
7. Activate when validated

### Scenario 3: Custom Project-Specific Policy

**Problem:** A special project requires custom water rates.

**Solution:**
1. Create new policy: "Special Project - Custom Rates"
2. Enter custom water rates
3. Use standard occupancy factors
4. Use standard calc parameters
5. Test with project data
6. Do NOT set as default (keep for this project only)
7. Activate for team use
8. Share policy ID with project team

### Scenario 4: Testing "What-If" Scenarios

**Problem:** Management wants to know impact of reducing water rates by 10%.

**Solution:**
1. Create test policy: "Water Reduction Test - 10%"
2. Enter all rates reduced by 10%
3. Keep as DRAFT (do not activate)
4. Test with various project types
5. Generate comparison reports
6. Present findings to management
7. Archive the test policy after analysis

---

## Best Practices

### 1. Naming Conventions
- Include policy number and revision in the name
- Example: "MEP-21 Water Policy Rev 5 + Policy 25 Rev 10"
- Use consistent format across all policies

### 2. Documentation
- Always fill in the description field
- Explain what changed in this revision
- Reference official policy documents
- Add document URL when available

### 3. Testing
- Test at least 3 different project types before activating
- Compare results with previous policy
- Verify calculations match manual calculations
- Get peer review from another L0/L1 user

### 4. Versioning
- Never modify an active policy
- Create a new version instead
- Keep revision numbers sequential
- Maintain effective dates correctly

### 5. Communication
- Announce new policy activations to the team
- Explain what changed and why
- Provide training if calculations differ significantly
- Document known impacts

---

## Troubleshooting

### Problem: "Cannot activate policy"
**Cause:** You are L2 or lower level user  
**Solution:** Ask L0 or L1 to activate the policy

### Problem: "Policy data not loading in calculation"
**Cause:** Browser cache or network issue  
**Solution:** Refresh the page, clear cache, or check network connection

### Problem: "Calculations give unexpected results"
**Cause:** Policy rates may be incorrect  
**Solution:** Review policy details, compare with source document, correct and create new version

### Problem: "Cannot save calculation with draft policy"
**Cause:** Draft policies cannot be used for saved calculations  
**Solution:** Test only, then activate policy before saving calculations

### Problem: "Old calculations showing wrong policy"
**Cause:** Database migration or data corruption  
**Solution:** Contact system administrator, check policy_change_log table

---

## Summary

**For L0/L1 Users:**
1. Create new policy → Test → Activate → Set as default
2. Full control over policy lifecycle
3. Can archive outdated policies

**For L2 Users:**
1. Create new policy → Test → Request L0/L1 to activate
2. Can create and test, but not activate
3. View-only access to active policies

**For All Users:**
- Always test before activation
- Document changes clearly
- Compare with previous policy
- Monitor impact after activation
- Maintain audit trail

---

## Quick Reference

| Action | L0/L1 | L2 | Steps |
|--------|--------|-----|-------|
| Create Policy | ✅ | ✅ | Policy Mgmt → Create New Policy → Fill wizard |
| Test Policy | ✅ | ✅ | Water Demand Calc → Switch Policy → Calculate |
| Activate Policy | ✅ | ❌ | Policy Mgmt → Select Draft → Click Activate |
| Set as Default | ✅ | ❌ | During activation or in policy details |
| Archive Policy | ✅ | ❌ | Policy Mgmt → Select Active → Click Archive |
| View Policies | ✅ | ✅ | Policy Mgmt → View list and details |

---

## Next Steps

After mastering this workflow:
1. Learn to use AI-powered PDF extraction (when available)
2. Use the policy comparison tool (coming soon)
3. Generate impact reports (coming soon)
4. Set up policy approval workflows (coming soon)

For questions or support, contact your L0 administrator or system admin.
