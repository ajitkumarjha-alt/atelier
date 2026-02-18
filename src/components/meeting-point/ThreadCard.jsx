/**
 * ThreadCard — Bento-style thread preview card for the Meeting Point list.
 */

import { Pin, CheckCircle2, MessageCircle, Eye, Clock, Bot } from 'lucide-react';

export default function ThreadCard({ thread, onClick, serviceConfig }) {
  const cfg = serviceConfig[thread.service_tag] || serviceConfig.General;
  const Icon = cfg.icon;
  const timeAgo = getTimeAgo(thread.created_at);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border transition-all
                  shadow-card hover:shadow-card-hover group
                  ${thread.is_pinned ? 'border-lodha-gold/40 ring-1 ring-lodha-gold/10' : 'border-lodha-steel/20'}
                  ${thread.has_solution ? 'border-l-4 border-l-green-400' : ''}`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Service icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1">
              {thread.is_pinned && (
                <Pin className="w-3.5 h-3.5 text-lodha-gold flex-shrink-0" />
              )}
              <h3 className="text-base font-semibold text-lodha-black group-hover:text-lodha-gold transition-colors truncate">
                {thread.title}
              </h3>
              {thread.has_solution && (
                <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Solved
                </span>
              )}
            </div>

            {/* Preview */}
            <p className="text-sm text-lodha-grey line-clamp-2 mb-3">
              {thread.body_preview}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-lodha-grey">
              {/* Service tag */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-medium`}>
                {cfg.emoji} {thread.service_tag}
              </span>

              {/* Author */}
              <span className="flex items-center gap-1">
                {thread.is_anonymous ? (
                  <span className="italic">Anonymous</span>
                ) : (
                  <>
                    <span className="font-medium text-lodha-black">{thread.author_name}</span>
                    {thread.author_level !== 'Anonymous' && (
                      <span className="text-lodha-grey">({thread.author_level})</span>
                    )}
                  </>
                )}
              </span>

              {/* Stats */}
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />{thread.view_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />{thread.reply_count}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{timeAgo}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
