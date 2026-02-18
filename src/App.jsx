import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { UserProvider, useUser } from './lib/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { createOrUpdateUser } from './services/userService';
import { Loader } from 'lucide-react';

// ── Eagerly loaded (landing / auth flow) ─────────────────────────────────────
import WelcomePage from './pages/WelcomePage';

// ── Lazily loaded pages ──────────────────────────────────────────────────────
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const L0Dashboard = lazy(() => import('./pages/L0Dashboard'));
const L1Dashboard = lazy(() => import('./pages/L1Dashboard'));
const L2Dashboard = lazy(() => import('./pages/L2Dashboard'));
const L3Dashboard = lazy(() => import('./pages/L3Dashboard'));
const L4Dashboard = lazy(() => import('./pages/L4Dashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const VendorLogin = lazy(() => import('./pages/VendorLogin'));
const CMDashboard = lazy(() => import('./pages/CMDashboard'));
const ConsultantLogin = lazy(() => import('./pages/ConsultantLogin'));
const ConsultantDashboard = lazy(() => import('./pages/ConsultantDashboard'));
const ConsultantProjectDrawings = lazy(() => import('./pages/ConsultantProjectDrawings'));
const ConsultantProjectCalculations = lazy(() => import('./pages/ConsultantProjectCalculations'));
const ConsultantMASDetail = lazy(() => import('./pages/ConsultantMASDetail'));
const ConsultantRFIDetail = lazy(() => import('./pages/ConsultantRFIDetail'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ProjectInput = lazy(() => import('./pages/ProjectInput'));
const ProjectInputEnhanced = lazy(() => import('./pages/project/ProjectInputEnhanced'));
const DDSManagement = lazy(() => import('./pages/DDSManagement'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const RFCManagement = lazy(() => import('./pages/RFCManagement'));
const StandardsHub = lazy(() => import('./pages/StandardsHub'));
const MASPage = lazy(() => import('./pages/MASPage'));
const MASForm = lazy(() => import('./pages/MASForm'));
const MASDetail = lazy(() => import('./pages/MASDetail'));
const RFIPage = lazy(() => import('./pages/RFIPage'));
const RFICreate = lazy(() => import('./pages/RFICreate'));
const RFIDetail = lazy(() => import('./pages/RFIDetail'));
const MyAssignments = lazy(() => import('./pages/MyAssignments'));
const DrawingSchedule = lazy(() => import('./pages/DrawingSchedule'));
const DesignCalculations = lazy(() => import('./pages/DesignCalculations'));
const ChangeRequestsPage = lazy(() => import('./pages/ChangeRequestsPage'));
const ChangeRequestDetail = lazy(() => import('./pages/ChangeRequestDetail'));

// Meeting Point
const MeetingPoint = lazy(() => import('./pages/MeetingPoint'));
const MeetingPointThread = lazy(() => import('./pages/MeetingPointThread'));

// Calculation pages
const ElectricalLoadCalculation = lazy(() => import('./pages/calculations/ElectricalLoadCalculation'));
const WaterDemandCalculation = lazy(() => import('./pages/calculations/WaterDemandCalculation'));
const CableSelectionSheet = lazy(() => import('./pages/calculations/CableSelectionSheet'));
const RisingMainDesign = lazy(() => import('./pages/calculations/RisingMainDesign'));
const DownTakeDesign = lazy(() => import('./pages/calculations/DownTakeDesign'));
const BusRiserDesign = lazy(() => import('./pages/calculations/BusRiserDesign'));
const LightingLoadCalculation = lazy(() => import('./pages/calculations/LightingLoadCalculation'));
const HVACLoadCalculation = lazy(() => import('./pages/calculations/HVACLoadCalculation'));
const FirePumpCalculation = lazy(() => import('./pages/calculations/FirePumpCalculation'));
const PlumbingFixtureCalculation = lazy(() => import('./pages/calculations/PlumbingFixtureCalculation'));
const EarthingLightningCalculation = lazy(() => import('./pages/calculations/EarthingLightningCalculation'));
const PanelSchedule = lazy(() => import('./pages/calculations/PanelSchedule'));
const FireFightingSystemDesign = lazy(() => import('./pages/calculations/FireFightingSystemDesign'));
const VentilationPressurisation = lazy(() => import('./pages/calculations/VentilationPressurisation'));
const PHEPumpSelection = lazy(() => import('./pages/calculations/PHEPumpSelection'));

// ── Shared loading spinner ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
      <div className="flex flex-col items-center gap-4">
        <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
        <div className="text-lodha-black text-xl font-garamond font-bold">Loading...</div>
      </div>
    </div>
  );
}

// ── Role constants ───────────────────────────────────────────────────────────
const ADMIN_ROLES = ['SUPER_ADMIN'];
const LEADERSHIP = ['SUPER_ADMIN', 'L0', 'L1'];
const DESIGN_TEAM = ['SUPER_ADMIN', 'L1', 'L2'];
const MAS_ROLES = ['SUPER_ADMIN', 'L1', 'L2', 'VENDOR'];
const RFI_ROLES = ['SUPER_ADMIN', 'L1', 'L2', 'CM'];
const RFC_ROLES = ['SUPER_ADMIN', 'L1', 'L2', 'L3'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div className="min-h-screen bg-lodha-sand p-8">
      <h1 className="text-3xl font-garamond font-bold text-lodha-gold">
        {title} (Coming Soon)
      </h1>
    </div>
  );
}

function AppRoutes() {
  const { user, userLevel, loading, isActive } = useUser();

  if (loading) {
    return <PageLoader />;
  }

  // Shorthand wrapper
  const P = ({ children, roles, redirect }) => (
    <ProtectedRoute user={user} userLevel={userLevel} roles={roles} redirect={redirect}>
      {children}
    </ProtectedRoute>
  );

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public ─────────────────────────────────────────────── */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/vendor-login" element={<VendorLogin />} />
          <Route path="/consultant-login" element={<ConsultantLogin />} />

          {/* ── Pending Approval ───────────────────────────────────── */}
          <Route
            path="/pending-approval"
            element={
              user && userLevel === null ? (
                <PendingApproval />
              ) : user && userLevel !== null ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* ── Dashboard Router ───────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              user ? (
                userLevel === null ? (
                  <Navigate to="/pending-approval" replace />
                ) : userLevel === 'SUPER_ADMIN' ? (
                  <Navigate to="/super-admin-dashboard" replace />
                ) : userLevel === 'L0' ? (
                  <Navigate to="/l0-dashboard" replace />
                ) : userLevel === 'L1' ? (
                  <Navigate to="/l1-dashboard" replace />
                ) : userLevel === 'VENDOR' ? (
                  <Navigate to="/vendor-dashboard" replace />
                ) : userLevel === 'CM' ? (
                  <Navigate to="/cm-dashboard" replace />
                ) : userLevel === 'L3' ? (
                  <Navigate to="/l3-dashboard" replace />
                ) : userLevel === 'L4' ? (
                  <Navigate to="/l4-dashboard" replace />
                ) : userLevel === 'CONSULTANT' ? (
                  <Navigate to="/consultant-dashboard" replace />
                ) : (
                  <Navigate to="/l2-dashboard" replace />
                )
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* ── Dashboards ─────────────────────────────────────────── */}
          <Route path="/super-admin-dashboard" element={<P roles={ADMIN_ROLES}><SuperAdminDashboard /></P>} />
          <Route path="/l0-dashboard" element={<P roles={['L0', 'SUPER_ADMIN']}><L0Dashboard /></P>} />
          <Route path="/l1-dashboard" element={<P roles={['L1', 'SUPER_ADMIN']}><L1Dashboard /></P>} />
          <Route path="/l2-dashboard" element={<P roles={DESIGN_TEAM}><L2Dashboard /></P>} />
          <Route path="/l3-dashboard" element={<P><L3Dashboard /></P>} />
          <Route path="/l4-dashboard" element={<P><L4Dashboard /></P>} />
          <Route path="/cm-dashboard" element={<P roles={['CM', 'SUPER_ADMIN']}><CMDashboard /></P>} />
          <Route
            path="/vendor-dashboard"
            element={
              (localStorage.getItem('vendorEmail') || (user && (userLevel === 'VENDOR' || userLevel === 'SUPER_ADMIN'))) ? (
                <VendorDashboard />
              ) : (
                <Navigate to="/vendor-login" replace />
              )
            }
          />
          <Route
            path="/consultant-dashboard"
            element={
              (localStorage.getItem('consultantEmail') || (user && userLevel === 'SUPER_ADMIN')) ? (
                <ConsultantDashboard />
              ) : (
                <Navigate to="/consultant-login" replace />
              )
            }
          />

          {/* ── Standards / Policy ─────────────────────────────────── */}
          <Route path="/standards" element={<P><StandardsHub /></P>} />
          <Route path="/project-standards" element={<Navigate to="/standards" replace />} />
          <Route path="/policy-management" element={<Navigate to="/standards" replace />} />
          <Route path="/standards-management" element={<Navigate to="/standards" replace />} />

          {/* ── Projects ───────────────────────────────────────────── */}
          <Route path="/project/:id" element={<P><ProjectDetail /></P>} />
          <Route path="/project-input" element={<P roles={LEADERSHIP}><ProjectInput /></P>} />
          <Route path="/project-input/:projectId" element={<P roles={LEADERSHIP}><ProjectInput /></P>} />
          <Route path="/project-input-enhanced" element={<P roles={LEADERSHIP}><ProjectInputEnhanced /></P>} />
          <Route path="/project-input-enhanced/:projectId" element={<P roles={LEADERSHIP}><ProjectInputEnhanced /></P>} />

          {/* ── DDS / Tasks / RFC ──────────────────────────────────── */}
          <Route path="/dds/:projectId" element={<P><DDSManagement /></P>} />
          <Route path="/task-management" element={<P><TaskManagement /></P>} />
          <Route path="/rfc-management" element={<P roles={RFC_ROLES}><RFCManagement /></P>} />
          <Route path="/projects/:projectId/rfc" element={<P><RFCManagement /></P>} />

          {/* ── Drawing Schedule & Design Calcs ────────────────────── */}
          <Route path="/drawing-schedule/:projectId" element={<P roles={DESIGN_TEAM}><DrawingSchedule /></P>} />
          <Route path="/design-calculations/:projectId" element={<P><DesignCalculations /></P>} />

          {/* ── Individual Calculation Pages ────────────────────────── */}
          <Route path="/projects/:projectId/calculations/electrical-load/:calculationId?" element={<P><ElectricalLoadCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/water-demand/:calculationId?" element={<P><WaterDemandCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/cable-selection/:calculationId?" element={<P><CableSelectionSheet /></P>} />
          <Route path="/projects/:projectId/calculations/rising-main/:calculationId?" element={<P><RisingMainDesign /></P>} />
          <Route path="/projects/:projectId/calculations/down-take/:calculationId?" element={<P><DownTakeDesign /></P>} />
          <Route path="/projects/:projectId/calculations/bus-riser/:calculationId?" element={<P><BusRiserDesign /></P>} />
          <Route path="/projects/:projectId/calculations/lighting-load/:calculationId?" element={<P><LightingLoadCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/hvac-load/:calculationId?" element={<P><HVACLoadCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/fire-pump/:calculationId?" element={<P><FirePumpCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/plumbing-fixture/:calculationId?" element={<P><PlumbingFixtureCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/earthing-lightning/:calculationId?" element={<P><EarthingLightningCalculation /></P>} />
          <Route path="/projects/:projectId/calculations/panel-schedule/:calculationId?" element={<P><PanelSchedule /></P>} />
          <Route path="/projects/:projectId/calculations/fire-fighting-system-design" element={<P><FireFightingSystemDesign /></P>} />
          <Route path="/projects/:projectId/calculations/ventilation-pressurisation" element={<P><VentilationPressurisation /></P>} />
          <Route path="/projects/:projectId/calculations/phe-pump-selection" element={<P><PHEPumpSelection /></P>} />

          {/* ── Change Requests ─────────────────────────────────────── */}
          <Route path="/change-requests/:projectId" element={<P roles={DESIGN_TEAM}><ChangeRequestsPage /></P>} />
          <Route path="/change-request/:id" element={<P roles={DESIGN_TEAM}><ChangeRequestDetail /></P>} />

          {/* ── MAS ────────────────────────────────────────────────── */}
          <Route path="/mas-list" element={<P roles={MAS_ROLES}><MASPage /></P>} />
          <Route path="/mas-form" element={<P roles={MAS_ROLES}><MASForm /></P>} />
          <Route path="/mas/:id" element={<P roles={MAS_ROLES}><MASDetail /></P>} />
          <Route path="/mas" element={<Navigate to="/mas-list" replace />} />

          {/* ── RFI ────────────────────────────────────────────────── */}
          <Route path="/rfi" element={<P roles={['SUPER_ADMIN', 'L1', 'L2']}><RFIPage /></P>} />
          <Route path="/rfi/create" element={<P roles={['CM', 'SUPER_ADMIN']}><RFICreate /></P>} />
          <Route path="/rfi/:id" element={<P roles={RFI_ROLES}><RFIDetail /></P>} />
          <Route path="/projects/:projectId/rfi" element={<P><RFIPage /></P>} />
          <Route path="/projects/:projectId/rfi/create" element={<P><RFICreate /></P>} />
          <Route path="/projects/:projectId/rfi/:id" element={<P><RFIDetail /></P>} />

          {/* ── My Assignments ─────────────────────────────────────── */}
          <Route path="/my-assignments" element={<P><MyAssignments /></P>} />

          {/* ── Consultant sub-routes ──────────────────────────────── */}
          <Route
            path="/consultant/project/:projectId/drawings"
            element={
              (localStorage.getItem('consultantEmail') || (user && userLevel === 'SUPER_ADMIN')) ? (
                <ConsultantProjectDrawings />
              ) : (
                <Navigate to="/consultant-login" replace />
              )
            }
          />
          <Route
            path="/consultant/project/:projectId/calculations"
            element={
              (localStorage.getItem('consultantEmail') || (user && userLevel === 'SUPER_ADMIN')) ? (
                <ConsultantProjectCalculations />
              ) : (
                <Navigate to="/consultant-login" replace />
              )
            }
          />
          <Route
            path="/consultant/mas/:masId"
            element={
              (localStorage.getItem('consultantEmail') || (user && userLevel === 'SUPER_ADMIN')) ? (
                <ConsultantMASDetail />
              ) : (
                <Navigate to="/consultant-login" replace />
              )
            }
          />
          <Route
            path="/consultant/rfi/:rfiId"
            element={
              (localStorage.getItem('consultantEmail') || (user && userLevel === 'SUPER_ADMIN')) ? (
                <ConsultantRFIDetail />
              ) : (
                <Navigate to="/consultant-login" replace />
              )
            }
          />

          {/* ── Meeting Point (Forum) ──────────────────────────────── */}
          <Route path="/meeting-point" element={<P><MeetingPoint /></P>} />
          <Route path="/meeting-point/:threadId" element={<P><MeetingPointThread /></P>} />

          {/* ── Legacy / Placeholder ───────────────────────────────── */}
          <Route path="/project-plans" element={<P><ComingSoon title="Project Plans" /></P>} />
          <Route path="/structural-data" element={<P><ComingSoon title="Structural Data" /></P>} />
          <Route path="/settings" element={<P><ComingSoon title="Settings" /></P>} />

          {/* ── Catch-all ──────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Jost, sans-serif',
            },
          }}
        />
        <AppRoutes />
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;
