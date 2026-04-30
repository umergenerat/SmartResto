import React, { useState, useRef } from 'react';
import { Download, Upload, Copy, Check, RefreshCw, Smartphone } from 'lucide-react';
import { Meal, Beneficiaries, ScheduleMode, ReferenceIngredient, ApiSettings } from '../types';

interface SyncPanelProps {
  mode: ScheduleMode; setMode: (m: ScheduleMode) => void;
  beneficiaries: Beneficiaries; setBeneficiaries: (b: Beneficiaries) => void;
  meals: Meal[]; setMeals: (m: Meal[]) => void;
  referenceIngredients: ReferenceIngredient[]; setReferenceIngredients: (r: ReferenceIngredient[]) => void;
  apiSettings: ApiSettings; setApiSettings: (a: ApiSettings) => void;
}

export default function SyncPanel({
  mode, setMode,
  beneficiaries, setBeneficiaries,
  meals, setMeals,
  referenceIngredients, setReferenceIngredients,
  apiSettings, setApiSettings
}: SyncPanelProps) {
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteData, setPasteData] = useState('');

  const getSyncData = () => {
    return {
      mode,
      beneficiaries,
      meals,
      referenceIngredients,
      apiSettings,
      timestamp: new Date().toISOString()
    };
  };

  const handleExportFile = () => {
    const dataStr = JSON.stringify(getSyncData(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartresto-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('تم تصدير البيانات بنجاح كملف.');
  };

  const handleCopyText = () => {
    const dataStr = JSON.stringify(getSyncData());
    // Encode to base64 for easy copying via Whatsapp/etc
    const base64 = btoa(encodeURIComponent(dataStr));
    navigator.clipboard.writeText(base64).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      setMsg('تم نسخ البيانات كرمز نصي. يمكنك لصقه في التطبيق الآخر.');
    });
  };

  const loadData = (data: any) => {
    if (data.mode) setMode(data.mode);
    if (data.beneficiaries) setBeneficiaries(data.beneficiaries);
    if (data.meals) setMeals(data.meals);
    if (data.referenceIngredients) setReferenceIngredients(data.referenceIngredients);
    if (data.apiSettings) setApiSettings(data.apiSettings);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = ev.target?.result as string;
        const data = JSON.parse(result);
        loadData(data);
        setMsg('تم استيراد البيانات من الملف بنجاح!');
      } catch (err) {
        setMsg('حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف صالح.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteData = () => {
    if (!pasteData) return;
    try {
      const decoded = decodeURIComponent(atob(pasteData.trim()));
      const data = JSON.parse(decoded);
      loadData(data);
      setPasteData('');
      setMsg('تم استيراد البيانات من النص بنجاح!');
    } catch (err) {
      setMsg('النص غير صالح. تأكد من نسخ الرمز بالكامل.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <RefreshCw className="w-6 h-6 text-emerald-400" />
          المزامنة والنسخ الاحتياطي
        </h2>
        
        <p className="text-emerald-100/70 text-sm mb-8 leading-relaxed">
          يتيح لك هذا القسم مزامنة البيانات بين الحاسوب والهاتف، أو أخذ نسخة احتياطية من معلوماتك.
          يمكنك تصدير البيانات كملف أو نسخها كنص لمشاركتها عبر تطبيقات المراسلة.
        </p>

        {msg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Export Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-300 border-b border-emerald-500/20 pb-2">تصدير البيانات (من هذا الجهاز)</h3>
            
            <button
              onClick={handleExportFile}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-100 rounded-xl transition-all font-medium text-sm"
            >
              <Download className="w-5 h-5" />
              تنزيل كملف (JSON)
            </button>

            <button
              onClick={handleCopyText}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-100 rounded-xl transition-all font-medium text-sm"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              {copied ? 'تم النسخ!' : 'نسخ كرمز نصي (للمشاركة)'}
            </button>
          </div>

          {/* Import Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-blue-300 border-b border-blue-500/20 pb-2">استيراد البيانات (إلى هذا الجهاز)</h3>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-100 rounded-xl transition-all font-medium text-sm"
              >
                <Upload className="w-5 h-5" />
                رفع ملف بيانات (JSON)
              </button>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-xs text-blue-100/70 block">أو لصق الرمز النصي هنا:</label>
              <textarea
                value={pasteData}
                onChange={e => setPasteData(e.target.value)}
                rows={3}
                placeholder="ألصق الرمز هنا..."
                className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl p-3 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60"
              />
              <button
                onClick={handlePasteData}
                disabled={!pasteData.trim()}
                className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-all font-medium text-sm"
              >
                <Smartphone className="w-4 h-4" />
                استيراد من النص
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
