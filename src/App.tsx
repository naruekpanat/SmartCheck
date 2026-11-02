import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DailyCheckView } from './components/DailyCheckView';
import { StudentsManager } from './components/StudentsManager';
import { CheckItemsManager } from './components/CheckItemsManager';
import { DashboardView } from './components/DashboardView';
import { GoogleSheetSettings } from './components/GoogleSheetSettings';
import { QRBadgeModal } from './components/QRBadgeModal';
import { Student, CheckItem, AttendanceRecord, SheetConfig } from './types';
import { storageService } from './services/storage';
import { FileSpreadsheet, CheckCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'daily' | 'students' | 'items' | 'dashboard' | 'sheets'>('daily');
  
  // App state
  const [students, setStudents] = useState<Student[]>(() => storageService.getStudents());
  const [checkItems, setCheckItems] = useState<CheckItem[]>(() => storageService.getCheckItems());
  const [records, setRecords] = useState<AttendanceRecord[]>(() => storageService.getRecords());
  const [config, setConfig] = useState<SheetConfig>(() => storageService.getConfig());

  // QR Modal
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    mode: 'scanner' | 'badge';
    student: Student | null;
  }>({
    isOpen: false,
    mode: 'scanner',
    student: null,
  });

  // Automatically fetch real students from Google Sheet on launch
  useEffect(() => {
    if (config.spreadsheetId) {
      storageService.fetchStudentsFromSheet(config.spreadsheetId).then(fetched => {
        if (fetched && fetched.length > 0) {
          setStudents(fetched);
        }
      });
    }
  }, [config.spreadsheetId]);

  // Handle records saved
  const handleRecordsSaved = (newRecords: AttendanceRecord[]) => {
    setRecords(newRecords);
  };

  // Open QR pass badge for specific student
  const handleOpenStudentQR = (student: Student) => {
    setQrModal({
      isOpen: true,
      mode: 'badge',
      student,
    });
  };

  // Open QR scanner modal
  const handleOpenScanner = () => {
    setQrModal({
      isOpen: true,
      mode: 'scanner',
      student: null,
    });
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [appToast, setAppToast] = useState<string | null>(null);

  const showAppToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 4000);
  };

  // Handle student scanned successfully from camera
  const handleScanSuccess = (scannedStudent: Student) => {
    // Switch to daily tab if not already
    setActiveTab('daily');
    showAppToast(`พบนักเรียน: ${scannedStudent.name} (${scannedStudent.classroom} เลขที่ ${scannedStudent.rollNo}) เรียบร้อยแล้ว`);
  };

  // Factory reset data
  const handleResetData = () => {
    setShowResetModal(true);
  };

  const confirmResetData = () => {
    storageService.resetToDefaults();
    setStudents(storageService.getStudents());
    setCheckItems(storageService.getCheckItems());
    setRecords(storageService.getRecords());
    setConfig(storageService.getConfig());
    setShowResetModal(false);
    showAppToast('รีเซ็ตข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        onOpenQRScanner={handleOpenScanner}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'daily' && (
          <DailyCheckView
            students={students}
            checkItems={checkItems}
            config={config}
            onRecordsSaved={handleRecordsSaved}
            onUpdateConfig={setConfig}
          />
        )}

        {activeTab === 'students' && (
          <StudentsManager
            students={students}
            onUpdateStudents={setStudents}
            onOpenStudentQR={handleOpenStudentQR}
          />
        )}

        {activeTab === 'items' && (
          <CheckItemsManager
            checkItems={checkItems}
            onUpdateCheckItems={setCheckItems}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            records={records}
            students={students}
            checkItems={checkItems}
            onRecordsUpdated={setRecords}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetSettings
            config={config}
            onUpdateConfig={setConfig}
            students={students}
            checkItems={checkItems}
            records={records}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* QR Code Scanner / Badge Modal */}
      {qrModal.isOpen && (
        <QRBadgeModal
          mode={qrModal.mode}
          student={qrModal.student}
          students={students}
          onClose={() => setQrModal({ isOpen: false, mode: 'scanner', student: null })}
          onScanSuccess={handleScanSuccess}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ระบบเช็คชื่อนักเรียน SmartCheck</span>
            <span>·</span>
            <span>เชื่อมต่อกับ Google Sheets</span>
            <span className="font-mono text-slate-400">ID: {config.spreadsheetId.slice(0, 12)}...</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('sheets')}
              className="text-blue-700 hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>วิธีเชื่อมต่อชีต</span>
            </button>
            <span>·</span>
            <span>รองรับทั้งคอมพิวเตอร์และมือถือ</span>
          </div>
        </div>
      </footer>

      {/* App-wide Toast */}
      {appToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>{appToast}</span>
          <button onClick={() => setAppToast(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              ยืนยันการรีเซ็ตข้อมูลเริ่มต้น?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ข้อมูลที่บันทึกไว้ในเครื่องจะถูกรีเซ็ตกลับเป็นค่าเริ่มต้นตามรายชื่อนักเรียน ม.2/1
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
              >
                รีเซ็ตข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
