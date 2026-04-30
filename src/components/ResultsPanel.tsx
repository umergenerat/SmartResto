import React, { useState, useMemo } from 'react';
import { Printer, ShoppingBasket, CheckCircle2, Download, LayoutList, TableProperties, X } from 'lucide-react';
import { Beneficiaries, ScheduleMode, TotalsResult, DetailedResult, DayOfWeek, MealType } from '../types';
import * as xlsx from 'xlsx';

interface ResultsPanelProps {
  results: TotalsResult[];
  detailedResults: DetailedResult[];
  beneficiaries: Beneficiaries;
  mode: ScheduleMode;
  filterDay: DayOfWeek | 'all';
  setFilterDay: (d: DayOfWeek | 'all') => void;
  filterMealType: MealType | 'all';
  setFilterMealType: (t: MealType | 'all') => void;
}

const daysLabels: Record<DayOfWeek, string> = {
  monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد',
};
const daysOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'فطور', lunch: 'غداء', dinner: 'عشاء', suhoor: 'سحور', iftar: 'إفطار',
};
const mealTypeColors: Record<MealType, string> = {
  breakfast: '#f59e0b', lunch: '#34d399', dinner: '#60a5fa', suhoor: '#a78bfa', iftar: '#f87171',
};

type ViewMode = 'detailed' | 'summary';

