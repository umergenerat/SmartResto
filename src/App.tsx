import React, { useState, useMemo, useRef } from 'react';
import { Meal, Beneficiaries, ScheduleMode, TotalsResult, DetailedResult, DayOfWeek, MealType, ReferenceIngredient, DishEvaluation, ApiSettings } from './types';
import { analyzeMenuDocument, analyzeDishImage } from './lib/gemini';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConfigPanel from './components/ConfigPanel';
import MenuBuilder from './components/MenuBuilder';
import ResultsPanel from './components/ResultsPanel';
import EvaluationPanel from './components/EvaluationPanel';
import SyncPanel from './components/SyncPanel';

// ─── Utility helpers (exported so components can import them) ───────────────

export const normalizeIngredientName = (text: string) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[\s\-_'",.؛،\(\)\[\]\{\}]/g, '')
    .trim()
    .toLowerCase();

export const findMatchingReference = (refs: ReferenceIngredient[], nameToMatch: string) => {
  const n = normalizeIngredientName(nameToMatch);
  return refs.find(r =>
    normalizeIngredientName(r.name) === n ||
    (r.nameFr && normalizeIngredientName(r.nameFr) === n)
  );
};

// ─── Default reference data ──────────────────────────────────────────────────

const defaultPDFIngredients: ReferenceIngredient[] = [
  { id: 'pdf-1', name: 'شاي', nameFr: 'Thé', quantityPerPerson: 125, unit: 'مل' },
  { id: 'pdf-2', name: 'زيت زيتون', nameFr: "Huile d'olive", quantityPerPerson: 10, unit: 'مل' },
  { id: 'pdf-3', name: 'جبن', nameFr: 'Fromage', quantityPerPerson: 15, unit: 'غ' },
  { id: 'pdf-4', name: 'بيض مسلوق', nameFr: 'Œuf bouilli', quantityPerPerson: 1, unit: 'وحدة' },
  { id: 'pdf-5', name: 'خبز', nameFr: 'Pain', quantityPerPerson: 1, unit: 'وحدة' },
  { id: 'pdf-6', name: 'لحم بقر', nameFr: 'Viande de boeuf', quantityPerPerson: 80, unit: 'غ' },
  { id: 'pdf-7', name: 'فواكه', nameFr: 'Fruits', quantityPerPerson: 1, unit: 'وحدة' },
  { id: 'pdf-8', name: 'سميد', nameFr: 'Semoule', quantityPerPerson: 35, unit: 'غ' },
  { id: 'pdf-9', name: 'حليب', nameFr: 'Lait', quantityPerPerson: 125, unit: 'مل' },
  { id: 'pdf-10', name: 'تمر', nameFr: 'Dattes', quantityPerPerson: 7, unit: 'حبة' },
  { id: 'pdf-11', name: 'قطبان ديك رومي', nameFr: 'Brochettes de dinde', quantityPerPerson: 100, unit: 'غ' },
  { id: 'pdf-12', name: 'ياغورت', nameFr: 'Yaourt', quantityPerPerson: 1, unit: 'وحدة' },
  { id: 'pdf-13', name: 'زبدة', nameFr: 'Beurre', quantityPerPerson: 15, unit: 'غ' },
  { id: 'pdf-14', name: 'مربى', nameFr: 'Confiture', quantityPerPerson: 25, unit: 'غ' },
  { id: 'pdf-15', name: 'عسل', nameFr: 'Miel', quantityPerPerson: 25, unit: 'غ' },
  { id: 'pdf-16', name: 'عصير برتقال', nameFr: "Jus d'orange", quantityPerPerson: 125, unit: 'مل' },
  { id: 'pdf-17', name: 'مادلين', nameFr: 'Madeleine', quantityPerPerson: 1, unit: 'وحدة' },
  { id: 'pdf-18', name: 'دجاج محمر', nameFr: 'Poulet rôti', quantityPerPerson: 200, unit: 'غ' },
  { id: 'pdf-19', name: 'زيتون أخضر', nameFr: 'Olives vertes', quantityPerPerson: 25, unit: 'غ' },
  { id: 'pdf-20', name: 'بطاطس مقلية', nameFr: 'Frites', quantityPerPerson: 140, unit: 'غ' },
  { id: 'pdf-21', name: 'أرز صيني', nameFr: 'Riz chinois', quantityPerPerson: 45, unit: 'غ' },
  { id: 'pdf-22', name: 'بسكويت', nameFr: 'Biscuit', quantityPerPerson: 1, unit: 'وحدة' },
  { id: 'pdf-23', name: 'سمك مقلي', nameFr: 'Poisson frit', quantityPerPerson: 200, unit: 'غ' },
  { id: 'pdf-24', name: 'قطاني', nameFr: 'Légumineuses', quantityPerPerson: 80, unit: 'غ' },
  { id: 'pdf-25', name: 'مشروب غازي', nameFr: 'Boisson gazeuse', quantityPerPerson: 330, unit: 'مل' },
  { id: 'pdf-26', name: 'شرائح ديك رومي', nameFr: 'Tranches de dinde', quantityPerPerson: 100, unit: 'غ' },
  { id: 'pdf-27', name: 'معجنات', nameFr: 'Pâtes', quantityPerPerson: 50, unit: 'غ' },
  { id: 'pdf-28', name: 'كفتة', nameFr: 'Kefta', quantityPerPerson: 75, unit: 'غ' },
  { id: 'pdf-29', name: 'خضر', nameFr: 'Légumes', quantityPerPerson: 80, unit: 'غ' },
  { id: 'pdf-30', name: 'كسكس', nameFr: 'Couscous', quantityPerPerson: 100, unit: 'غ' },
  { id: 'pdf-31', name: 'لبن', nameFr: 'Lben', quantityPerPerson: 245, unit: 'مل' },
  { id: 'pdf-32', name: 'بطاطس', nameFr: 'Pommes de terre', quantityPerPerson: 88, unit: 'غ' },
  { id: 'pdf-33', name: 'جزر', nameFr: 'Carottes', quantityPerPerson: 60, unit: 'غ' },
  { id: 'pdf-34', name: 'قطاني (فاصوليا/عدس)', nameFr: 'Légumineuses (Haricots/Lentilles)', quantityPerPerson: 80, unit: 'غ' },
  { id: 'pdf-35', name: 'سلطة مغربية', nameFr: 'Salade marocaine', quantityPerPerson: 1, unit: 'وحدة' },
];

// ─── Days / MealType helpers ─────────────────────────────────────────────────

const daysLabels: Record<DayOfWeek, string> = {
  monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد'
};

// ─── Main App ────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'config' | 'menu' | 'results' | 'evaluation' | 'sync';

export default function App() {
  // ── Persisted state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const [mode, setMode] = useState<ScheduleMode>(() => {
    try { const s = localStorage.getItem('mode'); return s ? JSON.parse(s) : 'normal'; } catch { return 'normal'; }
  });
  const [beneficiaries, setBeneficiaries] = useState<Beneficiaries>(() => {
    try { const s = localStorage.getItem('beneficiaries'); return s ? JSON.parse(s) : { fullBoard: 100, halfBoard: 50 }; } catch { return { fullBoard: 100, halfBoard: 50 }; }
  });
  const [meals, setMeals] = useState<Meal[]>(() => {
    try { const s = localStorage.getItem('meals'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [referenceIngredients, setReferenceIngredients] = useState<ReferenceIngredient[]>(() => {
    try {
      const s = localStorage.getItem('refIngredients');
      const parsed = s ? JSON.parse(s) : [];
      return parsed.length > 0 ? parsed : defaultPDFIngredients;
    } catch { return defaultPDFIngredients; }
  });

  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => {
    try {
      const s = localStorage.getItem('apiSettings');
      return s ? JSON.parse(s) : { apiKey: '', useOpenModel: false };
    } catch { return { apiKey: '', useOpenModel: false }; }
  });

  React.useEffect(() => {
    localStorage.setItem('mode', JSON.stringify(mode));
    localStorage.setItem('beneficiaries', JSON.stringify(beneficiaries));
    localStorage.setItem('meals', JSON.stringify(meals));
    localStorage.setItem('refIngredients', JSON.stringify(referenceIngredients));
    localStorage.setItem('apiSettings', JSON.stringify(apiSettings));
  }, [mode, beneficiaries, meals, referenceIngredients, apiSettings]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filterDay, setFilterDay] = useState<DayOfWeek | 'all'>('all');
  const [filterMealType, setFilterMealType] = useState<MealType | 'all'>('all');
  const [draggingMealId, setDraggingMealId] = useState<string | null>(null);

  // ── AI upload state ────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Evaluation state ───────────────────────────────────────────────────────
  const [evalImage, setEvalImage] = useState<File | null>(null);
  const [evalImagePreview, setEvalImagePreview] = useState<string | null>(null);
  const [evalReferenceMealId, setEvalReferenceMealId] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<DishEvaluation | null>(null);
  const [evalErrorMsg, setEvalErrorMsg] = useState('');

  // ── AI handlers ────────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMsg('جاري تحضير الملف...');
    setAiError('');
    try {
      const apiKey = apiSettings.apiKey;
      if (!apiKey && !apiSettings.useOpenModel) throw new Error('مفتاح API غير متوفر');
      const extracted = await analyzeMenuDocument(file, apiKey, setUploadMsg);
      if (extracted.length > 0) {
        const enriched = extracted.map(m => ({
          ...m,
          ingredients: m.ingredients.map(ing => {
            if (!ing.quantityPerPerson || ing.quantityPerPerson === 0) {
              const ref = findMatchingReference(referenceIngredients, ing.name);
              if (ref) return { ...ing, quantityPerPerson: ref.quantityPerPerson, unit: ing.unit || ref.unit };
            }
            return ing;
          })
        }));
        setMeals([...meals, ...enriched]);
        setActiveTab('menu');
      } else {
        setAiError('لم يتم العثور على وجبات صالحة في المستند.');
      }
    } catch (err: any) {
      setAiError(err.message || 'حدث خطأ غير معروف');
    } finally {
      setIsUploading(false);
      setUploadMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEvalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setEvalErrorMsg('الرجاء رفع صورة صالحة'); return; }
    setEvalImage(file);
    const reader = new FileReader();
    reader.onload = ev => setEvalImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setEvalResult(null);
    setEvalErrorMsg('');
  };

  const executeEvaluation = async () => {
    if (!evalImage) return;
    setIsEvaluating(true);
    setEvalErrorMsg('');
    setEvalResult(null);
    try {
      const apiKey = apiSettings.apiKey;
      if (!apiKey && !apiSettings.useOpenModel) throw new Error('مفتاح API غير متوفر');
      const refMeal = meals.find(m => m.id === evalReferenceMealId) || null;
      const result = await analyzeDishImage(evalImage, refMeal, apiKey, setUploadMsg);
      setEvalResult(result);
    } catch (err: any) {
      setEvalErrorMsg(err.message || 'حدث خطأ أثناء تحليل الصورة');
    } finally {
      setIsEvaluating(false);
      setUploadMsg('');
    }
  };

  // ── Totals calculation ─────────────────────────────────────────────────────

  const calculateTotals = (): TotalsResult[] => {
    const map = new Map<string, TotalsResult>();
    meals.forEach(meal => {
      if (filterDay !== 'all' && meal.day !== filterDay) return;
      if (filterMealType !== 'all' && meal.type !== filterMealType) return;
      let people = 0;
      if (mode === 'normal') {
        if (meal.type === 'breakfast' || meal.type === 'dinner') people = beneficiaries.fullBoard;
        else if (meal.type === 'lunch') people = beneficiaries.fullBoard + beneficiaries.halfBoard;
      } else {
        if (meal.type === 'suhoor' || meal.type === 'dinner' || meal.type === 'breakfast') people = beneficiaries.fullBoard;
        else if (meal.type === 'iftar' || meal.type === 'lunch') people = beneficiaries.fullBoard + beneficiaries.halfBoard;
      }
      if (people === 0 && meal.ingredients.length > 0) people = beneficiaries.fullBoard;

      meal.ingredients.forEach(ing => {
        let qty = Number(ing.quantityPerPerson);
        let unit = ing.unit;
        if (!qty || isNaN(qty)) {
          const ref = findMatchingReference(referenceIngredients, ing.name);
          if (ref) { qty = ref.quantityPerPerson; if (!unit?.trim()) unit = ref.unit; }
        }
        qty = qty || 0;
        unit = unit || 'غ';
        const key = `${ing.name}-${unit}`;
        const mealDay = daysLabels[meal.day || 'monday'];
        const label = `${meal.name} (${mealDay})`;
        const ref = findMatchingReference(referenceIngredients, ing.name);
        if (!map.has(key)) {
          map.set(key, { name: ing.name, nameFr: ref?.nameFr, unit, totalQuantity: qty * people, mealsUsing: [label] });
        } else {
          const ex = map.get(key)!;
          ex.totalQuantity += qty * people;
          if (!ex.mealsUsing.includes(label)) ex.mealsUsing.push(label);
          if (!ex.nameFr && ref?.nameFr) ex.nameFr = ref.nameFr;
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  // ── Detailed results: one row per ingredient × meal × day ──────────────────
  const calculateDetailedResults = (): DetailedResult[] => {
    const rows: DetailedResult[] = [];
    meals.forEach(meal => {
      if (filterDay !== 'all' && meal.day !== filterDay) return;
      if (filterMealType !== 'all' && meal.type !== filterMealType) return;
      let people = 0;
      if (mode === 'normal') {
        if (meal.type === 'breakfast' || meal.type === 'dinner') people = beneficiaries.fullBoard;
        else if (meal.type === 'lunch') people = beneficiaries.fullBoard + beneficiaries.halfBoard;
      } else {
        if (meal.type === 'suhoor' || meal.type === 'dinner' || meal.type === 'breakfast') people = beneficiaries.fullBoard;
        else if (meal.type === 'iftar' || meal.type === 'lunch') people = beneficiaries.fullBoard + beneficiaries.halfBoard;
      }
      if (people === 0 && meal.ingredients.length > 0) people = beneficiaries.fullBoard;
      meal.ingredients.forEach(ing => {
        let qty = Number(ing.quantityPerPerson);
        let unit = ing.unit;
        if (!qty || isNaN(qty) || qty === 0) {
          const ref = findMatchingReference(referenceIngredients, ing.name);
          if (ref) { qty = ref.quantityPerPerson; if (!unit?.trim()) unit = ref.unit; }
        }
        qty = qty || 0;
        unit = unit || 'غ';
        const ref = findMatchingReference(referenceIngredients, ing.name);
        rows.push({
          mealId: meal.id,
          mealName: meal.name,
          day: meal.day || 'monday',
          mealType: meal.type,
          ingredientName: ing.name,
          ingredientNameFr: ref?.nameFr,
          unit,
          quantityPerPerson: qty,
          peopleCount: people,
          totalQuantity: qty * people,
        });
      });
    });
    return rows;
  };

  const results = useMemo(() => calculateTotals(), [meals, beneficiaries, mode, filterDay, filterMealType, referenceIngredients]);
  const detailedResults = useMemo(() => calculateDetailedResults(), [meals, beneficiaries, mode, filterDay, filterMealType, referenceIngredients]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-mesh flex flex-col md:flex-row" dir="rtl">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mealsCount={meals.length}
        resultsCount={results.length}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-h-screen">
        {activeTab === 'dashboard' && (
          <Dashboard
            meals={meals}
            beneficiaries={beneficiaries}
            mode={mode}
            results={results}
            onGoToMenu={() => setActiveTab('menu')}
            onGoToResults={() => setActiveTab('results')}
            onGoToConfig={() => setActiveTab('config')}
          />
        )}

        {activeTab === 'config' && (
          <ConfigPanel
            mode={mode} setMode={setMode}
            beneficiaries={beneficiaries} setBeneficiaries={setBeneficiaries}
            referenceIngredients={referenceIngredients}
            setReferenceIngredients={setReferenceIngredients}
            apiSettings={apiSettings}
            setApiSettings={setApiSettings}
            onNext={() => setActiveTab('menu')}
          />
        )}

        {activeTab === 'menu' && (
          <MenuBuilder
            meals={meals} setMeals={setMeals}
            mode={mode}
            referenceIngredients={referenceIngredients}
            isUploading={isUploading}
            uploadMsg={uploadMsg}
            aiError={aiError}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onCalculate={() => setActiveTab('results')}
            draggingMealId={draggingMealId}
            setDraggingMealId={setDraggingMealId}
          />
        )}

        {activeTab === 'results' && (
          <ResultsPanel
            results={results}
            detailedResults={detailedResults}
            beneficiaries={beneficiaries}
            mode={mode}
            filterDay={filterDay} setFilterDay={setFilterDay}
            filterMealType={filterMealType} setFilterMealType={setFilterMealType}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationPanel
            meals={meals}
            evalImagePreview={evalImagePreview}
            evalReferenceMealId={evalReferenceMealId}
            setEvalReferenceMealId={setEvalReferenceMealId}
            isEvaluating={isEvaluating}
            evalResult={evalResult}
            evalErrorMsg={evalErrorMsg}
            uploadMsg={uploadMsg}
            onFileChange={handleEvalFileChange}
            onEvaluate={executeEvaluation}
          />
        )}

        {activeTab === 'sync' && (
          <SyncPanel
            mode={mode} setMode={setMode}
            beneficiaries={beneficiaries} setBeneficiaries={setBeneficiaries}
            meals={meals} setMeals={setMeals}
            referenceIngredients={referenceIngredients} setReferenceIngredients={setReferenceIngredients}
            apiSettings={apiSettings} setApiSettings={setApiSettings}
          />
        )}
      </main>
    </div>
  );
}
