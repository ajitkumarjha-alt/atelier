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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delayed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'at_risk':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-lodha-steel/20 text-lodha-grey border-lodha-steel/40';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 border border-lodha-steel/30 hover:border-lodha-gold/20 overflow-hidden">
      {/* Header with Status */}
      <div className="p-5 pb-4 border-b border-lodha-steel/15">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h3 className="text-lg font-garamond font-bold text-lodha-black flex-1 leading-tight">{name}</h3>
          {status && ['on_track', 'delayed', 'at_risk'].includes(status) && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap border ${getStatusColor(status)}`}>
              {status.replace('_', ' ')}
            </span>
          )}
        </div>
        
        {/* Project Summary */}
        {description && (
          <p className="text-sm text-lodha-grey line-clamp-2 mb-3 font-jost">{description}</p>
        )}

        {/* Lifecycle Stage */}
        {lifecycle_stage && (
          <div className="text-xs text-lodha-grey/70 font-jost">
            <span className="font-medium">Stage:</span> {lifecycle_stage}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="p-5 pt-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-lodha-grey font-jost">Overall Progress</span>
            <span className="text-sm font-bold text-lodha-gold font-jost">{completion_percentage}%</span>
          </div>
          <div className="h-2 bg-lodha-sand rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-lodha-gold to-lodha-gold/70 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completion_percentage}%` }}
            />
          </div>
        </div>

        {/* Floor Progress */}
        <div className="flex items-center gap-2 text-sm font-jost">
          <Building2 className="w-4 h-4 text-lodha-gold" />
          <span className="text-lodha-grey">Floors:</span>
          <span className="font-semibold text-lodha-black">{floors_completed}/{total_floors} completed</span>
        </div>

        {/* Critical Flags Section */}
        {critical_flags && critical_flags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-lodha-steel/15">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-600 font-medium font-jost">
                {critical_flags.length} critical {critical_flags.length === 1 ? 'point' : 'points'} flagged
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}