# Policy Management - Visual Workflow Summary

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POLICY LIFECYCLE WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║  STEP 1: CREATE NEW POLICY                                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Navigate to: /policy-management                                 ║
║  Click: "Create New Policy" button                               ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  POLICY CREATION WIZARD (5 Steps)                     │      ║
║  ├────────────────────────────────────────────────────────┤      ║
║  │  1. Basic Info                                        │      ║
║  │     • Policy Name                                     │      ║
║  │     • Policy Number (e.g., MEP-21)                   │      ║
║  │     • Revision (e.g., Rev 5)                         │      ║
║  │     • Effective Date                                 │      ║
║  │     • Description                                    │      ║
║  │                                                      │      ║
║  │  2. Water Consumption Rates (28+ entries)           │      ║
║  │     • Project Type (Residential, Office, etc.)      │      ║
║  │     • Sub Type (Luxury, Hi-end, etc.)              │      ║
║  │     • Usage Category (drinking, flushing)          │      ║
║  │     • Rate Value (e.g., 165 L/occupant/day)       │      ║
║  │                                                    │      ║
║  │  3. Occupancy Factors (34+ entries)               │      ║
║  │     • Residential: occupants per unit            │      ║
║  │     • Office: sqm per person                     │      ║
║  │     • Retail: visitor factors                    │      ║
║  │                                                  │      ║
║  │  4. Calculation Parameters (5+ entries)         │      ║
║  │     • pool_evaporation_rate: 8 mm/day          │      ║
║  │     • landscape_water_rate: 5 L/sqm/day       │      ║
║  │     • cooling_tower_makeup_rate: 10 L/hr/TR   │      ║
║  │                                               │      ║
║  │  5. Review & Create                          │      ║
║  │     • Summary stats                          │      ║
║  │     • Confirm all data                       │      ║
║  │     • Click "Create Policy"                  │      ║
║  └──────────────────────────────────────────────┘      ║
║                                                         ║
║  Result: Policy created in 🟡 DRAFT status             ║
║                                                         ║
╚═══════════════════════════════════════════════════════════════════╝

                              ↓

╔═══════════════════════════════════════════════════════════════════╗
║  STEP 2: TEST THE POLICY                                          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Navigate to: Water Demand Calculation                           ║
║  (Any project → Design Calculations → New Water Demand)          ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  POLICY SELECTION BANNER                              │      ║
║  ├────────────────────────────────────────────────────────┤      ║
║  │  📄 MEP-21 Rev 5  [DRAFT - Testing Only]             │      ║
║  │                                                        │      ║
║  │  ⚠️ Testing Draft Policy - You can calculate but     │      ║
║  │  cannot save. Switch to active policy to save.       │      ║
║  │                                                        │      ║
║  │  Switch Policy: [Dropdown]                            │      ║
║  │    ├─ MEP-21 Rev 5 [DRAFT - Testing Only] ← Selected │      ║
║  │    └─ MEP-21 Rev 4 (Default) ✓                       │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                   ║
║  TEST SCENARIOS:                                                 ║
║  ┌──────────────────────────────────────────────────┐           ║
║  │ Scenario A: Residential Luxury Project          │           ║
║  │  • 10x 2BHK, 5x 3BHK                            │           ║
║  │  • Calculate → Review results                   │           ║
║  │  • Compare with MEP-21 Rev 4                    │           ║
║  │  • Note differences in water demand             │           ║
║  └──────────────────────────────────────────────────┘           ║
║                                                                   ║
║  ┌──────────────────────────────────────────────────┐           ║
║  │ Scenario B: Office Project                      │           ║
║  │  • 5000 sqm office space                        │           ║
║  │  • Calculate → Review occupancy                 │           ║
║  │  • Verify peak factor applied                   │           ║
║  └──────────────────────────────────────────────────┘           ║
║                                                                   ║
║  ┌──────────────────────────────────────────────────┐           ║
║  │ Scenario C: Pool + Landscape                     │           ║
║  │  • 100 sqm pool, 500 sqm landscape              │           ║
║  │  • Verify evaporation rate applied              │           ║
║  │  • Check landscape water calculation            │           ║
║  └──────────────────────────────────────────────────┘           ║
║                                                                   ║
║  COMPARISON TABLE:                                               ║
║  ┌────────────┬──────────────┬──────────────┬────────────┐      ║
║  │ Category   │ MEP-21 Rev 4 │ MEP-21 Rev 5 │ Difference │      ║
║  ├────────────┼──────────────┼──────────────┼────────────┤      ║
║  │ Drinking   │ 10,000 L/day │ 11,000 L/day │ +10%       │      ║
║  │ Flushing   │ 8,000 L/day  │ 7,500 L/day  │ -6.25%     │      ║
║  │ Pool       │ 800 L/day    │ 800 L/day    │ No change  │      ║
║  │ TOTAL      │ 18,800 L/day │ 19,300 L/day │ +2.7%      │      ║
║  └────────────┴──────────────┴──────────────┴────────────┘      ║
║                                                                   ║
║  ⚠️ IMPORTANT: Cannot save calculations with draft policies!    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

                              ↓

