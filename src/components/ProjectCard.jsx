import { Building2, AlertTriangle } from 'lucide-react';

export default function ProjectCard({ project }) {
  const {
    name,
    description,
    completion_percentage,
    floors_completed,
    total_floors,
    status,
    lifecycle_stage,
    critical_flags // Reserved for future implementation
  } = project;

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 border border-gray-200 overflow-hidden">
      {/* Header with Status */}
      <div className="p-5 pb-4 border-b border-gray-100">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h3 className="text-xl font-serif font-bold text-lodha-deep flex-1 leading-tight">{name}</h3>
          {status && ['on_track', 'delayed', 'at_risk'].includes(status) && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap border ${getStatusColor(status)}`}>
              {status.replace('_', ' ')}
            </span>
          )}
        </div>
        
        {/* Project Summary */}
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{description}</p>
        )}

        {/* Lifecycle Stage */}
        {lifecycle_stage && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">Stage:</span> {lifecycle_stage}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="p-5 pt-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-lodha-gold">{completion_percentage}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-lodha-gold to-yellow-500 transition-all duration-500 ease-out"
              style={{ width: `${completion_percentage}%` }}
            />
          </div>
        </div>

        {/* Floor Progress */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-lodha-deep" />
          <span className="text-gray-600">Floors:</span>
          <span className="font-semibold text-gray-900">{floors_completed}/{total_floors} completed</span>
        </div>

        {/* Critical Flags Section - Placeholder for future implementation */}
        {critical_flags && critical_flags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-600 font-medium">
                {critical_flags.length} critical {critical_flags.length === 1 ? 'point' : 'points'} flagged
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}