import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Copy, Check, RefreshCw, Smartphone, QrCode, Scan } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
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

  // QR Sync State
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrChunks, setQrChunks] = useState<string[]>([]);
  const [chunkIdx, setChunkIdx] = useState(0);

  const [isScanningQR, setIsScanningQR] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const scannedChunksRef = useRef<string[]>([]);
  const totalChunksRef = useRef<number>(0);
  
  // Audio for feedback
  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  };

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
    const bytes = new TextEncoder().encode(dataStr);
    let binString = "";
    for (let i = 0; i < bytes.length; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binString);
    
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
      const base64 = pasteData.trim();
      const binString = atob(base64);
      
      try {
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        const decoded = new TextDecoder().decode(bytes);
        const data = JSON.parse(decoded);
        loadData(data);
      } catch (e) {
        // Fallback for older versions
        const decoded = decodeURIComponent(binString);
        const data = JSON.parse(decoded);
        loadData(data);
      }
      
      setPasteData('');
      setMsg('تم استيراد البيانات من النص بنجاح!');
    } catch (err) {
      setMsg('النص غير صالح. تأكد من نسخ الرمز بالكامل.');
    }
  };

  // --- QR Generator Logic ---
  const CHUNK_SIZE = 250; // max safe size for reliable fast scanning
  const startGeneratingQR = () => {
    const dataStr = JSON.stringify(getSyncData());
    
    // Optimized Base64 encoding for Unicode (reduces size dramatically)
    const bytes = new TextEncoder().encode(dataStr);
    let binString = "";
    for (let i = 0; i < bytes.length; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binString);
    
    const total = Math.ceil(base64.length / CHUNK_SIZE);
    const chunks: string[] = [];
    for (let i = 0; i < total; i++) {
      chunks.push(`${i + 1}/${total}|${base64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`);
    }
    setQrChunks(chunks);
    setChunkIdx(0);
    setIsGeneratingQR(true);
    setMsg('');
  };

  useEffect(() => {
    let interval: any;
    if (isGeneratingQR && qrChunks.length > 0) {
      interval = setInterval(() => {
        setChunkIdx((prev) => (prev + 1) % qrChunks.length);
      }, 400); // 400ms allows camera enough time to grab each frame securely
    }
    return () => clearInterval(interval);
  }, [isGeneratingQR, qrChunks]);


  // --- QR Scanner Logic ---
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("qr-reader");
        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        
        let isDone = false;
        const onScanSuccess = (text: string) => {
          if (isDone) return;
          const parts = text.split('|');
          if (parts.length >= 2) {
            const header = parts[0].split('/');
            if (header.length === 2) {
              const m = parseInt(header[0], 10);
              const n = parseInt(header[1], 10);
              const dataPart = parts.slice(1).join('|');
              
              if (totalChunksRef.current === 0) {
                totalChunksRef.current = n;
                scannedChunksRef.current = new Array(n).fill(null);
              }
              
              if (m > 0 && m <= n && !scannedChunksRef.current[m - 1]) {
                scannedChunksRef.current[m - 1] = dataPart;
                const currentCount = scannedChunksRef.current.filter(Boolean).length;
                setScanProgress({ current: currentCount, total: n });
                beep(); // feedback beep on new chunk
                
                if (currentCount === n) {
                  isDone = true;
                  
                  const processScan = () => {
                    try {
                      const fullBase64 = scannedChunksRef.current.join('');
                      const binString = atob(fullBase64);
                      
                      try {
                        const bytes = new Uint8Array(binString.length);
                        for (let i = 0; i < binString.length; i++) {
                          bytes[i] = binString.charCodeAt(i);
                        }
                        const decoded = new TextDecoder().decode(bytes);
                        const data = JSON.parse(decoded);
                        loadData(data);
                      } catch (e1) {
                        const decoded = decodeURIComponent(binString);
                        const data = JSON.parse(decoded);
                        loadData(data);
                      }
                      
                      if (isComponentMounted) setMsg('تم مسح واستيراد البيانات عبر QR بنجاح!');
                    } catch(err) {
                      if (isComponentMounted) setMsg('حدث خطأ في تجميع أو معالجة بيانات الـ QR.');
                    }
                  };

                  if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                      html5QrCode?.clear();
                      if (isComponentMounted) setIsScanningQR(false);
                      processScan();
                    }).catch(() => {
                      if (isComponentMounted) setIsScanningQR(false);
                      processScan();
                    });
                  } else {
                    if (isComponentMounted) setIsScanningQR(false);
                    processScan();
                  }
                }
              }
            }
          }
        };

        // Try environment camera first
        try {
          await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
        } catch (e) {
          // Fallback to user camera if environment is not available
          if (isComponentMounted) {
            try {
              await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
            } catch (e2) {
              if (isComponentMounted) setMsg("تعذر الوصول إلى الكاميرا. يرجى التأكد من الصلاحيات.");
            }
          }
        }
      } catch (err) {
        console.error("QR Scanner Error:", err);
        if (isComponentMounted) {
          setMsg("تعذر تشغيل الكاميرا.");
        }
      }
    };

    if (isScanningQR) {
      scannedChunksRef.current = [];
      totalChunksRef.current = 0;
      setScanProgress({ current: 0, total: 0 });
      setMsg('');
      
      // Delay start slightly to ensure DOM element is ready
      setTimeout(() => {
        if (isComponentMounted) startScanner();
      }, 100);
    }

    return () => {
      isComponentMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
      }
    };
  }, [isScanningQR]);

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
              onClick={startGeneratingQR}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl transition-all font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              <QrCode className="w-5 h-5" />
              توليد رمز QR (سريع ومتسلسل)
            </button>

            <button
              onClick={handleExportFile}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-100 rounded-xl transition-all font-medium text-sm mt-4"
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
            
            <button
              onClick={() => setIsScanningQR(!isScanningQR)}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-500 hover:bg-blue-400 text-slate-900 rounded-xl transition-all font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            >
              {isScanningQR ? <Check className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
              {isScanningQR ? 'إيقاف المسح' : 'مسح رمز QR'}
            </button>

            <div className="relative mt-4">
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
                rows={2}
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

        {/* QR Scanner Modal / Inline UI */}
        {isScanningQR && (
          <div className="mt-8 p-6 glass-card border border-blue-500/30 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-slate-800">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }} 
              />
            </div>
            <h3 className="text-lg font-bold text-center text-blue-300 mb-2">وجّه الكاميرا نحو رمز QR</h3>
            {scanProgress.total > 0 && (
              <p className="text-center text-blue-200 text-sm mb-4 font-bold">
                تم التقاط: {scanProgress.current} من {scanProgress.total} أجزاء
              </p>
            )}
            <div id="qr-reader" className="mx-auto rounded-xl overflow-hidden w-full max-w-sm bg-black" style={{ minHeight: '300px' }} />
          </div>
        )}

        {/* QR Generator Modal / Inline UI */}
        {isGeneratingQR && qrChunks.length > 0 && (
          <div className="mt-8 p-6 glass-card border border-emerald-500/30 rounded-2xl text-center flex flex-col items-center">
            <h3 className="text-lg font-bold text-emerald-300 mb-2">امسح الرمز من الجهاز الآخر</h3>
            <p className="text-sm text-emerald-200/70 mb-6">
              يتم عرض الرموز بشكل متتابع سريع (الجزء {chunkIdx + 1} من {qrChunks.length}). دع الكاميرا تمسح باستمرار.
            </p>
            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl">
              <QRCodeSVG 
                value={qrChunks[chunkIdx]} 
                size={300} 
                level="L" // L is low error correction for smaller simpler QR codes (faster scanning)
              />
            </div>
            <button 
              onClick={() => setIsGeneratingQR(false)}
              className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
            >
              إلغاء وإخفاء
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
