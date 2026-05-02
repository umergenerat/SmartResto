import React, { useState } from 'react';
import { Plus, Trash2, Calculator as CalculatorIcon, Wand2 } from 'lucide-react';
import { Beneficiaries, ReferenceIngredient } from '../types';
import { findMatchingReference } from '../App';

interface CalculatorPanelProps {
  beneficiaries: Beneficiaries;
  referenceIngredients: ReferenceIngredient[];
}

interface CalcRow {
  id: string;
  name: string;
  qtyFull: number;
  qtyHalf: number;
  unit: string;
}

export default function CalculatorPanel({ beneficiaries, referenceIngredients }: CalculatorPanelProps) {
  const [days, setDays] = useState(30);
  const [fullBoard, setFullBoard] = useState(beneficiaries.fullBoard);
  const [halfBoard, setHalfBoard] = useState(beneficiaries.halfBoard);
  
  const [rows, setRows] = useState<CalcRow[]>([
    { id: '1', name: '', qtyFull: 0, qtyHalf: 0, unit: 'غ' }
  ]);

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(36).substring(2), name: '', qtyFull: 0, qtyHalf: 0, unit: 'غ' }]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof CalcRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const autoFillFromRef = () => {
    const updated = rows.map(r => {
      if (r.name && (!r.qtyFull && !r.qtyHalf)) {
        const ref = findMatchingReference(referenceIngredients, r.name);
        if (ref) {
          // By default, assume the material applies to full board at least
          return { ...r, qtyFull: ref.quantityPerPerson, qtyHalf: 0, unit: ref.unit || 'غ' };
        }
      }
      return r;
    });
    setRows(updated);
  };

  const clearRows = () => {
    if (window.confirm('هل تريد مسح جميع السطور؟')) {
      setRows([{ id: Math.random().toString(36).substring(2), name: '', qtyFull: 0, qtyHalf: 0, unit: 'غ' }]);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="section-title">حاسبة التوقعات والمشتريات</h2>
          <p className="section-subtitle">حساب الكميات الإجمالية المطلوبة لفترة زمنية محددة</p>
        </div>
      </div>

      {/* Global Parameters */}
      <div className="glass-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-200 mb-2">عدد أيام الإطعام المقترحة</label>
          <div className="relative">
            <input 
              type="number" min="1" value={days || ''} 
              onChange={e => setDays(Number(e.target.value))}
              className="smart-input pl-10 text-lg font-bold" 
            />
            <CalendarIcon className="w-5 h-5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-200 mb-2">أفراد المنحة الكاملة</label>
          <div className="relative">
            <input 
              type="number" min="0" value={fullBoard || ''} 
              onChange={e => setFullBoard(Number(e.target.value))}
              className="smart-input text-lg font-bold" 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-200 mb-2">أفراد نصف المنحة</label>
          <div className="relative">
            <input 
              type="number" min="0" value={halfBoard || ''} 
              onChange={e => setHalfBoard(Number(e.target.value))}
              className="smart-input text-lg font-bold" 
            />
          </div>
        </div>
      </div>

      {/* Calculator Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-blue-400" /> المواد والكميات المخصصة
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={autoFillFromRef} className="btn-ghost text-xs py-1.5 px-3">
              <Wand2 className="w-3.5 h-3.5" /> تعبئة من المرجع
            </button>
            <button onClick={clearRows} className="btn-danger text-xs py-1.5 px-3">مسح</button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th className="p-3 font-semibold text-slate-300 w-1/3">المادة</th>
                <th className="p-3 font-semibold text-slate-300 text-center">الكمية/كاملة (يومياً)</th>
                <th className="p-3 font-semibold text-slate-300 text-center">الكمية/نصف (يومياً)</th>
                <th className="p-3 font-semibold text-slate-300 text-center">الوحدة</th>
                <th className="p-3 font-semibold text-emerald-400 text-center">الكمية الإجمالية المطلوبة</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {rows.map((row) => {
                const totalFull = (row.qtyFull || 0) * (fullBoard || 0) * (days || 0);
                const totalHalf = (row.qtyHalf || 0) * (halfBoard || 0) * (days || 0);
                const total = totalFull + totalHalf;
                
                // Smart display logic for units
                let displayTotal = total;
                let displayUnit = row.unit;
                if ((row.unit === 'غ' || row.unit === 'g') && total >= 1000) {
                  displayTotal = total / 1000;
                  displayUnit = 'كغ';
                } else if ((row.unit === 'مل' || row.unit === 'ml') && total >= 1000) {
                  displayTotal = total / 1000;
                  displayUnit = 'لتر';
                }

                return (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-2">
                      <input 
                        type="text" list="ref-list" value={row.name} 
                        onChange={e => updateRow(row.id, 'name', e.target.value)}
                        placeholder="اسم المادة"
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 outline-none p-1 text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" min="0" step="0.01" value={row.qtyFull || ''} 
                        onChange={e => updateRow(row.id, 'qtyFull', Number(e.target.value))}
                        className="w-full bg-black/20 border border-transparent focus:border-blue-500 rounded p-1 text-center outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" min="0" step="0.01" value={row.qtyHalf || ''} 
                        onChange={e => updateRow(row.id, 'qtyHalf', Number(e.target.value))}
                        className="w-full bg-black/20 border border-transparent focus:border-blue-500 rounded p-1 text-center outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" list="units-list" value={row.unit} 
                        onChange={e => updateRow(row.id, 'unit', e.target.value)}
                        className="w-full bg-black/20 border border-transparent focus:border-blue-500 rounded p-1 text-center outline-none"
                      />
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-400" dir="ltr">
                      {displayTotal > 0 ? (
                        <span>
                          {displayTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs opacity-70">{displayUnit}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeRow(row.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={addRow} className="text-blue-400 text-sm font-medium flex items-center gap-1 hover:text-blue-300 transition-colors">
            <Plus className="w-4 h-4" /> إدراج مادة جديدة
          </button>
          
          <div className="text-sm text-slate-400">
            إجمالي المواد: <strong className="text-slate-200">{rows.length}</strong>
          </div>
        </div>
      </div>

      <datalist id="ref-list">
        {referenceIngredients.map(r => <option key={r.id} value={r.name}>{r.nameFr ? `${r.nameFr} - ` : ''}{r.quantityPerPerson} {r.unit}</option>)}
      </datalist>
      <datalist id="units-list">
        {['غ', 'كغ', 'مل', 'لتر', 'حبة', 'وحدة'].map(u => <option key={u} value={u} />)}
      </datalist>
    </div>
  );
}

function CalendarIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  );
}
