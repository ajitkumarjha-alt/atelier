import { useLocation } from 'react-router-dom';
import { Calculator, Download, FileText, AlertCircle } from 'lucide-react';
import { useUser } from '../lib/UserContext';
import { getEffectiveUserLevel, canCreateEditCalculations } from '../lib/userLevel';

export default function CalculationComingSoon({ calculationType, icon: Icon = Calculator, calculationId }) {
  const location = useLocation();
  const { userLevel } = useUser();

  const canGenerate = () => {
    if (!userLevel) return false;
    const effectiveLevel = getEffectiveUserLevel(userLevel, location.pathname);
    return canCreateEditCalculations(effectiveLevel);
  };

  const getEffectiveLevel = () => {
    if (!userLevel) return null;
    return getEffectiveUserLevel(userLevel, location.pathname);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
      <div className="text-center">
        {userLevel === 'SUPER_ADMIN' && getEffectiveLevel() !== 'SUPER_ADMIN' && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            <AlertCircle className="w-4 h-4" />
            Testing as {getEffectiveLevel()} user
          </div>
        )}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Icon className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          This calculation page is currently under development. 
          You'll soon be able to generate {calculationType?.toLowerCase() || 'calculations'} with data from building details, 
          company policies, and by-laws.
        </p>
        <div className="mt-6 text-sm text-gray-500">
          <p>Features to be included:</p>
          <ul className="mt-2 space-y-1">
            <li>• Data confirmation from building details</li>
            <li>• Company policy and by-laws integration</li>
            <li>• Automated calculation generation</li>
            <li>• PDF and Excel export options</li>
          </ul>
        </div>

        {/* Permission Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            {canGenerate() ? (
              <span className="flex items-center justify-center gap-2 text-green-600 font-medium">
                <FileText className="w-4 h-4" />
                You have permission to create and generate calculations
              </span>
            ) : (
              <span className="text-gray-600">
                You can view and download calculations. Only L2 and above can create or generate calculations.
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        {canGenerate() && calculationId && (
          <div className="mt-6 flex gap-3 justify-center">
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              disabled
            >
              <Calculator className="w-5 h-5" />
              Generate Calculation
            </button>
            <button
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
              disabled
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
