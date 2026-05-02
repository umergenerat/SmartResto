import React from 'react';
import { GripVertical, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Meal, DayOfWeek, MealType, ReferenceIngredient, Ingredient } from '../types';
import { findMatchingReference } from '../App';

interface MealCardProps {
  meal: Meal;
  referenceIngredients: ReferenceIngredient[];
  draggingMealId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  updateMeal: (id: string, field: keyof Meal, value: any) => void;
  moveMealUp: () => void;
  moveMealDown: () => void;
  duplicateMeal: (id: string) => void;
  removeMeal: (id: string) => void;
  updateIngredient: (mealId: string, ingId: string, field: keyof Ingredient, value: string | number) => void;
  removeIngredient: (mealId: string, ingId: string) => void;
  addIngredient: (mealId: string) => void;
  daysLabels: Record<DayOfWeek, string>;
  mealTypeLabels: Record<MealType, string>;
  typeColors: Record<MealType, string>;
}

const MealCard: React.FC<MealCardProps> = ({
  meal,
  referenceIngredients,
  draggingMealId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  updateMeal,
  moveMealUp,
  moveMealDown,
  duplicateMeal,
  removeMeal,
  updateIngredient,
  removeIngredient,
  addIngredient,
  daysLabels,
  mealTypeLabels,
  typeColors
}) => {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, meal.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, meal.id)}
      onDragEnd={onDragEnd}
      className={`meal-card ${draggingMealId === meal.id ? 'dragging' : ''}`}
    >
      {/* Meal header */}
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3"
           style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          <div className="cursor-move p-1 -ml-2 rounded hover:bg-white/5" title="اسحب للترتيب">
            <GripVertical className="w-4 h-4 text-slate-500" />
          </div>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColors[meal.type] }} />
          <input
            type="text" value={meal.name}
            onChange={e => updateMeal(meal.id, 'name', e.target.value)}
            className="font-bold text-slate-200 bg-transparent border-b border-transparent hover:border-slate-600 focus:border-emerald-500 outline-none text-sm"
            placeholder="اسم الوجبة"
          />
          <select value={meal.day || 'monday'} onChange={e => updateMeal(meal.id, 'day', e.target.value as DayOfWeek)}
            className="smart-select text-xs py-1.5 px-2">
            {Object.entries(daysLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={meal.type} onChange={e => updateMeal(meal.id, 'type', e.target.value as MealType)}
            className="smart-select text-xs py-1.5 px-2">
            {Object.entries(mealTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex flex-col gap-0.5 ml-2 border-l border-white/10 pl-3">
            <button onClick={moveMealUp} className="text-slate-500 hover:text-emerald-400 p-0.5 rounded transition-colors" title="تحريك لأعلى">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button onClick={moveMealDown} className="text-slate-500 hover:text-emerald-400 p-0.5 rounded transition-colors" title="تحريك لأسفل">
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => duplicateMeal(meal.id)} className="btn-ghost hover:bg-blue-500/10 text-blue-400 p-1.5 rounded-lg transition-colors" title="نسخ الوجبة">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <button onClick={() => removeMeal(meal.id)} className="btn-danger p-1.5" title="حذف الوجبة">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ingredients */}
      <div className="p-5">
        {meal.ingredients.length > 0 ? (
          <div className="space-y-2 mb-4">
            {meal.ingredients.map(ing => (
              <div key={ing.id} className="ingredient-row">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(148,163,184,0.6)' }}>المادة</label>
                  <input type="text" value={ing.name} list="ref-list"
                    onChange={e => updateIngredient(meal.id, ing.id, 'name', e.target.value)}
                    placeholder="اسم المادة الغذائية" className="smart-input text-sm" />
                </div>
                <div className="w-28">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(148,163,184,0.6)' }}>الكمية/فرد</label>
                  <input type="number" min="0" step="0.01" value={ing.quantityPerPerson || ''}
                    onChange={e => updateIngredient(meal.id, ing.id, 'quantityPerPerson', Number(e.target.value))}
                    placeholder={findMatchingReference(referenceIngredients, ing.name)?.quantityPerPerson?.toString() || '0'}
                    className="smart-input text-sm text-center" />
                </div>
                <div className="w-20">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(148,163,184,0.6)' }}>الوحدة</label>
                  <input type="text" list="units-list" value={ing.unit}
                    onChange={e => updateIngredient(meal.id, ing.id, 'unit', e.target.value)}
                    placeholder={findMatchingReference(referenceIngredients, ing.name)?.unit || 'غ'}
                    className="smart-input text-sm text-center" />
                </div>
                <div className="pt-5">
                  <button onClick={() => removeIngredient(meal.id, ing.id)} className="btn-danger">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-3 mb-3" style={{ color: 'rgba(148,163,184,0.35)' }}>لا توجد مواد</p>
        )}
        <button onClick={() => addIngredient(meal.id)}
          className="text-emerald-400 text-sm font-medium flex items-center gap-1 hover:text-emerald-300 transition-colors">
          <Plus className="w-4 h-4" /> إضافة مادة غذائية
        </button>
      </div>
    </div>
  );
};

export default MealCard;
