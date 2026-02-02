import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './lib/UserContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import L0Dashboard from './pages/L0Dashboard';
import L1Dashboard from './pages/L1Dashboard';
import L2Dashboard from './pages/L2Dashboard';
import L3Dashboard from './pages/L3Dashboard';
import L4Dashboard from './pages/L4Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import VendorDashboard from './pages/VendorDashboard';
import CMDashboard from './pages/CMDashboard';
import ConsultantLogin from './pages/ConsultantLogin';
import ConsultantDashboard from './pages/ConsultantDashboard';
import ConsultantProjectDrawings from './pages/ConsultantProjectDrawings';
import ConsultantProjectCalculations from './pages/ConsultantProjectCalculations';
import ConsultantMASDetail from './pages/ConsultantMASDetail';
import ConsultantRFIDetail from './pages/ConsultantRFIDetail';
import ProjectDetail from './pages/ProjectDetail';
import ProjectInput from './pages/ProjectInput';
import MASPage from './pages/MASPage';
import MASForm from './pages/MASForm';
import MASDetail from './pages/MASDetail';
import RFIPage from './pages/RFIPage';
import RFICreate from './pages/RFICreate';
import RFIDetail from './pages/RFIDetail';
import DrawingSchedule from './pages/DrawingSchedule';
import DesignCalculations from './pages/DesignCalculations';
import ChangeRequestsPage from './pages/ChangeRequestsPage';
import ChangeRequestDetail from './pages/ChangeRequestDetail';
import ProjectStandardsManagement from './pages/ProjectStandardsManagement';
import { createOrUpdateUser } from './services/userService';
import { Loader } from 'lucide-react';

// Calculation Pages
import ElectricalLoadCalculation from './pages/calculations/ElectricalLoadCalculation';
import WaterDemandCalculation from './pages/calculations/WaterDemandCalculation';
import CableSelectionSheet from './pages/calculations/CableSelectionSheet';
import RisingMainDesign from './pages/calculations/RisingMainDesign';
import DownTakeDesign from './pages/calculations/DownTakeDesign';
import BusRiserDesign from './pages/calculations/BusRiserDesign';
import LightingLoadCalculation from './pages/calculations/LightingLoadCalculation';
import HVACLoadCalculation from './pages/calculations/HVACLoadCalculation';
import FirePumpCalculation from './pages/calculations/FirePumpCalculation';
import PlumbingFixtureCalculation from './pages/calculations/PlumbingFixtureCalculation';
import EarthingLightningCalculation from './pages/calculations/EarthingLightningCalculation';
import PanelSchedule from './pages/calculations/PanelSchedule';