╔═══════════════════════════════════════════════════════════════════╗
║  STEP 3: ACTIVATE THE POLICY (L0/L1 only)                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Return to: /policy-management                                   ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  POLICY LIST                                          │      ║
║  ├────────────────────────────────────────────────────────┤      ║
║  │  Policy Name         Status   Actions                 │      ║
║  │  ─────────────────   ──────   ────────                │      ║
║  │  MEP-21 Rev 5        🟡DRAFT  👁️ View  ✅ Activate   │      ║
║  │  MEP-21 Rev 4        🟢ACTIVE 👁️ View  📦 Archive    │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                   ║
║  ACTIVATION PROCESS:                                             ║
║  1. Click 👁️ "View" to review policy details                    ║
║  2. Verify all rates, factors, parameters                        ║
║  3. Click ✅ "Activate" button                                   ║
║  4. Confirm activation dialog:                                   ║
║     "Are you sure you want to activate this policy?             ║
║      It will become available for all new calculations."         ║
║  5. Optionally set as default:                                   ║
║     "Make this the default policy? ☑️ Yes □ No"                 ║
║                                                                   ║
║  Result: Policy status changes to 🟢 ACTIVE                      ║
║                                                                   ║
║  CHANGE LOG ENTRY:                                               ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  Date: 2026-02-05 10:30:25                           │      ║
║  │  Action: Policy Activated                            │      ║
║  │  User: user@example.com (L0)                         │      ║
║  │  Policy: MEP-21 Rev 5                                │      ║
║  │  Reason: Updated water rates per new standard        │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

                              ↓

╔═══════════════════════════════════════════════════════════════════╗
║  STEP 4: USE IN PRODUCTION                                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Water Demand Calculations now use new policy by default         ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  POLICY BANNER (Production)                          │      ║
║  ├────────────────────────────────────────────────────────┤      ║
║  │  📄 MEP-21 Water Policy Rev 5                        │      ║
║  │  MEP-21 + Policy 25 Rev 10                           │      ║
║  │  🟢 Default  [Active]                                │      ║
║  │                                                        │      ║
║  │  Effective: 02/05/2026                                │      ║
║  │  Policy: MEP-21                                       │      ║
║  │                                                        │      ║
║  │  Switch Policy: [MEP-21 Rev 5 (Default) ▼]           │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                   ║
║  CALCULATION SAVED WITH POLICY REFERENCE:                        ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  Calculation ID: #12345                               │      ║
║  │  Project: Luxury Residences                           │      ║
║  │  Policy Used: MEP-21 Rev 5 (ID: 2)                   │      ║
║  │  Policy Version: Rev 5                                │      ║
║  │  Policy Effective Date: 2026-02-05                    │      ║
║  │  Calculated At: 2026-02-05 11:45:30                  │      ║
║  │                                                        │      ║
║  │  🔒 IMMUTABLE - Policy reference locked               │      ║
║  │  Future policy changes won't affect this calculation  │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VERSION CONTROL
   • Multiple policy versions can coexist
   • Each has unique ID, status, effective date
   • Draft → Active → Archived lifecycle

