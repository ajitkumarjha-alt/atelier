import { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';

/**
 * PromptDialog - Replaces native prompt() dialogs.
 *
 * Props:
 *  - open (bool)
 *  - title (string)
 *  - message (string|node) – optional helper text
 *  - placeholder (string)
 *  - defaultValue (string)
 *  - inputType ('text'|'number'|'textarea')
 *  - confirmLabel (string)
 *  - cancelLabel (string)
 *  - onConfirm (fn(value))
 *  - onCancel (fn)
 *  - validate (fn(value) => string|null) – return error string or null
 */
export default function PromptDialog({
  open,
  title = 'Enter a value',
  message,
  placeholder = '',
  defaultValue = '',
  inputType = 'text',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  validate,
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, defaultValue]);

  // Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (validate) {
      const err = validate(value);
      if (err) { setError(err); return; }
    }
    onConfirm?.(value);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-lodha-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      onClick={(e) => e.target === overlayRef.current && onCancel?.()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lodha-gold/10 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-lodha-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="prompt-dialog-title" className="text-lg font-garamond font-bold text-lodha-black">
                  {title}
                </h3>
                {message && (
                  <p className="mt-1 text-sm font-jost text-lodha-grey">{message}</p>
                )}
                <div className="mt-3">
                  {inputType === 'textarea' ? (
                    <textarea
                      ref={inputRef}
                      value={value}
                      onChange={(e) => { setValue(e.target.value); setError(null); }}
                      placeholder={placeholder}
                      rows={3}
                      className={`input-field resize-none ${error ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
                    />
                  ) : (
                    <input
                      ref={inputRef}
                      type={inputType}
                      value={value}
                      onChange={(e) => { setValue(e.target.value); setError(null); }}
                      placeholder={placeholder}
                      step={inputType === 'number' ? 'any' : undefined}
                      className={`input-field ${error ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
                    />
                  )}
                  {error && (
                    <p className="mt-1.5 text-xs font-jost text-red-600">{error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 bg-lodha-sand/30 rounded-b-xl border-t border-lodha-steel/20">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-jost font-medium text-lodha-grey bg-white border border-lodha-steel/40
                         rounded-lg hover:bg-lodha-sand transition-colors focus:outline-none focus:ring-2 focus:ring-lodha-steel/40"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-jost font-semibold text-white bg-lodha-gold rounded-lg
                         hover:bg-lodha-deep transition-colors focus:outline-none focus:ring-2 focus:ring-lodha-gold/40 focus:ring-offset-1"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
