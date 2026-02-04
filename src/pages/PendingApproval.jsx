import { Clock, Mail, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('devUserEmail');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lodha-deep via-gray-900 to-lodha-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-garamond font-bold text-white mb-2">
              Access Not Granted
            </h1>
            <p className="text-white/90 text-lg">
              Your account is not registered in the system
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Welcome Message */}
            <div className="text-center">
              <p className="text-xl text-lodha-black font-jost font-semibold mb-2">
                {user?.displayName || user?.email}
              </p>
              <p className="text-lodha-grey">
                Thank you for your interest in the Atelier MEP Portal
              </p>
            </div>

            {/* Status Info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-jost font-semibold text-lodha-black mb-1">
                    Your Email
                  </h3>
                  <p className="text-lodha-grey text-sm">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-jost font-semibold text-lodha-black mb-1">
                    Account Status
                  </h3>
                  <p className="text-red-700 text-sm font-medium">
                    Not Registered
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next Section */}
            <div className="border-t border-lodha-sand pt-6">
              <h2 className="text-lg font-garamond font-bold text-lodha-black mb-4">
                How to get access?
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-lodha-gold text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <p className="text-lodha-grey text-sm">
                    <span className="font-semibold text-lodha-black">Contact your administrator</span> - Reach out to your L0, L1, or L2 project manager
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-lodha-gold text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <p className="text-lodha-grey text-sm">
                    <span className="font-semibold text-lodha-black">They will add you to a project</span> - Admins can add users through the project's team management section
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-lodha-gold text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <p className="text-lodha-grey text-sm">
                    <span className="font-semibold text-lodha-black">Access granted</span> - Once added to a project team, you can log in and access the system
                  </p>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-jost font-semibold text-blue-900 mb-1">
                    Important Note
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Users are not automatically registered in the system. You must be manually added to a project by an authorized administrator (L0, L1, or L2) before you can access the portal.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-lodha-gold text-white rounded-lg font-jost font-semibold hover:bg-lodha-deep transition-colors duration-200"
              >
                Check Status Now
              </button>
              
              <button
                onClick={handleSignOut}
                className="px-6 py-3 border border-lodha-grey text-lodha-grey rounded-lg font-jost font-semibold hover:bg-lodha-sand transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>

            {/* Auto-refresh Notice */}
            <p className="text-center text-xs text-lodha-grey">
              <Clock className="w-3 h-3 inline mr-1" />
              This page automatically checks for approval every 30 seconds
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-lodha-sand text-sm">
            © {new Date().getFullYear()} Atelier MEP Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
