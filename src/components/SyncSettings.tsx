import React, { useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Database, 
  Layers, 
  ArrowUpRight, 
  Download, 
  Upload, 
  Shield, 
  FileSpreadsheet, 
  HardDrive 
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SyncSettings() {
  const [activePanel, setActivePanel] = useState<'sheets' | 'backup'>('sheets');
  
  // Google Sheets states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Backup states
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/sync-sheets', { method: 'POST' });
      if (!res.ok) {
        throw new Error("Tashqi Google servisi yoki tarmoq xatosi yuz berdi");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Sinxronizatsiya qilishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const downloadJSONBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess(null);
    setBackupError(null);
    try {
      const res = await fetch('/api/backup/get-all');
      if (!res.ok) throw new Error("Serverdan ma'lumotlarni yuklashda muammo yuz berdi");
      const db = await res.json();
      
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CAMPUS_LMS_REZERV_NUSHASI_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setBackupSuccess("Tizimdagi barcha ma'lumotlar JSON zaxira fayli shaklida kompyuteringizga muvaffaqiyatli yuklab olindi!");
    } catch (err: any) {
      setBackupError(err.message || "Arxivni yuklab olishda muammo yuz berdi");
    } finally {
      setBackupLoading(false);
    }
  };

  const downloadExcelBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess(null);
    setBackupError(null);
    try {
      const res = await fetch('/api/backup/get-all');
      if (!res.ok) throw new Error("Serverdan ma'lumotlarni yuklashda muammo yuz berdi");
      const db = await res.json();
      
      const wb = XLSX.utils.book_new();
      
      // 1. Groups sheet
      const groupsData = (db.groups || []).map((g: any) => ({
        "Guruh ID": g.id,
        "Guruh Nomi": g.group_name,
        "Yaratilgan Sana": g.created_date ? new Date(g.created_date).toLocaleString('uz-UZ') : ""
      }));
      const wsGroups = XLSX.utils.json_to_sheet(groupsData);
      XLSX.utils.book_append_sheet(wb, wsGroups, "Guruhlar");
      
      // 2. Students sheet
      const studentsData = (db.students || []).map((s: any) => {
        const group = (db.groups || []).find((g: any) => g.id === s.group_id);
        const payments = (db.payments || []).filter((p: any) => p.student_id === s.id);
        const totalPaidSum = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
        
        return {
          "O'quvchi ID": s.id,
          "F.I.SH (To'liq ismi)": s.fullname,
          "Telefon Raqami": s.phone_number || "",
          "Guruh Nomi": group ? group.group_name : "Guruhsiz",
          "Qo'shilgan Sana": s.joined_date ? new Date(s.joined_date).toLocaleDateString('uz-UZ') : "",
          "Joriy To'plagan Ballari": s.current_points || 0,
          "To'lov Holati": s.payment_status === 'paid' ? "To'lagan" : "Qarzdor",
          "Darslar Jadvali": s.lesson_schedule === 'odd' ? "Toqdagi kunlar" : s.lesson_schedule === 'even' ? "Juft kunlar" : "Boshqa",
          "Umumiy To'langan Summa (So'm)": totalPaidSum
        };
      });
      const wsStudents = XLSX.utils.json_to_sheet(studentsData);
      XLSX.utils.book_append_sheet(wb, wsStudents, "O'quvchilar");
      
      // 3. Payments sheet
      const paymentsData = (db.payments || []).map((p: any) => {
        const student = (db.students || []).find((s: any) => s.id === p.student_id);
        const group = (db.groups || []).find((g: any) => g.id === p.group_id);
        
        return {
          "To'lov ID": p.id,
          "O'quvchi Ismi": student ? student.fullname : "Noma'lum",
          "Guruh Nomi": group ? group.group_name : "Noma'lum",
          "Summa (So'm)": p.amount || 0,
          "To'lov Usuli": p.payment_method === 'card' ? "Karta orqali" : "Naqd pul",
          "To'langan Sana": p.payment_date ? new Date(p.payment_date).toLocaleString('uz-UZ') : "",
          "Qoplangan Darslar Soni": p.lessons_covered || 0
        };
      });
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(wb, wsPayments, "To'lovlar");
      
      XLSX.writeFile(wb, `CAMPUS_LMS_HISOBOTLAR_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setBackupSuccess("O'quvchilar va to'lov tahlili Excel XLSX fayli ko'rinishida yuklab olindi!");
    } catch (err: any) {
      setBackupError(err.message || "Excel faylni yuklashda xatolik yuz berdi");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleJSONUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBackupLoading(true);
    setBackupSuccess(null);
    setBackupError(null);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.teachers || !parsed.groups) {
          throw new Error("Noto'g'ri zaxira fayl formati! Faylda 'teachers' va 'groups' maydonlari bo'lishi shart.");
        }
        
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        
        if (!res.ok) {
          throw new Error("Serverga zaxira ma'lumotlarini yuklashda xatolik");
        }
        
        setBackupSuccess("Barcha o'quvchilar, guruhlar va to'lovlar zaxiradan to'liq muvaffaqiyatli tiklandi!");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setBackupError("Yuklashda muammo: " + err.message);
      } finally {
        setBackupLoading(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setBackupError("Faylni o'qishda xatolik yuz berdi");
      setBackupLoading(false);
    };
    reader.readAsText(file);
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("Rostdan ham barcha ma'lumotlarni o'chirib yubormoqchimisiz? Guruhlar, o'quvchilar va to'lovlar butunlay o'chib ketadi! (Tizim administratorlari saqlab qolinadi)")) {
      return;
    }
    
    setBackupLoading(true);
    setBackupSuccess(null);
    setBackupError(null);
    try {
      const res = await fetch('/api/system/reset-clean', { method: 'POST' });
      if (!res.ok) throw new Error("Serverda tozalash amali muvaffaqiyatsiz tugadi");
      const data = await res.json();
      setBackupSuccess("Barcha guruhlar, o'quvchilar va statistika muvaffaqiyatli tozalandi va Appwritega sinxronlandi!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupError(err.message || "Tizimni tozalashda xatolik");
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="sync-control-wrapper">
      {/* Navigation tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl max-w-md">
        <button
          onClick={() => setActivePanel('sheets')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold transition duration-150 ${
            activePanel === 'sheets' 
              ? 'bg-white text-slate-800 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Google Sheets darslar rejalari</span>
        </button>
        <button
          onClick={() => setActivePanel('backup')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold transition duration-150 ${
            activePanel === 'backup' 
              ? 'bg-white text-slate-800 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ma'lumotlar Xavfsizligi & Zaxira</span>
        </button>
      </div>

      {activePanel === 'sheets' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6" id="sync-settings-card">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-5 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <RefreshCw className={`${loading ? 'animate-spin' : ''} w-6 h-6 text-blue-600`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Google Sheets Sinxronizatsiyasi</h3>
              <p className="text-xs text-slate-500">Tizimni dars rejalari va PDF materiallar jadvali bilan dinamik ulash.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="max-w-2xl text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                Campus O‘quv Markazi dars rejasi va media materiallari ushbu Google Sheet manzili bilan bog‘langan:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-blue-700 break-all flex items-center justify-between">
                <span className="truncate max-w-full mr-2">https://docs.google.com/spreadsheets/d/1lwykV1XumuQLTbI_oF09F7MR...</span>
                <a 
                  href="https://docs.google.com/spreadsheets/d/1lwykV1XumuQLTbI_oF09F7MR_tLC_JhRtQmgaBAM7qM/edit?usp=sharing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-bold text-blue-600 shrink-0 inline-flex items-center hover:underline"
                >
                  <span>Ko'rish</span>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </a>
              </div>
              <p>
                Agarda siz Google Sheets jadvalidagi kursor ostida yangi maqsadlar, dars rejasi o'zgarishi, video havola yoki yangi LEGO guruh PDF fayllarini kiritsangiz — quyidagi tugmani bosing. Platforma barcha ma'lumotlarni so'rib olib guruhlar darsligiga o'tkazadi.
              </p>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Tarmoq Sinxronizatsiyasi To‘xtatildi</p>
                  <p className="text-xs mt-1">{error}. Tizim avtomatik tarzda keshdagi arxivdan foydalanmoqda.</p>
                </div>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center space-x-3.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">Muvaffaqiyatli sinxronlandi!</p>
                  <p className="text-xs text-green-700">Google Sheets orqali {result.count} ta dars rejasi va unga tegishli barcha PDF fayl havolalari yangilandi.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-start pt-2">
              <button
                onClick={handleSync}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200 shadow-md shadow-blue-500/10 inline-flex items-center space-x-2 disabled:bg-blue-400"
                id="btn-sync-sheets"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Google Sheets\'dan o\'qilmoqda...' : 'Sinxronizatsiya qilish (Hozir yangilash)'}</span>
              </button>
            </div>

            {/* Informative Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center space-x-3">
                <div className="h-9 w-9 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-md">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Database holati</p>
                  <p className="text-xs font-extrabold text-slate-700">Dynamic Live Sheets</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center space-x-3">
                <div className="h-9 w-9 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-md">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Darslar rejalari</p>
                  <p className="text-xs font-extrabold text-slate-700">01 - 48 Darslar</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center space-x-3">
                <div className="h-9 w-9 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">PDF Resurslar</p>
                  <p className="text-xs font-extrabold text-slate-700">Auto-Attached Drive</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6" id="backup-settings-card">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-5 mb-6">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Ma'lumotlar Mutloq Xavfsizligi Markazi</h3>
              <p className="text-xs text-slate-500">Kiritilgan barcha o'quvchilar, guruhlar va to'lovlar xavfsizligini nazorat qilish va eksport/import.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Warning and explanation box */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-start space-x-3 text-sm text-slate-600 leading-relaxed">
              <HardDrive className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 text-sm mb-1">Durable Mutloq Saqlash Tizimi Faol!</p>
                <p className="text-xs">
                  Siz kiritgan har bir ma'lumot (o'quvchi qo'shish, darsni tasdiqlash, to'lovlar qilish va h.k.) serverdagi <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-700">db.json</code> bazasiga sinxron yoziladi hamda sizning brauzeringiz xotirasiga (Durable Local Storage backup) doimiy zaxiralanadi.
                </p>
                <p className="text-xs mt-1.5 text-emerald-700 font-medium">
                  ✓ Tizim qayta yuklansa yoki o'chirib yoqilsa ham ma'lumotlaringiz butkul saqlanadi va aslo o'chib ketmaydi.
                </p>
              </div>
            </div>

            {backupError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div className="text-sm">
                  <p className="font-bold">Xatolik yuz berdi</p>
                  <p className="text-xs mt-1">{backupError}</p>
                </div>
              </div>
            )}

            {backupSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">Amal muvaffaqiyatli bajarildi!</p>
                  <p className="text-xs text-emerald-700">{backupSuccess}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Ma'lumotlarni eksport qilish (Yuklab olish)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 hover:border-slate-300 transition rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      <span className="font-bold text-sm text-slate-800">Microsoft Excel (XLSX) hisoboti</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Barcha o'quvchilar ro'yxati, guruhlar tarkibi va amalga oshirilgan barcha to'lovlar tarixini chiroyli alohida varaqlarda Excel fayli ko'rinishida yuklab oling.
                    </p>
                  </div>
                  <button
                    onClick={downloadExcelBackup}
                    disabled={backupLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-850 text-white py-2.5 rounded-xl text-xs font-bold transition disabled:bg-slate-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel formatida yuklab olish</span>
                  </button>
                </div>

                <div className="p-4 border border-slate-200 hover:border-slate-300 transition rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-blue-600 mb-2">
                      <Database className="w-4 h-4" />
                      <span className="font-bold text-sm text-slate-800 font-sans">To'liq Tizim Zaxira Arxivi (JSON)</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Barcha dars tahlillari, o'quvchilar ballari, to'lovlar tarixi, ustozlar ma'lumotlarini o'z ichiga olgan butun ma'lumotlar ombori nusxasini qayta tiklash uchun yuklab oling.
                    </p>
                  </div>
                  <button
                    onClick={downloadJSONBackup}
                    disabled={backupLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition disabled:bg-indigo-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>LMS Zaxira Arxivini yuklab olish</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Zaxiradan qayta tiklash (Import qilish)</h4>
              
              <div className="p-5 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-center gap-3">
                <Upload className="w-8 h-8 text-slate-400 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Qayta yuklash uchun JSON arxiv faylini tanlang</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Avvalroq platformadan yuklab olingan <code className="bg-slate-200 px-1 rounded">.json</code> formatidagi arxiv faylini yuklasangiz, server va brauzer ma'lumotlari aynan ushbu holatga to'liq yangilanadi.
                  </p>
                </div>
                
                <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-4 py-2 rounded-xl text-xs text-center transition shadow-3xs">
                  <span>Faylni tanlash...</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJSONUpload}
                    disabled={backupLoading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Danger Zone: Hard Reset */}
            <div className="pt-6 border-t border-red-100 space-y-4 rounded-2xl bg-red-50/50 p-5 border border-red-100">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-red-500 flex items-center space-x-1.5">
                <span>Xavfli hudud (Mutloq tozalash)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Agarda siz Appwrite cloud tizimingizni barcha eski sinov dars guruhlari, dars tahlillari va o'quvchilardan butkul tozalashni istasangiz — quyidagi tugmani bosing. Ushbu amal guruhlar va o'quvchilarni o'chirib yuboradi, faqatgina hozirgi admin/ustoz login-parollari saqlanib qoladi.
              </p>
              <button
                onClick={handleResetDatabase}
                disabled={backupLoading}
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition duration-150 shadow-sm hover:shadow-md disabled:bg-red-400"
              >
                <span>Barcha ma'lumotlarni o'chirish va tozalash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
