import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Tooltip — Hover/focus tooltip for domain jargon.
 *
 * Usage:
 *   <Tooltip text="Material Approval Submission">MAS</Tooltip>
 *   <Tooltip text="Request for Information" icon>RFI</Tooltip>
 */
export default function Tooltip({ children, text, icon = false, className = '' }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState('top');
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Flip if too close to top
      if (rect.top < 60) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="term"
      aria-describedby={visible ? 'tooltip-content' : undefined}
    >
      {children}
      {icon && <HelpCircle className="w-3.5 h-3.5 text-lodha-grey/50" aria-hidden="true" />}
      {visible && (
        <span
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 text-xs font-jost text-white
                     bg-lodha-black/90 rounded-lg shadow-lg whitespace-nowrap pointer-events-none
                     animate-in fade-in duration-150
                     ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {text}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-lodha-black/90 rotate-45
                       ${position === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'}`}
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
