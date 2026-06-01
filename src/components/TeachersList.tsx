import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, User, Key, UserCheck, AlertCircle, Eye, EyeOff, Copy, Check, X, BookOpen, AlertTriangle } from 'lucide-react';
import { Teacher } from '../types';

interface TeachersListProps {
  onBackToDashboard: () => void;
}

export default function TeachersList({ onBackToDashboard }: TeachersListProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New states for details modal and iframe-safe confirmation modal
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  // New teacher form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [role, setRole] = useState<'teacher' | 'admin'>('teacher');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeachers();
    fetchGroups();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teachers');
      if (!res.ok) throw new Error('O\'qituvchilar ro\'yxatini yuklab bo\'lmadi');
      const data = await res.json();
      setTeachers(data);
    } catch (err: any) {
      setError(err.message || 'Yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const handleCopy = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(err => {
      console.error('Nusxalashda xatolik:', err);
    });
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullname) {
      setError('Barcha maydonlarni to\'ldirishingiz kerak');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullname, role })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'O\'qituvchini qo\'shib bo\'lmadi');
      }

      setSuccessMsg('O\'qituvchi muvaffaqiyatli qo\'shildi!');
      // Reset form
      setUsername('');
      setPassword('');
      setFullname('');
      setRole('teacher');
      setShowForm(false);
      
      // Reload list
      fetchTeachers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6" id="teachers-list-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">O‘qituvchilar Ro‘yxati</h3>
            <p className="text-xs text-slate-500">Tizimdagi barcha o‘qituvchilarni nazorat qilish, yangilarini qo‘shish va o‘chirish.</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-sm inline-flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi O‘qituvchi Qo‘shish</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6 flex items-center space-x-2 font-medium text-sm">
          <span>✓ {successMsg}</span>
        </div>
      )}

      {/* New Teacher Form Drawer */}
      {showForm && (
        <form onSubmit={handleCreateTeacher} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 max-w-2xl animate-fadeIn space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Yangi o‘qituvchi profil ma'lumotlari</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">To‘liq Ism-Sharifi (fullname)</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="Masalan: Nursaid Nasirdinov"
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-10 py-2.5 text-sm outline-hidden transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Foydalanuvchi nomi (username)</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Yangi foydalanuvchi nomi..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-10 py-2.5 text-sm outline-hidden transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Kirish paroli (password)</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-10 py-2.5 text-sm outline-hidden transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tizimdagi lavozimi (Role)</label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'teacher' | 'admin')}
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-hidden transition duration-200 appearance-none"
                >
                  <option value="teacher">O‘qituvchi (Teacher)</option>
                  <option value="admin">Administrator (Admin)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all duration-200 shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
            >
              {submitting ? 'Saqlanmoqda...' : 'O‘qituvchini Qo‘shish'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <span>Yuklanmoqda...</span>
        </div>
      ) : teachers.length === 0 ? (
        <div className="py-12 text-slate-400 text-center text-sm font-medium">
          Hech qanday o'qituvchi topilmadi.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">To‘liq Ismi <span className="text-[10px] text-blue-500 font-normal normal-case ml-1.5">(Ko‘rish uchun bosing)</span></th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Lavozimi</th>
                <th className="py-3 px-4 text-right animate-pulse">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr 
                  key={teacher.id} 
                  onClick={() => {
                    setSelectedTeacher(teacher);
                    setShowPassword(false);
                  }}
                  className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors duration-150"
                  title="O'qituvchi profilini va parolini ko'rish"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold font-sans text-sm border border-slate-200">
                        {teacher.fullname ? teacher.fullname.substring(0, 2).toUpperCase() : 'UQ'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 text-sm block leading-tight">{teacher.fullname}</span>
                        {groups.filter(g => g.teacher_id === teacher.id).length > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {groups.filter(g => g.teacher_id === teacher.id).map(g => g.group_name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-slate-500">
                    {teacher.username}
                  </td>
                  <td className="py-4 px-4">
                    {teacher.role === 'admin' ? (
                      <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] px-2.5 py-1 rounded-full font-bold">
                        Administrator
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-2.5 py-1 rounded-full font-bold">
                        O‘qituvchi
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {teacher.id !== 't2' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Stop opening info modal when delete is clicked
                          setTeacherToDelete(teacher);
                        }}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition duration-200 cursor-pointer"
                        title="O'chirish"
                        id={`btn-delete-teacher-${teacher.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 pr-1 select-none">Tizim egasi</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Teacher Details Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Profiling Ma'lumotlari</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Tizimga kirish tafsilotlari</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Profile card */}
              <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base border border-blue-200">
                  {selectedTeacher.fullname ? selectedTeacher.fullname.substring(0, 2).toUpperCase() : 'UQ'}
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-900 text-xs leading-snug">{selectedTeacher.fullname}</h5>
                  <div className="flex items-center space-x-1 mt-0.5">
                    {selectedTeacher.role === 'admin' ? (
                      <span className="bg-red-50 text-red-700 text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        Administrator
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        O‘qituvchi
                      </span>
                    )}
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="text-[9px] text-slate-550 font-semibold font-mono">ID: {selectedTeacher.id}</span>
                  </div>
                </div>
              </div>

              {/* Login Credentials and stats */}
              <div className="space-y-3">
                {/* Username */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-2xs">Foydalanuvchi nomi</label>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs text-slate-800">
                    <span>{selectedTeacher.username}</span>
                    <button 
                      onClick={() => handleCopy(selectedTeacher.username, 'username')}
                      className="text-slate-400 hover:text-blue-600 transition p-1 hover:bg-slate-100 rounded-md"
                      title="Nusxalash"
                    >
                      {copiedField === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-2xs">Parol (Maxfiy kalit)</label>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs text-slate-800">
                    <span>{showPassword ? selectedTeacher.password : '••••••••••••'}</span>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-md"
                        title={showPassword ? "Yashirish" : "Ko'rsatish"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button 
                        onClick={() => handleCopy(selectedTeacher.password || '', 'password')}
                        className="text-slate-400 hover:text-blue-600 transition p-1 hover:bg-slate-100 rounded-md"
                        title="Nusxalash"
                      >
                        {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Groups count & names */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-2xs">Biriktirilgan guruhlar</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                    {groups.filter(g => g.teacher_id === selectedTeacher.id).length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Hozircha hech qanday guruh biriktirilmagan.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {groups.filter(g => g.teacher_id === selectedTeacher.id).map(g => (
                          <span key={g.id} className="inline-flex items-center space-x-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                            <BookOpen className="w-3 h-3 text-blue-500" />
                            <span>{g.group_name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">LMS o‘qituvchi boshqaruvi</span>
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Iframe Safe) */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xs w-full overflow-hidden animate-scaleIn">
            <div className="p-5 text-center space-y-3.5">
              <div className="mx-auto w-10 h-10 bg-red-50 text-red-650 rounded-full flex items-center justify-center border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">O'chirishni tasdiqlang</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Haqiqatan ham <strong className="text-slate-800">{teacherToDelete.fullname}</strong> o'qituvchisini tizimdan o'chirmoqchimisiz? Guruhlar darsligi saqlanadi.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-150 p-3.5 flex items-center justify-end space-x-2">
              <button 
                onClick={() => setTeacherToDelete(null)}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-lg transition"
              >
                Bekor qilish
              </button>
              <button 
                onClick={async () => {
                  const id = teacherToDelete.id;
                  setTeacherToDelete(null);
                  try {
                    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
                    if (!res.ok) {
                      const errData = await res.json();
                      throw new Error(errData.error || 'O\'qituvchini o\'chirishda xato');
                    }
                    setSuccessMsg('O\'qituvchi muvaffaqiyatli o\'chirib tashlandi.');
                    fetchTeachers();
                  } catch (err: any) {
                    setError(err.message);
                  }
                }}
                className="bg-red-650 hover:bg-red-700 text-white font-bold text-[10px] px-3 net-alert-bg py-1.5 rounded-lg transition"
              >
                Ha, o'chirilsin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
