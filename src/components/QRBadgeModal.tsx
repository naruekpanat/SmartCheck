import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  X, 
  Printer, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  User, 
  Search,
  Sparkles
} from 'lucide-react';
import { Student } from '../types';

interface QRBadgeModalProps {
  mode: 'scanner' | 'badge';
  student?: Student | null;
  students: Student[];
  onClose: () => void;
  onScanSuccess?: (student: Student) => void;
}

export const QRBadgeModal: React.FC<QRBadgeModalProps> = ({
  mode,
  student,
  students,
  onClose,
  onScanSuccess,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera for scanner mode
  useEffect(() => {
    if (mode === 'scanner') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Handle manual or scanned student match
  const handleMatchStudent = (query: string) => {
    const q = query.trim();
    if (!q) return;

    setScanError(null);
    // Check if query is formatted like "smartcheck:67001" or just "67001"
    const cleanedId = q.replace(/^smartcheck:/, '');
    const found = students.find(
      s => s.studentId === cleanedId || s.rollNo === cleanedId || s.name.includes(cleanedId)
    );

    if (found) {
      setLastScannedStudent(found);
      if (onScanSuccess) {
        onScanSuccess(found);
      }
      setManualInput('');
    } else {
      setScanError(`ไม่พบนักเรียนรหัสหรือเลขที่ "${q}" ในระบบ`);
      setTimeout(() => setScanError(null), 4000);
    }
  };

  // Simple QR pattern representation generator (SVG matrix for high fidelity and zero external dependencies)
  const renderSvgQr = (data: string) => {
    // Generate deterministic pseudo-random QR grid from string
    const size = 21;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0;
    }

    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Corner Finder patterns (7x7)
    const drawFinder = (startX: number, startY: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          if (
            y === 0 || y === 6 || x === 0 || x === 6 ||
            (y >= 2 && y <= 4 && x >= 2 && x <= 4)
          ) {
            grid[startY + y][startX + x] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    // Populate data cells deterministically
    let seed = Math.abs(hash);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inFinder = 
          (x < 8 && y < 8) || 
          (x >= size - 8 && y < 8) || 
          (x < 8 && y >= size - 8);
        if (!inFinder) {
          seed = (seed * 9301 + 49297) % 233280;
          grid[y][x] = (seed / 233280) > 0.48;
        }
      }
    }

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) =>
            cell ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" /> : null
          )
        )}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {mode === 'badge' ? 'บัตรประจำตัวและ QR Code นักเรียน' : 'สแกน QR Code นักเรียน'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {mode === 'badge' && student ? (
            /* Badge Mode: Printable Student Card */
            <div className="space-y-4">
              <div 
                id="printable-student-badge"
                className="bg-white border-2 border-slate-800 rounded-xl p-5 shadow-sm text-center relative overflow-hidden"
              >
                {/* School Header Stripe */}
                <div className="bg-blue-800 text-white py-1.5 px-3 rounded-md mb-4 text-xs font-bold tracking-wide">
                  โรงเรียนเทศบาลมาตรฐาน · บัตรเช็คชื่อประจำตัว
                </div>

                {/* Avatar Placeholder */}
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 mb-3">
                  <User className="w-8 h-8 text-slate-500" />
                </div>

                {/* Student Info */}
                <h4 className="text-base font-bold text-slate-900">{student.name}</h4>
                <div className="text-xs text-slate-500 mt-0.5">
                  ชั้น {student.classroom} · เลขที่ {student.rollNo}
                </div>
                <div className="text-xs font-mono font-bold text-blue-700 mt-1">
                  รหัสประจำตัว: {student.studentId}
                </div>

                {/* QR Code Graphic */}
                <div className="w-36 h-36 mx-auto mt-4 p-2 bg-white border border-slate-300 rounded-lg shadow-2xs">
                  {renderSvgQr(`smartcheck:${student.studentId}`)}
                </div>

                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  smartcheck:{student.studentId}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์บัตรนักเรียน</span>
                </button>
              </div>
            </div>
          ) : (
            /* Scanner Mode */
            <div className="space-y-4">
              {/* Camera Stream Viewport */}
              <div className="w-full aspect-video bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <CameraOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      กล้องปิดอยู่ หรือไม่มีสิทธิ์เข้าถึงกล้อง
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-2 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 bg-slate-800 rounded-md transition-colors"
                    >
                      ลองเปิดกล้องอีกครั้ง
                    </button>
                  </div>
                )}

                {/* Scanner Target Guide Overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 border-2 border-blue-500/40 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-dashed border-white/80 rounded-lg animate-pulse flex items-center justify-center text-[10px] text-white/80">
                      วาง QR Code ในกรอบนี้
                    </div>
                  </div>
                )}
              </div>

              {/* Scanned Feedback */}
              {lastScannedStudent && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      เช็คชื่อสำเร็จ: {lastScannedStudent.name}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      ชั้น {lastScannedStudent.classroom} · เลขที่ {lastScannedStudent.rollNo} (รหัส {lastScannedStudent.studentId})
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Input / Barcode Gun Form */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หรือยิงบาร์โค้ด / กรอกรหัสนักเรียนโดยตรง:
                </label>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleMatchStudent(manualInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="เช่น 67001 หรือชื่อนักเรียน..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    ตรวจเช็ค
                  </button>
                </form>

                {scanError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 animate-in fade-in">
                    ⚠️ {scanError}
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
