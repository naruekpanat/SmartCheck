export type CheckItemType = 'Checkbox' | 'Score' | 'Text';

export interface Student {
  studentId: string;    // รหัสนักเรียน (e.g. "67001")
  rollNo: string;       // เลขที่ (e.g. "1")
  name: string;         // ชื่อ-นามสกุล (e.g. "สมชาย ใจดี")
  classroom: string;    // ชั้น/ห้อง (e.g. "ม.2/1")
  status: 'Active' | 'Inactive'; // สถานะ
  avatarUrl?: string;
  notes?: string;
}

export interface CheckItem {
  itemId: string;       // รหัสรายการ (e.g. "1", "2")
  title: string;        // ชื่อรายการ (e.g. "การมาเรียน", "การแต่งกาย", "ทำความสะอาดเขตพื้นที่")
  type: CheckItemType;  // ประเภท: Checkbox, Score, Text
  active: boolean;      // ใช้งานอยู่หรือไม่
  maxScore?: number;    // สำหรับ Score (default: 5)
  category?: string;    // หมวดหมู่
  description?: string;
}

export interface AttendanceRecord {
  id?: string;
  timestamp: string;    // วัน-เวลาที่บันทึก (e.g. "2026-11-02 08:15")
  date: string;         // วันที่ (e.g. "2026-11-02")
  studentId: string;    // รหัสนักเรียน
  studentName: string;  // ชื่อนักเรียน
  itemId: string;       // รหัสรายการเช็ค
  itemName: string;     // ชื่อรายการเช็ค
  status: string;       // สถานะ: ผ่าน, ไม่ผ่าน, มา, ขาด, สาย, ลา, คะแนน (1-5)
  note: string;         // หมายเหตุ
  recorder: string;     // ผู้บันทึก (e.g. "ครูสมศรี")
}

export interface SheetConfig {
  spreadsheetUrl: string;
  spreadsheetId: string;
  appsScriptUrl: string;
  recorderName: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}
