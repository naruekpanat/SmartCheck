import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  HelpCircle, 
  Database, 
  ShieldCheck, 
  Download, 
  RotateCcw,
  Sparkles,
  Link2
} from 'lucide-react';
import { SheetConfig, Student, CheckItem, AttendanceRecord } from '../types';
import { APPS_SCRIPT_TEMPLATE, storageService } from '../services/storage';

interface GoogleSheetSettingsProps {
  config: SheetConfig;
  onUpdateConfig: (config: SheetConfig) => void;
  students: Student[];
  checkItems: CheckItem[];
  records: AttendanceRecord[];
  onResetData: () => void;
}

export const GoogleSheetSettings: React.FC<GoogleSheetSettingsProps> = ({
  config,
  onUpdateConfig,
  students,
  checkItems,
  records,
  onResetData,
}) => {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl);
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || '');
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Extract sheet ID from URL
  const extractedId = React.useMemo(() => {
    const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : config.spreadsheetId;
  }, [spreadsheetUrl, config.spreadsheetId]);

  // Save config changes
  const handleSaveConfig = () => {
    const updated: SheetConfig = {
      ...config,
      spreadsheetUrl,
      spreadsheetId: extractedId,
      appsScriptUrl: appsScriptUrl.trim(),
    };
    storageService.saveConfig(updated);
    onUpdateConfig(updated);
    setSyncStatus({ success: true, message: 'บันทึกการตั้งค่า Google Sheets เรียบร้อยแล้ว' });
  };

  // Copy Apps Script template
  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 3000);
  };

  // Test sync
  const handleTestSync = async () => {
    if (!appsScriptUrl.trim()) {
      setSyncStatus({ success: false, message: 'กรุณาระบุ Web App URL ของ Google Apps Script ก่อนทดสอบ' });
      return;
    }

    setIsTestingSync(true);
    setSyncStatus(null);

    const res = await storageService.syncToAppsScript({
      action: 'saveRecords',
      records: records.slice(0, 1), // send 1 record as ping test
    });

    setIsTestingSync(false);
    setSyncStatus(res);
  };

  // Download CSV files
  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadStudentsCSV = () => {
    downloadFile('Students.csv', storageService.exportStudentsCSV(students));
  };

  const handleDownloadCheckItemsCSV = () => {
    const headers = ['ItemID', 'ชื่อรายการ', 'ประเภท', 'Active'];
    const rows = checkItems.map(i => [
      `"${i.itemId}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.type}"`,
      i.active ? 'TRUE' : 'FALSE',
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadFile('CheckItems.csv', csv);
  };

  const handleDownloadRecordsCSV = () => {
    downloadFile('Records.csv', storageService.exportRecordsCSV(records));
  };

  // Push all students and check items to Google Sheets
  const [isPushingAll, setIsPushingAll] = useState(false);
  const handlePushAllData = async () => {
    if (!appsScriptUrl.trim()) {
      setSyncStatus({ success: false, message: 'กรุณาระบุ Web App URL ของ Google Apps Script ก่อนกดส่งข้อมูล' });
      return;
    }
    setIsPushingAll(true);
    setSyncStatus(null);

    const res = await storageService.syncToAppsScript({
      action: 'syncAll',
      students,
      checkItems,
    });

    setIsPushingAll(false);
    setSyncStatus({
      success: res.success,
      message: res.success
        ? `ส่งรายชื่อนักเรียน (${students.length} คน) และรายการเช็ค (${checkItems.length} รายการ) ขึ้น Google Sheets สำเร็จเรียบร้อย!`
        : res.message,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Explanation Banner for the Browser Output */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950">
              ข้อความ &ldquo;status: success, students: [], checkItems: []&rdquo; หมายถึงอะไร?
            </h3>
            <p className="text-xs text-blue-900 mt-1 leading-relaxed">
              <strong>นั่นหมายความว่าคุณติดตั้งและ Deploy Google Apps Script สำเร็จแล้ว 100%!</strong> หน้าจอที่คุณเห็นคือการตอบกลับของ <strong>API Endpoint เบื้องหลัง</strong> สำหรับเชื่อมต่อกับระบบ ไม่ใช่หน้าเว็บเช็คชื่อ
            </p>
            <div className="mt-2.5 p-2.5 bg-white/80 rounded-lg border border-blue-200 text-xs text-slate-700 space-y-1">
              <div><strong>ขั้นตอนถัดไปเพื่อเริ่มใช้งาน:</strong></div>
              <div>1. คัดลอกลิงก์ Web App URL จากแถบที่อยู่ของเบราว์เซอร์ที่คุณเปิดอยู่ (ที่ขึ้นต้นด้วย <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">https://script.google.com/macros/s/.../exec</code>)</div>
              <div>2. นำมาวางลงในช่อง <strong>&ldquo;Google Apps Script Web App URL&rdquo;</strong> ด้านล่างนี้</div>
              <div>3. กดปุ่ม <strong>&ldquo;⚡ ส่งรายชื่อนักเรียนและเกณฑ์ตรวจขึ้นชีตทันที&rdquo;</strong> เพื่อนำข้อมูลนักเรียนทั้งหมดขึ้น Google Sheets</div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Sheet Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                การเชื่อมต่อ Google Sheets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เก็บข้อมูลทั้งหมดไว้ใน Google Sheets ของคุณแบบฟรี ไม่มีวันหมดอายุ
              </p>
            </div>
          </div>

          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>เปิด Google Sheet ของคุณ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Form Inputs */}
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ลิงก์ Google Sheets (Spreadsheet URL)
            </label>
            <input
              type="text"
              value={spreadsheetUrl}
              onChange={e => setSpreadsheetUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Spreadsheet ID: {extractedId || '-'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Apps Script Web App URL (สำหรับส่งข้อมูลเข้าชีตอัตโนมัติ) *</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ต้องลงท้ายด้วย /exec
              </span>
            </label>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={appsScriptUrl}
                onChange={e => {
                  const val = e.target.value.trim().replace(/^["']|["']$/g, '');
                  setAppsScriptUrl(val);
                  // Auto-save immediately so user never loses it
                  const updated = {
                    ...config,
                    appsScriptUrl: val,
                    spreadsheetUrl,
                    spreadsheetId: extractedId,
                  };
                  storageService.saveConfig(updated);
                  onUpdateConfig(updated);
                }}
                className={`w-full px-3 py-2.5 text-xs sm:text-sm font-mono rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                  !appsScriptUrl
                    ? 'bg-amber-50/60 border-2 border-dashed border-amber-300 ring-2 ring-amber-200/50 placeholder:text-amber-700/60'
                    : 'bg-slate-50 border border-slate-200 focus:ring-blue-600'
                }`}
                placeholder="วาง Web App URL ที่นี่ (เช่น https://script.google.com/macros/s/AKfycb.../exec)"
              />
              <button
                type="button"
                onClick={handleTestSync}
                disabled={isTestingSync || !appsScriptUrl}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 shadow-2xs"
              >
                {isTestingSync ? 'กำลังทดสอบ...' : 'ทดสอบการส่ง'}
              </button>
            </div>

            {/* Warning if user pasted the temporary redirected echo url */}
            {appsScriptUrl.includes('googleusercontent.com') && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️ คำเตือน:</span>
                <span>
                  ลิงก์ที่คุณวางเป็นลิงก์ชั่วคราวจากการ Redirect (<code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded">googleusercontent.com/macros/echo</code>) 
                  กรุณาใช้ลิงก์ <strong>Web App URL</strong> ต้นทางที่ได้จากหน้าต่าง Deploy ใน Apps Script ซึ่งขึ้นต้นด้วย <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded">https://script.google.com/macros/s/.../exec</code>
                </span>
              </div>
            )}

            {syncStatus && (
              <div className={`mt-2 p-3 rounded-lg text-xs font-medium ${
                syncStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {syncStatus.message}
              </div>
            )}
          </div>

          {/* Instant Push Data Button */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">
                ส่งข้อมูลเริ่มต้นขึ้น Google Sheets
              </div>
              <div className="text-[11px] text-slate-500">
                นำรายชื่อนักเรียน {students.length} คน และรายการเช็ค {checkItems.length} รายการ ไปเติมในชีตของคุณทันที
              </div>
            </div>

            <button
              type="button"
              onClick={handlePushAllData}
              disabled={isPushingAll || !appsScriptUrl}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPushingAll ? (
                <span>กำลังส่งข้อมูล...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ ส่งข้อมูลขึ้นชีตทันที (Push to Sheets)</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onResetData}
              className="text-xs text-rose-600 hover:text-rose-800 underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ตข้อมูลตัวอย่างเริ่มต้น (Factory Reset)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>

      {/* Structure Guide for 3 Sheets */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900">
            โครงสร้างชีต 3 แท็บตามมาตรฐานที่ระบบรองรับ
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          ใน Google Sheet ของคุณ สคริปต์จะสร้างหรือจับคู่กับ 3 แท็บนี้โดยอัตโนมัติ:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sheet 1: Students */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-900 font-mono">1. Students</span>
              <button
                type="button"
                onClick={handleDownloadStudentsCSV}
                className="text-[11px] text-blue-700 hover:underline flex items-center gap-0.5"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">รายชื่อนักเรียนทั้งหมด</p>
            <div className="space-y-1 text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
              <div>A: StudentID (กุญแจหลัก)</div>
              <div>B: เลขที่</div>
              <div>C: ชื่อ-นามสกุล</div>
              <div>D: ชั้น/ห้อง</div>
              <div>E: สถานะ (Active / Inactive)</div>
            </div>
          </div>

          {/* Sheet 2: CheckItems */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-900 font-mono">2. CheckItems</span>
              <button
                type="button"
                onClick={handleDownloadCheckItemsCSV}
                className="text-[11px] text-blue-700 hover:underline flex items-center gap-0.5"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">รายการที่ต้องการตรวจเช็ค</p>
            <div className="space-y-1 text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
              <div>A: ItemID</div>
              <div>B: ชื่อรายการ</div>
              <div>C: ประเภท (Checkbox/Score/Text)</div>
              <div>D: Active (TRUE / FALSE)</div>
            </div>
          </div>

          {/* Sheet 3: Records */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-900 font-mono">3. Records</span>
              <button
                type="button"
                onClick={handleDownloadRecordsCSV}
                className="text-[11px] text-blue-700 hover:underline flex items-center gap-0.5"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">บันทึกประวัติการตรวจเช็ค</p>
            <div className="space-y-1 text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
              <div>A: Timestamp</div>
              <div>B: Date</div>
              <div>C: StudentID</div>
              <div>D: ชื่อนักเรียน</div>
              <div>E: ItemID</div>
              <div>F: ชื่อรายการ</div>
              <div>G: สถานะ</div>
              <div>H: หมายเหตุ</div>
              <div>I: ผู้บันทึก</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step by Step Apps Script Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              วิธีติดตั้ง Google Apps Script (ทำเพียงครั้งเดียว 2 นาที)
            </h3>
          </div>

          <button
            type="button"
            onClick={handleCopyAppsScript}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {hasCopiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">คัดลอกโค้ดแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ด Apps Script</span>
              </>
            )}
          </button>
        </div>

        <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <li>
            เปิด Google Sheets ของคุณ: <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-mono">docs.google.com/spreadsheets/d/{extractedId}</a>
          </li>
          <li>
            ไปที่เมนูด้านบน คลิก <strong>"ส่วนขยาย" (Extensions)</strong> &rarr; เลือก <strong>"Apps Script"</strong>
          </li>
          <li>
            ลบโค้ดเริ่มต้นทั้งหมด แล้วกด <strong>"คัดลอกโค้ด Apps Script"</strong> ด้านบนไปวาง (Ctrl+V)
          </li>
          <li>
            กดปุ่ม <strong>"บันทึก" (Save)</strong> รูปแผ่นดิสก์
          </li>
          <li>
            กดปุ่มสีน้ำเงินมุมขวาบน <strong>"การทำให้ใช้งานได้" (Deploy)</strong> &rarr; <strong>"การทำให้ใช้งานได้ใหม่" (New deployment)</strong>
          </li>
          <li>
            คลิกรูปฟันเฟือง เลือกประเภท <strong>"เว็บแอป" (Web app)</strong>
          </li>
          <li>
            กำหนดสิทธิ์:
            <ul className="list-disc list-inside pl-4 text-slate-500 mt-1">
              <li>ดำเนินการในฐานะ (Execute as): <strong>ฉัน (Me)</strong></li>
              <li>ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong>ทุกคน (Anyone)</strong></li>
            </ul>
          </li>
          <li>
            กดปุ่ม <strong>"ทำให้ใช้งานได้" (Deploy)</strong> แล้วคัดลอก <strong>Web App URL</strong> นำมาวางในช่องด้านบน แล้วกดบันทึก
          </li>
        </ol>

        {/* Code Preview Box */}
        <div className="mt-4 bg-slate-900 rounded-lg p-3 text-slate-200 text-xs font-mono max-h-48 overflow-y-auto">
          <pre>{APPS_SCRIPT_TEMPLATE}</pre>
        </div>
      </div>
    </div>
  );
};
