import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  UserX, 
  UserCheck, 
  Download, 
  Upload, 
  QrCode,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Student } from '../types';
import { storageService } from '../services/storage';

interface StudentsManagerProps {
  students: Student[];
  onUpdateStudents: (updated: Student[]) => void;
  onOpenStudentQR: (student: Student) => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({
  students,
  onUpdateStudents,
  onOpenStudentQR,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTextInput, setBulkTextInput] = useState('');

  // Form states
  const [formData, setFormData] = useState<Student>({
    studentId: '',
    rollNo: '1',
    name: '',
    classroom: 'ม.2/1',
    status: 'Active',
    notes: '',
  });

  // Delete confirmation modal state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4500);
  };

  // Extract unique classrooms
  const classrooms = useMemo(() => {
    const set = new Set(students.map(s => s.classroom).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Class filter
      if (selectedClass !== 'all' && student.classroom !== selectedClass) return false;

      // Status filter
      if (statusFilter !== 'all' && student.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          student.name.toLowerCase().includes(q) ||
          student.studentId.includes(q) ||
          student.rollNo.includes(q) ||
          student.classroom.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      if (a.classroom === b.classroom) {
        return Number(a.rollNo || 0) - Number(b.rollNo || 0);
      }
      return a.classroom.localeCompare(b.classroom);
    });
  }, [students, selectedClass, statusFilter, searchQuery]);

