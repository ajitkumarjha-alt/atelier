import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Building2, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiFetchJson } from '../lib/api';
import toast from 'react-hot-toast';

// Color palette for buildings
const BUILDING_COLORS = [
  { planned: 'bg-blue-400', actual: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
  { planned: 'bg-emerald-400', actual: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
  { planned: 'bg-amber-400', actual: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' },
  { planned: 'bg-purple-400', actual: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
  { planned: 'bg-rose-400', actual: 'bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200' },
  { planned: 'bg-teal-400', actual: 'bg-teal-600', text: 'text-teal-600', light: 'bg-teal-50', border: 'border-teal-200' },
  { planned: 'bg-orange-400', actual: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
  { planned: 'bg-cyan-400', actual: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200' },
  { planned: 'bg-violet-400', actual: 'bg-violet-600', text: 'text-violet-600', light: 'bg-violet-50', border: 'border-violet-200' },
  { planned: 'bg-pink-400', actual: 'bg-pink-600', text: 'text-pink-600', light: 'bg-pink-50', border: 'border-pink-200' },
];

export default function DDSProgressChart({ ddsId }) {
  const [chartData, setChartData] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [buildingNames, setBuildingNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [showMonthly, setShowMonthly] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!ddsId) return;
    try {
      setLoading(true);
      const data = await apiFetchJson(`/api/dds/${ddsId}/progress-chart`);
      setChartData(data.months || []);
      setBuildings(data.buildings || []);
      setBuildingNames(data.buildingNames || []);
    } catch (err) {
      toast.error('Failed to load progress chart');
    } finally {
      setLoading(false);
    }
  }, [ddsId]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-lodha-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-lodha-steel rounded-xl p-12 text-center">
        <div className="w-14 h-14 bg-lodha-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-lodha-gold" />
        </div>
        <h3 className="text-lg font-garamond font-bold text-lodha-grey mb-2">No Progress Data</h3>
        <p className="text-sm text-lodha-grey/60 font-jost">
          Progress chart will show once DDS items have scheduled dates.
        </p>
      </div>
    );
  }

  const visibleBuildings = selectedBuilding === 'all'
    ? buildingNames
    : [selectedBuilding];

  // Calculate overall progress
  const totalItems = buildings.reduce((sum, b) => sum + b.total, 0);
  const completedItems = buildings.reduce((sum, b) => sum + b.completed, 0);
  const overdueItems = buildings.reduce((sum, b) => sum + b.overdue, 0);
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-lodha-steel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lodha-gold/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-lodha-gold" />
            </div>
            <div>
              <p className="text-2xl font-garamond font-bold text-lodha-grey">{overallPct}%</p>
              <p className="text-xs text-lodha-grey/60 font-jost">Overall Progress</p>
            </div>
          </div>
          <div className="mt-2 h-2 bg-lodha-steel/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-lodha-gold to-lodha-muted-gold rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }} />
          </div>
        </div>
        <div className="bg-white border border-lodha-steel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-garamond font-bold text-lodha-grey">{completedItems}</p>
              <p className="text-xs text-lodha-grey/60 font-jost">Completed / {totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-lodha-steel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-garamond font-bold text-red-600">{overdueItems}</p>
              <p className="text-xs text-lodha-grey/60 font-jost">Overdue Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-lodha-steel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-garamond font-bold text-lodha-grey">{buildingNames.length}</p>
              <p className="text-xs text-lodha-grey/60 font-jost">Buildings/Towers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Building Progress Summary */}
      <div className="bg-white border border-lodha-steel rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-garamond text-lg font-bold text-lodha-grey flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-lodha-gold" /> Building-wise Progress
          </h3>
          <select
            value={selectedBuilding}
            onChange={e => setSelectedBuilding(e.target.value)}
            className="px-3 py-1.5 bg-lodha-sand border border-lodha-steel rounded-lg text-xs font-jost focus:outline-none focus:ring-2 focus:ring-lodha-gold/30"
          >
            <option value="all">All Buildings</option>
            {buildingNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {buildings.filter(b => selectedBuilding === 'all' || b.name === selectedBuilding).map((b, i) => {
            const colorSet = BUILDING_COLORS[i % BUILDING_COLORS.length];
            const pct = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
            return (
              <div key={b.name} className={`border rounded-xl p-4 ${colorSet.light} ${colorSet.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className={`w-4 h-4 ${colorSet.text}`} />
                  <span className={`font-jost font-semibold text-sm ${colorSet.text}`}>{b.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="text-lg font-garamond font-bold text-lodha-grey">{b.total}</p>
                    <p className="text-xs text-lodha-grey/50 font-jost">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-garamond font-bold text-emerald-600">{b.completed}</p>
                    <p className="text-xs text-lodha-grey/50 font-jost">Done</p>
                  </div>
                  <div>
                    <p className="text-lg font-garamond font-bold text-red-600">{b.overdue}</p>
                    <p className="text-xs text-lodha-grey/50 font-jost">Overdue</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full ${colorSet.actual} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-jost font-bold ${colorSet.text}`}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Progress Chart (visual bar chart) */}
      <div className="bg-white border border-lodha-steel rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-garamond text-lg font-bold text-lodha-grey flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-lodha-gold" /> Monthly Progress Chart
          </h3>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-jost">
              {visibleBuildings.slice(0, 4).map((name, i) => {
                const colorSet = BUILDING_COLORS[buildingNames.indexOf(name) % BUILDING_COLORS.length];
                return (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${colorSet.planned}`} />
                    <span className="text-lodha-grey/60">P</span>
                    <div className={`w-3 h-3 rounded ${colorSet.actual}`} />
                    <span className="text-lodha-grey/60">A</span>
                    <span className="text-lodha-grey font-semibold">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Y-axis labels and grid */}
            <div className="flex">
              <div className="w-12 flex flex-col justify-between text-right pr-2 text-xs text-lodha-grey/50 font-jost" style={{ height: '200px' }}>
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="flex-1 relative" style={{ height: '200px' }}>
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(pct => (
                  <div key={pct} className="absolute w-full border-t border-lodha-steel/15"
                    style={{ bottom: `${pct}%` }} />
                ))}

                {/* Bars */}
                <div className="absolute inset-0 flex items-end gap-0.5">
                  {chartData.map((month, mIdx) => (
                    <div key={mIdx} className="flex-1 flex items-end justify-center gap-px h-full">
                      {visibleBuildings.map((name, bIdx) => {
                        const colorIdx = buildingNames.indexOf(name);
                        const colorSet = BUILDING_COLORS[colorIdx % BUILDING_COLORS.length];
                        const planned = month[`${name}_planned`] || 0;
                        const actual = month[`${name}_actual`] || 0;

                        return (
                          <div key={name} className="flex gap-px" style={{ minWidth: visibleBuildings.length > 3 ? '8px' : '16px' }}>
                            <div
                              className={`${colorSet.planned} rounded-t-sm transition-all duration-300 opacity-50`}
                              style={{ width: visibleBuildings.length > 3 ? '4px' : '7px', height: `${planned}%` }}
                              title={`${name} Planned: ${planned}%`}
                            />
                            <div
                              className={`${colorSet.actual} rounded-t-sm transition-all duration-300`}
                              style={{ width: visibleBuildings.length > 3 ? '4px' : '7px', height: `${actual}%` }}
                              title={`${name} Actual: ${actual}%`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex ml-12">
              {chartData.map((month, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-xs text-lodha-grey/50 font-jost" style={{ fontSize: chartData.length > 18 ? '8px' : '10px' }}>
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Data Table */}
      <div className="bg-white border border-lodha-steel rounded-xl overflow-hidden">
        <button
          onClick={() => setShowMonthly(!showMonthly)}
          className="w-full px-5 py-3 flex items-center justify-between bg-lodha-sand/50 border-b border-lodha-steel/20"
        >
          <h3 className="font-jost font-semibold text-sm text-lodha-grey flex items-center gap-2">
            <Clock className="w-4 h-4 text-lodha-gold" /> Monthly Data Table
          </h3>
          {showMonthly ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showMonthly && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-lodha-sand/30 border-b border-lodha-steel/20">
                  <th className="px-4 py-2 text-left font-jost font-semibold text-lodha-grey/70 text-xs sticky left-0 bg-lodha-sand/30">Month</th>
                  {visibleBuildings.map(name => (
                    <th key={name} colSpan="2" className="px-2 py-2 text-center font-jost font-semibold text-lodha-grey/70 text-xs border-l border-lodha-steel/10">{name}</th>
                  ))}
                </tr>
                <tr className="bg-lodha-sand/20 border-b border-lodha-steel/15">
                  <th className="px-4 py-1 text-left font-jost text-lodha-grey/50 text-xs sticky left-0 bg-lodha-sand/20"></th>
                  {visibleBuildings.map(name => (
                    <th key={name} className="text-xs font-jost text-lodha-grey/50 border-l border-lodha-steel/10" colSpan="1">
                      <div className="flex">
                        <span className="flex-1 text-center px-1">Plan</span>
                        <span className="flex-1 text-center px-1 border-l border-lodha-steel/10">Act</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-lodha-steel/10">
                {chartData.map((month, i) => (
                  <tr key={i} className="hover:bg-lodha-sand/10">
                    <td className="px-4 py-1.5 text-xs font-jost text-lodha-grey font-medium sticky left-0 bg-white">{month.label}</td>
                    {visibleBuildings.map(name => {
                      const planned = month[`${name}_planned`] || 0;
                      const actual = month[`${name}_actual`] || 0;
                      const diff = actual - planned;
                      return (
                        <td key={name} className="px-0 py-1.5 text-xs font-jost border-l border-lodha-steel/10">
                          <div className="flex">
                            <span className="flex-1 text-center text-blue-600">{planned}%</span>
                            <span className={`flex-1 text-center border-l border-lodha-steel/10 ${
                              diff >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>{actual}%</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