export default function ResultsPanel({
  results, detailedResults, beneficiaries, mode,
  filterDay, setFilterDay, filterMealType, setFilterMealType,
}: ResultsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [search, setSearch] = useState('');

  // ── Filtered detailed rows ────────────────────────────────────────────────
  const filteredDetailed = useMemo(() =>
    detailedResults.filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.ingredientName.includes(search) ||
        (r.ingredientNameFr && r.ingredientNameFr.toLowerCase().includes(q)) ||
        r.mealName.includes(search)
      );
    }),
    [detailedResults, search]
  );

  // ── Filtered summary rows ─────────────────────────────────────────────────
  const filteredSummary = useMemo(() =>
    results.filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.name.includes(search) || (r.nameFr && r.nameFr.toLowerCase().includes(q));
    }),
    [results, search]
  );

  // ── Group detailed rows by Day → MealType ────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, { day: DayOfWeek; mealType: MealType; mealName: string; peopleCount: number; rows: DetailedResult[] }>();
    filteredDetailed.forEach(r => {
      const key = `${r.day}__${r.mealType}__${r.mealId}`;
      if (!map.has(key)) map.set(key, { day: r.day, mealType: r.mealType, mealName: r.mealName, peopleCount: r.peopleCount, rows: [] });
      map.get(key)!.rows.push(r);
    });
    return [...map.entries()]
      .sort(([, a], [, b]) => {
        const di = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
        if (di !== 0) return di;
        return a.mealName.localeCompare(b.mealName);
      })
      .map(([, v]) => v);
  }, [filteredDetailed]);

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportDetailedExcel = () => {
    const rows = filteredDetailed.map((r, i) => ({
      '#': i + 1,
      'اليوم': daysLabels[r.day],
      'الوجبة': r.mealName,
      'نوع الوجبة': mealTypeLabels[r.mealType],
      'المادة الغذائية': r.ingredientName,
      'Ingrédient': r.ingredientNameFr || '',
      'الكمية / فرد': r.quantityPerPerson,
      'الوحدة': r.unit,
      'عدد المستفيدين': r.peopleCount,
      'الكمية الإجمالية': r.totalQuantity,
    }));
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'التفاصيل');
    xlsx.writeFile(wb, 'قائمة_الاحتياجات_المفصلة.xlsx');
  };

  const exportSummaryExcel = () => {
    const rows = filteredSummary.map((r, i) => ({
      '#': i + 1,
      'المادة': r.name,
      'Ingrédient': r.nameFr || '',
      'الكمية الإجمالية': r.totalQuantity,
      'الوحدة': r.unit,
      'تدخل في': r.mealsUsing.join('، '),
    }));
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'الإجمالي');
    xlsx.writeFile(wb, 'قائمة_الاحتياجات_المجملة.xlsx');
  };

  const totalRows = viewMode === 'detailed' ? filteredDetailed.length : filteredSummary.length;
  const grandTotal = filteredDetailed.reduce((s, r) => s + r.totalQuantity, 0);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-title">قائمة الاحتياجات الغذائية</h2>
          <p className="section-subtitle">
            {viewMode === 'detailed'
              ? 'مفصّلة حسب كل وجبة ويوم — الكمية/فرد × عدد المستفيدين'
              : 'مجملة — إجمالي كل مادة عبر جميع الوجبات'}
          </p>
        </div>
        <div className="flex gap-2 no-print flex-wrap">
          <button
            onClick={() => viewMode === 'detailed' ? exportDetailedExcel() : exportSummaryExcel()}
            className="btn-ghost text-xs py-2 px-3"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button onClick={() => window.print()} className="btn-ghost text-xs py-2 px-3">
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </button>
        </div>
      </div>

      {/* ── View toggle + Stats ── */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Toggle buttons */}
        <div className="flex rounded-xl overflow-hidden border no-print"
             style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setViewMode('detailed')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: viewMode === 'detailed' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
              color: viewMode === 'detailed' ? '#34d399' : '#94a3b8',
            }}
          >
            <LayoutList className="w-4 h-4" /> مفصّلة
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: viewMode === 'summary' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
              color: viewMode === 'summary' ? '#34d399' : '#94a3b8',
            }}
          >
            <TableProperties className="w-4 h-4" /> مجملة
          </button>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 flex-wrap">
          <div className="stat-card py-2 px-4 text-center">
            <span className="text-emerald-400 font-black text-lg">{beneficiaries.fullBoard}</span>
            <span className="text-xs text-slate-400 mr-1">منحة كاملة</span>
          </div>
          <div className="stat-card py-2 px-4 text-center">
            <span className="text-blue-400 font-black text-lg">{beneficiaries.halfBoard}</span>
            <span className="text-xs text-slate-400 mr-1">نصف منحة</span>
          </div>
          <div className="stat-card py-2 px-4 text-center">
            <span className="text-amber-400 font-black text-lg">{totalRows}</span>
            <span className="text-xs text-slate-400 mr-1">سطر</span>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center no-print">
        {/* Search */}
        <div className="flex-1 min-w-[180px] relative">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم..." className="smart-input text-sm py-2 pl-8"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Day filter */}
        <select value={filterDay} onChange={e => setFilterDay(e.target.value as DayOfWeek | 'all')}
          className="smart-select text-sm py-2">
          <option value="all">كل الأيام</option>
          {Object.entries(daysLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {/* Meal type filter */}
        <select value={filterMealType} onChange={e => setFilterMealType(e.target.value as MealType | 'all')}
          className="smart-select text-sm py-2">
          <option value="all">كل الوجبات</option>
          {Object.entries(mealTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DETAILED VIEW — grouped by Day / Meal
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'detailed' && (
        <div className="space-y-5">
          {grouped.length === 0 ? (
            <EmptyState hasData={detailedResults.length > 0} />
          ) : (
            grouped.map(group => {
              const groupTotal = group.rows.reduce((s, r) => s + r.totalQuantity, 0);
              return (
                <div key={`${group.day}-${group.mealType}-${group.mealName}`} className="glass-card overflow-hidden">
                  {/* Group header */}
                  <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                       style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 rounded-full" style={{ background: mealTypeColors[group.mealType] }} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 text-sm">{group.mealName}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: `${mealTypeColors[group.mealType]}20`, color: mealTypeColors[group.mealType] }}>
                            {mealTypeLabels[group.mealType]}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                            {daysLabels[group.day]}
                          </span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
                          عدد المستفيدين:
                          <span className="font-bold mr-1" style={{ color: '#34d399' }}>{group.peopleCount}</span>
                          {' '}شخص
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold" style={{ color: 'rgba(148,163,184,0.5)' }}>
                      {group.rows.length} مادة
                    </div>
                  </div>

                  {/* Ingredients table */}
                  <div className="overflow-x-auto">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th className="w-8 text-center">#</th>
                          <th>المادة الغذائية</th>
                          <th className="text-center">الكمية/فرد</th>
                          <th className="text-center">×</th>
                          <th className="text-center">عدد الأفراد</th>
                          <th className="text-center">=</th>
                          <th className="text-center">الكمية الإجمالية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((r, i) => (
                          <tr key={`${r.mealId}-${r.ingredientName}-${i}`}>
                            <td className="text-center text-xs font-mono"
                                style={{ color: 'rgba(148,163,184,0.35)' }}>{i + 1}</td>
                            <td>
                              <div className="font-semibold text-slate-200 text-sm">{r.ingredientName}</div>
                              {r.ingredientNameFr && (
                                <div className="text-xs mt-0.5" dir="ltr" style={{ color: 'rgba(148,163,184,0.5)' }}>
                                  {r.ingredientNameFr}
                                </div>
                              )}
                            </td>
                            <td className="text-center">
                              <span className="font-mono text-sm font-semibold text-slate-200">
                                {r.quantityPerPerson > 0
                                  ? (Number.isInteger(r.quantityPerPerson) ? r.quantityPerPerson : r.quantityPerPerson.toFixed(2))
                                  : <span style={{ color: 'rgba(239,68,68,0.7)' }}>—</span>
                                }
                                {r.quantityPerPerson > 0 && (
                                  <span className="text-xs font-normal mr-1" style={{ color: 'rgba(148,163,184,0.5)' }}>
                                    {r.unit}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="text-center text-slate-500 font-bold">×</td>
                            <td className="text-center">
                              <span className="font-mono text-sm font-semibold" style={{ color: '#60a5fa' }}>
                                {r.peopleCount}
                              </span>
                            </td>
                            <td className="text-center text-slate-500 font-bold">=</td>
                            <td className="text-center">
                              <span className="badge-emerald font-mono text-sm">
                                {r.totalQuantity > 0
                                  ? (Number.isInteger(r.totalQuantity) ? r.totalQuantity : r.totalQuantity.toFixed(2))
                                  : '—'
                                }
                                {r.totalQuantity > 0 && (
                                  <span className="mr-1" style={{ opacity: 0.7 }}>{r.unit}</span>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SUMMARY VIEW — aggregated by ingredient
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'summary' && (
        <div className="glass-card overflow-hidden">
          {filteredSummary.length === 0 ? (
            <EmptyState hasData={results.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <table className="results-table">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>المادة الغذائية</th>
                    <th className="text-center">الكمية الإجمالية</th>
                    <th className="hidden md:table-cell">تدخل في</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((r, i) => (
                    <tr key={`${r.name}-${r.unit}`}>
                      <td className="text-center font-mono text-xs" style={{ color: 'rgba(148,163,184,0.35)' }}>{i + 1}</td>
                      <td>
                        <div className="font-semibold text-slate-200 text-sm">{r.name}</div>
                        {r.nameFr && <div className="text-xs mt-0.5" dir="ltr" style={{ color: 'rgba(148,163,184,0.5)' }}>{r.nameFr}</div>}
                      </td>
                      <td className="text-center">
                        <span className="badge-emerald font-mono text-sm">
                          {Number.isInteger(r.totalQuantity) ? r.totalQuantity : r.totalQuantity.toFixed(2)}
                          <span className="mr-1" style={{ opacity: 0.7 }}>{r.unit}</span>
                        </span>
                      </td>
                      <td className="hidden md:table-cell text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        {r.mealsUsing.join('، ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state helper ─────────────────────────────────────────────────────
function EmptyState({ hasData }: { hasData: boolean }) {
  return (
    <div className="p-16 text-center">
      {!hasData ? (
        <>
          <ShoppingBasket className="w-12 h-12 mx-auto mb-4 text-emerald-500 opacity-20" />
          <p className="text-slate-400 text-sm">لم يتم برمجة وجبات بعد. أضف وجبات في تبويب «إدارة القوائم».</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-30" />
          <p className="text-slate-400 text-sm">لا نتائج تطابق الفلتر أو كلمة البحث</p>
        </>
      )}
    </div>
  );
}
