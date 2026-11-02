import React from 'react';
import { 
  CheckSquare, 
  Users, 
  ListPlus, 
  BarChart3, 
  FileSpreadsheet, 
  QrCode,
  ExternalLink 
} from 'lucide-react';
import { SheetConfig } from '../types';

interface NavbarProps {
  activeTab: 'daily' | 'students' | 'items' | 'dashboard' | 'sheets';
  setActiveTab: (tab: 'daily' | 'students' | 'items' | 'dashboard' | 'sheets') => void;
  config: SheetConfig;
  onOpenQRScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  config,
  onOpenQRScanner,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Wordmark Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                SmartCheck
                <span className="text-xs font-normal text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-200">
                  Google Sheets
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                ระบบเช็คชื่อและรายการตรวจประจำวัน
              </p>
            </div>
          </div>

          {/* Navigation Tabs Zone */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'daily'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>เช็คชื่อประจำวัน</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'students'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>รายชื่อนักเรียน</span>
            </button>

            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'items'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>รายการเช็ค</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>สรุปรายงาน</span>
            </button>

            <button
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'sheets'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>เชื่อมต่อชีต</span>
            </button>
          </nav>

          {/* Action Zone */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenQRScanner}
              title="สแกน QR Code นักเรียน"
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <a
              href={config.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>เปิด Google Sheet</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
