import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, LogOut, LayoutDashboard, 
  Building2, FileText, AlertCircle, Settings, User, Users, FolderKanban
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { createOrUpdateUser } from '../services/userService';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userLevel, setUserLevel] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (user) {
        try {
          const userData = await createOrUpdateUser(user.email, user.displayName);
          setUserLevel(userData.user_level);
        } catch (err) {
          console.error('Error fetching user level:', err);
        }
      }
    };
    fetchUserLevel();
  }, [user]);

  // Define navigation items based on user level
  const getNavItems = () => {
    const items = [];

    // Dashboard - everyone gets their appropriate dashboard
    items.push({ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard });

    // L0 specific
    if (userLevel === 'L0') {
      items.push({ name: 'All Projects', path: '/l0-dashboard', icon: FolderKanban });
    }

    // L1 specific
    if (userLevel === 'L1') {
      items.push({ name: 'Project Management', path: '/l1-dashboard', icon: Building2 });
      items.push({ name: 'Create Project', path: '/project-input', icon: FolderKanban });
    }

    // L2, L3, L4 - Execution users
    if (['L2', 'L3', 'L4'].includes(userLevel)) {
      items.push({ name: 'MAS Management', path: '/mas-list', icon: FileText });
      items.push({ name: 'RFI Management', path: '/cm-dashboard', icon: AlertCircle });
    }

    // CM specific
    if (userLevel === 'CM') {
      items.push({ name: 'RFI Management', path: '/cm-dashboard', icon: AlertCircle });
    }

    // VENDOR specific
    if (userLevel === 'VENDOR') {
      items.push({ name: 'Material Submissions', path: '/mas-list', icon: FileText });
    }

    // SUPER_ADMIN gets everything
    if (userLevel === 'SUPER_ADMIN') {
      items.push(
        { name: 'L0 Dashboard', path: '/l0-dashboard', icon: FolderKanban },
        { name: 'L1 Dashboard', path: '/l1-dashboard', icon: Building2 },
        { name: 'L2 Dashboard', path: '/l2-dashboard', icon: LayoutDashboard },
        { name: 'Project Standards', path: '/project-standards', icon: Settings },
        { name: 'User Management', path: '/super-admin-dashboard', icon: Users }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('devUserEmail');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <button
        onClick={() => navigate(item.path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg
                   transition-all duration-200 font-jost ${
          isActive
            ? 'bg-gradient-to-r from-lodha-gold to-lodha-gold/90 text-white shadow-md transform scale-105'
            : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex max-w-full overflow-x-hidden">
      {/* Sidebar */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-lodha-grey via-lodha-grey to-lodha-cool-grey transform 
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                   lg:translate-x-0 transition-transform duration-200 ease-in-out
                   flex flex-col shadow-xl`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-lodha-gold/30 bg-gradient-to-r from-transparent to-lodha-gold/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lodha-gold rounded flex items-center justify-center">
              <span className="text-white font-garamond font-bold text-lg">A</span>
            </div>
            <h1 className="text-2xl font-garamond font-bold text-white">
              Atelier
            </h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-lodha-gold/20">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-lodha-gold/20 to-lodha-gold/10 border border-lodha-gold/30 text-white">
            <div className="w-10 h-10 bg-lodha-gold rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-jost font-medium truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-white/70 truncate font-jost">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-lodha-steel">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1 rounded-md hover:bg-lodha-sand"
            >
              <Menu className="w-6 h-6 text-lodha-grey" />
            </button>
            <h2 className="text-lg md:text-xl font-garamond font-bold text-lodha-grey truncate">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg hover:bg-lodha-sand
                     text-lodha-grey text-xs md:text-sm font-jost font-semibold transition-colors duration-200
                     border border-lodha-gold hover:border-lodha-grey flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-lodha-sand p-4 md:p-6 overflow-y-auto overflow-x-hidden w-full">
          <div className="max-w-7xl mx-auto w-full px-2 md:px-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-lodha-grey bg-opacity-30 lg:hidden z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}