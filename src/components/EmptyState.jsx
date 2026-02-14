import { Inbox } from 'lucide-react';

/**
 * EmptyState — Consistent empty state with optional CTA.
 *
 * Usage:
 *   <EmptyState
 *     icon={FileText}
 *     title="No documents yet"
 *     description="Upload your first document to get started."
 *     actionLabel="Upload Document"
 *     onAction={() => setShowUpload(true)}
 *   />
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`py-16 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-lodha-sand flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-lodha-grey/50" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-garamond font-bold text-lodha-black mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm font-jost text-lodha-grey max-w-md mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