✅ TESTING BEFORE ACTIVATION
   • Draft policies can be tested but not saved
   • Compare results between different policies
   • Zero risk to production data

✅ GRANULAR ACCESS CONTROL
   • L2: Create and test policies
   • L0/L1: Activate and archive policies
   • SUPER_ADMIN: Full access

✅ IMMUTABLE AUDIT TRAIL
   • Every calculation saves policy_version_id
   • Historical calculations always reference original policy
   • Change log tracks all policy modifications

✅ SMART CACHING
   • 5-minute cache reduces API calls
   • Auto-refresh on policy changes
   • Optimal performance

✅ FLEXIBLE SWITCHING
   • Switch between policies instantly
   • Test "what-if" scenarios
   • No code changes needed


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          COMMON USE CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔷 USE CASE 1: Annual Policy Update
   1. New MEP-21 revision released → Create new policy
   2. Test with sample projects → Compare results
   3. Get L0 approval → Activate policy
   4. Set as default → All new calculations use it
   5. Old calculations retain their original policy

🔷 USE CASE 2: Project-Specific Custom Rates
   1. Client requests custom water rates → Create policy
   2. Test with client's requirements → Validate
   3. Activate (but don't set as default) → Team uses it
   4. Only this project uses custom policy → Others use default

🔷 USE CASE 3: Regulatory Compliance Check
   1. Authority updates occupancy norms → Create policy
   2. Re-run all projects → Generate comparison report
   3. Show impact to management → Get approval
   4. Activate → Ensure future compliance

🔷 USE CASE 4: Impact Analysis
   1. "What if we reduce by 10%?" → Create test policy
   2. Test with various scenarios → Analyze results
   3. Present findings → Management decision
   4. Either activate or archive test policy


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         TECHNICAL STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE:
  • policy_versions - Policy metadata
  • water_consumption_rates - 28+ water rates
  • occupancy_factors - 34+ occupancy factors
  • calculation_parameters - 5+ calc parameters
  • policy_change_log - Audit trail
  • ai_extraction_sessions - AI extraction tracking

API ENDPOINTS:
  GET    /api/policy-versions
  GET    /api/policy-versions/:id
  POST   /api/policy-versions
  POST   /api/policy-versions/:id/activate
  POST   /api/policy-versions/:id/archive
  GET    /api/policy-versions/:id/water-rates
  POST   /api/policy-versions/:id/water-rates
  GET    /api/policy-versions/:id/occupancy-factors
  POST   /api/policy-versions/:id/occupancy-factors
  GET    /api/policy-versions/:id/calculation-parameters
  POST   /api/policy-versions/:id/calculation-parameters

FRONTEND COMPONENTS:
  • PolicyManagement.jsx - Main policy management UI
  • PolicyCreationWizard.jsx - 5-step creation wizard
  • WaterDemandCalculation.jsx - Calculation with policy selector
  • policyService.js - API wrapper with caching


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          FUTURE ENHANCEMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 PHASE 2: AI Policy Extraction
   • Upload PDF policy documents
   • Gemini Vision API extracts tables
   • User reviews and corrects
   • One-click import

📊 PHASE 3: Policy Comparison
   • Side-by-side policy comparison
   • Diff view for changes
   • Impact analysis reports
   • Batch recalculation

✏️ PHASE 4: In-App Editing
   • Visual table editor
   • Inline editing of rates
   • Real-time validation
   • Preview before save

🔔 PHASE 5: Notifications
   • Email alerts on policy activation
   • Slack/Teams integration
   • Scheduled policy reviews
   • Compliance reminders


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                              SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documentation:
  • POLICY_USER_WORKFLOW_GUIDE.md - Detailed user guide
  • POLICY_MANAGEMENT_IMPLEMENTATION.md - Technical docs
  • POLICY_MANAGEMENT_TEST_GUIDE.md - Testing checklist

For issues or questions:
  • Contact L0 administrator
  • System admin: Check policy_change_log table
  • Review audit trail in database
```
