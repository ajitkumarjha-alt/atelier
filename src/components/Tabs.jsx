/**
 * Tabs — Shared tab navigation component.
 * Replaces 5+ different inline tabs implementations.
 *
 * Usage:
 *   <Tabs
 *     tabs={[
 *       { key: 'all', label: 'All', count: 42 },
 *       { key: 'active', label: 'Active', count: 12 },
 *       { key: 'completed', label: 'Completed' },
 *     ]}
 *     active="all"
 *     onChange={(key) => setActiveTab(key)}
 *     variant="pills"   // 'pills' | 'underline' | 'segment'
 *     size="md"          // 'sm' | 'md'
 *   />
 */

const VARIANT_STYLES = {
  pills: {
    container: 'flex flex-wrap gap-2',
    tab: (active) =>
      active
        ? 'bg-lodha-gold text-white shadow-sm'
        : 'bg-white text-lodha-grey hover:bg-lodha-sand border border-lodha-steel/30',
    base: 'rounded-full font-jost font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-lodha-gold/30',
  },
  underline: {
    container: 'flex border-b border-lodha-steel/20 gap-0',
    tab: (active) =>
      active
        ? 'text-lodha-gold border-b-2 border-lodha-gold -mb-px'
        : 'text-lodha-grey hover:text-lodha-black border-b-2 border-transparent -mb-px',
    base: 'font-jost font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-lodha-gold/30 focus:ring-inset',
  },
  segment: {
    container: 'inline-flex bg-lodha-sand rounded-lg p-1 gap-1',
    tab: (active) =>
      active
        ? 'bg-white text-lodha-black shadow-sm'
        : 'text-lodha-grey hover:text-lodha-black',
    base: 'rounded-md font-jost font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-lodha-gold/30',
  },
};

const SIZE_MAP = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Tabs({
  tabs = [],
  active,
  onChange,
  variant = 'pills',
  size = 'md',
  className = '',
}) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.pills;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={`${style.container} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.key}`}
            onClick={() => onChange?.(tab.key)}
            className={`${style.base} ${style.tab(isActive)} ${sizeClass}`}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`ml-1.5 text-[10px] font-bold ${
                isActive ? 'opacity-80' : 'opacity-60'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
