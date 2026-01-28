import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BarChart3 } from 'lucide-react';
import { auth } from '../lib/firebase';

export default function SuperAdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-lodha-sand">
      {/* Navbar */}
      <nav className="bg-lodha-black shadow-lg border-b-4 border-lodha-gold">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-lodha-gold" />
              <h1 className="text-2xl font-garamond font-bold text-lodha-gold">
                Atelier Super Admin
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <span className="text-white font-jost">
                {user?.displayName || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-lodha-gold text-lodha-black rounded-lg hover:bg-white transition-colors font-jost font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white hover:bg-lodha-gold/20 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-lodha-gold/20 space-y-3">
              <p className="text-white font-jost text-sm">
                {user?.displayName || user?.email}
              </p>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-lodha-black rounded-lg hover:bg-white transition-colors font-jost font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
