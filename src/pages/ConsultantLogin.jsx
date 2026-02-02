import { useState } from 'react';
import { LogIn, Loader, Mail, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ConsultantLogin() {
  const [step, setStep] = useState(1); // 1: email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/consultants/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setMessage('OTP sent to your email. Please check your inbox.');
      setStep(2);
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/consultants/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // Store consultant session
      localStorage.setItem('consultantEmail', email);
      localStorage.setItem('consultantToken', data.token);
      localStorage.setItem('consultantId', data.consultantId);

      // Navigate to consultant dashboard
      navigate('/consultant-dashboard');
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    await handleSendOTP({ preventDefault: () => {} });
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Image Section */}
      <div className="hidden lg:block w-1/2 relative">
        <div className="absolute inset-0 bg-lodha-deep/20" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2940&auto=format&fit=crop")',
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
                MEP Consultant Portal
              </p>
            </div>

            {/* Login Form */}
            <div className="space-y-6">
              {step === 1 ? (
                // Step 1: Email Input
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div className="text-center text-sm text-lodha-grey font-jost">
                    Enter your registered email to receive OTP
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        placeholder="consultant@company.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
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
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                // Step 2: OTP Verification
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="text-center text-sm text-lodha-grey font-jost">
                    Enter the OTP sent to <span className="font-semibold text-lodha-gold">{email}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      One-Time Password
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent text-center text-2xl tracking-widest"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
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
                      <Shield className="w-5 h-5" />
                    )}
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setOtp('');
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-lodha-gold hover:text-lodha-deep font-medium"
                    >
                      Change Email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-lodha-gold hover:text-lodha-deep font-medium disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}

              {/* Success Message */}
              {message && (
                <div className="text-green-700 text-sm text-center p-3 bg-green-50 rounded-md border border-green-200 font-jost">
                  {message}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="text-red-700 text-sm text-center p-3 bg-red-50 rounded-md border border-red-200 font-jost">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 text-center border-t">
              <p className="text-sm text-lodha-grey font-jost mb-2">
                For internal employees, please use
              </p>
              <button
                onClick={() => navigate('/')}
                className="text-lodha-gold hover:text-lodha-deep font-medium"
              >
                Employee Login
              </button>
            </div>

            <div className="text-center">
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
