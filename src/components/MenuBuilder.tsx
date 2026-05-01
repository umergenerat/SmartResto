import React, { useRef, useState } from 'react';
import {
  Plus, Trash2, GripVertical, UploadCloud, ListPlus, Wand2,
  UtensilsCrossed, AlertCircle, Download, Calendar, Copy
} from 'lucide-react';
import { Meal, ScheduleMode, MealType, DayOfWeek, ReferenceIngredient, Ingredient } from '../types';
import { findMatchingReference, normalizeIngredientName } from '../App';
import * as xlsx from 'xlsx';
import MealCard from './MealCard';

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
  const [activeDay, setActiveDay] = useState<DayOfWeek | 'all'>('all');

  const validationIssues = React.useMemo(() => {
    let missingQty = 0;
    let missingUnit = 0;
    meals.forEach(m => {
      m.ingredients.forEach(ing => {
        const qty = Number(ing.quantityPerPerson);
        if (!qty || isNaN(qty) || qty <= 0) missingQty++;
        if (!ing.unit || !ing.unit.trim()) missingUnit++;
      });
    });
    return { missingQty, missingUnit, totalIssues: missingQty + missingUnit };
  }, [meals]);

  const getDayFromText = (t: string): DayOfWeek | undefined => {
    const s = normalizeIngredientName(t);
    const sf = String(t || '').trim().toLowerCase(); // for pure english/french checks
    if (s.includes('اثنين') || sf.includes('lundi')) return 'monday';
    if (s.includes('ثلاثا') || sf.includes('mardi')) return 'tuesday';
    if (s.includes('اربعا') || sf.includes('mercredi')) return 'wednesday';
    if (s.includes('خميس') || sf.includes('jeudi')) return 'thursday';
    if (s.includes('جمعه') || sf.includes('vendredi')) return 'friday';
    if (s.includes('سبت') || sf.includes('samedi')) return 'saturday';
    if (s.includes('احد') || sf.includes('dimanche')) return 'sunday';
  };

  const getMealTypeFromText = (t: string): MealType => {
    const s = normalizeIngredientName(t);
    const sf = String(t || '').trim().toLowerCase();
    if (s.includes('سحور') || sf.includes('shour') || sf.includes('suhoor')) return 'suhoor';
    if (s.includes('افطار') || sf.includes('iftar') || sf.includes('ftour')) return 'iftar';
    if (s.includes('عشا') || sf.includes('diner') || sf.includes('dîner')) return 'dinner';
    if (s.includes('غدا') || s.includes('غذا') || sf === 'dejeuner' || sf.includes('déjeuner') || sf.includes('dejeuner') && !sf.includes('petit')) return 'lunch';
    if (s.includes('فطور') || s.includes('صباح') || sf.includes('petit') || sf.includes('pdj') || sf.includes('matin')) return mode === 'ramadan' ? 'iftar' : 'breakfast';
    return mode === 'ramadan' ? 'iftar' : 'lunch';
  };

  const getMealTypeFromTextStrict = (t: string): MealType | undefined => {
    const s = normalizeIngredientName(t);
    const sf = String(t || '').trim().toLowerCase();
    if (s.includes('سحور') || sf.includes('shour') || sf.includes('suhoor')) return 'suhoor';
    if (s.includes('افطار') || sf.includes('iftar') || sf.includes('ftour')) return 'iftar';
    if (s.includes('عشا') || sf.includes('diner') || sf.includes('dîner')) return 'dinner';
    if (s.includes('غدا') || s.includes('غذا') || (sf.includes('dejeuner') && !sf.includes('petit')) || (sf.includes('déjeuner') && !sf.includes('petit'))) return 'lunch';
    if (s.includes('فطور') || s.includes('صباح') || sf.includes('petit') || sf.includes('pdj') || sf.includes('matin')) return mode === 'ramadan' ? 'iftar' : 'breakfast';
    return undefined;
  };

  const handleMenuExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = xlsx.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
      const map = new Map<string, Meal>();

      const addParsed = (d: DayOfWeek, m: MealType, rawText: string, qty: number = 0, unit: string = '') => {
        if (!rawText || typeof rawText !== 'string') return;
        const key = `${d}-${m}`;
        if (!map.has(key)) {
          map.set(key, {
            id: generateId(), day: d, type: m, name: `${mealTypeLabels[m]} - ${daysLabels[d]}`, ingredients: []
          });
        }
        // split multiple ingredients in the same cell
        const ingNames = rawText.split(/[,،+\-\n]| و /).map(s => s.trim()).filter(s => s.length > 0 && s !== '-' && s !== '/');
        ingNames.forEach(ingName => {
          map.get(key)!.ingredients.push({ id: generateId(), name: ingName, quantityPerPerson: qty, unit });
        });
      };

      const dayColMap: Record<number, DayOfWeek> = {};
      const mealColMap: Record<number, MealType> = {};
      let headerRowIdx = -1;

      // Step 1: Detect Headers (Look for a row with Days or Meals)
      for (let r = 0; r < json.length && r < 10; r++) {
        const row = json[r];
        if (!Array.isArray(row)) continue;
        let dCount = 0;
        let mCount = 0;
        row.forEach((cell, c) => {
          const s = String(cell || '').trim();
          if (getDayFromText(s)) dCount++;
          if (getMealTypeFromTextStrict(s)) mCount++;
        });

        if (dCount >= 3) {
          row.forEach((cell, c) => {
            const d = getDayFromText(String(cell));
            if (d) dayColMap[c] = d;
          });
          headerRowIdx = r;
          break;
        } else if (mCount >= 2) {
          row.forEach((cell, c) => {
            const m = getMealTypeFromTextStrict(String(cell));
            if (m) mealColMap[c] = m;
          });
          headerRowIdx = r;
          break;
        }
      }

      // Step 2: Extract data based on layout
      if (Object.keys(dayColMap).length >= 3) {
        // Layout A: Days on Top columns, Meals in rows
        let currentMeal: MealType = mode === 'ramadan' ? 'iftar' : 'lunch';
        for (let r = headerRowIdx + 1; r < json.length; r++) {
          const row = json[r];
          if (!Array.isArray(row)) continue;
          
          for (let c = 0; c < row.length; c++) {
            if (dayColMap[c]) continue;
            const m = getMealTypeFromTextStrict(String(row[c] || ''));
            if (m) { currentMeal = m; break; }
          }

          for (const [colIdxStr, d] of Object.entries(dayColMap)) {
            const c = parseInt(colIdxStr);
            const cell = String(row[c] || '').trim();
            if (cell && !getMealTypeFromTextStrict(cell) && !getDayFromText(cell)) {
              addParsed(d, currentMeal, cell);
            }
          }
        }
      } else if (Object.keys(mealColMap).length >= 2) {
        // Layout B: Meals on Top columns, Days in rows
        let currentDay: DayOfWeek = 'monday';
        for (let r = headerRowIdx + 1; r < json.length; r++) {
          const row = json[r];
          if (!Array.isArray(row)) continue;
          
          for (let c = 0; c < row.length; c++) {
            if (mealColMap[c]) continue;
            const d = getDayFromText(String(row[c] || ''));
            if (d) { currentDay = d; break; }
          }

          for (const [colIdxStr, m] of Object.entries(mealColMap)) {
            const c = parseInt(colIdxStr);
            const cell = String(row[c] || '').trim();
            if (cell && !getMealTypeFromTextStrict(cell) && !getDayFromText(cell)) {
              addParsed(currentDay, m, cell);
            }
          }
        }
      } else {
        // Layout C: Flat List (e.g. Day, Meal, Ingredient, Qty)
        let currentDay: DayOfWeek = 'monday';
        let currentType: MealType = mode === 'ramadan' ? 'iftar' : 'breakfast';
        
        let dayCol = -1, mealCol = -1, ingCol = -1, qtyCol = -1, unitCol = -1;
        for (let r = 0; r < Math.min(json.length, 5); r++) {
           const row = json[r];
           if (!Array.isArray(row)) continue;
           row.forEach((cell, c) => {
             const s = String(cell || '').trim().toLowerCase();
             const normalized = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
             if (s.includes('يوم') || s === 'day' || normalized.includes('jour')) dayCol = c;
             if (s.includes('وجب') || s === 'meal' || normalized.includes('repas')) mealCol = c;
             if (s.includes('مكون') || s.includes('مادة') || s.includes('صنف') || s.includes('بيان') || normalized.includes('designation') || normalized.includes('ingredient')) ingCol = c;
             if (s.includes('كمي') || s.includes('مقدار') || normalized.includes('grammage') || normalized.includes('quantite')) qtyCol = c;
             if (s.includes('وحد') || s === 'unit' || normalized.includes('unite')) unitCol = c;
           });
           if (ingCol !== -1) break;
        }

        for (let r = 0; r < json.length; r++) {
            const row = json[r];
            if (!Array.isArray(row) || row.length === 0) continue;
            
            const cells = row.map(c => String(c === undefined || c === null ? '' : c).trim());
            if (cells.every(c => !c)) continue;

            let explicitDay = false;
            let explicitMeal = false;
            
            if (dayCol !== -1 && cells[dayCol]) {
               const d = getDayFromText(cells[dayCol]);
               if (d) { currentDay = d; explicitDay = true; }
            }
            if (mealCol !== -1 && cells[mealCol]) {
               const m = getMealTypeFromTextStrict(cells[mealCol]);
               if (m) { currentType = m; explicitMeal = true; }
            }
            
            if (!explicitDay) {
              for (const c of cells) { const d = getDayFromText(c); if (d) { currentDay = d; break; } }
            }
            if (!explicitMeal) {
              for (const c of cells) { const m = getMealTypeFromTextStrict(c); if (m) { currentType = m; break; } }
            }
            
            let ingRaw = '';
            let qty = 0;
            let unit = '';
            
            if (ingCol !== -1) {
               ingRaw = cells[ingCol];
               if (qtyCol !== -1) qty = parseFloat(cells[qtyCol]) || 0;
               if (unitCol !== -1) unit = cells[unitCol] || '';
            } else {
               // Fallback smart extraction
               const candidateNums: number[] = [];
               const candidateStrs: string[] = [];
               for (const c of cells) {
                  if (!c) continue;
                  
                  const d = getDayFromText(c);
                  const m = getMealTypeFromTextStrict(c);
                  const n = parseFloat(c);
                  
                  if (!isNaN(n) && /^[\d.,\s]+$/.test(c)) { 
                     candidateNums.push(n); 
                  } else {
                     const isHeader = ['المادة', 'المكون', 'الكمية', 'الوحدة', 'اليوم', 'الوجبة', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الاحد', 'الأحد', 'فطور', 'غداء', 'عشاء', 'سحور', 'افطار', 'إفطار'].some(h => c === h || (c.includes(h) && c.length <= h.length + 3));
                     if (isHeader) continue;

                     if (d || m) {
                        // Check if it's purely a day/meal marker or contains actual ingredients
                        let cleaned = c;
                        ['اثنين', 'إثنين', 'ثلاثاء', 'أربعاء', 'اربعاء', 'خميس', 'جمعة', 'جمعه', 'سبت', 'أحد', 'احد', 'فطور', 'صباح', 'غداء', 'غذا', 'عشاء', 'سحور', 'إفطار', 'افطار', 'يوم', 'وجبة', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'petit', 'dejeuner', 'déjeuner', 'diner', 'dîner', 'shour', 'suhoor', 'iftar', 'ftour', 'matin', 'pdj', 'jour', 'repas'].forEach(w => {
                           cleaned = cleaned.replace(new RegExp(w, 'gi'), '');
                        });
                        cleaned = cleaned.replace(/[\s\-_'",.؛،\(\)\[\]\{\}:]/g, '').trim();
                        // If there are remaining characters, it's an ingredient
                        if (cleaned.length > 1) {
                           candidateStrs.push(c);
                        }
                     } else {
                        candidateStrs.push(c);
                     }
                  }
               }
               
               if (candidateStrs.length > 0) {
                  ingRaw = candidateStrs[0];
                  if (candidateNums.length > 0) qty = candidateNums[0];
                  if (candidateStrs.length > 1) unit = candidateStrs[1];
                  else if (cells.length > 3 && !parseFloat(cells[3])) unit = cells[3];
               }
            }
            
            if (ingRaw) {
               addParsed(currentDay, currentType, ingRaw, qty, unit);
            }
        }
      }

      // Finalize: Autocomplete from references where possible
      const added = Array.from(map.values());
      if (added.length) { 
        const filled = added.map(m => ({
          ...m, ingredients: m.ingredients.map(ing => {
             if (!ing.quantityPerPerson || !ing.unit) {
                const ref = findMatchingReference(referenceIngredients, ing.name);
                if (ref) {
                   return {
                      ...ing,
                      quantityPerPerson: ing.quantityPerPerson || ref.quantityPerPerson,
                      unit: ing.unit || ref.unit
                   };
                }
             }
             return ing;
          })
        }));
        setMeals([...meals, ...filled]); 
        alert('تم الاستيراد والتوزيع الذكي بنجاح!'); 
      } else {
        alert('لم يتم العثور على بيانات صالحة. يرجى التأكد من محتوى الجدول.');
      }
      if (menuFileRef.current) menuFileRef.current.value = '';
    } catch (err) { console.error(err); alert('حدث خطأ في قراءة الملف'); }
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
          return { ...ing, [field]: value };
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

  const duplicateDay = (sourceDay: DayOfWeek, targetDay: DayOfWeek) => {
    if (sourceDay === targetDay) return;
    const sourceMeals = meals.filter(m => m.day === sourceDay);
    if (sourceMeals.length === 0) return alert('لا توجد وجبات في هذا اليوم لنسخها');
    
    if (!window.confirm(`تأكيد نسخ وجبات ${daysLabels[sourceDay]} إلى ${daysLabels[targetDay]}؟`)) return;

    const newMeals = sourceMeals.map(m => ({
      ...m,
      id: generateId(),
      day: targetDay,
      ingredients: m.ingredients.map(ing => ({ ...ing, id: generateId() }))
    }));
    
    setMeals([...meals, ...newMeals]);
    alert('تم النسخ بنجاح!');
  };

  const exportMenu = () => {
    const data: any[] = [];
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealOrder = ['breakfast', 'lunch', 'dinner', 'suhoor', 'iftar'];

    const frenchDays: Record<string, string> = {
      monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
      thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche'
    };
    const frenchMeals: Record<string, string> = {
      breakfast: 'Petit déjeuner', lunch: 'Déjeuner', dinner: 'Diner', suhoor: 'Shour', iftar: 'Iftar'
    };

    // Sort meals by day then by type
    const sortedMeals = [...meals].sort((a, b) => {
      const dayDiff = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return mealOrder.indexOf(a.type) - mealOrder.indexOf(b.type);
    });

    sortedMeals.forEach(meal => {
      if (meal.ingredients.length === 0) {
        data.push({
          'Jour': frenchDays[meal.day] || '',
          'Repas': frenchMeals[meal.type] || '',
          'Désignation': '',
          'Grammage': '',
          'Unité': ''
        });
      } else {
        meal.ingredients.forEach(ing => {
          data.push({
            'Jour': frenchDays[meal.day] || '',
            'Repas': frenchMeals[meal.type] || '',
            'Désignation': ing.name,
            'Grammage': ing.quantityPerPerson || '',
            'Unité': ing.unit || ''
          });
        });
      }
    });

    if (data.length === 0) {
      // Empty template
      data.push({
        'Jour': 'Lundi',
        'Repas': 'Petit déjeuner',
        'Désignation': '',
        'Grammage': '',
        'Unité': ''
      });
    }

    const ws = xlsx.utils.json_to_sheet(data);
    
    // Auto-fit columns roughly
    const colWidths = [
      { wch: 15 }, // Jour
      { wch: 20 }, // Repas
      { wch: 35 }, // Désignation
      { wch: 12 }, // Grammage
      { wch: 12 }  // Unité
    ];
    ws['!cols'] = colWidths;

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Menu");
    xlsx.writeFile(wb, "Menu_Template.xlsx");
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
          <button onClick={exportMenu} className="btn-ghost text-xs py-2 px-3">
            <Download className="w-3.5 h-3.5" /> استخراج النموذج
          </button>
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

      {/* Validation Summary */}
      {meals.length > 0 && validationIssues.totalIssues > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl animate-fade-in" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-300">
            <span className="font-bold block mb-1">تنبيه بالنواقص قبل الحساب:</span>
            <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
              {validationIssues.missingQty > 0 && <li>يوجد {validationIssues.missingQty} مادة بدون كمية محددة.</li>}
              {validationIssues.missingUnit > 0 && <li>يوجد {validationIssues.missingUnit} مادة بدون وحدة قياس.</li>}
            </ul>
            <span className="opacity-70 block mt-1.5 text-[11px]">يرجى تعبئتها يدوياً أو استخدام زر "تعبئة تلقائية" أعلى الصفحة لتجنب حسابات خاطئة.</span>
          </div>
        </div>
      )}

      {/* Day Tabs */}
      {meals.length > 0 && (
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin">
            <button 
              onClick={() => setActiveDay('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${activeDay === 'all' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-transparent'}`}
            >
              الكل
            </button>
            {Object.entries(daysLabels).map(([k, v]) => (
              <button 
                key={k}
                onClick={() => setActiveDay(k as DayOfWeek)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 flex items-center gap-2 ${activeDay === k ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-transparent'}`}
              >
                <Calendar className="w-3.5 h-3.5 opacity-50" />
                {v}
                <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px]">
                  {meals.filter(m => m.day === k).length}
                </span>
              </button>
            ))}
          </div>

          {activeDay !== 'all' && meals.filter(m => m.day === activeDay).length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 animate-fade-in bg-slate-800/30 rounded-lg border border-slate-700/50 w-fit">
              <Copy className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">نسخ وجبات هذا اليوم إلى:</span>
              <select 
                className="smart-select text-xs py-1 px-2 w-auto bg-slate-900/50"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    duplicateDay(activeDay as DayOfWeek, e.target.value as DayOfWeek);
                  }
                }}
              >
                <option value="" disabled>اختر اليوم...</option>
                {Object.entries(daysLabels).filter(([k]) => k !== activeDay).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Meals list */}
      <div className="space-y-4">
        {meals.filter(m => activeDay === 'all' || m.day === activeDay).map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            referenceIngredients={referenceIngredients}
            draggingMealId={draggingMealId}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={() => setDraggingMealId(null)}
            updateMeal={updateMeal}
            removeMeal={removeMeal}
            updateIngredient={updateIngredient}
            removeIngredient={removeIngredient}
            addIngredient={addIngredient}
            daysLabels={daysLabels}
            mealTypeLabels={mealTypeLabels}
            typeColors={typeColors}
          />
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
