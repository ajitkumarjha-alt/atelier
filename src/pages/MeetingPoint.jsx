/**
 * Meeting Point — Bento Grid Dashboard
 * ─────────────────────────────────────
 * AI-augmented forum for MEP engineers.
 * Bento Grid layout: large trending tiles, medium service feeds, small stat tiles.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useUser } from '../lib/UserContext';
import Layout from '../components/Layout';
import NewThreadModal from '../components/meeting-point/NewThreadModal';
import ThreadCard from '../components/meeting-point/ThreadCard';
import {
  MessageSquarePlus, Search, TrendingUp, CheckCircle2,
  Zap, Droplets, Flame, Wind, Cable, MessageCircle,
  Users, Filter, Sparkles, ChevronDown, Pin,
} from 'lucide-react';

const SERVICE_CONFIG = {
  Electrical: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', emoji: '⚡' },
  HVAC:       { icon: Wind, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', emoji: '❄️' },
  PHE:        { icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', emoji: '💧' },
  Fire:       { icon: Flame, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', emoji: '🔥' },
  LV:         { icon: Cable, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', emoji: '🔌' },
  General:    { icon: MessageCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', emoji: '💬' },
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'trending', label: 'Trending' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'resolved', label: 'Resolved' },
];

export default function MeetingPoint() {
  const { user, userLevel } = useUser();
  const navigate = useNavigate();

  const [threads, setThreads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // ── Fetch threads ──────────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        limit: '20',
      });
      if (activeService) params.set('service', activeService);
      if (searchQuery) params.set('search', searchQuery);

      const res = await apiFetch(`/api/meeting-point/threads?${params}`);
      const data = await res.json();
      setThreads(data.threads || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  }, [activeService, sort, page, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/meeting-point/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setLoading(true); fetchThreads(); }, [fetchThreads]);

  // ── Search debounce ────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleThreadCreated = () => {
    setShowNewThread(false);
    fetchThreads();
    fetchStats();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-lodha-sand">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-lodha-steel/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-garamond font-bold text-lodha-black flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-lodha-gold" />
                  Meeting Point
                </h1>
                <p className="text-lodha-grey mt-1 font-jost">
                  AI-augmented engineering forum — ask, discuss, resolve
                </p>
              </div>
              <button
                onClick={() => setShowNewThread(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-lodha-gold text-white rounded-lg
                           hover:bg-lodha-deep transition-colors font-jost font-medium shadow-sm"
              >
                <MessageSquarePlus className="w-5 h-5" />
                New Discussion
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* ── Bento Grid: Stats + Service Feeds ────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {/* Large tile: Trending / Overview */}
            <div className="col-span-2 row-span-2 bg-white rounded-xl border border-lodha-steel/20 p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-lodha-gold" />
                <h3 className="font-garamond font-bold text-lodha-black text-lg">Trending This Week</h3>
              </div>
              {stats?.trending?.length > 0 ? (
                <div className="space-y-3">
                  {stats.trending.slice(0, 4).map(t => {
                    const cfg = SERVICE_CONFIG[t.service_tag] || SERVICE_CONFIG.General;
                    return (
                      <button
                        key={t.id}
                        onClick={() => navigate(`/meeting-point/${t.id}`)}
                        className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-lodha-sand/60 transition-colors"
                      >
                        <span className="text-lg mt-0.5">{cfg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-lodha-black truncate">{t.title}</p>
                          <p className="text-xs text-lodha-grey">{t.view_count} views · {t.reply_count} replies</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-lodha-grey">No trending discussions yet. Start one!</p>
              )}
            </div>

            {/* Service feed tiles */}
            {Object.entries(SERVICE_CONFIG).map(([tag, cfg]) => {
              const count = stats?.by_service?.find(s => s.service_tag === tag)?.count || 0;
              const Icon = cfg.icon;
              const isActive = activeService === tag;
              return (
                <button
                  key={tag}
                  onClick={() => { setActiveService(isActive ? null : tag); setPage(1); }}
                  className={`rounded-xl border p-4 transition-all text-left shadow-card hover:shadow-card-hover
                    ${isActive
                      ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-current ${cfg.color}`
                      : 'bg-white border-lodha-steel/20 hover:border-lodha-gold/30'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                    <span className="text-sm font-semibold text-lodha-black">{tag}</span>
                  </div>
                  <p className="text-2xl font-bold text-lodha-black">{count}</p>
                  <p className="text-xs text-lodha-grey">threads</p>
                </button>
              );
            })}

            {/* Small tiles: stats */}
            <div className="bg-white rounded-xl border border-lodha-steel/20 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-lodha-grey">Resolved</span>
              </div>
              <p className="text-2xl font-bold text-lodha-black">{stats?.resolved_threads || 0}</p>
            </div>

            <div className="bg-white rounded-xl border border-lodha-steel/20 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-lodha-gold" />
                <span className="text-xs font-medium text-lodha-grey">Top Contributors</span>
              </div>
              {stats?.top_contributors?.slice(0, 2).map(c => (
                <p key={c.id} className="text-xs text-lodha-black truncate">
                  {c.full_name} <span className="text-lodha-grey">({c.post_count})</span>
                </p>
              ))}
              {!stats?.top_contributors?.length && (
                <p className="text-xs text-lodha-grey">—</p>
              )}
            </div>
          </div>

          {/* ── Search + Filters ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lodha-grey" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search discussions (AI-powered)…"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-lodha-steel/30 bg-white
                           font-jost text-sm focus:outline-none focus:ring-2 focus:ring-lodha-gold/30
                           focus:border-lodha-gold placeholder:text-lodha-grey/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-lodha-grey" />
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium font-jost transition-colors
                    ${sort === opt.value
                      ? 'bg-lodha-gold text-white'
                      : 'bg-white text-lodha-grey border border-lodha-steel/30 hover:border-lodha-gold/40'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {activeService && (
              <button
                onClick={() => setActiveService(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium font-jost
                           bg-lodha-cream text-lodha-black border border-lodha-steel/30
                           hover:bg-lodha-sand transition-colors flex items-center gap-1"
              >
                {SERVICE_CONFIG[activeService]?.emoji} {activeService} ✕
              </button>
            )}
          </div>

          {/* ── Thread List ──────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl p-5 border border-lodha-steel/20 animate-pulse">
                  <div className="h-5 bg-lodha-sand rounded w-3/4 mb-3" />
                  <div className="h-3 bg-lodha-sand rounded w-full mb-2" />
                  <div className="h-3 bg-lodha-sand rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-lodha-steel/20">
              <MessageCircle className="w-12 h-12 text-lodha-grey/30 mx-auto mb-4" />
              <h3 className="text-lg font-garamond font-bold text-lodha-black mb-2">No discussions yet</h3>
              <p className="text-sm text-lodha-grey mb-4">
                {searchQuery
                  ? 'No results match your search. Try different keywords.'
                  : 'Be the first to start a discussion!'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewThread(true)}
                  className="px-4 py-2 bg-lodha-gold text-white rounded-lg text-sm font-medium
                             hover:bg-lodha-deep transition-colors"
                >
                  Start Discussion
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map(thread => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  onClick={() => navigate(`/meeting-point/${thread.id}`)}
                  serviceConfig={SERVICE_CONFIG}
                />
              ))}
            </div>
          )}

          {/* ── Pagination ───────────────────────────────────────── */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
                    ${page === p
                      ? 'bg-lodha-gold text-white'
                      : 'bg-white text-lodha-grey border border-lodha-steel/30 hover:border-lodha-gold/40'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── New Thread Modal ────────────────────────────────────── */}
        {showNewThread && (
          <NewThreadModal
            onClose={() => setShowNewThread(false)}
            onCreated={handleThreadCreated}
            serviceConfig={SERVICE_CONFIG}
          />
        )}
      </div>
    </Layout>
  );
}
