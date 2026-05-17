import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Settings, CalendarDays, Calculator, ScanSearch, ChefHat, Download, RefreshCw, ClipboardList, Menu, X } from 'lucide-react';

type Tab = 'dashboard' | 'config' | 'menu' | 'results' | 'calculator' | 'evaluation' | 'sync';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  mealsCount: number;
  resultsCount: number;
}

const navItems = [
  { id: 'dashboard' as Tab, icon: ChefHat, label: 'لوحة التحكم' },
  { id: 'config'    as Tab, icon: Settings, label: 'الإعدادات والمستفيدين' },
  { id: 'menu'      as Tab, icon: CalendarDays, label: 'إدارة القوائم' },
  { id: 'results'   as Tab, icon: Calculator, label: 'حساب الكميات' },
  { id: 'calculator'as Tab, icon: ClipboardList, label: 'حاسبة التوقعات' },
  { id: 'evaluation'as Tab, icon: ScanSearch, label: 'تقييم الأطباق (AI)' },
  { id: 'sync'      as Tab, icon: RefreshCw, label: 'المزامنة والنسخ' },
];

export default function Sidebar({ activeTab, setActiveTab, mealsCount, resultsCount }: SidebarProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleTabClick = (id: Tab) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <aside className="sidebar-bg w-full md:w-64 flex flex-col shrink-0 z-20 sticky top-0 md:h-screen md:static shadow-md md:shadow-none">
        {/* Mobile Header & Desktop Logo */}
        <div className="p-4 md:p-6 border-b border-emerald-900/40 flex items-center justify-between md:justify-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center glow-emerald"
                 style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold gradient-text leading-none">SMART RESTO</h1>
              <p className="text-[10px] md:text-xs mt-0.5" style={{ color: 'rgba(110,231,183,0.5)' }}>حاسبة المطعمة الذكية</p>
            </div>
          </div>
          
          {/* Hamburger Button for Mobile */}
          <button 
            className="md:hidden p-2 text-emerald-300 hover:bg-emerald-900/30 rounded-lg transition-colors focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Navigation - Hidden on mobile unless open */}
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col absolute md:static top-full left-0 right-0 sidebar-bg md:bg-transparent border-b md:border-b-0 border-emerald-900/40 shadow-xl md:shadow-none h-[calc(100vh-73px)] md:h-auto overflow-y-auto`}>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-right">{label}</span>
                {id === 'menu' && mealsCount > 0 && (
                  <span className="badge-emerald text-xs px-2 py-0.5">{mealsCount}</span>
                )}
                {id === 'results' && resultsCount > 0 && (
                  <span className="badge-emerald text-xs px-2 py-0.5">{resultsCount}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Install App Button */}
          {deferredPrompt && (
            <div className="p-4 px-6 border-t border-emerald-900/30">
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-emerald-900/30">
            <p className="text-center text-xs" style={{ color: 'rgba(110,231,183,0.4)' }}>
              تطوير <span style={{ color: 'rgba(110,231,183,0.8)' }} className="font-bold">عمر أيت لوتو</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-10 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
