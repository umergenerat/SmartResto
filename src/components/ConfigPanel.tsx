import React, { useState, useRef } from 'react';
import { Settings, CalendarDays, UtensilsCrossed, Plus, ListPlus, FileUp, Trash2, ChevronDown, ChevronUp, Cpu, Key, Bot } from 'lucide-react';
import { Beneficiaries, ScheduleMode, ReferenceIngredient, ApiSettings } from '../types';
import * as xlsx from 'xlsx';

interface ConfigPanelProps {
  mode: ScheduleMode;
  setMode: (m: ScheduleMode) => void;
  beneficiaries: Beneficiaries;
  setBeneficiaries: (b: Beneficiaries) => void;
  referenceIngredients: ReferenceIngredient[];
  setReferenceIngredients: (r: ReferenceIngredient[]) => void;
  apiSettings: ApiSettings;
  setApiSettings: (a: ApiSettings) => void;
  onNext: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function ConfigPanel({
  mode, setMode, beneficiaries, setBeneficiaries,
  referenceIngredients, setReferenceIngredients,
  apiSettings, setApiSettings, onNext
}: ConfigPanelProps) {
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showRefTable, setShowRefTable] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const addRef = () =>
    setReferenceIngredients([...referenceIngredients, { id: generateId(), name: '', quantityPerPerson: 0, unit: 'غ' }]);

  const updateRef = (id: string, field: keyof ReferenceIngredient, value: string | number) =>
    setReferenceIngredients(referenceIngredients.map(r => r.id === id ? { ...r, [field]: value } : r));

  const removeRef = (id: string) =>
    setReferenceIngredients(referenceIngredients.filter(r => r.id !== id));

