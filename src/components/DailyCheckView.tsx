import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  UserCheck, 
  CheckCheck, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  Check, 
  Clock, 
  XCircle, 
  FileText, 
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Send,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, CheckItem, AttendanceRecord, SheetConfig } from '../types';
import { storageService } from '../services/storage';

interface DailyCheckViewProps {
  students: Student[];
  checkItems: CheckItem[];
  config: SheetConfig;
  onRecordsSaved: (newRecords: AttendanceRecord[]) => void;
  onUpdateConfig: (config: SheetConfig) => void;
}

export const DailyCheckView: React.FC<DailyCheckViewProps> = ({
  students,
  checkItems,
  config,
  onRecordsSaved,
  onUpdateConfig,
}) => {
  // Today's date in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [recorder, setRecorder] = useState<string>(config.recorderName || 'ครูสมศรี ใจงาม');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Available classes from students
  const availableClasses = useMemo(() => {
    const set = new Set(students.map(s => s.classroom).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return students[0]?.classroom || '2/1';
  });

  // Matrix state: { [studentId]: { [itemId]: { status: string, note: string } } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, { status: string; note: string }>>>({});
  
  // Saving states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState<boolean>(false);
  const [existingDuplicateCount, setExistingDuplicateCount] = useState<number>(0);

  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.includes(selectedClass) && selectedClass !== 'all') {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // Active check items
  const activeItems = useMemo(() => {
    return checkItems.filter(item => item.active);
  }, [checkItems]);

  // Filtered active students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Must be Active for daily check
      if (student.status !== 'Active') return false;
      
      // Class filter
      if (selectedClass !== 'all' && student.classroom !== selectedClass) return false;
      
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          student.name.toLowerCase().includes(q) ||
          student.studentId.includes(q) ||
          student.rollNo.includes(q)
        );
      }
      return true;
    }).sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
  }, [students, selectedClass, searchQuery]);

  // Initialize or load matrix when date or class changes
  useEffect(() => {
    // Check if there are already records in storage for this date
    const allRecords = storageService.getRecords();
    const existingForDate = allRecords.filter(r => r.date === selectedDate);
    
    const newMatrix: Record<string, Record<string, { status: string; note: string }>> = {};

    filteredStudents.forEach(st => {
      newMatrix[st.studentId] = {};
      activeItems.forEach(item => {
        // Find if already recorded
        const rec = existingForDate.find(r => r.studentId === st.studentId && r.itemId === item.itemId);
        if (rec) {
          newMatrix[st.studentId][item.itemId] = {
            status: rec.status,
            note: rec.note || '',
          };
        } else {
          // Defaults
          let defaultStatus = '';
          if (item.itemId === '1' || item.title.includes('มาเรียน')) {
            defaultStatus = 'มา'; // Default to present
          } else if (item.title.includes('เลิกเรียน')) {
            defaultStatus = 'อยู่'; // Default to อยู่
          } else if (item.type === 'Checkbox') {
            defaultStatus = 'ผ่าน'; // Default to pass
          } else if (item.type === 'Score') {
            defaultStatus = '5'; // Default score
          }
          newMatrix[st.studentId][item.itemId] = {
            status: defaultStatus,
            note: '',
          };
        }
      });
    });

    setMatrix(newMatrix);
  }, [selectedDate, selectedClass, filteredStudents.length, activeItems.length]);

  // Quick cell update
  const setCellStatus = (studentId: string, itemId: string, status: string) => {
    setMatrix(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [itemId]: {
          ...prev[studentId]?.[itemId],
          status,
        },
      },
    }));
  };

  const setCellNote = (studentId: string, itemId: string, note: string) => {
    setMatrix(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [itemId]: {
          ...prev[studentId]?.[itemId],
          note,
        },
      },
    }));
  };

  // Bulk action 1: Mark All Present
  const handleBulkMarkAllPresent = () => {
    const attendanceItem = activeItems.find(i => i.itemId === '1' || i.title.includes('มาเรียน'));
    if (!attendanceItem) return;

    setMatrix(prev => {
      const copy = { ...prev };
      filteredStudents.forEach(st => {
        if (!copy[st.studentId]) copy[st.studentId] = {};
        copy[st.studentId][attendanceItem.itemId] = {
          ...copy[st.studentId][attendanceItem.itemId],
          status: 'มา',
        };
      });
      return copy;
    });
  };

  // Bulk action 2: Pass All Checkboxes
  const handleBulkPassAllCheckboxes = () => {
    setMatrix(prev => {
      const copy = { ...prev };
      filteredStudents.forEach(st => {
        if (!copy[st.studentId]) copy[st.studentId] = {};
        activeItems.forEach(item => {
          if (item.type === 'Checkbox' && item.itemId !== '1' && !item.title.includes('มาเรียน')) {
            copy[st.studentId][item.itemId] = {
              ...copy[st.studentId][item.itemId],
              status: item.title.includes('เลิกเรียน') ? 'อยู่' : 'ผ่าน',
            };
          }
        });
      });
      return copy;
    });
  };

  // Bulk action 3: Reset
  const handleReset = () => {
    const newMatrix: Record<string, Record<string, { status: string; note: string }>> = {};
    filteredStudents.forEach(st => {
      newMatrix[st.studentId] = {};
      activeItems.forEach(item => {
        let defaultStatus = '';
        if (item.itemId === '1' || item.title.includes('มาเรียน')) {
          defaultStatus = 'มา';
        } else if (item.title.includes('เลิกเรียน')) {
          defaultStatus = 'อยู่';
        } else if (item.type === 'Checkbox') {
          defaultStatus = 'ผ่าน';
        } else if (item.type === 'Score') {
          defaultStatus = '5';
        }
        newMatrix[st.studentId][item.itemId] = { status: defaultStatus, note: '' };
      });
    });
    setMatrix(newMatrix);
    setSaveSuccessMsg('รีเซ็ตค่าเริ่มต้นสำหรับห้องนี้เรียบร้อยแล้ว');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Calculate stats for current selection
  const stats = useMemo(() => {
    const attendanceItem = activeItems.find(i => i.itemId === '1' || i.title.includes('มาเรียน'));
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    if (attendanceItem) {
      filteredStudents.forEach(st => {
        const val = matrix[st.studentId]?.[attendanceItem.itemId]?.status;
        if (val === 'มา') presentCount++;
        else if (val === 'สาย') lateCount++;
        else if (val === 'ขาด') absentCount++;
        else if (val === 'ลา') leaveCount++;
      });
    }

    return {
      total: filteredStudents.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      leave: leaveCount,
    };
  }, [filteredStudents, matrix, activeItems]);

  // Prepare records to save
  const prepareRecords = (): AttendanceRecord[] => {
    const nowTimeStr = new Date().toTimeString().slice(0, 5);
    const timestamp = `${selectedDate} ${nowTimeStr}`;
    const recordsToSave: AttendanceRecord[] = [];

    filteredStudents.forEach(student => {
      activeItems.forEach(item => {
        const cell = matrix[student.studentId]?.[item.itemId];
        if (cell && cell.status) {
          recordsToSave.push({
            id: `rec_${Date.now()}_${student.studentId}_${item.itemId}`,
            timestamp,
            date: selectedDate,
            studentId: student.studentId,
            studentName: student.name,
            itemId: item.itemId,
            itemName: item.title,
            status: cell.status,
            note: cell.note || '',
            recorder: recorder.trim() || 'ครูผู้บันทึก',
          });
        }
      });
    });

    return recordsToSave;
  };

  // Check duplicates before saving
  const handleInitiateSave = () => {
    if (!recorder.trim()) {
      setSaveErrorMsg('โปรดระบุชื่อผู้บันทึก (ครู)');
      setTimeout(() => setSaveErrorMsg(null), 4000);
      return;
    }

    const records = prepareRecords();
    if (records.length === 0) {
      setSaveErrorMsg('ไม่มีข้อมูลที่เลือกสำหรับบันทึก');
      setTimeout(() => setSaveErrorMsg(null), 4000);
      return;
    }

    // Check duplicate collision
    const existing = storageService.checkBatchDuplicates(
      selectedDate,
      records.map(r => ({ studentId: r.studentId, itemId: r.itemId }))
    );

    if (existing.length > 0) {
      setExistingDuplicateCount(existing.length);
      setShowOverwriteModal(true);
    } else {
      executeSave(records, false);
    }
  };

  const executeSave = async (records: AttendanceRecord[], overwrite: boolean) => {
    setIsSaving(true);
    setShowOverwriteModal(false);

    try {
      // 1. Save to local storage
      const result = storageService.saveBatchRecords(records, overwrite);
      
      // Update config with recorder name
      if (recorder !== config.recorderName) {
        onUpdateConfig({ ...config, recorderName: recorder });
      }

      // 2. Sync to Google Apps Script if URL provided
      if (config.appsScriptUrl) {
        await storageService.syncToAppsScript({
          action: 'saveRecords',
          records: records,
        });
      }

      onRecordsSaved(result.records);

      // Confetti burst for pleasant reward!
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // ignore if blocked
      }

      setSaveSuccessMsg(
        `บันทึกข้อมูลสำเร็จเรียบร้อย (${records.length} รายการ) ${
          config.appsScriptUrl ? 'และส่งไปยัง Google Sheets แล้ว' : ''
        }`
      );

      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setSaveErrorMsg(`เกิดข้อผิดพลาดในการบันทึก: ${err.message || err}`);
      setTimeout(() => setSaveErrorMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Context Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Date Picker */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>วันที่ตรวจเช็ค</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap transition-colors"
              >
                วันนี้
              </button>
            </div>
          </div>

          {/* Classroom Selector */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>ระดับชั้น / ห้องเรียน</span>
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">ทุกชั้นเรียน (ทั้งหมด)</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>
                  ชั้น {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Recorder Name */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>ครูผู้บันทึก</span>
            </label>
            <input
              type="text"
              value={recorder}
              onChange={e => setRecorder(e.target.value)}
              placeholder="ระบุชื่อครูผู้บันทึก"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Quick Search */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>ค้นหานักเรียน</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, เลขที่ หรือรหัส..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

        </div>

        {/* Live Attendance Counters & Bulk Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          
          {/* Statistics Strip */}
          <div className="flex items-center gap-3 sm:gap-5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">นักเรียนทั้งหมด:</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums">{stats.total} คน</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>มา:</span>
              <span className="font-bold text-emerald-800 font-mono tabular-nums">{stats.present}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              <span>สาย:</span>
              <span className="font-bold text-amber-800 font-mono tabular-nums">{stats.late}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
              <span>ขาด:</span>
              <span className="font-bold text-rose-800 font-mono tabular-nums">{stats.absent}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
              <span>ลา:</span>
              <span className="font-bold text-sky-800 font-mono tabular-nums">{stats.leave}</span>
            </div>
          </div>

          {/* Quick Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMarkAllPresent}
              className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>มาเรียนทุกคน</span>
            </button>

            <button
              type="button"
              onClick={handleBulkPassAllCheckboxes}
              className="px-2.5 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>ผ่านทุกรายการ</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>รีเซ็ต</span>
            </button>
          </div>

        </div>
      </div>

      {/* Save Error Banner */}
      {saveErrorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
          <button
            onClick={() => setSaveErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 text-xs underline cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Save Success Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs underline"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Attendance Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 px-3 text-center w-12 font-mono">เลขที่</th>
                <th className="py-3 px-3 w-20 font-mono">รหัส</th>
                <th className="py-3 px-3 min-w-[140px]">ชื่อ-นามสกุล</th>
                <th className="py-3 px-2 text-center w-16">ชั้น</th>
                
                {/* Dynamic Columns for each Active Check Item */}
                {activeItems.map(item => (
                  <th key={item.itemId} className="py-3 px-3 min-w-[140px]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {item.title.includes('เลิกเรียน')
                          ? '(อยู่/ไม่อยู่)'
                          : item.type === 'Checkbox'
                          ? '(ผ่าน/ไม่ผ่าน)'
                          : item.type === 'Score'
                          ? '(คะแนน 1-5)'
                          : '(ข้อความ)'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4 + activeItems.length} className="py-12 text-center text-slate-500 text-xs">
                    ไม่พบรายชื่อนักเรียนในเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const studentMatrix = matrix[student.studentId] || {};

                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Roll No */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">
                        {student.rollNo}
                      </td>

                      {/* Student ID */}
                      <td className="py-3 px-3 font-mono text-slate-500 text-xs">
                        {student.studentId}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {student.name}
                      </td>

                      {/* Classroom */}
                      <td className="py-3 px-2 text-center text-xs text-slate-500">
                        {student.classroom}
                      </td>

                      {/* Dynamic Check Items Cells */}
                      {activeItems.map(item => {
                        const cellData = studentMatrix[item.itemId] || { status: '', note: '' };
                        const isAttendance = item.itemId === '1' || item.title.includes('มาเรียน');

                        return (
                          <td key={item.itemId} className="py-2.5 px-3">
                            {/* 1. Specialized Attendance 4-state buttons */}
                            {isAttendance ? (
                              <div className="flex items-center gap-1">
                                {[
                                  { label: 'มา', key: 'มา', color: 'emerald' },
                                  { label: 'สาย', key: 'สาย', color: 'amber' },
                                  { label: 'ลา', key: 'ลา', color: 'sky' },
                                  { label: 'ขาด', key: 'ขาด', color: 'rose' },
                                ].map(st => {
                                  const isSelected = cellData.status === st.key;
                                  let btnStyle = 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200';
                                  
                                  if (isSelected) {
                                    if (st.color === 'emerald') btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs';
                                    if (st.color === 'amber') btnStyle = 'bg-amber-500 text-white font-bold border-amber-500 shadow-2xs';
                                    if (st.color === 'sky') btnStyle = 'bg-sky-600 text-white font-bold border-sky-600 shadow-2xs';
                                    if (st.color === 'rose') btnStyle = 'bg-rose-600 text-white font-bold border-rose-600 shadow-2xs';
                                  }

                                  return (
                                    <button
                                      key={st.key}
                                      type="button"
                                      onClick={() => setCellStatus(student.studentId, item.itemId, st.key)}
                                      className={`px-2 py-1 text-xs rounded border transition-all ${btnStyle}`}
                                    >
                                      {st.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : item.type === 'Checkbox' ? (
                              item.title.includes('เลิกเรียน') ? (
                                /* Specialized After-School Stay / Not Stay (อยู่ / ไม่อยู่) */
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setCellStatus(student.studentId, item.itemId, 'อยู่')}
                                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-all flex items-center gap-1 ${
                                      cellData.status === 'อยู่'
                                        ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>อยู่</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setCellStatus(student.studentId, item.itemId, 'ไม่อยู่')}
                                    className={`px-2 py-1 text-xs font-medium rounded border transition-all flex items-center gap-1 ${
                                      cellData.status === 'ไม่อยู่'
                                        ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>ไม่อยู่</span>
                                  </button>
                                </div>
                              ) : (
                                /* Standard Pass / Fail Checkbox */
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setCellStatus(student.studentId, item.itemId, 'ผ่าน')}
                                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-all flex items-center gap-1 ${
                                      cellData.status === 'ผ่าน'
                                        ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>ผ่าน</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setCellStatus(student.studentId, item.itemId, 'ไม่ผ่าน')}
                                    className={`px-2 py-1 text-xs font-medium rounded border transition-all flex items-center gap-1 ${
                                      cellData.status === 'ไม่ผ่าน'
                                        ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>ไม่ผ่าน</span>
                                  </button>
                                </div>
                              )
                            ) : item.type === 'Score' ? (
                              /* 3. Score stepper / ratings 1-5 */
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(scoreVal => {
                                  const isSelected = String(cellData.status) === String(scoreVal);
                                  return (
                                    <button
                                      key={scoreVal}
                                      type="button"
                                      onClick={() => setCellStatus(student.studentId, item.itemId, String(scoreVal))}
                                      className={`w-6 h-6 text-xs font-mono font-medium rounded border transition-all ${
                                        isSelected
                                          ? 'bg-blue-700 text-white border-blue-700 font-bold shadow-2xs'
                                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                      }`}
                                    >
                                      {scoreVal}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              /* 4. Text Input */
                              <input
                                type="text"
                                value={cellData.status}
                                onChange={e => setCellStatus(student.studentId, item.itemId, e.target.value)}
                                placeholder="ระบุข้อความ..."
                                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            {config.appsScriptUrl ? (
              <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>เชื่อมต่อ Google Sheets แล้ว (บันทึกลงชีต Records อัตโนมัติ)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>ยังไม่ได้ระบุ Web App URL (ข้อมูลจะบันทึกในเครื่องนี้ก่อน หรือคลิกแท็บ &ldquo;เชื่อมต่อชีต&rdquo; เพื่อซิงก์)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleInitiateSave}
              disabled={isSaving || filteredStudents.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูล ({filteredStudents.length} คน)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Collision Warning Modal */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  พบข้อมูลที่เคยบันทึกไว้ในวันที่นี้แล้ว
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  ระบบตรวจพบว่ามีบันทึกการเช็คของวันที่ <span className="font-mono font-bold text-slate-800">{selectedDate}</span> ในฐานข้อมูลแล้วจำนวน <span className="font-mono font-bold text-amber-700">{existingDuplicateCount}</span> รายการ
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  คุณต้องการให้อัปเดตทับข้อมูลเดิม หรือบันทึกต่อท้ายข้อมูลเดิม?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowOverwriteModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={() => executeSave(prepareRecords(), false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                บันทึกต่อท้าย
              </button>

              <button
                type="button"
                onClick={() => executeSave(prepareRecords(), true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                อัปเดตทับข้อมูลเดิม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
