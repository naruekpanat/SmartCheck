import React, { useState } from 'react';
import { 
  ListPlus, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckSquare, 
  Hash, 
  Type, 
  Check, 
  X,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { CheckItem, CheckItemType } from '../types';
import { storageService } from '../services/storage';

interface CheckItemsManagerProps {
  checkItems: CheckItem[];
  onUpdateCheckItems: (items: CheckItem[]) => void;
}

export const CheckItemsManager: React.FC<CheckItemsManagerProps> = ({
  checkItems,
  onUpdateCheckItems,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CheckItem | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const [formData, setFormData] = useState<CheckItem>({
    itemId: '',
    title: '',
    type: 'Checkbox',
    active: true,
    description: '',
    maxScore: 5,
  });

  // Open add modal
  const handleOpenAdd = () => {
    // Generate next ItemID
    const maxId = checkItems.reduce((max, item) => {
      const num = parseInt(item.itemId, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    setFormData({
      itemId: String(maxId + 1),
      title: '',
      type: 'Checkbox',
      active: true,
      description: '',
      maxScore: 5,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (item: CheckItem) => {
    setFormData({ ...item });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Toggle active state
  const handleToggleActive = (item: CheckItem) => {
    const updated = storageService.updateCheckItem({
      ...item,
      active: !item.active,
    });
    onUpdateCheckItems(updated);
    showNotice('info', item.active ? `ปิดการใช้งานรายการ "${item.title}" แล้ว` : `เปิดการใช้งานรายการ "${item.title}" แล้ว`);
  };

  // Delete item - open in-app modal
  const handleDeleteItem = (item: CheckItem) => {
    if (item.itemId === '1') {
      showNotice('error', 'ไม่สามารถลบรายการหลัก "การมาเรียน" ได้ แต่สามารถปิดการใช้งาน (Inactive) ได้');
      return;
    }
    setItemToDelete(item);
  };

  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const title = itemToDelete.title;
    const updated = storageService.deleteCheckItem(itemToDelete.itemId);
    onUpdateCheckItems(updated);
    setItemToDelete(null);
    showNotice('success', `ลบรายการ "${title}" ออกจากระบบเรียบร้อยแล้ว`);
  };

  // Save form
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showNotice('error', 'กรุณากรอกชื่อรายการตรวจเช็ค');
      return;
    }

    if (!isEditing) {
      // Check duplicate ID
      const exists = checkItems.some(i => i.itemId === formData.itemId.trim());
      if (exists) {
        showNotice('error', `รหัสรายการ ${formData.itemId} มีอยู่แล้ว กรุณาใช้รหัสอื่น`);
        return;
      }
      const updated = storageService.addCheckItem(formData);
      onUpdateCheckItems(updated);
      showNotice('success', `เพิ่มรายการ "${formData.title}" สำเร็จ`);
    } else {
      const updated = storageService.updateCheckItem(formData);
      onUpdateCheckItems(updated);
      showNotice('success', `บันทึกการแก้ไข "${formData.title}" สำเร็จ`);
    }

    setIsModalOpen(false);
  };

  // Add preset items
  const handleAddPreset = (title: string, type: CheckItemType, description: string) => {
    // Check if exists
    if (checkItems.some(i => i.title === title)) {
      showNotice('info', `รายการ "${title}" มีอยู่ในระบบแล้ว`);
      return;
    }

    const maxId = checkItems.reduce((max, item) => {
      const num = parseInt(item.itemId, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    const newItem: CheckItem = {
      itemId: String(maxId + 1),
      title,
      type,
      active: true,
      description,
      maxScore: type === 'Score' ? 5 : undefined,
    };

    const updated = storageService.addCheckItem(newItem);
    onUpdateCheckItems(updated);
    showNotice('success', `เพิ่มเกณฑ์สำเร็จรูป "${title}" สำเร็จ`);
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

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-blue-700" />
              <span>รายการเช็คชื่อ & กิจกรรม (ชีต CheckItems)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดเกณฑ์การตรวจประจำวัน เช่น การแต่งกาย, การทำความสะอาด, ส่งการบ้าน หรือแบบประเมินคะแนน
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มรายการใหม่</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>เพิ่มเกณฑ์ยอดนิยมด่วน:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { title: 'ตรวจสุขภาพและเล็บผม', type: 'Checkbox' as CheckItemType, desc: 'ความสะอาดทรงผม เล็บ และเครื่องแต่งกาย' },
              { title: 'ร่วมกิจกรรมสวดมนต์/หน้าเสาธง', type: 'Checkbox' as CheckItemType, desc: 'การตรงต่อเวลาและระเบียบแถว' },
              { title: 'คะแนนการมีส่วนร่วมในชั้นเรียน', type: 'Score' as CheckItemType, desc: 'การตอบคำถามและการร่วมกิจกรรม (1-5)' },
              { title: 'บันทึกการอ่านหนังสือประจำวัน', type: 'Score' as CheckItemType, desc: 'จำนวนเรื่องหรือหน้าบันทึกการอ่าน' },
            ].map(p => (
              <button
                key={p.title}
                type="button"
                onClick={() => handleAddPreset(p.title, p.type, p.desc)}
                className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md transition-colors"
              >
                + {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Check Items Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checkItems.map(item => {
          return (
            <div
              key={item.itemId}
              className={`bg-white rounded-xl border p-4 transition-all shadow-xs ${
                item.active ? 'border-slate-200' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    item.type === 'Checkbox'
                      ? 'bg-emerald-50 text-emerald-700'
                      : item.type === 'Score'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}>
                    {item.type === 'Checkbox' ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : item.type === 'Score' ? (
                      <Hash className="w-5 h-5" />
                    ) : (
                      <Type className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        #{item.itemId}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      {item.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-slate-500">ประเภท:</span>
                      <span className="font-medium text-slate-800">
                        {item.type === 'Checkbox' ? 'Checkbox (ผ่าน/ไม่ผ่าน)' : item.type === 'Score' ? 'Score (ให้คะแนน)' : 'Text (ข้อความ)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-1 ${
                      item.active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.active ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}></span>
                    {item.active ? 'Active' : 'Inactive'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="แก้ไข"
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {item.itemId !== '1' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        title="ลบรายการ"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Check Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {isEditing ? 'แก้ไขรายการเช็ค' : 'เพิ่มรายการเช็คใหม่'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ItemID (รหัสรายการ) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={formData.itemId}
                    onChange={e => setFormData({ ...formData, itemId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="เช่น 1, 2, 3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="true">Active (เปิดใช้งาน)</option>
                    <option value="false">Inactive (ปิดการใช้งาน)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อรายการเช็ค *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="เช่น ทำความสะอาดเขตพื้นที่, การแต่งกาย"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประเภทข้อมูล
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as CheckItemType })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Checkbox">Checkbox (ผ่าน / ไม่ผ่าน)</option>
                  <option value="Score">Score (คะแนน 1-5)</option>
                  <option value="Text">Text (ข้อความ / หมายเหตุสั้น)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบายหรือเกณฑ์ประเมิน
                </label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="ระบุเกณฑ์การประเมิน เช่น กวาดลานสะอาดเรียบร้อย ถังขยะว่างเปล่า"
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
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบรายการตรวจเช็ค
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายการนี้จะถูกลบออกจากตารางเช็คชื่อประจำวัน
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 space-y-1">
              <div className="text-sm font-bold text-slate-900">
                {itemToDelete.title}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span>รหัส: <code className="bg-white border px-1.5 py-0.5 rounded font-mono">{itemToDelete.itemId}</code></span>
                <span>ประเภท: <span className="font-medium text-slate-800">{itemToDelete.type}</span></span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-xs transition shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบรายการนี้</span>
              </button>

              <button
                type="button"
                onClick={() => setItemToDelete(null)}
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
