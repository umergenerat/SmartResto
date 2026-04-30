import React, { useRef } from 'react';
import { UploadCloud, ScanSearch, AlertCircle, Search, Star } from 'lucide-react';
import { Meal, DishEvaluation } from '../types';

interface EvaluationPanelProps {
  meals: Meal[];
  evalImagePreview: string | null;
  evalReferenceMealId: string;
  setEvalReferenceMealId: (id: string) => void;
  isEvaluating: boolean;
  evalResult: DishEvaluation | null;
  evalErrorMsg: string;
  uploadMsg: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEvaluate: () => void;
}

const daysLabels: Record<string, string> = {
  monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد'
};
const mealTypeLabels: Record<string, string> = {
  breakfast: 'فطور صباحي', lunch: 'غداء', dinner: 'عشاء', suhoor: 'سحور', iftar: 'إفطار رمضان'
};

export default function EvaluationPanel({
  meals, evalImagePreview, evalReferenceMealId, setEvalReferenceMealId,
  isEvaluating, evalResult, evalErrorMsg, uploadMsg, onFileChange, onEvaluate
}: EvaluationPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const score = evalResult?.score ?? 0;

  const scoreColor = score >= 8 ? '#34d399' : score >= 5 ? '#f59e0b' : '#f87171';

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="section-title">تقييم الأطباق بالذكاء الاصطناعي</h2>
        <p className="section-subtitle">ارفع صورة لطبق جاهز لتحليله ومقارنته بالمبرمج</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Upload + controls */}
        <div className="space-y-4">
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={onFileChange} />
          <div onClick={() => fileRef.current?.click()}
            className={`upload-zone flex flex-col items-center justify-center min-h-[220px] cursor-pointer ${evalImagePreview ? 'p-2' : ''}`}>
            {evalImagePreview ? (
              <img src={evalImagePreview} alt="طبق" className="max-h-52 object-contain rounded-xl" />
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-emerald-500 opacity-50 mb-3" />
                <p className="text-slate-300 font-medium text-sm">اضغط لرفع صورة الطبق</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>JPG, PNG, WEBP</p>
              </>
            )}
          </div>

          {meals.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 block">وجبة المرجع للمقارنة (اختياري)</label>
              <select value={evalReferenceMealId} onChange={e => setEvalReferenceMealId(e.target.value)}
                className="smart-select w-full text-sm">
                <option value="">بدون مقارنة (استخراج المكونات فقط)</option>
                {meals.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({daysLabels[m.day || 'monday']} - {mealTypeLabels[m.type]})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button onClick={onEvaluate} disabled={!evalImagePreview || isEvaluating} className="btn-primary w-full py-3">
            <ScanSearch className="w-4 h-4" />
            {isEvaluating ? 'جاري التحليل...' : 'بدء تقييم الطبق'}
          </button>

          {uploadMsg && isEvaluating && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 animate-pulse">
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              {uploadMsg}
            </div>
          )}
          {evalErrorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-300"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {evalErrorMsg}
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[320px]">
          {evalResult ? (
            <div className="w-full space-y-5 animate-slide-right">
              {/* Score */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 relative"
                     style={{
                       background: `conic-gradient(${scoreColor} ${score * 36}deg, rgba(255,255,255,0.06) 0)`,
                     }}>
                  <div className="absolute inset-1.5 rounded-full flex items-center justify-center"
                       style={{ background: '#0d1f17' }}>
                    <span className="font-black text-xl" style={{ color: scoreColor }}>{score}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">من 10 — نتيجة التقييم</p>
              </div>

              {/* Detected */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" /> المكونات المرصودة
                </h4>
                <ul className="space-y-1">
                  {evalResult.detectedIngredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400 mt-0.5">•</span> {ing}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Evaluation */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> التحليل والملاحظات
                </h4>
                <p className="text-sm leading-relaxed text-slate-300 p-4 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {evalResult.evaluation}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center" style={{ color: 'rgba(148,163,184,0.3)' }}>
              <ScanSearch className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-sm">النتيجة ستظهر هنا بعد التحليل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
