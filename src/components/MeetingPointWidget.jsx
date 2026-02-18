/**
 * MeetingPointWidget — Reusable card for dashboards
 * Shows live stats + navigates to /meeting-point
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Sparkles, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function MeetingPointWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch('/api/meeting-point/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div
      onClick={() => navigate('/meeting-point')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/meeting-point')}
      role="button"
      tabIndex={0}
      className="mb-6 group cursor-pointer rounded-2xl border border-lodha-steel/20 bg-gradient-to-br from-white to-lodha-sand/40
                 p-5 shadow-sm hover:shadow-md hover:border-lodha-gold/30 transition-all
                 focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-lodha-gold/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-lodha-gold" />
          </div>
          <div>
            <h3 className="text-base font-garamond font-bold text-lodha-black group-hover:text-lodha-gold transition-colors flex items-center gap-2">
              Atelier Meeting Point
              <Sparkles className="w-3.5 h-3.5 text-lodha-gold opacity-60" />
            </h3>
            <p className="text-xs text-lodha-grey mt-0.5">
              {stats
                ? `${stats.open_threads || 0} open · ${stats.resolved_threads || 0} resolved · ${stats.total_threads || 0} discussions`
                : 'MEP knowledge forum with Atelier intelligence'}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-lodha-grey group-hover:text-lodha-gold group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
