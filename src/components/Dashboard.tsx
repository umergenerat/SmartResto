import React from 'react';
import { UtensilsCrossed, Users, ShoppingBasket, CalendarDays, Zap, TrendingUp } from 'lucide-react';
import { Meal, Beneficiaries, ScheduleMode, TotalsResult } from '../types';

interface DashboardProps {
  meals: Meal[];
  beneficiaries: Beneficiaries;
  mode: ScheduleMode;
  results: TotalsResult[];
  onGoToMenu: () => void;
  onGoToResults: () => void;
  onGoToConfig: () => void;
}

export default function Dashboard({ meals, beneficiaries, mode, results, onGoToMenu, onGoToResults, onGoToConfig }: DashboardProps) {
  const totalBeneficiaries = beneficiaries.fullBoard + beneficiaries.halfBoard;
  const totalIngredients = results.length;
  const mealsByType: Record<string, number> = {};
  meals.forEach(m => { mealsByType[m.type] = (mealsByType[m.type] || 0) + 1; });

  const typeLabels: Record<string, string> = {
    breakfast: 'فطور', lunch: 'غداء', dinner: 'عشاء', suhoor: 'سحور', iftar: 'إفطار'
  };

  const stats = [
    {
      label: 'إجمالي المستفيدين',
      value: totalBeneficiaries,
      sub: `${beneficiaries.fullBoard} منحة كاملة • ${beneficiaries.halfBoard} نصف منحة`,
      icon: Users,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
      onClick: onGoToConfig,
    },
    {
      label: 'الوجبات المبرمجة',
      value: meals.length,
      sub: mode === 'normal' ? 'نمط عادي' : 'نمط رمضان',
      icon: UtensilsCrossed,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.1)',
      onClick: onGoToMenu,
    },
    {
      label: 'أصناف المواد الغذائية',
      value: totalIngredients,
      sub: 'مادة في قائمة الاحتياجات',
      icon: ShoppingBasket,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      onClick: onGoToResults,
    },
    {
      label: 'أيام الأسبوع',
      value: new Set(meals.map(m => m.day)).size,
      sub: 'أيام مبرمجة في القائمة',
      icon: CalendarDays,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
      onClick: onGoToMenu,
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h2 className="section-title gradient-text">لوحة التحكم</h2>
        <p className="section-subtitle">نظرة شاملة على منظومة الإطعام الجماعي</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="stat-card text-right w-full cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                   style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <TrendingUp className="w-4 h-4 opacity-30 group-hover:opacity-60 transition-opacity" style={{ color }} />
            </div>
            <div className="text-3xl font-black mb-1" style={{ color }}>{value}</div>
            <div className="text-sm font-semibold text-slate-300 mb-1">{label}</div>
            <div className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Meals distribution */}
      {meals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By type */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              توزيع الوجبات حسب النوع
            </h3>
            <div className="space-y-3">
              {Object.entries(mealsByType).map(([type, count]) => {
                const pct = Math.round((count / meals.length) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{typeLabels[type] || type}</span>
                      <span className="text-emerald-400 font-bold">{count} وجبة</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #059669, #34d399)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top ingredients */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <ShoppingBasket className="w-4 h-4 text-amber-400" />
              أعلى المواد كمية
            </h3>
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.slice(0, 5).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="text-xs font-mono w-5 text-center" style={{ color: 'rgba(148,163,184,0.5)' }}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 truncate">{r.name}</span>
                        <span className="text-amber-400 font-bold font-mono shrink-0">
                          {Number.isInteger(r.totalQuantity) ? r.totalQuantity : r.totalQuantity.toFixed(1)} {r.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: 'rgba(148,163,184,0.5)' }}>
                أضف وجبات لتظهر الإحصاءات
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ background: 'rgba(16,185,129,0.1)' }}>
            <UtensilsCrossed className="w-10 h-10 text-emerald-500 opacity-60" />
          </div>
          <h3 className="text-xl font-bold text-slate-200 mb-2">ابدأ ببرمجة قوائم الوجبات</h3>
          <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.6)' }}>
            قم بإعداد المستفيدين ثم برمجة الوجبات للحصول على حسابات دقيقة
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={onGoToConfig} className="btn-primary">
              <Users className="w-4 h-4" /> إعداد المستفيدين
            </button>
            <button onClick={onGoToMenu} className="btn-ghost">
              <CalendarDays className="w-4 h-4" /> إدارة القوائم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
