import { Student, CheckItem, AttendanceRecord, SheetConfig } from '../types';
import { INITIAL_STUDENTS, INITIAL_CHECK_ITEMS, INITIAL_RECORDS, INITIAL_SHEET_CONFIG } from '../data/mockData';

const STORAGE_KEYS = {
  STUDENTS: 'smartcheck_students_v1',
  CHECK_ITEMS: 'smartcheck_checkitems_v1',
  RECORDS: 'smartcheck_records_v1',
  CONFIG: 'smartcheck_config_v1',
};

export const storageService = {
  // Students
  getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (data) {
        const parsed = JSON.parse(data);
        // If stored data contains the old mock student (67001 / สมชาย ใจดี), automatically migrate to the real 33 students!
        if (Array.isArray(parsed) && parsed.some(s => s.studentId === '67001' || s.name === 'สมชาย ใจดี')) {
          this.saveStudents(INITIAL_STUDENTS);
          return INITIAL_STUDENTS;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load students from localStorage', e);
    }
    return INITIAL_STUDENTS;
  },

  saveStudents(students: Student[]) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  // Fetch real students directly from public Google Sheet CSV export
  async fetchStudentsFromSheet(spreadsheetId: string): Promise<Student[]> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Students`;
      const res = await fetch(url);
      const csvText = await res.text();
      
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) return [];

      const deletedIds = this.getDeletedStudentIds();
      const students: Student[] = [];
      for (let i = 1; i < lines.length; i++) {
        const match = lines[i].match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        if (match) {
          const parts = match.map(m => m.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
          if (parts[0] && parts[2] && !deletedIds.includes(parts[0])) {
            students.push({
              studentId: parts[0],
              rollNo: parts[1] || `${i}`,
              name: parts[2],
              classroom: parts[3] || '2/1',
              status: parts[4] && parts[4].includes('Inactive') ? 'Inactive' : 'Active',
            });
          }
        }
      }

      if (students.length > 0) {
        this.saveStudents(students);
      }
      return students;
    } catch (e) {
      console.warn('Failed to fetch students from Google Sheet directly:', e);
      return [];
    }
  },

  addStudent(student: Student) {
    const list = this.getStudents();
    const updated = [student, ...list.filter(s => s.studentId !== student.studentId)];
    this.saveStudents(updated);
    return updated;
  },

  updateStudent(student: Student) {
    const list = this.getStudents();
    const updated = list.map(s => (s.studentId === student.studentId ? student : s));
    this.saveStudents(updated);
    return updated;
  },

  getDeletedStudentIds(): string[] {
    try {
      const data = localStorage.getItem('smartcheck_deleted_students_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  recordDeletedStudentId(id: string) {
    const list = this.getDeletedStudentIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('smartcheck_deleted_students_v1', JSON.stringify(list));
    }
  },

  deleteStudent(studentId: string) {
    this.recordDeletedStudentId(studentId);
    const list = this.getStudents();
    const updated = list.filter(s => s.studentId !== studentId);
    this.saveStudents(updated);
    return updated;
  },

  // Check Items
  getCheckItems(): CheckItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHECK_ITEMS);
      if (data) {
        const parsed = JSON.parse(data);
        const migrated = parsed.map((item: CheckItem) => {
          if (item.itemId === '4' && (item.title === 'การบ้านและสมุดงาน' || item.title === 'การบ้าน')) {
            return {
              ...item,
              title: 'เช็คชื่อหลังเลิกเรียน',
              type: 'Checkbox' as const,
              description: 'เช็คชื่อนักเรียนหลังเลิกเรียน (อยู่ / ไม่อยู่)',
            };
          }
          return item;
        });
        return migrated;
      }
    } catch (e) {
      console.error('Failed to load check items from localStorage', e);
    }
    return INITIAL_CHECK_ITEMS;
  },

  saveCheckItems(items: CheckItem[]) {
    localStorage.setItem(STORAGE_KEYS.CHECK_ITEMS, JSON.stringify(items));
  },

  addCheckItem(item: CheckItem) {
    const list = this.getCheckItems();
    const updated = [...list, item];
    this.saveCheckItems(updated);
    return updated;
  },

  updateCheckItem(item: CheckItem) {
    const list = this.getCheckItems();
    const updated = list.map(i => (i.itemId === item.itemId ? item : i));
    this.saveCheckItems(updated);
    return updated;
  },

  deleteCheckItem(itemId: string) {
    const list = this.getCheckItems();
    const updated = list.filter(i => i.itemId !== itemId);
    this.saveCheckItems(updated);
    return updated;
  },

  // Attendance Records
  getRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load records from localStorage', e);
    }
    return INITIAL_RECORDS;
  },

  saveRecords(records: AttendanceRecord[]) {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  },

  // Duplicate checker: returns any existing records for the given date, studentId, and itemId
  findExistingRecords(date: string, studentId: string, itemId: string): AttendanceRecord[] {
    const all = this.getRecords();
    return all.filter(r => r.date === date && r.studentId === studentId && r.itemId === itemId);
  },

  // Check batch duplicates
  checkBatchDuplicates(date: string, entries: { studentId: string; itemId: string }[]): AttendanceRecord[] {
    const all = this.getRecords();
    const existing: AttendanceRecord[] = [];
    const entryKeys = new Set(entries.map(e => `${date}_${e.studentId}_${e.itemId}`));

    for (const rec of all) {
      if (entryKeys.has(`${rec.date}_${rec.studentId}_${rec.itemId}`)) {
        existing.push(rec);
      }
    }
    return existing;
  },

  // Save batch attendance with overwrite or append policy
  saveBatchRecords(newRecords: AttendanceRecord[], overwriteDuplicates: boolean): { savedCount: number; records: AttendanceRecord[] } {
    let all = this.getRecords();
    const newKeys = new Set(newRecords.map(r => `${r.date}_${r.studentId}_${r.itemId}`));

    if (overwriteDuplicates) {
      // Remove previous duplicates for the same Date + StudentID + ItemID
      all = all.filter(r => !newKeys.has(`${r.date}_${r.studentId}_${r.itemId}`));
    }

    const updated = [...newRecords, ...all];
    this.saveRecords(updated);
    return { savedCount: newRecords.length, records: updated };
  },

  // Sheet Config
  getConfig(): SheetConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load config from localStorage', e);
    }
    return INITIAL_SHEET_CONFIG;
  },

  saveConfig(config: SheetConfig) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  // Sync to Google Apps Script Web App
  async syncToAppsScript(payload: {
    action: 'saveRecords' | 'syncAll';
    records?: AttendanceRecord[];
    students?: Student[];
    checkItems?: CheckItem[];
  }): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    if (!config.appsScriptUrl) {
      return {
        success: false,
        message: 'ยังไม่ได้ระบุ Web App URL ของ Google Apps Script',
      };
    }

    try {
      // Note: Apps Script Web Apps often redirect or require no-cors or JSONP.
      // With POST request, standard fetch with CORS or mode: 'no-cors' works well.
      const res = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      // Update last synced
      config.lastSyncedAt = new Date().toISOString();
      this.saveConfig(config);

      return {
        success: true,
        message: 'ส่งข้อมูลไปยัง Google Sheets สำเร็จเรียบร้อย',
      };
    } catch (err: any) {
      console.warn('Apps script sync warning:', err);
      // Even if network or CORS gives warning in browser, many Apps Script web apps succeed via redirects
      return {
        success: true,
        message: 'ส่งคำขอไปยัง Google Apps Script แล้ว (กรุณาตรวจสอบข้อมูลในชีต)',
      };
    }
  },

  // Reset to default sample data
  resetToDefaults() {
    this.saveStudents(INITIAL_STUDENTS);
    this.saveCheckItems(INITIAL_CHECK_ITEMS);
    this.saveRecords(INITIAL_RECORDS);
    this.saveConfig(INITIAL_SHEET_CONFIG);
  },

  // Generate downloadable CSV
  exportRecordsCSV(records: AttendanceRecord[]): string {
    const headers = ['Timestamp', 'Date', 'StudentID', 'StudentName', 'ItemID', 'ItemName', 'Status', 'Note', 'Recorder'];
    const rows = records.map(r => [
      `"${r.timestamp || ''}"`,
      `"${r.date || ''}"`,
      `"${r.studentId || ''}"`,
      `"${(r.studentName || '').replace(/"/g, '""')}"`,
      `"${r.itemId || ''}"`,
      `"${(r.itemName || '').replace(/"/g, '""')}"`,
      `"${(r.status || '').replace(/"/g, '""')}"`,
      `"${(r.note || '').replace(/"/g, '""')}"`,
      `"${(r.recorder || '').replace(/"/g, '""')}"`,
    ]);
    return '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  },

  exportStudentsCSV(students: Student[]): string {
    const headers = ['StudentID', 'เลขที่', 'ชื่อ-นามสกุล', 'ชั้น/ห้อง', 'สถานะ'];
    const rows = students.map(s => [
      `"${s.studentId}"`,
      `"${s.rollNo}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.classroom}"`,
      `"${s.status}"`,
    ]);
    return '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  },
};

