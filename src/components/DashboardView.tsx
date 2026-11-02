import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  UserX
} from 'lucide-react';
import { AttendanceRecord, Student, CheckItem } from '../types';
import { storageService } from '../services/storage';

interface DashboardViewProps {
  records: AttendanceRecord[];
  students: Student[];
  checkItems: CheckItem[];
  onRecordsUpdated: (updated: AttendanceRecord[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  students,
  checkItems,
  onRecordsUpdated,
}) => {
  // Filters
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedItemFilter, setSelectedItemFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recordToDeleteId, setRecordToDeleteId] = useState<string | null>(null);

  // Extract unique dates from records
  const availableDates = useMemo(() => {
    const set = new Set(records.map(r => r.date).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedDateFilter !== 'all' && r.date !== selectedDateFilter) return false;
      if (selectedItemFilter !== 'all' && r.itemId !== selectedItemFilter) return false;
      if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.studentId.includes(q) ||
          r.itemName.toLowerCase().includes(q) ||
          (r.recorder && r.recorder.toLowerCase().includes(q)) ||
          (r.note && r.note.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [records, selectedDateFilter, selectedItemFilter, selectedStatusFilter, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    // Look at attendance records (itemId === '1' or title contains มาเรียน)
    const attendanceRecs = records.filter(r => r.itemId === '1' || r.itemName.includes('มาเรียน'));
    
    const presentRecs = attendanceRecs.filter(r => r.status === 'มา').length;
    const lateRecs = attendanceRecs.filter(r => r.status === 'สาย').length;
    const absentRecs = attendanceRecs.filter(r => r.status === 'ขาด').length;
    const leaveRecs = attendanceRecs.filter(r => r.status === 'ลา').length;

    const totalAttendanceChecked = attendanceRecs.length;
    const attendanceRate = totalAttendanceChecked > 0 
      ? Math.round(((presentRecs + lateRecs) / totalAttendanceChecked) * 100) 
      : 100;

    // Checkbox items fail count
    const failedRecs = records.filter(r => r.status === 'ไม่ผ่าน').length;

    return {
      totalRecords: records.length,
      attendanceRate,
      presentRecs,
      lateRecs,
      absentRecs,
      leaveRecs,
      failedRecs,
    };
  }, [records]);

  // Students who need attention (absent, late, or failed items)
  const studentsNeedingAttention = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; issues: string[] }>();

    filteredRecords.forEach(r => {
      if (r.status === 'ขาด' || r.status === 'ไม่ผ่าน' || r.status === 'ไม่อยู่' || r.status === 'สาย') {
        const key = r.studentId;
        if (!map.has(key)) {
          map.set(key, { studentId: r.studentId, studentName: r.studentName, issues: [] });
        }
        map.get(key)!.issues.push(`${r.itemName}: ${r.status} (${r.date})`);
      }
    });

    return Array.from(map.values());
  }, [filteredRecords]);

  // Delete single record
  const handleDeleteRecord = (id?: string) => {
    if (!id) return;
    setRecordToDeleteId(id);
  };

  const confirmDeleteRecord = () => {
    if (!recordToDeleteId) return;
    const updated = records.filter(r => r.id !== recordToDeleteId);
    storageService.saveRecords(updated);
    onRecordsUpdated(updated);
    setRecordToDeleteId(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = storageService.exportRecordsCSV(filteredRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
        
        {/* KPI 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>อัตราการมาเรียน</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {stats.attendanceRate}%
            </span>
            <span className="text-xs text-slate-500">เฉลี่ยรวม</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>มา: {stats.presentRecs}</span>
            <span>·</span>
            <span>สาย: {stats.lateRecs}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ขาดเรียนสะสม</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-mono tabular-nums">
              {stats.absentRecs}
            </span>
            <span className="text-xs text-slate-500">ครั้ง</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>ลาป่วย/ลากิจ: {stats.leaveRecs} ครั้ง</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ไม่ผ่านเกณฑ์ตรวจ</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono tabular-nums">
              {stats.failedRecs}
            </span>
            <span className="text-xs text-slate-500">รายการ</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>เช่น แต่งกาย, เขตพื้นที่</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>บันทึกทั้งหมดในชีต</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono tabular-nums">
              {stats.totalRecords}
            </span>
            <span className="text-xs text-slate-500">แถวข้อมูล</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>ชีต Records ใน Google Sheets</span>
          </div>
        </div>

      </div>

      {/* Attention / Action Required Students */}
      {studentsNeedingAttention.length > 0 && (
        <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-4 shadow-xs no-print">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>นักเรียนที่ต้องติดตามเป็นพิเศษ (มีประวัติขาดเรียนหรือตรวจไม่ผ่านเกณฑ์)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {studentsNeedingAttention.slice(0, 6).map(st => (
              <div key={st.studentId} className="bg-white p-3 rounded-lg border border-rose-100 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs">{st.studentName}</span>
                  <span className="font-mono text-[10px] text-slate-400">#{st.studentId}</span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {st.issues.slice(0, 2).map((iss, idx) => (
                    <div key={idx} className="text-[11px] text-rose-700 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                      <span>{iss}</span>
                    </div>
                  ))}
                  {st.issues.length > 2 && (
                    <div className="text-[10px] text-slate-400">
                      และอีก {st.issues.length - 2} รายการ...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Records Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-700" />
              <span>ประวัติการบันทึก (ชีต Records)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลที่ถูกบันทึกลงในชีต Records ใน Google Sheets พร้อม Timestamp และผู้บันทึก
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>พิมพ์รายงาน</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 no-print">
          
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสนักเรียน หรือผู้บันทึก..."
              className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Date Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedDateFilter}
              onChange={e => setSelectedDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">ทุกวันที่</option>
              {availableDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Item Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedItemFilter}
              onChange={e => setSelectedItemFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">ทุกรายการตรวจ</option>
              {checkItems.map(item => (
                <option key={item.itemId} value={item.itemId}>{item.title}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="มา">มา</option>
              <option value="สาย">สาย</option>
              <option value="ลา">ลา</option>
              <option value="ขาด">ขาด</option>
              <option value="อยู่">อยู่</option>
              <option value="ไม่อยู่">ไม่อยู่</option>
              <option value="ผ่าน">ผ่าน</option>
              <option value="ไม่ผ่าน">ไม่ผ่าน</option>
            </select>
          </div>

        </div>

        {/* Table View */}
        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-3 font-mono">Timestamp</th>
                  <th className="py-2.5 px-3 font-mono">Date</th>
                  <th className="py-2.5 px-3 font-mono">StudentID</th>
                  <th className="py-2.5 px-3">ชื่อนักเรียน</th>
                  <th className="py-2.5 px-3">รายการเช็ค</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3">หมายเหตุ</th>
                  <th className="py-2.5 px-3">ผู้บันทึก</th>
                  <th className="py-2.5 px-2 text-center w-10 no-print"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      ไม่พบประวัติการบันทึกที่ตรงตามเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, index) => {
                    const isPass = rec.status === 'มา' || rec.status === 'ผ่าน' || rec.status === 'อยู่' || Number(rec.status) >= 4;
                    const isFail = rec.status === 'ขาด' || rec.status === 'ไม่ผ่าน' || rec.status === 'ไม่อยู่';
                    const isWarning = rec.status === 'สาย' || rec.status === 'ลา';

                    return (
                      <tr key={rec.id || index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {rec.timestamp}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {rec.date}
                        </td>

                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                          {rec.studentId}
                        </td>

                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {rec.studentName}
                        </td>

                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {rec.itemName}
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isFail
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {rec.status}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-500 max-w-[180px] truncate">
                          {rec.note || '-'}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {rec.recorder}
                        </td>

                        <td className="py-2.5 px-2 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.id)}
                            title="ลบแถวนี้"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              แสดงข้อมูล <span className="font-semibold text-slate-800">{filteredRecords.length}</span> แถว
            </span>
            <span className="text-[11px] text-slate-400">
              * ข้อมูลตรงกับชีต Records: Timestamp, Date, StudentID, ชื่อนักเรียน, ItemID, ชื่อรายการ, สถานะ, หมายเหตุ, ผู้บันทึก
            </span>
          </div>
        </div>

      </div>

      {/* Record Delete Modal */}
      {recordToDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              ยืนยันการลบประวัติรายการนี้?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ข้อมูลแถวนี้จะถูกลบออกจากประวัติการเช็คชื่อทันที
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecordToDeleteId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
              >
                ลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
