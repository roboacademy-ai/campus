import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Plus, Search, Trash2, Edit, CheckSquare, 
  XSquare, Clock, Award, TrendingUp, Percent, ShieldAlert, 
  Calendar, TrendingDown, PlusCircle, UserCheck, AlertTriangle, 
  BookOpen, FileText, ChevronRight, Filter, RefreshCw, Star, Trophy,
  Download, CreditCard, DollarSign, Check
} from 'lucide-react';
import { Group, UserSession, Student, AttendanceRecord, PointsHistoryEntry } from '../types';
import { formatUzbekDate, parseUzbekDateInput, formatUzbekInputDate } from '../utils/paymentCalculator';

interface StudentManagementProps {
  group: Group;
  currentUser: UserSession;
  onBack: () => void;
}

export default function StudentManagement({ group, currentUser, onBack }: StudentManagementProps) {
  // Helper: format YYYY-MM-DD -> DD/MM/YYYY
  const toDisplayFormat = (isoStr: string): string => {
    if (!isoStr) return "";
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Helper: parse DD/MM/YYYY -> YYYY-MM-DD
  const toValueFormat = (displayStr: string): string => {
    if (!displayStr) return "";
    const parts = displayStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return displayStr;
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout states
  const [activeTab, setActiveTab] = useState<'list' | 'attendance' | 'leaderboard' | 'payments'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Payments layout state
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('350000');

  // Modal / Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState<Student | null>(null);
  const [showBonusModal, setShowBonusModal] = useState<Student | null>(null);

  // Form Fields State
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('+998');
  const [parentPhone, setParentPhone] = useState('+998');
  const [dateJoined, setDateJoined] = useState(new Date().toISOString().substring(0, 10));
  const [age, setAge] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lessonSchedule, setLessonSchedule] = useState<'odd' | 'even'>('odd');

  // Penalty / Bonus Fields
  const [penaltyReason, setPenaltyReason] = useState('Darsga kechikish');
  const [penaltyPoints, setPenaltyPoints] = useState<number>(5);
  const [bonusReason, setBonusReason] = useState('Uy vazifasini mukammal bajarish');
  const [bonusPoints, setBonusPoints] = useState<number>(10);

  // Fetch group data
  useEffect(() => {
    fetchData();
  }, [group.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch students
      const stdRes = await fetch(`/api/groups/${group.id}/students`);
      if (!stdRes.ok) throw new Error('O‘quvchilar ro‘yxatini yuklab bo‘lmadi.');
      const stdData = await stdRes.json();
      setStudents(stdData);

      // Fetch attendance
      const attRes = await fetch(`/api/groups/${group.id}/attendance`);
      if (!attRes.ok) throw new Error('Davomat tarixini yuklab bo‘lmadi.');
      const attData = await attRes.json();
      setAttendance(attData);

      // Fetch points history
      const phRes = await fetch(`/api/groups/${group.id}/points-history`);
      if (!phRes.ok) throw new Error('Ballar tarixini yuklab bo‘lmadi.');
      const phData = await phRes.json();
      setPointsHistory(phData);

      // Fetch payments
      const payRes = await fetch(`/api/groups/${group.id}/payments`);
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Add Student Handler
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhone = parentPhone.trim();
    if (!fullname.trim() || !finalPhone) {
      alert('Iltimos, asosiy maydonlarni to‘ldiring!');
      return;
    }

    const finalJoinedDate = dateJoined;

    try {
      const res = await fetch(`/api/groups/${group.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname,
          phone: finalPhone,
          parent_phone: finalPhone,
          joined_date: finalJoinedDate,
          age: age ? parseInt(age, 10) : undefined,
          notes,
          lesson_schedule: lessonSchedule
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'O‘quvchini qo‘shishda xatolik yuz berdi');
      }

      await fetchData();
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Edit Student Handler
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const finalPhone = parentPhone.trim();
    const finalJoinedDate = dateJoined;

    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname,
          phone: finalPhone,
          parent_phone: finalPhone,
          joined_date: finalJoinedDate,
          age: age ? parseInt(age, 10) : undefined,
          notes,
          lesson_schedule: lessonSchedule
        })
      });

      if (!res.ok) {
        throw new Error('O‘quvchi tahririni saqlashda xatolik yuz berdi');
      }

      await fetchData();
      resetForm();
      setEditingStudent(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Student Handler
  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('O‘quvchini rostdan ham o‘chirib yubormoqchimisiz? Davomati va ballik tarixi ham o‘chadi.')) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('O‘quvchini o‘chirishda xatolik yuz berdi');

      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Mark Attendance Handler
  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    try {
      const dateStr = new Date().toISOString().substring(0, 10);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          group_id: group.id,
          lesson_number: selectedLesson,
          status,
          date: dateStr
        })
      });

      if (!res.ok) throw new Error('Davomatni saqlashda xatolik!');

      const updatedRecord = await res.json();
      setAttendance(prev => {
        const index = prev.findIndex(a => a.student_id === studentId && a.lesson_number === selectedLesson);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = updatedRecord;
          return updated;
        } else {
          return [...prev, updatedRecord];
        }
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Points System Modifier (Add Bonus / Deduct Penalty)
  const handlePointsChange = async (studentId: string, reason: string, pointsChange: number) => {
    try {
      const res = await fetch('/api/points-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          group_id: group.id,
          reason,
          points_change: pointsChange
        })
      });

      if (!res.ok) throw new Error('Ballarni o‘zgartirishda xatolik yuz berdi');

      await fetchData();
      setShowPenaltyModal(null);
      setShowBonusModal(null);

      // Keep single student details updated if is currently selected in profile
      if (selectedStudent && selectedStudent.id === studentId) {
        const responseData = await res.json();
        setSelectedStudent(responseData.student);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      const months = [
        'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
        'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
      ];
      const autoMonth = `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: showPaymentModal.id,
          group_id: group.id,
          amount: parseInt(paymentAmount, 10),
          month: autoMonth
        })
      });
      if (res.ok) {
        await fetchData();
        setShowPaymentModal(null);
        setPaymentAmount('350000');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'To‘lov kiritishda xatolik yuz berdi');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('To‘lovni rostdan ham o‘chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
         method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
      } else {
        alert('To‘lovni o‘chirishda xatolik yuz berdi');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setFullname(student.fullname);
    setPhone(student.parent_phone);
    setParentPhone(student.parent_phone);
    setDateJoined(student.joined_date);
    setAge(student.age ? String(student.age) : '');
    setNotes(student.notes || '');
    setLessonSchedule(student.lesson_schedule || 'odd');
  };

  const resetForm = () => {
    setFullname('');
    setPhone('+998');
    setParentPhone('+998');
    setDateJoined(new Date().toISOString().substring(0, 10));
    setAge('');
    setNotes('');
    setLessonSchedule('odd');
  };

  // Calculation metrics
  const getAttendanceStats = (studentId: string) => {
    const studentAtts = attendance.filter(a => a.student_id === studentId);
    const presents = studentAtts.filter(a => a.status === 'present').length;
    const lates = studentAtts.filter(a => a.status === 'late').length;
    const absents = studentAtts.filter(a => a.status === 'absent').length;
    const totalLog = studentAtts.length;

    // We count present & late as attended, but late as partial
    const rate = totalLog > 0 ? Math.round(((presents + (lates * 0.75)) / totalLog) * 100) : 100;
    return { presents, lates, absents, totalLog, rate };
  };

  const groupAttendanceRate = () => {
    if (attendance.length === 0) return 100;
    const presents = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    return Math.round((presents / attendance.length) * 100);
  };

  const topStudent = () => {
    if (students.length === 0) return null;
    return [...students].sort((a, b) => b.current_points - a.current_points)[0];
  };

  const lowestStudent = () => {
    if (students.length === 0) return null;
    return [...students].sort((a, b) => a.current_points - b.current_points)[0];
  };

  const filteredStudents = students.filter(s => 
    s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const exportStudentsToExcel = () => {
    // Generate simple dynamic CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "F.I.O,Telefon raqami,Kafil telefon raqami,A'zo sana,Balli\n";
    students.forEach((s) => {
      csvContent += `"${s.fullname}","${s.phone}","${s.parent_phone}","${s.joined_date}",${s.current_points}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Guruh_${group.group_name}_Oquvchilar.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "F.I.O,Dars raqami,Sana,Holat\n";
    attendance.forEach((a) => {
      const s = students.find(std => std.id === a.student_id);
      csvContent += `"${s ? s.fullname : 'O‘quvchi'}",${a.lesson_number},"${a.date}","${a.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Guruh_${group.group_name}_Davomat.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="student-management-workspace">
      
      {/* Upper Navigation & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition duration-200"
            id="btn-students-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase">O‘quvchilar tarkibi</span>
              <span className="text-xs text-slate-400 font-medium">Bosh sahifa &raquo; {group.group_name}</span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{group.group_name} — LMS Jurnal</h3>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex space-x-2 shrink-0">
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-200 flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi O‘quvchi</span>
          </button>
          <button
            onClick={exportStudentsToExcel}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-200 flex items-center space-x-1.5 shadow-2xs"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Jurnal EXCEL</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">LMS o‘quvchi ma’lumotlari yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-red-500 space-y-2">
          <p className="font-bold">LMS yuklashda xatolik</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Jami o‘quvchilar</p>
                <p className="text-xl font-extrabold text-slate-800">{students.length} nafar</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">O‘rtacha davomat</p>
                <p className="text-xl font-extrabold text-slate-800">{groupAttendanceRate()}%</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Guruh yetakchisi</p>
                <p className="text-sm font-extrabold text-slate-800 truncate max-w-[120px]" title={topStudent()?.fullname}>
                  {topStudent() ? topStudent()?.fullname : 'Mavjud emas'}
                </p>
                {topStudent() && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold font-mono">{topStudent()?.current_points} ball</span>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
              <div className="bg-red-50 text-red-600 p-3 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Eng past ko‘rsatkich</p>
                <p className="text-sm font-extrabold text-slate-800 truncate max-w-[120px]">
                  {lowestStudent() ? lowestStudent()?.fullname : 'Mavjud emas'}
                </p>
                {lowestStudent() && <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold font-mono">{lowestStudent()?.current_points} ball</span>}
              </div>
            </div>
          </div>

          {/* Sub Navigation Bar for management modules */}
          <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border shadow-2xs flex-wrap gap-2 justify-between items-center">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-200 ${
                  activeTab === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                O‘quvchilar ro‘yxati
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-200 flex items-center space-x-2 ${
                  activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Davomat jurnali</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">{attendance.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-200 flex items-center space-x-2 ${
                  activeTab === 'leaderboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Reyting & Mukofotlar</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-200 flex items-center space-x-2 ${
                  activeTab === 'payments' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>To'lovlar</span>
              </button>
            </div>

            <div className="relative max-w-xs w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ism yoki telefon bo'yicha izlash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-hidden transition"
              />
            </div>
          </div>

          {/* ADD STUDENT / EDIT STUDENT FORM OVERLAY */}
          {(showAddForm || editingStudent) && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span>{editingStudent ? 'O‘quvchi ma’lumotlarini tahrirlash' : 'Yangi o‘quvchi qo‘shish'}</span>
                  </h4>
                  <button
                    onClick={() => { setShowAddForm(false); setEditingStudent(null); resetForm(); }}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Yopish
                  </button>
                </div>

                <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">To‘liq nomi (F.I.O) *</label>
                      <input
                        type="text"
                        required
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        placeholder="Ali Karimov"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Yoshi (ixtiyoriy)</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="16"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kafil raqami *</label>
                      <input
                        type="text"
                        required
                        value={parentPhone}
                        onChange={(e) => { setParentPhone(e.target.value); setPhone(e.target.value); }}
                        placeholder="+99891XXXXXXX"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Guruhga qo‘shilgan sana (Kun/Oy/Yil) *</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          required
                          value={dateJoined.includes('-') ? toDisplayFormat(dateJoined) : dateJoined}
                          onChange={(e) => {
                            let rawVal = e.target.value.replace(/\D/g, '');
                            if (rawVal.length > 8) rawVal = rawVal.substring(0, 8);
                            
                            let formatted = '';
                            if (rawVal.length > 0) {
                              formatted += rawVal.substring(0, 2);
                            }
                            if (rawVal.length > 2) {
                              formatted += '/' + rawVal.substring(2, 4);
                            }
                            if (rawVal.length > 4) {
                              formatted += '/' + rawVal.substring(4, 8);
                            }
                            
                            if (formatted.length === 10) {
                              const parsed = toValueFormat(formatted);
                              setDateJoined(parsed);
                            } else {
                              setDateJoined(formatted);
                            }
                          }}
                          onBlur={() => {
                            if (dateJoined.length !== 10 || dateJoined.includes('/')) {
                              setDateJoined(new Date().toISOString().substring(0, 10));
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl pl-3 pr-10 py-2 text-sm outline-hidden font-semibold font-mono text-slate-800"
                        />
                        <div className="absolute right-3 top-2.5 flex items-center cursor-pointer">
                          <Calendar className="w-5 h-5 text-slate-400 hover:text-blue-500 pointer-events-none" />
                          <input
                            type="date"
                            value={dateJoined.includes('/') ? toValueFormat(dateJoined) : dateJoined}
                            onChange={(e) => {
                              if (e.target.value) {
                                setDateJoined(e.target.value);
                              }
                            }}
                            className="absolute top-0 right-0 w-5 h-5 opacity-0 cursor-pointer"
                            style={{ WebkitAppearance: 'none' }}
                          />
                        </div>
                      </div>
                      {dateJoined && (
                        <p className="text-[10px] font-bold text-blue-600 mt-1">
                          Tizim avtomatik: <span className="underline">{formatUzbekDate(dateJoined.includes('/') ? toValueFormat(dateJoined) : dateJoined)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dars kunlari jadvali tanlash */}
                  <div className="border border-slate-205 bg-slate-50/50 rounded-2xl p-4 space-y-3">
                    <div className="space-y-0.5">
                      <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">
                        Dars kunlari haftalik jadvali *
                      </label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase leading-normal">
                        O'QUVCHI QAYSI KUNLARI DARSGA KELADI? (TO'LOV SHUNGA QARAB HISOBLANADI)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Odd lane */}
                      <button
                        type="button"
                        onClick={() => setLessonSchedule('odd')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          lessonSchedule === 'odd'
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:scale-101'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 block">Dushanba / Chorshanba / Juma</span>
                          <span className="text-[10px] text-slate-500 block">Haftaning toq kunlari</span>
                        </div>
                        {lessonSchedule === 'odd' && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white stroke-[3.5]" />
                          </div>
                        )}
                      </button>

                      {/* Option 2: Even lane */}
                      <button
                        type="button"
                        onClick={() => setLessonSchedule('even')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          lessonSchedule === 'even'
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:scale-101'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 block">Seshanba / Payshanba / Shanba</span>
                          <span className="text-[10px] text-slate-500 block">Haftaning juft kunlari</span>
                        </div>
                        {lessonSchedule === 'even' && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white stroke-[3.5]" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Shaxsiy izoh / eslatmalar</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Masalan: Grafika bo'yicha tajribaga ega..."
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-hidden min-h-[80px]"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setEditingStudent(null); resetForm(); }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                    >
                      {editingStudent ? 'Tahrirni saqlash' : 'O‘quvchini ro‘yxatga olish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 1: STUDENTS LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-400 font-medium space-y-2">
                  <User className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Hech qanday o‘quvchi topilmadi.</p>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="text-blue-600 hover:underline text-xs font-bold"
                  >
                    Yangi qo‘shing &raquo;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left students list grid layout */}
                  <div className="xl:col-span-2 space-y-3">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3.5 px-4">O‘quvchi (F.I.O)</th>
                            <th className="py-3.5 px-4">Kafil raqami</th>
                            <th className="py-3.5 px-4 text-center">Xulq-atvor balli</th>
                            <th className="py-3.5 px-4 text-right">Amallar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map((student) => {
                            const isSelected = selectedStudent?.id === student.id;
                            const levelBadgeObj = student.current_points >= 115 
                              ? { label: 'Tashabbuskor', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                              : student.current_points < 80 
                              ? { label: 'Ogohlantirish', color: 'bg-red-50 text-red-700 border-red-200' }
                              : { label: 'Faol', color: 'bg-slate-50 text-slate-600 border-slate-200' };

                            return (
                              <tr 
                                key={student.id}
                                className={`group hover:bg-slate-50/50 transition cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''}`}
                                onClick={() => setSelectedStudent(student)}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-9 w-9 bg-slate-100 border rounded-full flex items-center justify-center font-bold text-slate-700 uppercase shrink-0">
                                      {student.fullname.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800 leading-tight group-hover:text-blue-600 transition">{student.fullname}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        Kiritilgan: {formatUzbekDate(student.joined_date)} • {student.lesson_schedule === 'even' ? 'Ses/Pay/Sha (Juft)' : 'Dush/Chor/Jum (Toq)'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-slate-600">{student.parent_phone}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                                    student.current_points >= 100 ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50'
                                  }`}>
                                    {student.current_points} ball
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end space-x-1">
                                    <button
                                      onClick={() => setShowBonusModal(student)}
                                      title="Bonus ball berish"
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                                    >
                                      <Star className="w-4 h-4 fill-emerald-100" />
                                    </button>
                                    <button
                                      onClick={() => setShowPenaltyModal(student)}
                                      title="Jarimalar modalini ochish"
                                      className="p-1 text-amber-600 hover:bg-amber-50 rounded-md transition"
                                    >
                                      <AlertTriangle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => startEdit(student)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(student.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Detail Card for Selected Student */}
                  <div className="xl:col-span-1">
                    {selectedStudent ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs sticky top-4 space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center font-extrabold text-blue-700 text-lg uppercase shrink-0">
                              {selectedStudent.fullname.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 leading-tight">{selectedStudent.fullname}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">A'zo sanasi: {formatUzbekDate(selectedStudent.joined_date)}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-bold uppercase border border-slate-200">
                            ID: {selectedStudent.id.substring(4, 9)}
                          </span>
                        </div>

                        {/* Behavior ball dynamic section */}
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wide block">Guruh reyting balli</span>
                            <span className="font-mono text-3xl font-extrabold text-slate-900 mt-1 block">{selectedStudent.current_points} ball</span>
                          </div>
                          <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Award className="w-6 h-6 text-amber-500 fill-amber-100" />
                          </div>
                        </div>

                        {/* Attendance analysis */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Davomat tahlilochisi</h5>
                          <div className="grid grid-cols-3 gap-3 text-center text-xs">
                            <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                              <span className="text-emerald-600 font-extrabold text-sm block">
                                {getAttendanceStats(selectedStudent.id).presents}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Bor</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                              <span className="text-amber-500 font-extrabold text-sm block">
                                {getAttendanceStats(selectedStudent.id).lates}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Kech</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                              <span className="text-red-500 font-extrabold text-sm block">
                                {getAttendanceStats(selectedStudent.id).absents}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Yo'q</span>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>Muddatsiz muloqot foizi:</span>
                            <span className="text-blue-700 font-extrabold">{getAttendanceStats(selectedStudent.id).rate}%</span>
                          </div>
                          <div className="w-full bg-slate-150 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-1.5" style={{ width: `${getAttendanceStats(selectedStudent.id).rate}%` }}></div>
                          </div>
                        </div>

                        {/* Recent History Timeline */}
                        <div className="space-y-3.5 border-t border-slate-100 pt-4">
                          <div className="flex justify-between items-center">
                            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">O‘zgarishlar tarixi</h5>
                            <span className="text-[9px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">Ball Loglari</span>
                          </div>
                          <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                            {pointsHistory.filter(ph => ph.student_id === selectedStudent.id).length === 0 ? (
                              <p className="text-xs text-slate-400 italic text-center py-2">Hozircha hech qanday ball o‘zgarishi qayd etilmagan.</p>
                            ) : (
                              pointsHistory
                                .filter(ph => ph.student_id === selectedStudent.id)
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(ph => (
                                  <div key={ph.id} className="flex justify-between items-center text-xs">
                                    <div className="space-y-0.5">
                                      <p className="font-semibold text-slate-700 leading-none">{ph.reason}</p>
                                      <p className="text-[10px] text-slate-400">{formatUzbekDate(ph.date)}</p>
                                    </div>
                                    <span className={`font-mono font-black ${
                                      ph.points_change >= 0 ? 'text-emerald-600' : 'text-red-500'
                                    }`}>
                                      {ph.points_change >= 0 ? `+${ph.points_change}` : ph.points_change}
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* Student Notes */}
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Tizim izohlari</h5>
                          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                            {selectedStudent.notes || "O‘quvchi bo‘yicha qo‘shimcha esdaliklar kiritilmagan."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 h-full flex flex-col justify-center items-center space-y-3">
                        <User className="w-12 h-12 text-slate-300" />
                        <div>
                          <p className="font-bold text-sm text-slate-600">Ish stoliga o‘tish</p>
                          <p className="text-xs text-slate-400 mt-1">Chap tomondan o‘quvchini tanlab batafsil shaxsiy tahliliy profilini bu yerda ko‘rishingiz mumkin.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTENDANCE LOG MODULE */}
          {activeTab === 'attendance' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                  <h4 className="font-extrabold text-slate-900 flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span>Darslar bo‘yicha davomat qaydlari</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Iltimos dars raqamini tanlang, so‘ng o‘quvchilar holatini qayd eting</p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-500 font-bold">Dars:</span>
                  <select
                    value={selectedLesson}
                    onChange={(e) => setSelectedLesson(parseInt(e.target.value, 10))}
                    className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-blue-500 transition outline-hidden"
                  >
                    {Array.from({ length: 48 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num}-Dars
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={exportAttendanceReport}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition shadow-3xs"
                    title="Excel hisobotini yuklab olish"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Attendance quick grid */}
              <div className="overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">
                      <th className="py-3 px-4">O‘quvchi nomi</th>
                      <th className="py-3 px-4">Kechlik/Sabab</th>
                      <th className="py-3 px-4 text-center">Davomat holati</th>
                      <th className="py-3 px-4 text-center">Tezkor saqlash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const currentRecord = attendance.find(
                        (a) => a.student_id === student.id && a.lesson_number === selectedLesson
                      );
                      const status = currentRecord ? currentRecord.status : null;

                      return (
                        <tr key={student.id} className="group hover:bg-slate-50/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <span className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                {student.fullname.charAt(0)}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800 block text-xs md:text-sm">{student.fullname}</span>
                                <span className="text-[9px] text-slate-400 font-semibold block">{student.parent_phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-450 italic text-xs">
                            {student.notes ? student.notes.substring(0, 30) + '...' : 'Izohsiz'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {status === 'present' && (
                              <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                Bor (✓)
                              </span>
                            )}
                            {status === 'absent' && (
                              <span className="inline-flex items-center bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                Kelmagan (✗)
                              </span>
                            )}
                            {status === 'late' && (
                              <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                Kechikkan (⏰)
                              </span>
                            )}
                            {!status && (
                              <span className="inline-flex items-center bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Belgilanmagan
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                              <button
                                onClick={() => handleMarkAttendance(student.id, 'present')}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                                  status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-3xs'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                <span>Bor</span>
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(student.id, 'late')}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                                  status === 'late'
                                    ? 'bg-amber-500 text-white shadow-3xs'
                                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                              >
                                <span>Kech</span>
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(student.id, 'absent')}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                                  status === 'absent'
                                    ? 'bg-red-600 text-white shadow-3xs'
                                    : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                                }`}
                              >
                                <span>Yo'q</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LEADERBOARD REYTING & MUKOFOTLAR */}
          {activeTab === 'leaderboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Top Leaderboard Podium card */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-900 flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>LMS Haqiqiy Leaderboard</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Xulq-atvor, intizom va faollik darajasi yuqori o‘quvchilar reytingi</p>
                </div>

                <div className="space-y-3">
                  {[...students]
                    .sort((a,b) => b.current_points - a.current_points)
                    .map((student, idx) => {
                      const rank = idx + 1;
                      const hasGold = rank === 1;
                      const hasSilver = rank === 2;
                      const hasBronze = rank === 3;

                      return (
                        <div 
                          key={student.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center space-x-4">
                            <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-black font-mono text-xs ${
                              hasGold ? 'bg-amber-100 text-amber-800 text-sm ring-2 ring-amber-400 animate-bounce' :
                              hasSilver ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-300' :
                              hasBronze ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {rank}
                            </span>
                            <div className="flex items-center space-x-3">
                              <span className="h-8 w-8 rounded-full bg-slate-200/50 flex justify-center items-center text-xs font-bold">
                                {student.fullname.substring(0, 1)}
                              </span>
                              <div>
                                <span className="font-bold text-slate-850 block">{student.fullname}</span>
                                <span className="text-[10px] text-slate-400 font-semibold block">{student.parent_phone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {/* Badges system */}
                            <div className="hidden sm:flex space-x-1">
                              {student.current_points >= 120 && (
                                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200 px-2 py-0.5 rounded uppercase">
                                  Tashabbuskor Elite
                                </span>
                              )}
                              {student.current_points < 90 && (
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border-amber-200 px-2 py-0.5 rounded uppercase">
                                  Diqqat Jurnalda
                                </span>
                              )}
                              {student.current_points < 75 && (
                                <span className="text-[9px] font-bold bg-red-100 text-red-800 border-red-300 px-2 py-0.5 rounded uppercase animate-ping">
                                  Xavf
                                </span>
                              )}
                            </div>

                            <span className="font-mono text-sm font-black text-slate-800 bg-white border px-3 py-1 rounded-lg">
                              {student.current_points} ball
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Gamification, badges detail guidelines card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-fit space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">LMS tizimi ballik shkalalari</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Har bir o‘quvchi ro‘yxatga olinganda dastlabki 100 reyting balli bilan qayd etiladi. Tizim yetakchilari avtomatik tarzda oltin orden bilan taqdirlanadi.
                </p>

                <div className="space-y-3.5 border-t border-slate-100 pt-4">
                  <div className="flex items-start space-x-3 text-xs text-slate-600">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <div>
                      <p className="font-bold text-slate-800">120+ ball: Tashabbuskorlik ordeni</p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">O‘rnak bo‘lganligi, qo‘shimcha vazifalar, dars g‘olibi.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 text-xs text-slate-600">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-yellow-500 shrink-0"></span>
                    <div>
                      <p className="font-bold text-slate-800">90-100 ball: Faol barqarorlik</p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Tizimli yoki standart harakatlar.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 text-xs text-slate-600">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
                    <div>
                      <p className="font-bold text-slate-800">80 ball past: Ogohlantirish jadvali</p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Kech qolish, uy vazifasi yo‘qligi, salbiy dars ishtiroki.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PAYMENTS - TO'LOVLAR */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              
              {/* Filtered Students Payment Overview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span>O'quvchilar To'lov Nazorati</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Guruh o'quvchilarining to'lov xususiyatlari, hisobotlari va kiritilgan operatsiyalar.
                    </p>
                  </div>
                  <div className="text-xs bg-blue-50 text-blue-800 font-bold px-3 py-1.5 rounded-xl border border-blue-100">
                    1 dars: <span className="font-mono">29 000</span> so'm
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students
                    .filter((s) => s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm))
                    .map((student) => {
                      const studentPayments = payments.filter((p: any) => p.student_id === student.id);
                      const totalPaid = studentPayments.reduce((acc: number, p: any) => acc + p.amount, 0);
                      const totalLessons = studentPayments.reduce((acc: number, p: any) => acc + p.lessons_covered, 0);
                      const isPaid = student.payment_status === 'paid';

                      return (
                        <div 
                          key={student.id}
                          className={`p-4 rounded-xl border transition ${
                            isPaid 
                              ? 'bg-emerald-50/40 border-emerald-150 hover:bg-emerald-50/70' 
                              : 'bg-red-50/40 border-red-150 hover:bg-red-50/70'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h5 className="font-bold text-slate-800 text-sm line-clamp-1">{student.fullname}</h5>
                              <p className="text-[10px] text-slate-400 font-medium">Qo'shilgan: {formatUzbekDate(student.joined_date)}</p>
                              <p className="text-[10px] text-slate-400 font-semibold font-mono">{student.parent_phone}</p>
                              <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {student.lesson_schedule === 'even' ? 'Ses / Pay / Sha' : 'Dush / Chor / Jum'}
                              </span>
                            </div>
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-red-100 text-red-800 animate-pulse'
                            }`}>
                              {isPaid ? "To'langan" : "To'lanmagan"}
                            </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                              {studentPayments.length > 0 ? (
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-700">Jami: {totalPaid.toLocaleString()} so'm</p>
                                  <p className="text-[10px] font-mono text-slate-500 font-bold">({totalLessons} darsga yetadi)</p>
                                </div>
                              ) : (
                                <p className="italic text-slate-400 text-[11px] font-medium">To'lovlar kiritilmagan</p>
                              )}
                            </div>
                            
                            <button
                              onClick={() => {
                                setShowPaymentModal(student);
                                setPaymentAmount('350000');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-2xs active:scale-95 transition"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>To'lov kiritish</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Payments History log table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Ushbu guruhning to'lovlar tarixi</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Barcha o'quvchilar tomonidan kiritilgan to'lovlar jurnali</p>
                </div>

                {payments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    Ushbu guruh uchun hali hech qanday to'lov belgilanmagan!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                          <th className="pb-3 pl-2">O'quvchi</th>
                          <th className="pb-3">To'lov summasi</th>
                          <th className="pb-3 text-center">Nechta darsga yetishi</th>
                          <th className="pb-3">To'langan oy</th>
                          <th className="pb-3">Sana</th>
                          <th className="pb-3 pr-2 text-right">O'chirish</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...payments]
                          .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                          .map((p) => {
                            const student = students.find(s => s.id === p.student_id);
                            return (
                              <tr key={p.id} className="border-b border-slate-50 text-xs hover:bg-slate-50/50 transition">
                                <td className="py-3 pl-2">
                                  <div className="font-bold text-slate-850">{student ? student.fullname : "O'chirib yuborilgan o'quvchi"}</div>
                                  <div className="text-[10px] text-slate-400">{student?.phone}</div>
                                </td>
                                <td className="py-3 text-emerald-700 font-bold font-mono">
                                  {p.amount.toLocaleString()} so'm
                                </td>
                                <td className="py-3 text-center font-bold font-mono text-slate-700">
                                  {p.lessons_covered} ta dars
                                </td>
                                <td className="py-3 text-slate-500 font-medium">
                                  {p.month || "Noma'lum"}
                                </td>
                                <td className="py-3 text-slate-400 font-semibold font-mono">
                                  {formatUzbekDate(p.payment_date)}
                                </td>
                                <td className="py-3 pr-2 text-right">
                                  <button
                                    onClick={() => handleDeletePayment(p.id)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition"
                                    title="To'lovni bekor qilish"
                                  >
                                    <Trash2 className="w-4 h-4 ml-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* BONUS LOG MODAL OVERLAY */}
          {showBonusModal && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="text-sm font-bold text-emerald-700 uppercase flex items-center space-x-2">
                    <Star className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    <span>Bonus ballari berish</span>
                  </h4>
                  <button
                    onClick={() => setShowBonusModal(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    Yopish
                  </button>
                </div>

                <div className="text-slate-600 text-xs space-y-1 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <p className="font-bold text-emerald-800">O‘quvchi: {showBonusModal.fullname}</p>
                  <p>Hozirgi balli: {showBonusModal.current_points} ball</p>
                </div>

                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handlePointsChange(showBonusModal.id, bonusReason, bonusPoints); }}>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Bonus berish sababi</label>
                    <select
                      value={bonusReason}
                      onChange={(e) => setBonusReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm outline-hidden font-medium"
                    >
                      <option value="Uy vazifasini mukammal bajarish">Uy vazifasini mukammal bajarish (+10)</option>
                      <option value="Darsdagi ajoyib faollik">Darsdagi ajoyib faollik (+5)</option>
                      <option value="Olimpiada yoki musobaqa g‘olibi">Olimpiada yoki g‘oliblik (+15)</option>
                      <option value="Tashabbuskorlik ko‘rsatish">Yordam / Qo‘shimcha tashabbus (+8)</option>
                      <option value="Yaxshi xulq-atvor uchun">Xushmuomalalik uchun (+5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">O‘zgartirilishi kutilayotgan ball (+)</label>
                    <input
                      type="number"
                      required
                      value={bonusPoints}
                      onChange={(e) => setBonusPoints(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm outline-hidden font-bold text-emerald-700"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowBonusModal(null)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Bonus ballini kiritish
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PENALTY LOG MODAL OVERLAY */}
          {showPenaltyModal && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="text-sm font-bold text-red-700 uppercase flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span>Jarima ballarini ayirish</span>
                  </h4>
                  <button
                    onClick={() => setShowPenaltyModal(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    Yopish
                  </button>
                </div>

                <div className="text-slate-600 text-xs space-y-1 bg-red-50 border border-red-200 p-4 rounded-xl">
                  <p className="font-bold text-red-800">O‘quvchi: {showPenaltyModal.fullname}</p>
                  <p>Hozirgi balli: {showPenaltyModal.current_points} ball</p>
                </div>

                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handlePointsChange(showPenaltyModal.id, penaltyReason, -penaltyPoints); }}>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Jarima sababi</label>
                    <select
                      value={penaltyReason}
                      onChange={(e) => setPenaltyReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-red-500 rounded-xl px-3 py-2 text-sm outline-hidden font-medium"
                    >
                      <option value="Darsga kechikib kelish">Darsga kechikib kelish (-5)</option>
                      <option value="Uy vazifasi yo‘qligi">Uy vazifasi yo‘qligi (-10)</option>
                      <option value="Sababsiz dars qoldirish">Sababsiz dars qoldirish (-15)</option>
                      <option value="Noo‘rin gaplar yoki dars xalaqiti">Noo‘rin gaplar yoki dars xalaqiti (-10)</option>
                      <option value="Uskunani ehtiyotsiz ishlatish">Uskunani ehtiyotsiz ishlatish (-20)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ayiriladigan ball miqdori (-)</label>
                    <input
                      type="number"
                      required
                      value={penaltyPoints}
                      onChange={(e) => setPenaltyPoints(parseInt(e.target.value, 15))}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-red-500 rounded-xl px-3 py-2 text-sm outline-hidden font-bold text-red-700"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPenaltyModal(null)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Jarima ballini ayirish
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAYMENT INPUT LOG MODAL OVERLAY */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="text-sm font-bold text-blue-700 uppercase flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-blue-600 fill-blue-100" />
                    <span>To'lov kiritish</span>
                  </h4>
                  <button
                    onClick={() => setShowPaymentModal(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    Yopish
                  </button>
                </div>

                <div className="text-slate-600 text-xs space-y-1 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="font-bold text-blue-800">O‘quvchi: {showPaymentModal.fullname}</p>
                  <p>Guruhga qo'shilgan vaqti: {formatUzbekDate(showPaymentModal.joined_date)}</p>
                </div>

                <form className="space-y-4" onSubmit={handleAddPayment}>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">To'lov Summasi (so'm)</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Masalan, 348000"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-hidden font-bold text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                      Tizim 1 darsni hamisha <span className="font-bold text-slate-650">29 000 so'm</span>dan hisoblaydi. 
                      Ushbu summa <span className="text-blue-600 font-bold">{Math.floor(parseInt(paymentAmount || '0', 10) / 29000)} ta dars</span>ga yetishini hisoblab chiqadi.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(null)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-605"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                    >
                      To'lovni tasdiqlash
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
}