  const handleBulkText = () => {
    const lines = bulkText.split('\n');
    const newRefs: ReferenceIngredient[] = [];
    lines.forEach(line => {
      const parts = line.split(/[\t;]| - /).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[0];
        const isSecond = isNaN(parseFloat(parts[1]));
        const nameFr = isSecond ? parts[1] : undefined;
        const qi = isSecond ? 2 : 1;
        const ui = isSecond ? 3 : 2;
        const qty = parseFloat(parts[qi]);
        if (name && !isNaN(qty)) {
          newRefs.push({ id: generateId(), name, nameFr, quantityPerPerson: qty, unit: parts[ui] || 'غ' });
        }
      }
    });
    if (newRefs.length > 0) {
      setReferenceIngredients([...referenceIngredients, ...newRefs]);
      setBulkText('');
      setShowBulk(false);
    }
  };

  const handleBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = xlsx.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = xlsx.utils.sheet_to_json(ws, { header: 1 });
      const newRefs: ReferenceIngredient[] = [];
      json.forEach((row, idx) => {
        if (idx === 0 && isNaN(parseFloat(row[1]))) return;
        if (Array.isArray(row) && row.length >= 2) {
          const name = row[0];
          const isSecond = typeof row[1] === 'string' && isNaN(parseFloat(row[1]));
          const nameFr = isSecond ? row[1] : undefined;
          const qi = isSecond ? 2 : 1;
          const ui = isSecond ? 3 : 2;
          const qty = parseFloat(row[qi]);
          if (name && !isNaN(qty)) {
            newRefs.push({ id: generateId(), name: String(name), nameFr: nameFr ? String(nameFr) : undefined, quantityPerPerson: qty, unit: String(row[ui] || 'غ') });
          }
        }
      });
      if (newRefs.length > 0) setReferenceIngredients([...referenceIngredients, ...newRefs]);
      setShowBulk(false);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
    } catch { alert('خطأ في قراءة الملف'); }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="section-title">الإعدادات الأساسية</h2>
        <p className="section-subtitle">نمط التغذية وعدد المستفيدين</p>
      </div>

      {/* Mode selector */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" /> نمط الأيام
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { val: 'normal' as ScheduleMode, label: 'أيام عادية', sub: 'فطور • غداء • عشاء', icon: CalendarDays },
            { val: 'ramadan' as ScheduleMode, label: 'شهر رمضان', sub: 'سحور • إفطار • عشاء', icon: UtensilsCrossed },
          ].map(({ val, label, sub, icon: Icon }) => (
            <button
              key={val}
              onClick={() => setMode(val)}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: mode === val ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.08)',
                background: mode === val ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: mode === val ? '#34d399' : 'rgba(148,163,184,0.5)' }} />
              <div className="font-bold text-sm" style={{ color: mode === val ? '#34d399' : '#94a3b8' }}>{label}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.5)' }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Beneficiaries */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" /> تعداد المستفيدين
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { field: 'fullBoard' as keyof Beneficiaries, label: 'منحة كاملة', sub: 'جميع الوجبات', color: '#34d399' },
            { field: 'halfBoard' as keyof Beneficiaries, label: 'نصف منحة', sub: 'الوجبة الرئيسية', color: '#60a5fa' },
          ].map(({ field, label, sub, color }) => (
            <div key={field} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <label className="block text-xs font-semibold mb-1" style={{ color }}>{label}</label>
              <div className="text-xs mb-2" style={{ color: 'rgba(148,163,184,0.5)' }}>{sub}</div>
              <input
                type="number" min="0"
                value={beneficiaries[field] || ''}
                onChange={e => setBeneficiaries({ ...beneficiaries, [field]: Number(e.target.value) })}
                className="smart-input text-2xl font-black"
                style={{ color }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI Settings */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" /> إعدادات الذكاء الاصطناعي
        </h3>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Key className="w-3.5 h-3.5 text-emerald-500" /> مفتاح API الخاص بـ Gemini
            </label>
            <input
              type="password"
              value={apiSettings.apiKey}
              onChange={e => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
              className="smart-input text-sm"
              placeholder="AIzaSy..."
            />
            <p className="text-[10px] mt-1 text-slate-500">يُستخدم لتحليل الملفات وتقييم الأطباق. يُخزن محلياً فقط.</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">الاستعانة التلقائية بنموذج مفتوح</div>
                <div className="text-[10px] text-slate-500">استخدام نماذج بديلة عند عدم توفر مفتاح خاص</div>
              </div>
            </div>
            <button
              onClick={() => setApiSettings({ ...apiSettings, useOpenModel: !apiSettings.useOpenModel })}
              className={`w-10 h-5 rounded-full transition-colors relative ${apiSettings.useOpenModel ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${apiSettings.useOpenModel ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Reference Ingredients */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowRefTable(!showRefTable)}
            className="flex items-center gap-2 font-semibold text-slate-200">
            <Settings className="w-4 h-4 text-emerald-400" />
            المكونات المرجعية
            <span className="badge-emerald">{referenceIngredients.length}</span>
            {showRefTable ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(!showBulk)} className="btn-ghost text-xs py-1.5 px-3">
              <ListPlus className="w-3.5 h-3.5" /> استيراد
            </button>
            <button onClick={addRef} className="btn-primary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> إضافة
            </button>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>
          تُستخدم للتعبئة التلقائية للكميات عند اختيار المادة في الوجبات
        </p>

        {/* Bulk import */}
        {showBulk && (
          <div className="mb-4 p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">لصق نص (اسم - fr - كمية - وحدة)</label>
                <textarea
                  value={bulkText} onChange={e => setBulkText(e.target.value)} rows={4}
                  className="smart-input resize-none text-sm"
                  placeholder={"بطاطس - Pommes de terre - 150 - غ\nحليب - Lait - 125 - مل"}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button onClick={() => { setShowBulk(false); setBulkText(''); }} className="btn-ghost text-xs py-1.5 px-3">إلغاء</button>
                  <button onClick={handleBulkText} disabled={!bulkText.trim()} className="btn-primary text-xs py-1.5 px-3">استيراد النص</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">أو رفع ملف Excel/CSV</label>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={bulkFileRef} onChange={handleBulkFile} />
                <button onClick={() => bulkFileRef.current?.click()} className="upload-zone w-full flex flex-col items-center gap-2 text-sm">
                  <FileUp className="w-7 h-7 text-emerald-500 opacity-60" />
                  <span className="text-slate-300 font-medium">اختر ملفاً</span>
                  <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>xlsx, xls, csv</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ref table */}
        {showRefTable && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {referenceIngredients.length > 0 ? referenceIngredients.map(ing => (
              <div key={ing.id} className="ingredient-row">
                <div className="flex-1 min-w-[140px]">
                  <input type="text" value={ing.name} onChange={e => updateRef(ing.id, 'name', e.target.value)}
                    placeholder="الاسم بالعربية" className="smart-input text-sm" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <input type="text" value={ing.nameFr || ''} onChange={e => updateRef(ing.id, 'nameFr', e.target.value)}
                    placeholder="Nom français" dir="ltr" className="smart-input text-sm text-left" />
                </div>
                <div className="w-24">
                  <input type="number" min="0" step="0.01" value={ing.quantityPerPerson || ''} onChange={e => updateRef(ing.id, 'quantityPerPerson', Number(e.target.value))}
                    placeholder="الكمية" className="smart-input text-sm text-center" />
                </div>
                <div className="w-20">
                  <input type="text" value={ing.unit} onChange={e => updateRef(ing.id, 'unit', e.target.value)}
                    placeholder="وحدة" className="smart-input text-sm text-center" />
                </div>
                <button onClick={() => removeRef(ing.id)} className="btn-danger"><Trash2 className="w-4 h-4" /></button>
              </div>
            )) : (
              <div className="text-center py-6 text-sm" style={{ color: 'rgba(148,163,184,0.4)' }}>
                لا توجد مواد مرجعية. أضف مواد أو استورد قائمة.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="btn-primary px-8 py-3 text-base">
          التالي: إدارة القائمة
        </button>
      </div>
    </div>
  );
}
