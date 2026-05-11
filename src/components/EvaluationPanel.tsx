import React, { useRef, useState } from 'react';
import { UploadCloud, ScanSearch, AlertCircle, Search, Star, Archive, Printer, Share2, Trash2, History, X, Clock, Calendar } from 'lucide-react';
import { Meal, DishEvaluation, ArchivedEvaluation } from '../types';

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
  onArchive: () => void;
  archivedEvaluations: ArchivedEvaluation[];
  onDeleteArchive: (id: string) => void;
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
  isEvaluating, evalResult, evalErrorMsg, uploadMsg, onFileChange, onEvaluate,
  onArchive, archivedEvaluations, onDeleteArchive
}: EvaluationPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedEvaluation | null>(null);

  const score = evalResult?.score ?? 0;
  const scoreColor = score >= 8 ? '#34d399' : score >= 5 ? '#f59e0b' : '#f87171';

  const handlePrint = (data: DishEvaluation | ArchivedEvaluation, title: string = 'تقييم طبق') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Noto+Sans+Arabic:wght@400;700&display=swap');
            body { font-family: 'Noto Sans Arabic', 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .score-box { display: inline-block; padding: 20px; border-radius: 50%; border: 4px solid #34d399; font-size: 24px; font-weight: bold; margin: 20px 0; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 18px; font-weight: bold; color: #10b981; margin-bottom: 10px; border-right: 4px solid #10b981; padding-right: 10px; }
            .content { font-size: 16px; line-height: 1.6; background: #f9fafb; padding: 15px; border-radius: 8px; }
            ul { padding-right: 20px; }
            li { margin-bottom: 5px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SMARTRESTO - تقييم الوجبات</h1>
            <p>${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          
          <div style="text-align: center;">
            <div class="score-box" style="border-color: ${data.score >= 8 ? '#34d399' : data.score >= 5 ? '#f59e0b' : '#f87171'}">
              النتيجة: ${data.score} / 10
            </div>
          </div>

          <div class="section">
            <div class="section-title">المكونات المرصودة</div>
            <div class="content">
              <ul>
                ${data.detectedIngredients.map(ing => `<li>${ing}</li>`).join('')}
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">التحليل والملاحظات</div>
            <div class="content">
              ${data.evaluation}
            </div>
          </div>

          <div class="footer">
            تم إنشاء هذا التقرير بواسطة تطبيق SMARTRESTO الذكي
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleShare = async (data: DishEvaluation | ArchivedEvaluation) => {
    const shareText = `تقييم طبق من SMARTRESTO:\nالنتيجة: ${data.score}/10\nالملاحظات: ${data.evaluation}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'تقييم طبق SMARTRESTO',
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('تم نسخ نص التقييم إلى الحافظة');
    }
  };

  if (showHistory) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-400" /> أرشيف التقييمات
            </h2>
            <p className="section-subtitle">تصفح التقييمات السابقة التي قمت بحفظها</p>
          </div>
          <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {archivedEvaluations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <History className="w-16 h-16 mx-auto mb-4 opacity-20 text-slate-400" />
            <p className="text-slate-400">لا توجد تقييمات مؤرشفة بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archivedEvaluations.map(ev => (
              <div key={ev.id} className="glass-card p-4 flex gap-4 cursor-pointer hover:border-emerald-500/50 transition-all group"
                   onClick={() => setSelectedArchive(ev)}>
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/5">
                  {ev.imagePreview ? (
                    <img src={ev.imagePreview} alt="Dish" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ScanSearch className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-400">{ev.score}/10</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteArchive(ev.id); }} className="p-1 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-slate-200 truncate">{ev.mealName || 'طبق خارجي'}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(ev.date).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Archive Modal */}
        {selectedArchive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
               onClick={() => setSelectedArchive(null)}>
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" /> تفاصيل التقييم المؤرشف
                </h3>
                <button onClick={() => setSelectedArchive(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedArchive.imagePreview && (
                  <img src={selectedArchive.imagePreview} alt="Dish" className="w-full rounded-xl border border-white/10" />
                )}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div className="text-center flex-1">
                      <div className="text-3xl font-black text-emerald-400">{selectedArchive.score}</div>
                      <div className="text-[10px] text-emerald-500 uppercase tracking-widest">النتيجة النهائية</div>
                    </div>
                    <div className="w-px h-10 bg-emerald-500/20 mx-4" />
                    <div className="text-right flex-1">
                      <div className="text-sm font-bold text-slate-200">{selectedArchive.mealName || 'طبق خارجي'}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(selectedArchive.date).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handlePrint(selectedArchive, `تقييم ${selectedArchive.mealName || 'طبق'}`)}
                            className="btn-secondary flex-1 py-2 text-xs">
                      <Printer className="w-4 h-4" /> طباعة PDF
                    </button>
                    <button onClick={() => handleShare(selectedArchive)}
                            className="btn-secondary flex-1 py-2 text-xs">
                      <Share2 className="w-4 h-4" /> مشاركة
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" /> المكونات المرصودة
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedArchive.detectedIngredients.map((ing, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> التحليل والملاحظات
                </h4>
                <p className="text-sm leading-relaxed text-slate-300 p-4 rounded-xl bg-white/5 border border-white/10">
                  {selectedArchive.evaluation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">تقييم الأطباق بالذكاء الاصطناعي</h2>
          <p className="section-subtitle">ارفع صورة لطبق جاهز لتحليله ومقارنته بالمبرمج</p>
        </div>
        <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium text-slate-300">
          <History className="w-4 h-4 text-emerald-400" /> السجل ({archivedEvaluations.length})
        </button>
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
        <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
          {evalResult ? (
            <div className="w-full space-y-5 animate-slide-right">
              {/* Actions Overlay */}
              <div className="flex justify-end gap-2 mb-2">
                <button onClick={() => handlePrint(evalResult)} className="p-2 bg-white/5 hover:bg-emerald-500/20 rounded-lg transition-colors group" title="طباعة">
                  <Printer className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                </button>
                <button onClick={() => handleShare(evalResult)} className="p-2 bg-white/5 hover:bg-emerald-500/20 rounded-lg transition-colors group" title="مشاركة">
                  <Share2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                </button>
                <button onClick={onArchive} className="p-2 bg-white/5 hover:bg-emerald-500/20 rounded-lg transition-colors group" title="أرشفة">
                  <Archive className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                </button>
              </div>

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
                <div className="flex flex-wrap gap-2">
                  {evalResult.detectedIngredients.map((ing, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-300">
                      {ing}
                    </span>
                  ))}
                </div>
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

