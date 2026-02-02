import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import Layout from '../../components/Layout';
import CalculationComingSoon from '../../components/CalculationComingSoon';

export default function EarthingLightningCalculation() {
  const { projectId, calculationId } = useParams();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/projects/${projectId}/design-calculations`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Earthing & Lightning Calculation</h1>
              <p className="text-sm text-gray-500 mt-1">
                Calculation ID: {calculationId || 'New'}
              </p>
            </div>
          </div>
        </div>

        <CalculationComingSoon 
          calculationType="Earthing & Lightning Calculation"
          icon={Zap}
          calculationId={calculationId}
        />
      </div>
    </Layout>
  );
}
