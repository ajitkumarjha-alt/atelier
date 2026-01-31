import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
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
import ProjectDetail from './pages/ProjectDetail';
import ProjectInput from './pages/ProjectInput';
import MASPage from './pages/MASPage';
import MASForm from './pages/MASForm';
import RFIPage from './pages/RFIPage';
import RFICreate from './pages/RFICreate';
import ProjectStandardsManagement from './pages/ProjectStandardsManagement';
import { createOrUpdateUser } from './services/userService';
import { Loader } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(null);

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.email : 'No user');
      setUser(user);
      
      // Determine user level by syncing with backend
      if (user) {
        try {
          const userData = await createOrUpdateUser(user.email, user.displayName);
          console.log('User data from backend:', userData);
          setUserLevel(userData.user_level || 'L2');
        } catch (error) {
          console.error('Error fetching user level:', error);
          setUserLevel('L2'); // Default fallback
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

        {/* Project Input Page */}
        <Route 
          path="/project-input" 
          element={
            user && (userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
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
            user && (userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
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

        {/* RFI Detail Page (placeholder for now) */}
        <Route 
          path="/rfi/:id" 
          element={
            user && (userLevel === 'CM' || userLevel === 'L2' || userLevel === 'L1' || userLevel === 'SUPER_ADMIN') ? (
              <div className="min-h-screen bg-lodha-sand p-8">
                <h1 className="text-3xl font-garamond font-bold text-lodha-gold">
                  RFI Detail (Coming Soon)
                </h1>
              </div>
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

export default App;
