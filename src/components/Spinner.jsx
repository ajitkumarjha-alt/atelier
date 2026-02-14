import { Loader } from 'lucide-react';

/**
 * Spinner — Unified loading spinner.
 * Replaces 4+ different spinner implementations across the codebase.
 *
 * Usage:
 *   <Spinner />                             // inline small
 *   <Spinner size="lg" />                   // larger
 *   <Spinner fullPage />                    // centered full-page
 *   <Spinner fullPage label="Loading..." /> // with text below
 */

const SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export default function Spinner({
  size = 'md',
  label,
  fullPage = false,
  className = '',
}) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  const spinner = (
    <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-label={label || 'Loading'}>
      <Loader className={`${sizeClass} text-lodha-gold animate-spin`} aria-hidden="true" />
      {label && (
        <span className="text-sm font-jost text-lodha-grey">{label}</span>
      )}
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