function AppRoutes() {
  const { user, userLevel, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
          <div className="text-lodha-black text-xl font-garamond font-bold">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Default Dashboard - shows based on user level */}
        <Route
          path="/dashboard"
          element={
            user ? (
              // Wait for userLevel to be determined to avoid redirect loops
              userLevel === null ? (
                <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
                  <div className="text-lodha-black text-xl font-garamond font-bold">Loading...</div>
                </div>
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
              ) : (
                <Navigate to="/l2-dashboard" replace />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Super Admin Dashboard */}
        <Route 
          path="/super-admin-dashboard" 
          element={
            user && userLevel === 'SUPER_ADMIN' ? (
              <SuperAdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* L0 Dashboard */}
        <Route 
          path="/l0-dashboard" 
          element={
            user && (userLevel === 'L0' || userLevel === 'SUPER_ADMIN') ? (
              <L0Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* L1 Dashboard */}
        <Route 
          path="/l1-dashboard" 
          element={
            user && (userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <L1Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* L2 Dashboard */}
        <Route 
          path="/l2-dashboard" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <L2Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* L3 Dashboard */}
        <Route 
          path="/l3-dashboard" 
          element={
            user ? (
              <L3Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* L4 Dashboard */}
        <Route 
          path="/l4-dashboard" 
          element={
            user ? (
              <L4Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Project Standards Management */}
        <Route 
          path="/project-standards" 
          element={
            user && userLevel === 'SUPER_ADMIN' ? (
              <ProjectStandardsManagement />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Drawing Schedule */}
        <Route 
          path="/drawing-schedule/:projectId" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <DrawingSchedule />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Design Calculations */}
        <Route 
          path="/design-calculations/:projectId" 
          element={
            user ? (
              <DesignCalculations />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Individual Calculation Pages */}
        <Route 
          path="/projects/:projectId/calculations/electrical-load/:calculationId?" 
          element={
            user ? (
              <ElectricalLoadCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/water-demand/:calculationId?" 
          element={
            user ? (
              <WaterDemandCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/cable-selection/:calculationId?" 
          element={
            user ? (
              <CableSelectionSheet />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/rising-main/:calculationId?" 
          element={
            user ? (
              <RisingMainDesign />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/down-take/:calculationId?" 
          element={
            user ? (
              <DownTakeDesign />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/bus-riser/:calculationId?" 
          element={
            user ? (
              <BusRiserDesign />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/lighting-load/:calculationId?" 
          element={
            user ? (
              <LightingLoadCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/hvac-load/:calculationId?" 
          element={
            user ? (
              <HVACLoadCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/fire-pump/:calculationId?" 
          element={
            user ? (
              <FirePumpCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/plumbing-fixture/:calculationId?" 
          element={
            user ? (
              <PlumbingFixtureCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/earthing-lightning/:calculationId?" 
          element={
            user ? (
              <EarthingLightningCalculation />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/projects/:projectId/calculations/panel-schedule/:calculationId?" 
          element={
            user ? (
              <PanelSchedule />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Change Requests */}
        <Route 
          path="/change-requests/:projectId" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <ChangeRequestsPage />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/change-request/:id" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <ChangeRequestDetail />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Project Input Page */}
        <Route 
          path="/project-input" 
          element={
            user && (userLevel === 'L0' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <ProjectInput />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Project Input Edit Page */}
        <Route 
          path="/project-input/:projectId" 
          element={
            user && (userLevel === 'L0' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <ProjectInput />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Project Detail Page */}
        <Route 
          path="/project/:id" 
          element={
            user ? (
              <ProjectDetail />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* MAS Page - List View */}
        <Route 
          path="/mas-list" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN' || userLevel === 'VENDOR') ? (
              <MASPage />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* MAS Form - Create/Edit */}
        <Route 
          path="/mas-form" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN' || userLevel === 'VENDOR') ? (
              <MASForm />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* MAS Detail Page */}
        <Route 
          path="/mas/:id" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN' || userLevel === 'VENDOR') ? (
              <MASDetail />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* MAS Legacy Route - redirect to list */}
        <Route 
          path="/mas" 
          element={<Navigate to="/mas-list" replace />} 
        />
        
          {/* Vendor Dashboard */}
          <Route 
            path="/vendor-dashboard" 
            element={
              user && (userLevel === 'VENDOR' || userLevel === 'SUPER_ADMIN') ? (
                <VendorDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

        {/* Consultant Routes - accessible by consultants and super admin */}
        <Route path="/consultant-login" element={<ConsultantLogin />} />
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

        {/* CM Dashboard */}
        <Route 
          path="/cm-dashboard" 
          element={
            user && (userLevel === 'CM' || userLevel === 'SUPER_ADMIN') ? (
              <CMDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* RFI Create Page */}
        <Route 
          path="/rfi/create" 
          element={
            user && (userLevel === 'CM' || userLevel === 'SUPER_ADMIN') ? (
              <RFICreate />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* RFI Detail Page */}
        <Route 
          path="/rfi/:id" 
          element={
            user && (userLevel === 'CM' || userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <RFIDetail />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* RFI Page */}
        <Route 
          path="/rfi" 
          element={
            user && (userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <RFIPage />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Legacy Routes - Coming Soon */}
        <Route 
          path="/project-plans" 
          element={
            user ? (
              <div className="min-h-screen bg-lodha-sand p-8">
                <h1 className="text-3xl font-garamond font-bold text-lodha-gold">
                  Project Plans (Coming Soon)
                </h1>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/structural-data" 
          element={
            user ? (
              <div className="min-h-screen bg-lodha-sand p-8">
                <h1 className="text-3xl font-garamond font-bold text-lodha-gold">
                  Structural Data (Coming Soon)
                </h1>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/settings" 
          element={
            user ? (
              <div className="min-h-screen bg-lodha-sand p-8">
                <h1 className="text-3xl font-garamond font-bold text-lodha-gold">
                  Settings (Coming Soon)
                </h1>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
}

export default App;
