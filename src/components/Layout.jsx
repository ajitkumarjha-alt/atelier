import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, LogOut, LayoutDashboard, 
  Building2, Database, Settings, User
} from 'lucide-react';
import { auth } from '../lib/firebase';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Project Plans', path: '/project-plans', icon: Building2 },
  { name: 'Structural Data', path: '/structural-data', icon: Database },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
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
                   transition-colors duration-200 font-jost ${
          isActive
            ? 'bg-lodha-gold/10 text-lodha-gold'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-lodha-black transform 
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                   lg:translate-x-0 transition-transform duration-200 ease-in-out
                   flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-lodha-gold/20">
          <h1 className="text-2xl font-garamond font-bold text-lodha-gold">
            Atelier
          </h1>
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
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-lodha-gold/10 text-white">
            <User className="w-5 h-5 flex-shrink-0" />
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
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-lodha-grey/10">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1 rounded-md hover:bg-lodha-sand"
            >
              <Menu className="w-6 h-6 text-lodha-grey" />
            </button>
            <h2 className="text-lg md:text-xl font-garamond font-bold text-lodha-black truncate">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg hover:bg-lodha-sand
                     text-lodha-black text-xs md:text-sm font-jost font-semibold transition-colors duration-200
                     border border-lodha-gold hover:border-lodha-black flex-shrink-0"
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
          className="fixed inset-0 bg-lodha-black bg-opacity-30 lg:hidden z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}