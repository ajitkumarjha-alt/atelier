/**
 * NewThreadModal — Create a new discussion with:
 * - Privacy toggle (identity / anonymous)
 * - Service tag selector
 * - File upload
 * - Real-time AI duplicate detection (shadow listener)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import {
  X, Send, EyeOff, Eye, Paperclip, Sparkles,
  Zap, Droplets, Flame, Wind, Cable, MessageCircle, Loader,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SERVICE_TAGS = [
  { value: 'Electrical', emoji: '⚡', label: 'Electrical' },
  { value: 'HVAC', emoji: '❄️', label: 'HVAC' },
  { value: 'PHE', emoji: '💧', label: 'PHE / Plumbing' },
  { value: 'Fire', emoji: '🔥', label: 'Fire Fighting' },
  { value: 'LV', emoji: '🔌', label: 'LV Systems' },
  { value: 'General', emoji: '💬', label: 'General' },
];

export default function NewThreadModal({ onClose, onCreated, serviceConfig }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [serviceTag, setServiceTag] = useState('General');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fileInputRef = useRef(null);
  const debounceRef = useRef(null);

  // ── AI Duplicate Detection (as-you-type) ───────────────────────────────
  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 15) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await apiFetch(`/api/meeting-point/suggest?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(title || body);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [title, body, fetchSuggestions]);

  // ── File handling ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('body', body.trim());
      formData.append('service_tag', serviceTag);
      formData.append('is_anonymous', String(isAnonymous));
      files.forEach(f => formData.append('files', f));

      const res = await apiFetch('/api/meeting-point/threads', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set multipart boundary
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create discussion');
      }

      toast.success('Discussion created!');
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lodha-steel/20">
          <h2 className="text-xl font-garamond font-bold text-lodha-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lodha-gold" />
            New Discussion
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-lodha-sand transition-colors">
            <X className="w-5 h-5 text-lodha-grey" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Privacy Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-lodha-sand border border-lodha-steel/20">
              <div className="flex items-center gap-3">
                {isAnonymous ? (
                  <EyeOff className="w-5 h-5 text-lodha-grey" />
                ) : (
                  <Eye className="w-5 h-5 text-lodha-gold" />
                )}
                <div>
                  <p className="text-sm font-medium text-lodha-black">
                    {isAnonymous ? 'Anonymous Mode' : 'Professional Identity'}
                  </p>
                  <p className="text-xs text-lodha-grey">
                    {isAnonymous
                      ? 'Your name is hidden. Atelier will scrub identifying details.'
                      : 'Post builds your professional reputation.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isAnonymous ? 'bg-lodha-grey' : 'bg-lodha-gold'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isAnonymous ? 'left-0.5' : 'left-6'
                }`} />
              </button>
            </div>

            {/* Service Selector */}
            <div>
              <label className="block text-sm font-medium text-lodha-black mb-2">
                Service Category
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TAGS.map(tag => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setServiceTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
                      ${serviceTag === tag.value
                        ? 'bg-lodha-gold text-white shadow-sm'
                        : 'bg-white text-lodha-grey border border-lodha-steel/30 hover:border-lodha-gold/40'
                      }`}
                  >
                    <span>{tag.emoji}</span>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-lodha-black mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. MSEDCL diversity factor for 2BHK residential towers"
                className="w-full px-4 py-2.5 rounded-lg border border-lodha-steel/30 bg-white
                           font-jost text-sm focus:outline-none focus:ring-2 focus:ring-lodha-gold/30
                           focus:border-lodha-gold placeholder:text-lodha-grey/50"
                maxLength={500}
              />
            </div>

            {/* AI Suggestions Panel */}
            {(suggestions.length > 0 || loadingSuggestions) && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">
                    {loadingSuggestions ? 'Searching similar discussions…' : 'Similar discussions found'}
                  </span>
                </div>
                {loadingSuggestions ? (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <Loader className="w-3 h-3 animate-spin" /> Analyzing…
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {suggestions.map(s => (
                      <a
                        key={s.id}
                        href={`/meeting-point/${s.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 rounded hover:bg-blue-100/50 transition-colors group"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600" />
                        <span className="text-sm text-blue-900 truncate flex-1">{s.title}</span>
                        {s.similarity && (
                          <span className="text-xs text-blue-500">
                            {Math.round(s.similarity * 100)}% match
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-lodha-black mb-1.5">
                Description
              </label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Describe your question or topic in detail. Include relevant technical parameters, standards, or references…"
                rows={6}
                className="w-full px-4 py-2.5 rounded-lg border border-lodha-steel/30 bg-white
                           font-jost text-sm focus:outline-none focus:ring-2 focus:ring-lodha-gold/30
                           focus:border-lodha-gold placeholder:text-lodha-grey/50 resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-lodha-black">
                  Attachments <span className="text-lodha-grey font-normal">(optional)</span>
                </label>
                <span className="text-xs text-lodha-grey">{files.length}/5 files</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.dwg,.dxf,.rvt,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 5}
                className="w-full p-4 rounded-lg border-2 border-dashed border-lodha-steel/30
                           hover:border-lodha-gold/40 transition-colors text-center
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip className="w-5 h-5 text-lodha-grey mx-auto mb-1" />
                <p className="text-sm text-lodha-grey">
                  Drop files or click to upload
                </p>
                <p className="text-xs text-lodha-grey/60 mt-1">
                  PDF, DWG, RVT, Excel, Images • Max 50MB each
                </p>
              </button>

              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-lodha-sand rounded text-sm">
                      <Paperclip className="w-3.5 h-3.5 text-lodha-grey" />
                      <span className="flex-1 truncate text-lodha-black">{f.name}</span>
                      <span className="text-xs text-lodha-grey">{(f.size / 1024).toFixed(0)}KB</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anonymous notice */}
            {isAnonymous && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Anonymous posting is enabled</p>
                  <p>Your identity is hidden from all users except admins. Atelier will automatically scrub potential identifiers from your post.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-lodha-steel/20 bg-lodha-sand/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-lodha-grey hover:text-lodha-black transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-lodha-gold text-white rounded-lg
                         text-sm font-medium hover:bg-lodha-deep transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader className="w-4 h-4 animate-spin" /> Posting…</>
              ) : (
                <><Send className="w-4 h-4" /> Post Discussion</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
