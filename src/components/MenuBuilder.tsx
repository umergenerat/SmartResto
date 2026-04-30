import React, { useRef } from 'react';
import {
  Plus, Trash2, GripVertical, UploadCloud, ListPlus, Wand2,
  UtensilsCrossed, AlertCircle
} from 'lucide-react';
import { Meal, ScheduleMode, MealType, DayOfWeek, ReferenceIngredient, Ingredient } from '../types';
import { findMatchingReference, normalizeIngredientName } from '../App';
import * as xlsx from 'xlsx';

interface MenuBuilderProps {
  meals: Meal[];
  setMeals: (m: Meal[]) => void;
  mode: ScheduleMode;
  referenceIngredients: ReferenceIngredient[];
  isUploading: boolean;
  uploadMsg: string;
  aiError: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCalculate: () => void;
  draggingMealId: string | null;
  setDraggingMealId: (id: string | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'فطور صباحي', lunch: 'غداء', dinner: 'عشاء', suhoor: 'سحور', iftar: 'إفطار رمضان'
};
const daysLabels: Record<DayOfWeek, string> = {
  monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد'
};

const typeColors: Record<MealType, string> = {
  breakfast: '#f59e0b', lunch: '#34d399', dinner: '#60a5fa', suhoor: '#a78bfa', iftar: '#f87171'
};

export default function MenuBuilder({
  meals, setMeals, mode, referenceIngredients,
  isUploading, uploadMsg, aiError, fileInputRef, onFileUpload,
  onCalculate, draggingMealId, setDraggingMealId
}: MenuBuilderProps) {

  const menuFileRef = useRef<HTMLInputElement>(null);

  const getDayFromText = (t: string): DayOfWeek | undefined => {
    const s = String(t || '').trim().toLowerCase();
    if (s.includes('اثنين') || s.includes('إثنين')) return 'monday';
    if (s.includes('ثلاثاء')) return 'tuesday';
    if (s.includes('أربعاء') || s.includes('اربعاء')) return 'wednesday';
    if (s.includes('خميس')) return 'thursday';
    if (s.includes('جمعة')) return 'friday';
    if (s.includes('سبت')) return 'saturday';
    if (s.includes('أحد') || s.includes('احد')) return 'sunday';
  };

  const getMealTypeFromText = (t: string): MealType => {
    const s = String(t || '').trim().toLowerCase();
    if (s.includes('سحور')) return 'suhoor';
    if (s.includes('إفطار') || s.includes('افطار')) return 'iftar';
    if (s.includes('عشاء')) return 'dinner';
    if (s.includes('غداء') || s.includes('غذا')) return 'lunch';
    if (s.includes('فطور') || s.includes('صباح')) return mode === 'ramadan' ? 'iftar' : 'breakfast';
    return mode === 'ramadan' ? 'iftar' : 'lunch';
  };

  const handleMenuExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = xlsx.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = xlsx.utils.sheet_to_json(ws, { header: 1 });
      const map = new Map<string, Meal>();
      json.forEach((row: any) => {
        if (!Array.isArray(row) || row.length < 3) return;
        const ingName = String(row[2]).trim();
        if (!ingName || ingName === 'المادة' || ingName === 'المكون') return;
        const day = getDayFromText(row[0]) || 'monday';
        const type = getMealTypeFromText(row[1]);
        const key = `${day}-${type}`;
        if (!map.has(key)) map.set(key, {
          id: generateId(), day, type,
          name: `${mealTypeLabels[type]} - ${daysLabels[day]}`, ingredients: []
        });
        let qty = row[3] ? parseFloat(row[3]) : 0;
        let unit = row[4] ? String(row[4]).trim() : '';
        if (!qty || !unit) {
          const ref = findMatchingReference(referenceIngredients, ingName);
          if (ref) { if (!qty) qty = ref.quantityPerPerson; if (!unit) unit = ref.unit; }
        }
        map.get(key)!.ingredients.push({ id: generateId(), name: ingName, quantityPerPerson: qty, unit });
      });
      const added = Array.from(map.values());
      if (added.length) { setMeals([...meals, ...added]); alert('تم الاستيراد بنجاح!'); }
      else alert('لم يتم العثور على بيانات صالحة.');
      if (menuFileRef.current) menuFileRef.current.value = '';
    } catch { alert('خطأ في قراءة الملف'); }
  };

  const addMeal = () => {
    setMeals([...meals, {
      id: generateId(), day: 'monday',
      name: 'وجبة جديدة', type: mode === 'normal' ? 'lunch' : 'iftar', ingredients: []
    }]);
  };

  const removeMeal = (id: string) => setMeals(meals.filter(m => m.id !== id));

  const addIngredient = (mealId: string) =>
    setMeals(meals.map(m => m.id === mealId ? { ...m, ingredients: [...m.ingredients, { id: generateId(), name: '', quantityPerPerson: 0, unit: '' }] } : m));

  const removeIngredient = (mealId: string, ingId: string) =>
    setMeals(meals.map(m => m.id === mealId ? { ...m, ingredients: m.ingredients.filter(i => i.id !== ingId) } : m));

  const updateIngredient = (mealId: string, ingId: string, field: keyof Ingredient, value: string | number) =>
    setMeals(meals.map(m => {
      if (m.id !== mealId) return m;
      return {
        ...m, ingredients: m.ingredients.map(ing => {
          if (ing.id !== ingId) return ing;
          const base = { ...ing, [field]: value };
          if (field === 'name') {
            const ref = findMatchingReference(referenceIngredients, normalizeIngredientName(String(value)));
            if (ref) {
              if (!Number(ing.quantityPerPerson)) base.quantityPerPerson = ref.quantityPerPerson;
              if (!ing.unit?.trim()) base.unit = ref.unit;
            }
          }
          return base;
        })
      };
    }));

  const updateMeal = (id: string, field: keyof Meal, value: any) =>
    setMeals(meals.map(m => m.id === id ? { ...m, [field]: value } : m));

  const autoFill = () => {
    let count = 0;
    const updated = meals.map(m => ({
      ...m, ingredients: m.ingredients.map(ing => {
        const qty = Number(ing.quantityPerPerson);
        const isQtyEmpty = !qty || isNaN(qty) || qty === 0;
        const isUnitEmpty = !ing.unit?.trim();
        if (isQtyEmpty || isUnitEmpty) {
          const ref = findMatchingReference(referenceIngredients, ing.name);
          if (ref) {
            count++;
            return { ...ing, quantityPerPerson: isQtyEmpty ? ref.quantityPerPerson : ing.quantityPerPerson, unit: isUnitEmpty ? ref.unit : ing.unit };
          }
        }
        return ing;
      })
    }));
    if (count > 0) { setMeals(updated); alert(`تم تعبئة ${count} كمية تلقائياً`); }
    else alert('لا توجد كميات فارغة مطابقة');
  };

  const onDragStart = (e: React.DragEvent, id: string) => { setDraggingMealId(id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingMealId || draggingMealId === targetId) return;
    const di = meals.findIndex(m => m.id === draggingMealId);
    const ti = meals.findIndex(m => m.id === targetId);
    if (di === -1 || ti === -1) return;
    const arr = [...meals];
    const [moved] = arr.splice(di, 1);
    arr.splice(ti, 0, moved);
    setMeals(arr);
    setDraggingMealId(null);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="section-title">قائمة الوجبات والمقادير</h2>
          <p className="section-subtitle">استخدم AI لاستخراج المكونات أو أضفها يدوياً</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={autoFill} className="btn-ghost text-xs py-2 px-3">
            <Wand2 className="w-3.5 h-3.5" /> تعبئة تلقائية
          </button>
          <input type="file" ref={menuFileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleMenuExcel} />
          <button onClick={() => menuFileRef.current?.click()} className="btn-ghost text-xs py-2 px-3">
            <ListPlus className="w-3.5 h-3.5" /> Excel
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain,.xlsx,.xls,.csv" onChange={onFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="btn-ghost text-xs py-2 px-3">
            <UploadCloud className="w-3.5 h-3.5" /> {isUploading ? 'جاري...' : 'AI رفع'}
          </button>
          <button onClick={addMeal} className="btn-primary text-xs py-2 px-3">
            <Plus className="w-3.5 h-3.5" /> وجبة جديدة
          </button>
        </div>
      </div>

      {/* AI status */}
      {uploadMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm text-blue-300">{uploadMsg}</span>
        </div>
      )}
      {aiError && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{aiError}</span>
        </div>
      )}

      {/* Empty */}
      {meals.length === 0 && !isUploading && (
        <div className="glass-card p-12 text-center">
          <UtensilsCrossed className="w-14 h-14 mx-auto mb-4 text-emerald-500 opacity-30" />
          <h3 className="text-lg font-bold text-slate-200 mb-2">لا توجد وجبات مبرمجة</h3>
          <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.5)' }}>
            أضف وجبة يدوياً أو ارفع ملفاً لاستخراج البيانات تلقائياً
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
            <UploadCloud className="w-4 h-4" /> رفع ملف (AI)
          </button>
        </div>
      )}

      {/* Meals list */}
      <div className="space-y-4">
        {meals.map(meal => (
          <div
            key={meal.id} draggable
            onDragStart={e => onDragStart(e, meal.id)}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, meal.id)}
            onDragEnd={() => setDraggingMealId(null)}
            className={`meal-card ${draggingMealId === meal.id ? 'dragging' : ''}`}
          >
            {/* Meal header */}
            <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3"
                 style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex flex-1 items-center gap-3 flex-wrap">
                <GripVertical className="w-4 h-4 text-slate-600 cursor-move hidden md:block" />
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
              <button onClick={() => removeMeal(meal.id)} className="btn-danger">
                <Trash2 className="w-4 h-4" />
              </button>
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
        ))}
      </div>

      {/* Datalists */}
      <datalist id="ref-list">
        {referenceIngredients.map(r => <option key={r.id} value={r.name}>{r.nameFr ? `${r.nameFr} - ` : ''}{r.quantityPerPerson} {r.unit}</option>)}
      </datalist>
      <datalist id="units-list">
        {['غ', 'كغ', 'مل', 'لتر', 'حبة', 'وحدة'].map(u => <option key={u} value={u} />)}
      </datalist>

      {meals.length > 0 && (
        <div className="flex justify-end pb-8">
          <button onClick={onCalculate} className="btn-primary px-8 py-3 text-base">
            حساب وإظهار النتائج
          </button>
        </div>
      )}
    </div>
  );
}
