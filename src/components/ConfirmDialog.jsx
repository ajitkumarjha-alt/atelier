import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  default: {
    icon: HelpCircle,
    iconBg: 'bg-lodha-gold/10',
    iconColor: 'text-lodha-gold',
    confirmBtn: 'bg-lodha-gold hover:bg-lodha-deep focus:ring-lodha-gold',
  },
};

/**
 * ConfirmDialog - Replaces native confirm() / alert() dialogs.
 *
 * Props:
 *  - open (bool)           – show / hide
 *  - title (string)        – dialog heading
 *  - message (string|node) – body text
 *  - variant ('danger'|'warning'|'info'|'default')
 *  - confirmLabel (string) – e.g. "Delete", "Yes, proceed"
 *  - cancelLabel (string)  – e.g. "Cancel"
 *  - onConfirm (fn)        – called when user confirms
 *  - onCancel (fn)         – called when user cancels or presses Escape
 *  - hideCancel (bool)     – if true, show only the confirm button (alert mode)
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  variant = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  hideCancel = false,
}) {
  const overlayRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return;

    const focusTarget = hideCancel ? confirmBtnRef.current : cancelBtnRef.current;
    focusTarget?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
      // Trap focus inside dialog
      if (e.key === 'Tab') {
        const focusable = overlayRef.current?.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    // Prevent scroll behind
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel, hideCancel]);

  if (!open) return null;

  const v = VARIANTS[variant] || VARIANTS.default;
  const Icon = v.icon;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-lodha-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => e.target === overlayRef.current && onCancel?.()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${v.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${v.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-dialog-title" className="text-lg font-garamond font-bold text-lodha-black">
                {title}
              </h3>
              {message && (
                <p className="mt-2 text-sm font-jost text-lodha-grey leading-relaxed">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 bg-lodha-sand/30 rounded-b-xl border-t border-lodha-steel/20">
          {!hideCancel && (
            <button
              ref={cancelBtnRef}
              onClick={onCancel}
              className="px-4 py-2 text-sm font-jost font-medium text-lodha-grey bg-white border border-lodha-steel/40
                         rounded-lg hover:bg-lodha-sand transition-colors focus:outline-none focus:ring-2 focus:ring-lodha-steel/40"
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-jost font-semibold text-white rounded-lg transition-colors
                       focus:outline-none focus:ring-2 focus:ring-offset-1 ${v.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