  // Handle open add modal
  const handleOpenAdd = () => {
    // Generate next StudentID suggestion
    const maxId = students.reduce((max, s) => {
      const num = parseInt(s.studentId, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 67000);

    const nextId = String(maxId + 1);
    const defaultClass = selectedClass !== 'all' ? selectedClass : 'ม.2/1';
    
    // Suggest next rollNo in that class
    const inClass = students.filter(s => s.classroom === defaultClass);
    const nextRoll = inClass.length > 0 ? String(inClass.length + 1) : '1';

    setFormData({
      studentId: nextId,
      rollNo: nextRoll,
      name: '',
      classroom: defaultClass,
      status: 'Active',
      notes: '',
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (student: Student) => {
    setFormData({ ...student });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Handle toggle status (Active/Inactive)
  const handleToggleStatus = (student: Student) => {
    const newStatus = student.status === 'Active' ? 'Inactive' : 'Active';
    const updated = storageService.updateStudent({
      ...student,
      status: newStatus,
      notes: newStatus === 'Inactive' && !student.notes ? 'ย้ายหรือพักการเรียน' : student.notes,
    });
    onUpdateStudents(updated);
    showNotice(
      'info',
      newStatus === 'Inactive'
        ? `เปลี่ยนสถานะ "${student.name}" เป็น Inactive (ย้าย/พักการเรียน) แล้ว`
        : `เปลี่ยนสถานะ "${student.name}" กลับเป็น Active (พร้อมเช็คชื่อ) แล้ว`
    );
  };

  // Handle delete student - open in-app modal (never blocked by iframe sandbox)
  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };

  // Confirm permanent deletion
  const handleConfirmPermanentDelete = () => {
    if (!studentToDelete) return;
    const name = studentToDelete.name;
    const updated = storageService.deleteStudent(studentToDelete.studentId);
    onUpdateStudents(updated);
    setStudentToDelete(null);
    showNotice('success', `ลบข้อมูลนักเรียน "${name}" ออกจากระบบเรียบร้อยแล้ว`);
  };

  // Inactive from delete modal
  const handleSetInactiveFromModal = () => {
    if (!studentToDelete) return;
    const name = studentToDelete.name;
    const updated = storageService.updateStudent({
      ...studentToDelete,
      status: 'Inactive',
      notes: studentToDelete.notes || 'ย้ายหรือพักการเรียน',
    });
    onUpdateStudents(updated);
    setStudentToDelete(null);
    showNotice('info', `เปลี่ยนสถานะ "${name}" เป็น Inactive (ย้าย/พักการเรียน) แล้ว`);
  };

  // Save student form
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId.trim() || !formData.name.trim()) {
      showNotice('error', 'กรุณากรอกรหัสนักเรียนและชื่อ-นามสกุลให้ครบถ้วน');
      return;
    }

    if (!isEditing) {
      // Check duplicate ID
      const exists = students.some(s => s.studentId === formData.studentId.trim());
      if (exists) {
        showNotice('error', `รหัสนักเรียน ${formData.studentId} มีอยู่ในระบบแล้ว กรุณาใช้รหัสที่ไม่ซ้ำ`);
        return;
      }
      const updated = storageService.addStudent(formData);
      onUpdateStudents(updated);
      showNotice('success', `เพิ่มนักเรียน "${formData.name}" เรียบร้อยแล้ว`);
    } else {
      const updated = storageService.updateStudent(formData);
      onUpdateStudents(updated);
      showNotice('success', `บันทึกการแก้ไขข้อมูล "${formData.name}" สำเร็จ`);
    }

    setIsModalOpen(false);
  };

  // Handle bulk import from text
  const handleBulkImport = () => {
    if (!bulkTextInput.trim()) return;

    const lines = bulkTextInput.split('\n');
    const newStudents: Student[] = [];

    lines.forEach(line => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const studentId = parts[0] || `67${Math.floor(100 + Math.random() * 900)}`;
        const rollNo = parts[1] || '1';
        const name = parts[2] || parts[1] || 'นักเรียน';
        const classroom = parts[3] || 'ม.2/1';
        const status = (parts[4] === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive';

        newStudents.push({
          studentId,
          rollNo,
          name,
          classroom,
          status,
        });
      }
    });

    if (newStudents.length > 0) {
      // Merge with existing
      let current = [...students];
      newStudents.forEach(st => {
        current = current.filter(s => s.studentId !== st.studentId);
        current.push(st);
      });

      storageService.saveStudents(current);
      onUpdateStudents(current);
      setIsBulkModalOpen(false);
      setBulkTextInput('');
      showNotice('success', `นำเข้ารายชื่อนักเรียนสำเร็จ ${newStudents.length} คน`);
    } else {
      showNotice('error', 'ไม่พบข้อมูลที่ตรงตามรูปแบบ (รหัสนักเรียน, เลขที่, ชื่อ-นามสกุล, ห้อง)');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = storageService.exportStudentsCSV(filteredStudents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Students_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('info', 'ส่งออกไฟล์ Students.csv สำเร็จ');
  };

  // Fetch live students from Google Sheet
  const [isFetchingFromSheet, setIsFetchingFromSheet] = useState(false);
  const handleFetchFromSheet = async () => {
    setIsFetchingFromSheet(true);
    const config = storageService.getConfig();
    const fetched = await storageService.fetchStudentsFromSheet(config.spreadsheetId);
    setIsFetchingFromSheet(false);
    if (fetched.length > 0) {
      onUpdateStudents(fetched);
      showNotice('success', `ดึงรายชื่อนักเรียนจริงจาก Google Sheet สำเร็จเรียบร้อย (${fetched.length} คน)!`);
    } else {
      showNotice('error', 'ไม่สามารถดึงข้อมูลจากชีตได้ กรุณาตรวจสอบว่าชีต Students มีข้อมูลหรือไม่');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notice */}
      {notice && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 ${
          notice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : notice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notice.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {notice.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{notice.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotice(null)} 
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Roster Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Title and stats */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" />
              <span>รายชื่อนักเรียน (ชีต Students)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {students.length} คน
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ดึงข้อมูลตรงจากชีต Students หรือเพิ่ม/แก้ไขรหัสนักเรียน เลขที่ และชั้นเรียน
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFetchFromSheet}
              disabled={isFetchingFromSheet}
              title="ดึงรายชื่อล่าสุดจาก Google Sheet"
              className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isFetchingFromSheet ? (
                <span>กำลังดึงข้อมูล...</span>
              ) : (
                <>
                  <span className="text-base leading-none">🔄</span>
                  <span>ดึงรายชื่อจาก Google Sheet</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>นำเข้ารายชื่อ</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มนักเรียนใหม่</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสนักเรียน หรือเลขที่..."
              className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Class Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">ทุกระดับชั้น/ห้องเรียน</option>
              {classrooms.map(c => (
                <option key={c} value={c}>ชั้น {c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="Active">เฉพาะที่กำลังศึกษา (Active)</option>
              <option value="Inactive">ย้าย/พักการเรียน (Inactive)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 px-3 text-center w-14 font-mono">เลขที่</th>
                <th className="py-3 px-4 w-28 font-mono">StudentID</th>
                <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                <th className="py-3 px-3 text-center w-24">ชั้น/ห้อง</th>
                <th className="py-3 px-3 text-center w-28">สถานะ</th>
                <th className="py-3 px-4 text-right w-44">การกระทำ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Roll No */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">
                      {student.rollNo}
                    </td>

                    {/* Student ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {student.studentId}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{student.name}</span>
                        {student.notes && (
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({student.notes})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Classroom */}
                    <td className="py-3 px-3 text-center text-slate-700">
                      {student.classroom}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        student.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          student.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'
                        }`}></span>
                        {student.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenStudentQR(student)}
                          title="ดู QR Code บัตรนักเรียน"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(student)}
                          title="แก้ไขข้อมูล"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(student)}
                          title={student.status === 'Active' ? 'เปลี่ยนเป็น Inactive' : 'เปลี่ยนเป็น Active'}
                          className={`p-1.5 rounded transition-colors ${
                            student.status === 'Active'
                              ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {student.status === 'Active' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student)}
                          title="ลบนักเรียน"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            แสดงนักเรียน <span className="font-semibold text-slate-800">{filteredStudents.length}</span> จากทั้งหมด <span className="font-semibold text-slate-800">{students.length}</span> คน
          </span>
          <span className="text-[11px] text-slate-400">
            * ชีต Students: StudentID, เลขที่, ชื่อ-นามสกุล, ชั้น/ห้อง, สถานะ
          </span>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {isEditing ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    StudentID (รหัสนักเรียน) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="เช่น 67001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่
                  </label>
                  <input
                    type="text"
                    value={formData.rollNo}
                    onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="เช่น 1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชั้น/ห้อง
                  </label>
                  <input
                    type="text"
                    value={formData.classroom}
                    onChange={e => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="เช่น ม.2/1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะ
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Active">Active (กำลังเรียน)</option>
                    <option value="Inactive">Inactive (ย้าย/พัก)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="เช่น ย้ายสถานศึกษา, ลาพักการเรียน"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              นำเข้ารายชื่อนักเรียนหลายคน (Bulk Import)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              วางข้อมูลจาก Excel หรือ CSV รูปแบบ: <br />
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">
                StudentID, เลขที่, ชื่อ-นามสกุล, ชั้น/ห้อง
              </code>
            </p>

            <textarea
              rows={8}
              value={bulkTextInput}
              onChange={e => setBulkTextInput(e.target.value)}
              placeholder="ตัวอย่าง:&#10;67013, 13, ธนกฤต เกียรติสุข, ม.2/1&#10;67014, 14, สุพัตรา เจริญผล, ม.2/1&#10;67015, 15, อภิสิทธิ์ มั่นคง, ม.2/1"
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                นำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (In-App, never blocked by iframe) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบข้อมูลนักเรียน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  โปรดเลือกการดำเนินการที่ต้องการสำหรับนักเรียนคนนี้
                </p>
              </div>
            </div>

            {/* Student Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 space-y-1.5">
              <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>เลขที่ {studentToDelete.rollNo} • {studentToDelete.name}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  studentToDelete.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {studentToDelete.status}
                </span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-3">
                <span>รหัสนักเรียน: <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800 font-semibold">{studentToDelete.studentId}</code></span>
                <span>ห้อง: <span className="font-semibold text-slate-800">{studentToDelete.classroom}</span></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-xs transition shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบออกจากระบบทันที (ลบถาวร)</span>
              </button>

              {studentToDelete.status === 'Active' && (
                <button
                  type="button"
                  onClick={handleSetInactiveFromModal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-medium text-xs transition cursor-pointer"
                >
                  <UserX className="w-4 h-4 text-amber-600" />
                  <span>เปลี่ยนเป็น Inactive (ย้าย/พักการเรียน - ข้อมูลเก่ายังอยู่)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="w-full px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs transition cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
