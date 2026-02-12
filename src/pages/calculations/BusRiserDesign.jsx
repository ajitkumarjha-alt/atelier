import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import Layout from '../../components/Layout';
import CalculationComingSoon from '../../components/CalculationComingSoon';

export default function BusRiserDesign() {
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
              className="p-2 hover:bg-lodha-sand rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="heading-primary">Bus Riser Design</h1>
              <p className="text-sm text-lodha-grey/70 mt-1">
                Calculation ID: {calculationId || 'New'}
              </p>
            </div>
          </div>
        </div>

        <CalculationComingSoon 
          calculationType="Bus Riser Design"
          icon={Layers}
          calculationId={calculationId}
        />
      </div>
    </Layout>
  );
}
