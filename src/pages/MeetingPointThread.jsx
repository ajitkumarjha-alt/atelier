/**
 * MeetingPointThread — Full thread detail page
 * Shows thread + all posts, verified solution, similar threads, reactions, reply form
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useUser } from '../lib/UserContext';
import Layout from '../components/Layout';
import {
  ArrowLeft, MessageCircle, ThumbsUp, CheckCircle2, Shield,
  Paperclip, Send, EyeOff, Eye, Loader, Sparkles, Pin,
  AlertCircle, Clock, ChevronRight, Download, Trash2, Pencil, Check,
  Zap, Droplets, Flame, Wind, Cable, Hash, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SERVICE_ICONS = {
  Electrical: { icon: Zap,  color: 'text-amber-500' },
  HVAC:       { icon: Wind, color: 'text-blue-500' },
  PHE:        { icon: Droplets, color: 'text-cyan-500' },
  Fire:       { icon: Flame, color: 'text-red-500' },
  LV:         { icon: Cable, color: 'text-purple-500' },
  General:    { icon: Hash, color: 'text-gray-500' },
};

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Post Card ─────────────────────────────────────────────────────── */
function PostCard({ post, threadId, onReact, onVerify, onEdit, onDelete, isAdmin, currentUserEmail }) {
  const isBot = post.author_name === 'AtelierBot';
  const isSolution = post.is_verified_solution;
  const isOwn = post.author_email === currentUserEmail;
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);

  return (
    <div
      id={`post-${post.id}`}
      className={`rounded-xl border p-5 transition-all ${
        isSolution
          ? 'border-green-300 bg-green-50/60 shadow-sm'
          : isBot
            ? 'border-blue-200 bg-blue-50/40'
            : 'border-lodha-steel/20 bg-white hover:shadow-sm'
      }`}
    >
      {/* Solution ribbon */}
      {isSolution && (
        <div className="flex items-center gap-2 mb-3 -mt-1">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Verified Solution</span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isBot ? 'bg-blue-100 text-blue-700' :
          post.is_anonymous ? 'bg-gray-100 text-gray-500' :
          'bg-lodha-gold/10 text-lodha-gold'
        }`}>
          {isBot ? '🤖' : post.is_anonymous ? '?' : (post.author_name?.[0] || 'U')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-lodha-black truncate">
              {post.is_anonymous ? 'Anonymous' : post.author_name || 'Unknown'}
            </span>
            {isBot && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                AI
              </span>
            )}
          </div>
          <span className="text-xs text-lodha-grey">{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div className="mb-4">
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-lodha-steel/30 bg-white
                       font-jost text-sm focus:outline-none focus:ring-2 focus:ring-lodha-gold/30
                       focus:border-lodha-gold resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => { onEdit(post.id, editBody); setEditing(false); }}
              disabled={!editBody.trim()}
              className="flex items-center gap-1 px-3 py-1 bg-lodha-gold text-white rounded text-xs font-medium
                         hover:bg-lodha-deep transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={() => { setEditing(false); setEditBody(post.body); }}
              className="px-3 py-1 text-xs text-lodha-grey hover:text-lodha-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-lodha-black/80 leading-relaxed whitespace-pre-wrap mb-4">
          {post.body}
          {post.updated_at && post.updated_at !== post.created_at && (
            <span className="text-[10px] text-lodha-grey/60 ml-1">(edited)</span>
          )}
        </div>
      )}

      {/* Attachments */}
      {post.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {post.attachments.map(att => (
            <a
              key={att.id}
              href={`/api/meeting-point/attachments/${att.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-lodha-sand rounded text-xs text-lodha-grey hover:text-lodha-gold transition-colors"
            >
              <Download className="w-3 h-3" />
              {att.original_name}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-lodha-steel/10">
        <button
          onClick={() => onReact(post.id, 'helpful')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
            post.user_reacted
              ? 'bg-lodha-gold/10 text-lodha-gold'
              : 'text-lodha-grey hover:bg-lodha-sand hover:text-lodha-black'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{post.helpful_count || 0} Helpful</span>
        </button>

        {isAdmin && !isSolution && (
          <button
            onClick={() => onVerify(post.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-green-600 hover:bg-green-50 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            Mark as Solution
          </button>
        )}

        {/* Own-post actions */}
        {isOwn && !isBot && !editing && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-lodha-grey hover:bg-lodha-sand hover:text-lodha-black transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => { if (confirm('Delete this reply?')) onDelete(post.id); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Thread Detail ──────────────────────────────────────────── */
export default function MeetingPointThread() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const isAdmin = ['SUPER_ADMIN', 'L0', 'L1'].includes(user?.user_level);

  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  // Thread editing
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // Reply form
  const [replyBody, setReplyBody] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replyFiles, setReplyFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // ── Fetch thread ───────────────────────────────────────────────────
  const fetchThread = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/meeting-point/threads/${threadId}`);
      if (!res.ok) throw new Error('Thread not found');
      const data = await res.json();
      setThread(data.thread);
      setPosts(data.posts || []);
      setSimilar(data.similar || []);
    } catch (err) {
      toast.error(err.message);
      navigate('/meeting-point');
    } finally {
      setLoading(false);
    }
  }, [threadId, navigate]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  // Record view once on mount (separate from data fetch)
  useEffect(() => {
    apiFetch(`/api/meeting-point/threads/${threadId}/view`, { method: 'POST' }).catch(() => {});
  }, [threadId]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleReact = async (postId, type) => {
    try {
      await apiFetch(`/api/meeting-point/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: type }),
      });
      fetchThread();
    } catch { /* silently fail */ }
  };

  const handleVerify = async (postId) => {
    try {
      await apiFetch(`/api/meeting-point/posts/${postId}/verify`, {
        method: 'PATCH',
      });
      toast.success('Marked as verified solution');
      fetchThread();
    } catch (err) {
      toast.error('Failed to mark solution');
    }
  };

  const handleEditPost = async (postId, newBody) => {
    try {
      const res = await apiFetch(`/api/meeting-point/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to edit');
      }
      toast.success('Reply updated');
      fetchThread();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await apiFetch(`/api/meeting-point/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Reply deleted');
      fetchThread();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResolve = async () => {
    try {
      await apiFetch(`/api/meeting-point/threads/${threadId}/resolve`, {
        method: 'PATCH',
      });
      toast.success('Thread marked as resolved');
      fetchThread();
    } catch (err) {
      toast.error('Failed to resolve thread');
    }
  };

  const handlePin = async () => {
    try {
      await apiFetch(`/api/meeting-point/threads/${threadId}/pin`, {
        method: 'PATCH',
      });
      toast.success(thread.is_pinned ? 'Unpinned' : 'Pinned');
      fetchThread();
    } catch (err) {
      toast.error('Failed to update pin');
    }
  };

  const handleEditThread = async () => {
    try {
      const res = await apiFetch(`/api/meeting-point/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, body: editBody }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to edit');
      }
      toast.success('Thread updated');
      setEditingThread(false);
      fetchThread();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this thread? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/meeting-point/threads/${threadId}`, { method: 'DELETE' });
      toast.success('Thread deleted');
      navigate('/meeting-point');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ── Submit Reply ───────────────────────────────────────────────────
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('body', replyBody.trim());
      formData.append('is_anonymous', String(replyAnonymous));
      replyFiles.forEach(f => formData.append('files', f));

      const res = await apiFetch(`/api/meeting-point/threads/${threadId}/posts`, {
        method: 'POST',
        body: formData,
        headers: {},
      });

      if (!res.ok) throw new Error('Failed to post reply');

      setReplyBody('');
      setReplyFiles([]);
      setReplyAnonymous(false);
      toast.success('Reply posted');
      fetchThread();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!thread) return null;

  const ServiceIcon = SERVICE_ICONS[thread.service_tag]?.icon || Hash;
  const serviceColor = SERVICE_ICONS[thread.service_tag]?.color || 'text-gray-500';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/meeting-point')}
          className="flex items-center gap-2 text-sm text-lodha-grey hover:text-lodha-gold transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meeting Point
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main Column ───────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Thread Header */}
            <div className="bg-white rounded-2xl border border-lodha-steel/20 p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-lodha-sand ${serviceColor}`}>
                  <ServiceIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {thread.is_pinned && (
                      <Pin className="w-3.5 h-3.5 text-lodha-gold" />
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-lodha-sand text-lodha-grey font-medium">
                      {thread.service_tag}
                    </span>
                    {thread.status === 'resolved' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        Resolved
                      </span>
                    )}
                  </div>
                  {editingThread ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-xl font-garamond font-bold text-lodha-black leading-tight
                                 px-3 py-1.5 rounded-lg border border-lodha-steel/30 bg-white
                                 focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 focus:border-lodha-gold"
                    />
                  ) : (
                    <h1 className="text-xl font-garamond font-bold text-lodha-black leading-tight">
                      {thread.title}
                    </h1>
                  )}
                </div>
              </div>

              {/* Thread body */}
              {editingThread ? (
                <div className="pl-14 mb-4">
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-lodha-steel/30 bg-white
                               font-jost text-sm focus:outline-none focus:ring-2 focus:ring-lodha-gold/30
                               focus:border-lodha-gold resize-none"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleEditThread}
                      disabled={!editTitle.trim() || !editBody.trim()}
                      className="flex items-center gap-1 px-4 py-1.5 bg-lodha-gold text-white rounded-lg text-xs font-medium
                                 hover:bg-lodha-deep transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Save Changes
                    </button>
                    <button
                      onClick={() => setEditingThread(false)}
                      className="px-4 py-1.5 text-xs text-lodha-grey hover:text-lodha-black transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-lodha-black/80 leading-relaxed whitespace-pre-wrap mb-4 pl-14">
                  {thread.body}
                  {thread.updated_at && thread.updated_at !== thread.created_at && (
                    <span className="text-[10px] text-lodha-grey/60 ml-1">(edited)</span>
                  )}
                </div>
              )}

              {/* Thread meta */}
              <div className="flex items-center justify-between pl-14 pt-3 border-t border-lodha-steel/10">
                <div className="flex items-center gap-4 text-xs text-lodha-grey">
                  <span className="flex items-center gap-1">
                    {thread.is_anonymous ? (
                      <><EyeOff className="w-3 h-3" /> Anonymous</>
                    ) : (
                      thread.author_name || 'Unknown'
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(thread.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {posts.length} replies
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Owner actions: Edit / Delete */}
                  {thread.author_email === user?.email && !editingThread && (
                    <>
                      <button
                        onClick={() => { setEditTitle(thread.title); setEditBody(thread.body); setEditingThread(true); }}
                        className="flex items-center gap-1 text-xs text-lodha-grey hover:text-lodha-black transition-colors px-2 py-1 rounded"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors px-2 py-1 rounded"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </>
                  )}

                  {/* Admin actions */}
                  {isAdmin && (
                    <>
                      <button
                        onClick={handlePin}
                        className="text-xs text-lodha-grey hover:text-lodha-gold transition-colors px-2 py-1 rounded"
                      >
                        {thread.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                      {thread.status !== 'resolved' && (
                        <button
                          onClick={handleResolve}
                          className="text-xs text-green-600 hover:bg-green-50 transition-colors px-2 py-1 rounded"
                        >
                          Resolve
                        </button>
                      )}
                      {thread.author_email !== user?.email && (
                        <button
                          onClick={handleDelete}
                          className="text-xs text-red-500 hover:bg-red-50 transition-colors px-2 py-1 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Verified Solution (if exists, show prominently) */}
            {thread.has_solution && posts.some(p => p.is_verified_solution) && (
              <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">Verified Solution</h3>
                </div>
                <div className="text-sm text-green-900/80 leading-relaxed whitespace-pre-wrap">
                  {posts.find(p => p.is_verified_solution)?.body}
                </div>
                <div className="text-xs text-green-700 mt-2">
                  — {posts.find(p => p.is_verified_solution)?.is_anonymous
                    ? 'Anonymous'
                    : posts.find(p => p.is_verified_solution)?.author_name}
                </div>
              </div>
            )}

            {/* Posts list */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-lodha-grey uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
              </h2>

              {posts.length === 0 ? (
                <div className="text-center py-12 text-lodha-grey text-sm">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No replies yet. Be the first to respond!
                </div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    threadId={threadId}
                    onReact={handleReact}
                    onVerify={handleVerify}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                    isAdmin={isAdmin}
                    currentUserEmail={user?.email}
                  />
                ))
              )}
            </div>

            {/* Reply Form */}
            <div className="bg-white rounded-2xl border border-lodha-steel/20 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-lodha-black mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-lodha-gold" />
                Post a Reply
              </h3>

              <form onSubmit={handleSubmitReply} className="space-y-3">
                {/* Anonymous toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReplyAnonymous(!replyAnonymous)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      replyAnonymous
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-lodha-gold/10 text-lodha-gold'
                    }`}
                  >
                    {replyAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {replyAnonymous ? 'Anonymous' : 'Named'}
                  </button>
                </div>

                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="Share your knowledge, experience, or solution…"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-lodha-steel/30 bg-white
                             font-jost text-sm focus:outline-none focus:ring-2 focus:ring-lodha-gold/30
                             focus:border-lodha-gold placeholder:text-lodha-grey/50 resize-none"
                />

                {/* File upload */}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.dwg,.dxf,.rvt,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={e => setReplyFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 5))}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-lodha-grey hover:bg-lodha-sand transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Attach files
                  </button>

                  {replyFiles.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {replyFiles.map((f, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-lodha-sand rounded text-xs text-lodha-grey">
                          {f.name}
                          <button
                            type="button"
                            onClick={() => setReplyFiles(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !replyBody.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-lodha-gold text-white rounded-lg
                               text-sm font-medium hover:bg-lodha-deep transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Posting…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Reply</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ── Sidebar ───────────────────────── */}
          <div className="space-y-5">
            {/* Thread Stats */}
            <div className="bg-white rounded-2xl border border-lodha-steel/20 p-5">
              <h3 className="text-sm font-semibold text-lodha-black mb-3">Thread Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-lodha-grey">Views</span>
                  <span className="font-medium text-lodha-black">{thread.view_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lodha-grey">Replies</span>
                  <span className="font-medium text-lodha-black">{posts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lodha-grey">Created</span>
                  <span className="font-medium text-lodha-black">{timeAgo(thread.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lodha-grey">Status</span>
                  <span className={`font-medium ${thread.status === 'resolved' ? 'text-green-600' : 'text-amber-600'}`}>
                    {thread.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
              </div>
            </div>

            {/* Similar Threads */}
            {similar.length > 0 && (
              <div className="bg-white rounded-2xl border border-lodha-steel/20 p-5">
                <h3 className="text-sm font-semibold text-lodha-black mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lodha-gold" />
                  Related Discussions
                </h3>
                <div className="space-y-2">
                  {similar.map(s => (
                    <Link
                      key={s.id}
                      to={`/meeting-point/${s.id}`}
                      className="block p-2.5 rounded-lg hover:bg-lodha-sand transition-colors group"
                    >
                      <div className="text-sm text-lodha-black group-hover:text-lodha-gold transition-colors line-clamp-2">
                        {s.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-lodha-grey">
                        <span>{s.service_tag}</span>
                        <span>•</span>
                        <span>{s.reply_count || 0} replies</span>
                        {s.similarity && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500">{Math.round(s.similarity * 100)}% similar</span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Atelier Insight */}
            {thread.ai_summary && (
              <div className="bg-blue-50/60 rounded-2xl border border-blue-200 p-5">
                <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Atelier Summary
                </h3>
                <p className="text-xs text-blue-800/80 leading-relaxed">
                  {thread.ai_summary}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