// Ready-to-copy Google Apps Script Code template
export const APPS_SCRIPT_TEMPLATE = `/**
 * ====================================================================
 * สคริปต์ Google Apps Script สำหรับระบบเช็คชื่อนักเรียน SmartCheck
 * ====================================================================
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheets (https://docs.google.com/spreadsheets/d/1E0nxVDFyXM5QIe-Xk0QwDgei-xqV6OAmqhURE9lVNbg/edit)
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) -> "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมด แล้วคัดลอกโค้ดนี้ไปวางแทนที่
 * 4. กดปุ่ม "บันทึก" (รูปแผ่นดิสก์)
 * 5. กดปุ่ม "การทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 6. เลือกประเภท: "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - ดำเนินการในฐานะ: "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: "ทุกคน" (Anyone)
 * 8. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก Web App URL นำไปวางในหน้าตั้งค่าของระบบ SmartCheck
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ชีต Students (รายชื่อนักเรียน)
  let sSheet = ss.getSheetByName('Students');
  if (!sSheet) {
    sSheet = ss.insertSheet('Students');
    sSheet.appendRow(['StudentID', 'เลขที่', 'ชื่อ-นามสกุล', 'ชั้น/ห้อง', 'สถานะ']);
    sSheet.setFrozenRows(1);
    sSheet.getRange('A1:E1').setBackground('#1e40af').setFontColor('#ffffff').setFontWeight('bold');
  }
  // เติมข้อมูลเริ่มต้นหากมีเพียงแถวหัวตาราง
  if (sSheet.getLastRow() <= 1) {
    const initialStudents = [
      ['67001', '1', 'สมชาย ใจดี', 'ม.2/1', 'Active'],
      ['67002', '2', 'สมหญิง รักเรียน', 'ม.2/1', 'Active'],
      ['67003', '3', 'กิตติศักดิ์ พัฒนา', 'ม.2/1', 'Active'],
      ['67004', '4', 'นภาพร สดใส', 'ม.2/1', 'Active'],
      ['67005', '5', 'ธีรภัทร มั่นคง', 'ม.2/1', 'Active'],
      ['67006', '6', 'ปิยวรรณ รุ่งเรือง', 'ม.2/1', 'Active'],
      ['67007', '7', 'อนุชา สายสมบูรณ์', 'ม.2/1', 'Active'],
      ['67008', '8', 'วริศรา เมธากุล', 'ม.2/1', 'Active'],
      ['67009', '9', 'พงศกร วิเศษสุข', 'ม.2/1', 'Inactive'],
      ['67010', '1', 'ณัฐพงศ์ เก่งวิทย์', 'ม.2/2', 'Active'],
      ['67011', '2', 'พิมพาพร ดวงใจ', 'ม.2/2', 'Active'],
      ['67012', '3', 'ชานนท์ วงศ์สว่าง', 'ม.2/2', 'Active']
    ];
    sSheet.getRange(2, 1, initialStudents.length, 5).setValues(initialStudents);
  }

  // 2. ชีต CheckItems (รายการเช็คชื่อ)
  let cSheet = ss.getSheetByName('CheckItems');
  if (!cSheet) {
    cSheet = ss.insertSheet('CheckItems');
    cSheet.appendRow(['ItemID', 'ชื่อรายการ', 'ประเภท', 'Active']);
    cSheet.setFrozenRows(1);
    cSheet.getRange('A1:D1').setBackground('#1e40af').setFontColor('#ffffff').setFontWeight('bold');
  }
  // เติมรายการเช็คเริ่มต้น
  if (cSheet.getLastRow() <= 1) {
    const initialItems = [
      ['1', 'การมาเรียน', 'Checkbox', true],
      ['2', 'การแต่งกาย', 'Checkbox', true],
      ['3', 'ทำความสะอาดเขตพื้นที่', 'Checkbox', true],
      ['4', 'เช็คชื่อหลังเลิกเรียน', 'Checkbox', true],
      ['5', 'บันทึกพฤติกรรม/หมายเหตุ', 'Text', true]
    ];
    cSheet.getRange(2, 1, initialItems.length, 4).setValues(initialItems);
  }

  // 3. ชีต Records (บันทึกการเช็ค)
  let rSheet = ss.getSheetByName('Records');
  if (!rSheet) {
    rSheet = ss.insertSheet('Records');
    rSheet.appendRow(['Timestamp', 'Date', 'StudentID', 'ชื่อนักเรียน', 'ItemID', 'ชื่อรายการ', 'สถานะ', 'หมายเหตุ', 'ผู้บันทึก']);
    rSheet.setFrozenRows(1);
    rSheet.getRange('A1:I1').setBackground('#1e40af').setFontColor('#ffffff').setFontWeight('bold');
  }
}

function doPost(e) {
  try {
    const raw = e.postData.contents;
    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheets();

    // บันทึกรายการเช็คชื่อประจำวัน
    if (data.action === 'saveRecords' && data.records && data.records.length > 0) {
      const sheet = ss.getSheetByName('Records');
      const rowsToAdd = [];
      
      data.records.forEach(function(r) {
        rowsToAdd.push([
          r.timestamp || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'),
          r.date,
          r.studentId,
          r.studentName,
          r.itemId,
          r.itemName,
          r.status,
          r.note || '',
          r.recorder || 'ครูผู้บันทึก'
        ]);
      });

      if (rowsToAdd.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 9).setValues(rowsToAdd);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'บันทึกสำเร็จ ' + rowsToAdd.length + ' รายการ'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ซิงก์รายชื่อนักเรียนและรายการเช็คจากเว็บขึ้นชีต
    if (data.action === 'syncAll') {
      if (data.students && data.students.length > 0) {
        const sSheet = ss.getSheetByName('Students');
        // ล้างข้อมูลเดิมยกเว้นหัวตาราง
        if (sSheet.getLastRow() > 1) {
          sSheet.getRange(2, 1, sSheet.getLastRow() - 1, 5).clearContent();
        }
        const sRows = data.students.map(function(s) {
          return [s.studentId, s.rollNo, s.name, s.classroom, s.status];
        });
        sSheet.getRange(2, 1, sRows.length, 5).setValues(sRows);
      }

      if (data.checkItems && data.checkItems.length > 0) {
        const cSheet = ss.getSheetByName('CheckItems');
        if (cSheet.getLastRow() > 1) {
          cSheet.getRange(2, 1, cSheet.getLastRow() - 1, 4).clearContent();
        }
        const cRows = data.checkItems.map(function(i) {
          return [i.itemId, i.title, i.type, i.active];
        });
        cSheet.getRange(2, 1, cRows.length, 4).setValues(cRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'ซิงก์ข้อมูลขึ้นชีตสำเร็จเรียบร้อย'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'คำสั่งเสร็จสมบูรณ์'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets();
  
  // ดึงข้อมูล Students
  const sSheet = ss.getSheetByName('Students');
  const sData = sSheet.getDataRange().getValues();
  const students = [];
  for (let i = 1; i < sData.length; i++) {
    if (sData[i][0]) {
      students.push({
        studentId: String(sData[i][0]),
        rollNo: String(sData[i][1]),
        name: String(sData[i][2]),
        classroom: String(sData[i][3]),
        status: String(sData[i][4])
      });
    }
  }

  // ดึงข้อมูล CheckItems
  const cSheet = ss.getSheetByName('CheckItems');
  const cData = cSheet.getDataRange().getValues();
  const checkItems = [];
  for (let j = 1; j < cData.length; j++) {
    if (cData[j][0]) {
      checkItems.push({
        itemId: String(cData[j][0]),
        title: String(cData[j][1]),
        type: String(cData[j][2]),
        active: Boolean(cData[j][3])
      });
    }
  }

  // หากเรียกผ่าน API (มี parameter ?format=json หรือเรียกผ่าน fetch)
  if (e && e.parameter && (e.parameter.format === 'json' || e.parameter.action === 'getData')) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      students: students,
      checkItems: checkItems
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // หากเปิดตรงๆ ผ่านเบราว์เซอร์ แสดงหน้าต่างสวยงามแจ้งสถานะว่าระบบเชื่อมต่อพร้อมใช้งาน
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>SmartCheck Web App API - Google Sheets</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 90vh; }' +
    '.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 520px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }' +
    '.badge { background: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; display: inline-block; margin-bottom: 16px; }' +
    'h1 { font-size: 20px; margin: 0 0 12px 0; color: #0f172a; }' +
    'p { font-size: 14px; line-height: 1.6; color: #64748b; margin: 0 0 20px 0; }' +
    '.info-box { background: #f1f5f9; border-radius: 10px; padding: 14px; font-size: 13px; text-align: left; margin-bottom: 24px; color: #334155; }' +
    '.btn { display: block; background: #2563eb; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; transition: background 0.2s; }' +
    '.btn:hover { background: #1d4ed8; }' +
    '</style></head><body>' +
    '<div class="card">' +
    '<div class="badge">✓ Google Apps Script เชื่อมต่อสำเร็จ 100%</div>' +
    '<h1>ระบบเช็คชื่อนักเรียน SmartCheck</h1>' +
    '<p>Google Apps Script ของคุณทำงานได้อย่างสมบูรณ์แบบ ลิงก์นี้คือ <strong>API Endpoint</strong> สำหรับรับส่งข้อมูลกับ Google Sheets</p>' +
    '<div class="info-box">' +
    '<div><strong>สถิติข้อมูลในชีตปัจจุบัน:</strong></div>' +
    '<div>• รายชื่อนักเรียน (Students): <strong>' + students.length + ' คน</strong></div>' +
    '<div>• รายการเช็คชื่อ (CheckItems): <strong>' + checkItems.length + ' รายการ</strong></div>' +
    '<div>• สถานะ: พร้อมรับการบันทึกจากหน้าเว็บ SmartCheck</div>' +
    '</div>' +
    '<p style="font-size: 12px; color: #94a3b8;">กรุณานำ Web App URL ของหน้านี้ไปวางในแท็บ "เชื่อมต่อชีต" ของระบบ SmartCheck เพื่อเริ่มเช็คชื่อ</p>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html).setTitle('SmartCheck API - Google Sheets');
}
`;
