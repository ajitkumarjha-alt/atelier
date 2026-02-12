import { useState } from 'react';
import { LogIn, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signInWithPopup, AuthErrorCodes } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { createOrUpdateUser } from '../services/userService';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        try {
          await createOrUpdateUser(result.user.email, result.user.displayName);
          // Let App's auth listener handle routing based on `userLevel`.
        } catch (dbError) {
          console.error('Database error:', dbError);
          setError('Failed to save user data. Please try again.');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      switch (error.code) {
        case AuthErrorCodes.POPUP_CLOSED_BY_USER:
          setError('Sign-in window was closed. Please try again.');
          break;
        case AuthErrorCodes.POPUP_BLOCKED:
          setError('Pop-up was blocked. Please allow pop-ups for this site.');
          break;
        case AuthErrorCodes.INVALID_API_KEY:
          setError('Authentication service is not properly configured.');
          break;
        default:
          setError('Failed to sign in. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-lodha-sand lg:bg-transparent">
      {/* Left Side - Image Section */}
      <div className="hidden lg:block w-1/2 relative" role="img" aria-label="Modern MEP engineering workspace">
        <div className="absolute inset-0 bg-gradient-to-br from-lodha-grey/80 to-lodha-grey/60" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2940&auto=format&fit=crop")',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-lg">
            <h2 className="text-4xl font-garamond font-bold mb-4">Welcome to Atelier</h2>
            <p className="text-lg font-jost opacity-90">
              Your comprehensive MEP project management platform. Streamline workflows, track progress, and collaborate seamlessly.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-elevated border border-lodha-steel/30 p-8 space-y-8">
            {/* Logo and Title */}
            <div className="text-center">
              <div className="w-16 h-16 bg-lodha-gold rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-garamond font-bold text-3xl">A</span>
              </div>
              <h1 className="text-4xl font-garamond font-bold text-lodha-grey mb-2">
                Atelier
              </h1>
              <p className="text-lodha-grey/70 text-base font-jost">
                MEP Project Management Portal
              </p>
            </div>

            {/* Sign In Card */}
            <div className="space-y-6">
              <div className="text-center text-sm text-lodha-grey/80 font-jost bg-lodha-sand/50 rounded-lg p-3">
                Sign in with your corporate Google account
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                aria-label={isLoading ? 'Signing in with Google' : 'Sign in with Google'}
                aria-busy={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4
                         text-sm font-medium rounded-lg
                         text-white bg-lodha-gold hover:bg-lodha-deep 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 
                         focus:ring-lodha-gold transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl font-jost font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" aria-hidden="true" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div 
                  role="alert" 
                  aria-live="polite"
                  className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700 text-sm font-jost">{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-lodha-steel">
              <p className="text-xs text-center text-lodha-grey/60 font-jost">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
              <p className="text-xs text-center text-lodha-grey/60 font-jost mt-2">
                © {new Date().getFullYear()} Atelier by Lodha Group. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}