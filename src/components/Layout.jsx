import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, LogOut, LayoutDashboard, 
  Building2, FileText, User, Users, FolderKanban,
  BookOpen
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { createOrUpdateUser } from '../services/userService';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';

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
      items.push({ name: 'L0 Dashboard', path: '/l0-dashboard', icon: FolderKanban });
      items.push({ name: 'Standards', path: '/standards', icon: BookOpen });
    }

    // L1 specific
    if (userLevel === 'L1') {
      items.push({ name: 'Project Management', path: '/l1-dashboard', icon: Building2 });
      items.push({ name: 'Create Project', path: '/project-input', icon: FolderKanban });
      items.push({ name: 'Standards', path: '/standards', icon: BookOpen });
    }

    // L2, L3, L4 - Execution users
    if (['L2', 'L3', 'L4'].includes(userLevel)) {
      items.push({ name: 'MAS Management', path: '/mas-list', icon: FileText });
      items.push({ name: 'Standards', path: '/standards', icon: BookOpen });
    }

    // L2 gets standards via execution user list above

    // CM specific
    // CM users access RFI through project detail page

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
        { name: 'Standards', path: '/standards', icon: BookOpen },
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
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                   transition-all duration-200 font-jost text-sm ${
          isActive
            ? 'bg-lodha-gold/90 text-white shadow-sm font-semibold'
            : 'text-white/70 hover:bg-white/8 hover:text-white'
        }`}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.name}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
        <span className="font-medium">{item.name}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex max-w-full overflow-x-hidden">
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      {/* Sidebar */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-gradient-to-b from-[#3a3a3c] to-[#2d2d2f] transform 
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                   lg:translate-x-0 transition-transform duration-200 ease-in-out
                   flex flex-col shadow-xl`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-lodha-gold rounded-lg flex items-center justify-center">
              <span className="text-white font-garamond font-bold text-lg">A</span>
            </div>
            <h1 className="text-xl font-garamond font-bold text-white tracking-wide">
              Atelier
            </h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-white/70 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 text-white">
            <div className="w-9 h-9 bg-lodha-gold/80 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-jost font-medium truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-white/50 truncate font-jost">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Navigation */}
        <header className="h-14 bg-white flex items-center justify-between px-4 md:px-6 border-b border-lodha-steel/30">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-lodha-sand"
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-5 h-5 text-lodha-grey" aria-hidden="true" />
            </button>
            <h2 className="text-lg font-garamond font-bold text-lodha-black truncate">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-lodha-sand
                       text-lodha-grey text-sm font-jost font-medium transition-colors duration-150
                       border border-lodha-steel/40 hover:border-lodha-steel flex-shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 bg-lodha-sand/50 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden w-full max-w-full" role="main">
          <div className="max-w-7xl mx-auto w-full">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-lodha-grey bg-opacity-30 lg:hidden z-40"
          onClick={() => setIsSidebarOpen(false)}
          role="button"
          aria-label="Close navigation menu"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}