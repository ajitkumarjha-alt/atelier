import { Building2, Gauge, Package } from 'lucide-react';

export default function ProjectCard({ project }) {
  const {
    name,
    completion_percentage,
    floors_completed,
    total_floors,
    mep_status,
    material_stock_percentage,
    status
  } = project;

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMEPStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 hover:shadow-2xl transition-shadow duration-200 w-full max-w-full overflow-hidden">
      {/* Header with Status Badge */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <h3 className="text-xl font-serif font-bold text-lodha-deep truncate flex-1">{name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${getStatusColor(status)}`}>
          {status.replace('_', ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-lodha-gold">{completion_percentage}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-lodha-gold transition-all duration-500 ease-out"
            style={{ width: `${completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Floors Metric */}
        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-lodha-sand mb-2">
            <Building2 className="w-5 h-5 text-lodha-deep" />
          </div>
          <span className="text-sm font-medium text-gray-900">{floors_completed}/{total_floors}</span>
          <span className="text-xs text-gray-500">Floors</span>
        </div>

        {/* MEP Status */}
        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-lodha-sand mb-2">
            <Gauge className={`w-5 h-5 ${getMEPStatusColor(mep_status)}`} />
          </div>
          <span className="text-sm font-medium text-gray-900 capitalize text-center break-words">{mep_status.replace('_', ' ')}</span>
          <span className="text-xs text-gray-500">MEP Status</span>
        </div>

        {/* Material Stock */}
        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-lodha-sand mb-2">
            <Package className="w-5 h-5 text-lodha-deep" />
          </div>
          <span className="text-sm font-medium text-gray-900">{material_stock_percentage}%</span>
          <span className="text-xs text-gray-500">Stock</span>
        </div>
      </div>
    </div>
  );
}