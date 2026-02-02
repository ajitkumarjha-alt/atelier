import { useNavigate } from 'react-router-dom';
import { Building2, UserCheck, Users, Mail, Chrome, Sparkles, Shield, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const devUserEmail = localStorage.getItem('devUserEmail');
    const consultantEmail = localStorage.getItem('consultantEmail');
    const vendorEmail = localStorage.getItem('vendorEmail');

    if (devUserEmail) {
      navigate('/dashboard');
    } else if (consultantEmail) {
      navigate('/consultant-dashboard');
    } else if (vendorEmail) {
      navigate('/vendor-dashboard');
    }
  }, [navigate]);

  const handleEmployeeLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'lodhagroup.com', // Restrict to Lodha domain
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email && user.email.endsWith('@lodhagroup.com')) {
        localStorage.setItem('devUserEmail', user.email);
        navigate('/dashboard');
      } else {
        alert('Please use your Lodha Group email (@lodhagroup.com) to sign in.');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('Login failed. Please try again.');
      }
    }
  };

  const handleConsultantLogin = () => {
    navigate('/consultant-login');
  };

  const handleVendorLogin = () => {
    navigate('/vendor-login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background with Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-lodha-deep via-gray-900 to-lodha-black">
        {/* Building Background Image */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* Animated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-lodha-black/90 via-lodha-deep/70 to-transparent" />
        
        {/* Floating Particles Effect */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-lodha-gold/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="max-w-7xl w-full">
          {/* Header with Logo */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-lodha-gold/20 blur-3xl rounded-full" />
                <div className="relative bg-gradient-to-br from-lodha-gold to-yellow-600 p-5 rounded-2xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl font-garamond font-bold text-white mb-4 tracking-tight">
                Atelier
              </h1>
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-lodha-gold" />
                <Sparkles className="w-5 h-5 text-lodha-gold animate-pulse" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-lodha-gold" />
              </div>
              <p className="text-2xl md:text-3xl text-gray-200 font-jost font-light">
                Project Management & Engineering Platform
              </p>
              <p className="text-lg text-lodha-gold font-semibold tracking-widest mt-4">
                LODHA GROUP
              </p>
            </div>
          </div>

          {/* Login Options */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Lodha Employee Login */}
            <div 
              className={`relative group ${hoveredCard === 'employee' ? 'z-20' : 'z-10'}`}
              onMouseEnter={() => setHoveredCard('employee')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-lodha-gold to-yellow-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
              
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border-2 border-lodha-gold/40 p-8 hover:border-lodha-gold transition-all duration-500 hover:shadow-2xl hover:shadow-lodha-gold/30 hover:-translate-y-2 transform">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-lodha-gold to-yellow-600 rounded-2xl mb-6 shadow-xl transform group-hover:rotate-6 transition-transform duration-500">
                    <Building2 className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-garamond font-bold text-white mb-3">
                    Lodha Employee
                  </h2>
                  
                  <p className="text-gray-300 text-sm mb-8 min-h-[60px] leading-relaxed">
                    Access the complete platform with your company credentials and manage projects end-to-end
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={handleEmployeeLogin}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 text-lodha-black rounded-xl transition-all duration-300 font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                      <Chrome className="w-5 h-5" />
                      Sign in with Google
                    </button>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                      <Shield className="w-4 h-4 text-lodha-gold" />
                      <span className="text-lodha-gold font-semibold">@lodhagroup.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consultant Login */}
            <div 
              className={`relative group ${hoveredCard === 'consultant' ? 'z-20' : 'z-10'}`}
              onMouseEnter={() => setHoveredCard('consultant')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
              
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border-2 border-teal-500/40 p-8 hover:border-teal-400 transition-all duration-500 hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-2 transform">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mb-6 shadow-xl transform group-hover:rotate-6 transition-transform duration-500">
                    <UserCheck className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-garamond font-bold text-white mb-3">
                    MEP Consultant
                  </h2>
                  
                  <p className="text-gray-300 text-sm mb-8 min-h-[60px] leading-relaxed">
                    Access project drawings, design calculations, and respond to RFI/MAS referrals
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={handleConsultantLogin}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl transition-all duration-300 font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                      <Mail className="w-5 h-5" />
                      Login with OTP
                    </button>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                      <Clock className="w-4 h-4 text-teal-400" />
                      <span className="text-teal-300">Secure One-Time Password</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Login */}
            <div 
              className={`relative group ${hoveredCard === 'vendor' ? 'z-20' : 'z-10'}`}
              onMouseEnter={() => setHoveredCard('vendor')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
              
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border-2 border-orange-500/40 p-8 hover:border-orange-400 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-2 transform">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 shadow-xl transform group-hover:rotate-6 transition-transform duration-500">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-garamond font-bold text-white mb-3">
                    Vendor
                  </h2>
                  
                  <p className="text-gray-300 text-sm mb-8 min-h-[60px] leading-relaxed">
                    Submit and manage material approval sheets, track submissions for assigned projects
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={handleVendorLogin}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl transition-all duration-300 font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                      <Mail className="w-5 h-5" />
                      Login with OTP
                    </button>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-300">Secure One-Time Password</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center space-y-6">
            {/* Features */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Shield className="w-5 h-5 text-lodha-gold" />
                <span>Enterprise-Grade Security</span>
              </div>
              <div className="w-px h-6 bg-gray-600" />
              <div className="flex items-center gap-2 text-gray-300">
                <Sparkles className="w-5 h-5 text-lodha-gold" />
                <span>Role-Based Access Control</span>
              </div>
              <div className="w-px h-6 bg-gray-600" />
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-5 h-5 text-lodha-gold" />
                <span>24/7 Platform Availability</span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="pt-6 border-t border-gray-700/50">
              <p className="text-gray-400 text-sm mb-2">
                Need access? Contact your project manager or system administrator
              </p>
              <p className="text-gray-500 text-xs">
                © {new Date().getFullYear()} Lodha Group. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
}
