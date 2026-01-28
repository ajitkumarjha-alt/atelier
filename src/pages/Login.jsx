import { useState } from 'react';
import { LogIn, Loader } from 'lucide-react';
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
      console.log('Starting Google Sign In...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Sign in successful:', result.user.email);
      
      if (result.user) {
        try {
          await createOrUpdateUser(result.user.email, result.user.displayName);
          console.log('User data saved to database');
          navigate('/dashboard');
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
    <div className="min-h-screen w-full flex">
      {/* Left Side - Image Section */}
      <div className="hidden lg:block w-1/2 relative">
        <div className="absolute inset-0 bg-lodha-deep/20" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2940&auto=format&fit=crop")',
            backgroundBlendMode: 'overlay'
          }}
        />
      </div>

      {/* Right Side - Login Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-lodha-sand p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-2xl p-8 space-y-8">
            {/* Logo and Title */}
            <div className="text-center">
              <h1 className="text-5xl font-garamond font-bold text-lodha-gold mb-2">
                Atelier
              </h1>
              <p className="text-lodha-grey text-lg font-jost font-medium">
                MEP Project Portal
              </p>
            </div>

            {/* Sign In Card */}
            <div className="space-y-6">
              <div className="text-center text-sm text-lodha-grey font-jost">
                Sign in with your corporate account
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 
                         border border-transparent text-sm font-medium rounded-md 
                         text-white bg-lodha-gold hover:bg-lodha-black 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 
                         focus:ring-lodha-gold transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl font-jost font-semibold"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>

              {/* Error Message */}
              {error && (
                <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-md border border-red-100 font-jost">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 text-center">
              <p className="text-sm text-lodha-grey font-jost">
                © {new Date().getFullYear()} Atelier. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}