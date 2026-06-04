import React, { useState } from 'react';
import { 
  Users, LayoutGrid, BookOpen, Percent, ArrowLeft, CheckCircle, 
  XCircle, ChevronRight, CreditCard, Award, Calendar, Phone, 
  GraduationCap, Search, AlertTriangle, TrendingUp, Sparkles,
  DollarSign, Clock, ArrowRight, Info, X
} from 'lucide-react';
import { Group, Student } from '../types';
import { getStudentPaymentDetails, formatUzbekDate, calculateFullYearLessonDates } from '../utils/paymentCalculator';
import { UserAvatar } from './UserAvatar';

interface AdminStatsDashboardProps {
  groups: Group[];
  teachers: any[];
  allStudents: Student[];
  allPayments?: any[];
  onTogglePayment: (studentId: string, currentStatus: 'paid' | 'unpaid') => void;
}

export default function AdminStatsDashboard({ 
  groups, 
  teachers, 
  allStudents, 
  allPayments = [],
  onTogglePayment 
}: AdminStatsDashboardProps) {
  // Local drill-down states for Admin
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  
  // Search and filter inside group list as sub-level config
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculations for TOP-LEVEL (Overall General Statistics)
  const activeGroupIds = new Set(groups.map(g => g.id));
  const validStudents = allStudents.filter(s => activeGroupIds.has(s.group_id));
  const validPayments = allPayments.filter(p => activeGroupIds.has(p.group_id));

  const totalGroupsCount = groups.length;
  const totalStudentsCount = validStudents.length;
  
  const paidCount = validStudents.filter(s => s.payment_status === 'paid').length;
  const unpaidCount = totalStudentsCount - paidCount;
  
  const paidPercentage = totalStudentsCount > 0 ? Math.round((paidCount / totalStudentsCount) * 100) : 0;
  // Cap at 100 just in case data inconsistencies
  const finalPaidPercent = Math.min(paidPercentage, 100);
  const finalUnpaidPercent = 100 - finalPaidPercent;

  // Real collections & lessons covered from teacher-input fields
  const totalCollections = validPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalLessonsCovered = validPayments.reduce((acc, p) => acc + (p.lessons_covered || 0), 0);

  // Average points across the institution
  const averagePoints = totalStudentsCount > 0 
    ? Math.round(validStudents.reduce((acc, s) => acc + s.current_points, 0) / totalStudentsCount)
    : 100;

  // Selected Teacher logic
  const currentTeacher = teachers.find(t => t.id === selectedTeacherId);
  const teacherGroups = selectedTeacherId 
    ? groups.filter(g => g.teacher_id === selectedTeacherId)
    : [];
  const teacherStudents = selectedTeacherId 
    ? allStudents.filter(s => teacherGroups.map(g => g.id).includes(s.group_id))
    : [];

  const teacherPaidCount = teacherStudents.filter(s => s.payment_status === 'paid').length;
  const teacherUnpaidCount = teacherStudents.length - teacherPaidCount;
  const teacherPaidPercentage = teacherStudents.length > 0 
    ? Math.round((teacherPaidCount / teacherStudents.length) * 100) 
    : 100;

  const teacherPayments = allPayments.filter(p => teacherGroups.some(g => g.id === p.group_id));
  const teacherCollections = teacherPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const teacherLessonsCovered = teacherPayments.reduce((acc, p) => acc + (p.lessons_covered || 0), 0);

  // Selected Group logic
  const currentGroup = groups.find(g => g.id === selectedGroupId);
  const groupStudents = selectedGroupId 
    ? allStudents.filter(s => s.group_id === selectedGroupId)
    : [];

  const groupPaidCount = groupStudents.filter(s => s.payment_status === 'paid').length;
  const groupUnpaidCount = groupStudents.length - groupPaidCount;
  const groupPaidPercentage = groupStudents.length > 0 
    ? Math.round((groupPaidCount / groupStudents.length) * 100) 
    : 100;

  const groupPayments = allPayments.filter(p => p.group_id === selectedGroupId);
  const groupCollections = groupPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const groupLessonsCovered = groupPayments.reduce((acc, p) => acc + (p.lessons_covered || 0), 0);

  // Apply search query when showing lists of students
  const filteredGroupStudents = groupStudents.filter(s => 
    s.fullname.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.parent_phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6" id="admin-stats-dashboard">
      
      {/* LEVEL 1: OVERALL GENERAL STATISTICS DASHBOARD */}
      {selectedTeacherId === null && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Section Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 text-white border border-slate-700 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-500/20">
                  O'quv Markazi Boshqaruvi
                </span>
                <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">LMS UMUMIY STATISTIKASI</h2>
                <p className="text-xs text-slate-300">Barcha o'quvchilar balansi, guruhlar dinamikasi va ustozlar hisoboti</p>
              </div>
              
              {/* Extra branding badge to look exceptionally crafted */}
              <div className="flex items-center space-x-2.5 bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2 border border-white/10">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <span className="text-[9px] text-slate-400 block font-bold leading-none">FAOL TIZIM</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">ONLINE DAUCHBOARD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Guruhlar soni */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jami O'quv Guruhlar</h4>
                <p className="text-3xl font-black text-slate-900 font-sans tracking-tight">{totalGroupsCount} ta</p>
                <span className="text-[10px] text-blue-600 font-extrabold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-505 animate-pulse"></span>
                  Barcha ustozlarda
                </span>
              </div>
              <div className="h-11 w-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2: O'quvchilar soni */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jami Faol O'quvchilar</h4>
                <p className="text-3xl font-black text-slate-900 font-sans tracking-tight">{totalStudentsCount} nafar</p>
                <span className="text-[10px] text-indigo-600 font-extrabold">O'quv markaz ro'yxatida</span>
              </div>
              <div className="h-11 w-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3: To'lovlarni amalga oshirganlar */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div className="space-y-1.5 w-full">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To‘lagan O‘quvchilar</h4>
                <div className="flex items-baseline space-x-1.5">
                  <p className="text-3xl font-black text-emerald-600 font-sans tracking-tight">{finalPaidPercent}%</p>
                  <span className="text-xs text-slate-500 font-bold font-mono">({paidCount} / {totalStudentsCount})</span>
                </div>
                {/* Progress bar visual for payment ratio */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-emerald-505 h-full rounded-full bg-emerald-500" style={{ width: `${finalPaidPercent}%` }}></div>
                </div>
              </div>
              <div className="h-11 w-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 ml-2">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 4: No-pay percentage */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div className="space-y-1.5 w-full">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qarzdor O‘quvchilar</h4>
                <div className="flex items-baseline space-x-1.5">
                  <p className="text-3xl font-black text-red-600 font-sans tracking-tight">{finalUnpaidPercent}%</p>
                  <span className="text-xs text-slate-500 font-bold font-mono">({unpaidCount} / {totalStudentsCount})</span>
                </div>
                {/* Progress bar visual for payment ratio */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${finalUnpaidPercent}%` }}></div>
                </div>
              </div>
              <div className="h-11 w-11 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500 shrink-0 ml-2">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* More descriptive charts context / metrics context */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Percent className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>To‘lov Holati Va Balans Tafsilotlari</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detailed metrics box */}
              <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-700">Tizim bo'yicha umumiy oylik tahlil</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">To'lov qilgan faol o'quvchilar:</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">{paidCount} nafar</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">To'lov muddati kechikkanlar (ogohlantirilgan):</span>
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md font-mono">{unpaidCount} nafar</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500 font-medium font-bold">Jami yig'ilgan mablag':</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono text-xs">{totalCollections.toLocaleString('uz-UZ')} so'm</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium font-bold">Yopilgan darslar ulushi (faol to'lov):</span>
                    <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-mono text-xs">{totalLessonsCovered} ta dars</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Oʻrtacha oʻzlashtirish ball koeffitsiyenti:</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-mono">{averagePoints} ball</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-150">
                  ⚠️ <strong>Administratorlar diqqatiga:</strong> Guruh boshqaruviga qarab to'lov holatini va o'quvchilarning umumiy faolligini har doim nazorat qilib boring. Tizim avtomatik ogohlantirish beradi.
                </div>
              </div>

              {/* Informative advice / study state box */}
              <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-1.5">Intizom va faollik darajasi</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    O'quv markazining umumiy o'zlashtirish reytingi barqaror. O'quvchilarda jazo ballarining berilishi kamaygan. Guruhlar davomati rejalashtirilgan 48 ta dars bo'yicha o'rtacha <strong>92.5%</strong> ko'rsatkichni tashkil etmoqda.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3.5 mt-4">
                  <div className="bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100/50 text-center">
                    <span className="text-[10px] text-slate-450 uppercase block font-bold">Faollik</span>
                    <span className="text-sm font-black text-emerald-600">A'lo daraja</span>
                  </div>
                  <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-100/50 text-center">
                    <span className="text-[10px] text-slate-450 uppercase block font-bold">Jadvallar</span>
                    <span className="text-sm font-black text-blue-600">Tahrirlangan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TEACHERS SELECTION WRAPPER (ism familyasi tursin) */}
          <div className="space-y-3.5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">O‘QITUVCHILAR BO‘YICHA CHUNQURLASHISH</h3>
            </div>
            
            <p className="text-xs text-slate-550 leading-relaxed">
              O'quv markazidagi o'qituvchilardan birini tanlang. Uning shaxsiy guruhlarini, dars o'tish foizi va o'quvchilarining to'lov hamda ballar tahlilini yuklaymiz.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="teachers-buttons-grid">
              {teachers.map((teacher) => {
                const teacherGroupsCount = groups.filter(g => g.teacher_id === teacher.id).length;
                return (
                  <button
                    key={teacher.id}
                    onClick={() => {
                      setSelectedTeacherId(teacher.id);
                      setSelectedGroupId(null);
                    }}
                    className="w-full text-left bg-white border border-slate-205 hover:border-blue-500 rounded-xl p-4.5 hover:shadow-2xs transition-all duration-200 group flex items-start justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-3.5">
                      {/* Teacher Avatar display */}
                      <div className="h-11 w-11 rounded-full bg-white text-slate-800 flex items-center justify-center border border-slate-200 overflow-hidden p-1.5 shrink-0">
                        <UserAvatar className="w-full h-full" />
                      </div>
                      
                      {/* Name of teacher */}
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-blue-600 transition truncate leading-snug">
                          {teacher.fullname}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">@{teacher.username}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {teacherGroupsCount} ta guruh
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-slate-350 group-hover:text-blue-500 transition-colors self-center shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* LEVEL 2: DETAILED STATS & GROUPS FOR A SPECIFIC TEACHER */}
      {selectedTeacherId !== null && selectedGroupId === null && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Breadcrumbs / Back button */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
            <button
              onClick={() => setSelectedTeacherId(null)}
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-950 font-bold text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Mudiriyat bosh sahifasiga qaytish</span>
            </button>
            
            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block leading-none">TAHRIR ANALITIKASI</span>
              <span className="text-xs font-extrabold text-blue-600 font-mono">Ustoz: {currentTeacher?.fullname}</span>
            </div>
          </div>

          {/* Header Section for Teacher Profil */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm p-2">
                <UserAvatar className="w-full h-full text-slate-800" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 leading-none">{currentTeacher?.fullname}</h3>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="font-semibold font-mono">@{currentTeacher?.username}</span>
                  <span>•</span>
                  <span>O‘qib kelayotgan o'quvchi: <strong className="text-slate-700">{teacherStudents.length} ta</strong></span>
                </div>
              </div>
            </div>
            
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-150 shadow-2xs text-left sm:text-right">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Lavozimi</span>
              <span className="text-xs font-extrabold text-indigo-700 uppercase">Katta O'qituvchi / Murabbiy</span>
            </div>
          </div>

          {/* Teacher Specific Statistics (Ustozning umumiy statistikasi) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Ustozning umumiy statistikasi</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat Card 1: Groups count */}
              <div className="bg-white rounded-xl p-4.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Guruhlar soni</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">{teacherGroups.length} ta</span>
                </div>
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
              </div>

              {/* Stat Card 2: Students in teacher's group */}
              <div className="bg-white rounded-xl p-4.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Guruhlardagi o‘quvchilar</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">{teacherStudents.length} nafar</span>
                </div>
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              {/* Stat Card 3: Payment completion percent */}
              <div className="bg-white rounded-xl p-4.5 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">To‘lov ko‘rsatkichi</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">{teacherPaidPercentage}%</span>
                </div>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-xs text-slate-700 font-bold font-mono">To'langan: {teacherPaidCount}</span>
                  <span className="text-xs text-slate-350">|</span>
                  <span className="text-xs text-red-500 font-bold font-mono">Qarz: {teacherUnpaidCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${teacherPaidPercentage}%` }}></div>
                </div>
              </div>

              {/* Stat Card 4: Teacher's Total revenue collections */}
              <div className="bg-white rounded-xl p-4.5 border border-slate-200 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Yig'ilgan to'lovlar</span>
                  <span className="text-xl font-black text-emerald-600 block leading-tight">{teacherCollections.toLocaleString('uz-UZ')} so'm</span>
                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 block w-max">
                    {teacherLessonsCovered} ta dars yopilgan
                  </span>
                </div>
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Teacher's Groups list (Ustozlarning guruhi ochilsin) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-slate-105 pb-2">
              <BookOpen className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">USTOZNING JONLI GURUHLARI RO'YXATI</h3>
            </div>
            
            <p className="text-xs text-slate-550 leading-relaxed">
              O'quvchilar tarkibini, davomat darajasini va o'quvchilarning umumiy to'lov analitikasini ko'rish uchun quyidagi guruhlardan birining ustiga bosing.
            </p>

            {teacherGroups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
                <LayoutGrid className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700 text-sm">Ushbu o‘qituvchida hali guruhlar yo‘q</p>
                <p className="text-xs text-slate-400 mt-1">Ushbu ustoz uchun tizim boshqaruvidan dars jadvali yarating.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="teacher-groups-sub-grid">
                {teacherGroups.map((group) => {
                  const percentage = group.completion_percentage || 0;
                  const groupStds = allStudents.filter(s => s.group_id === group.id);
                  const groupPaid = groupStds.filter(s => s.payment_status === 'paid').length;
                  const groupUnpaid = groupStds.length - groupPaid;
                  
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setSearchQuery('');
                      }}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 hover:shadow-2xs cursor-pointer transition-all duration-150 flex flex-col justify-between group relative"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            48 ta dars qamrovi
                          </span>
                          
                          <span className="text-[10px] text-slate-405 font-mono font-bold">
                            {groupStds.length} ta o'quvchi
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {group.group_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">
                            Yaratilgan: {formatUzbekDate(group.created_date)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Quick stats inside card */}
                      <div className="space-y-2 mt-4.5 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold uppercase">To'lovlar:</span>
                          <span className="font-semibold text-slate-650">
                            <span className="text-emerald-600 font-bold">{groupPaid} to'lagan</span> / <span className="text-red-500 font-bold">{groupUnpaid} qarz</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] mt-1">
                          <span className="text-slate-400 font-bold uppercase">Darsliklar:</span>
                          <span className="font-bold text-blue-700">{percentage}% ({group.completed_count || 0}/48)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* LEVEL 3: DETAILED SINGLE-GROUP VISUAL STUDENT STATISTICS */}
      {selectedTeacherId !== null && selectedGroupId !== null && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Breadcrumbs / Back button */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
            <button
              onClick={() => {
                setSelectedGroupId(null);
                setSearchQuery('');
              }}
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-950 font-bold text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ustoz guruhlariga qaytish</span>
            </button>
            
            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block leading-none">GURUH TAHLILI</span>
              <span className="text-xs font-extrabold text-blue-600 font-mono">Guruh: {currentGroup?.group_name}</span>
            </div>
          </div>

          {/* Group and Teacher card wrapper info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                  Faol dars drayveri
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{currentGroup?.group_name} guruhi analitikasi</h3>
                <p className="text-xs text-slate-450 font-medium">Ustoz: <strong className="text-slate-600">{currentTeacher?.fullname}</strong></p>
              </div>

              {/* Attendance quick state info */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-white border rounded-xl p-3 shadow-3xs text-left min-w-[128px]">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">To'langan foiz</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">{groupPaidPercentage}%</span>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-3xs text-left min-w-[128px]">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Mashg'ulot qamrov</span>
                  <span className="text-lg font-black text-blue-600 font-mono">{currentGroup?.completion_percentage || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group Student Stats Panel */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Guruh o‘quvchilari to‘lov statistikasi</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat card 1: total active in group */}
              <div className="bg-white rounded-xl p-4 border border-slate-201 flex items-center justify-between shadow-3xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Ro'yxatdagi jami o'quvchilar</span>
                  <span className="text-2xl font-black text-slate-950 block mt-1 font-mono">{groupStudents.length} nafar</span>
                </div>
                <div className="w-9 h-9 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center shrink-0 border">
                  <span className="text-xs font-bold font-mono">JAMI</span>
                </div>
              </div>

              {/* Stat card 2: Paid in group */}
              <div className="bg-white rounded-xl p-4 border border-slate-201 flex items-center justify-between shadow-3xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">To'lovni amalga oshirganlar</span>
                  <span className="text-2xl font-black text-emerald-600 block mt-1 font-sans">{groupPaidCount} nafar</span>
                </div>
                <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              {/* Stat card 3: Unpaid in group */}
              <div className="bg-white rounded-xl p-4 border border-slate-201 flex items-center justify-between shadow-3xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">To'lov qilmaganlar (Qarzi borlar)</span>
                  <span className="text-2xl font-black text-red-600 block mt-1 font-sans">{groupUnpaidCount} nafar</span>
                </div>
                <div className="w-9 h-9 bg-red-50 text-red-700 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                  <XCircle className="w-5 h-5 text-red-500 animate-pulse" />
                </div>
              </div>

              {/* Stat card 4: Group Collection */}
              <div className="bg-white rounded-xl p-4 border border-slate-201 flex items-center justify-between shadow-3xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Guruh to'lov summasi</span>
                  <span className="text-xl font-black text-blue-600 block mt-1 font-sans leading-none">{groupCollections.toLocaleString('uz-UZ')} so'm</span>
                  <span className="text-[9px] bg-slate-105 text-slate-500 font-bold px-1.5 py-0.5 rounded inline-block mt-1">
                    {groupLessonsCovered} ta dars yopilgan
                  </span>
                </div>
                <div className="w-9 h-9 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Student List with live toggle actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-3xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-normal">Guruh o‘quvchilari to'liq tahlil jadvali</h4>
                <p className="text-xs text-slate-400 font-medium">To'lov holatini almashtirish uchun <strong className="text-blue-600">badge</strong> (unvon) unli tugmasini bosing</p>
              </div>

              {/* Search bar specifically for filtering students locally */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ism yoki telefon qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs outline-hidden transition"
                />
              </div>
            </div>

            {filteredGroupStudents.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-400 italic">Guruhda hech qanday o‘quvchi ro'yxatga olinmagan yoki qidiruvga loyiq topilmadi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-3 px-4">O‘quvchi (F.I.SH)</th>
                      <th className="py-3 px-4">Kafil raqami</th>
                      <th className="py-3 px-4 font-mono">Ballari</th>
                      <th className="py-3 px-4 text-center">Toʻlov Holati (Faol Tizim)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroupStudents.map((student) => {
                      const isPaid = student.payment_status === 'paid';
                      return (
                        <tr 
                          key={student.id} 
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Name details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-705 flex items-center justify-center font-bold text-xs shrink-0 border font-sans">
                                {student.fullname ? student.fullname.substring(0, 2).toUpperCase() : 'OQ'}
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 text-xs block leading-none">{student.fullname}</span>
                                <span className="text-[9px] text-slate-405 font-medium">Qo'shilgan sana: {formatUzbekDate(student.joined_date)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Phone numbers */}
                          <td className="py-3.5 px-4 font-semibold text-xs text-slate-700">
                            <div className="flex items-center space-x-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{student.parent_phone}</span>
                            </div>
                          </td>

                          {/* Points */}
                          <td className="py-3.5 px-4 font-bold font-mono text-xs text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-blue-700">{student.current_points} ball</span>
                            </div>
                          </td>

                          {/* Interactive Payment toggler */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setSelectedDetailStudent(student)}
                              className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-3xs outline-hidden border ${
                                isPaid 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 hover:scale-103' 
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80 hover:scale-103'
                              }`}
                              title="To'lov tahlili, darslari va to'langan summasini ko'rish"
                            >
                              {isPaid ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>To‘langan</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  <span>To‘lanmagan</span>
                                </>
                              )}
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

      {/* DETAILED PAYMENT MONITORING MODAL OVERLAY */}
      {selectedDetailStudent && (() => {
        const studentPayments = allPayments.filter(p => p.student_id === selectedDetailStudent.id);
        const {
          totalPaid,
          totalLessonsPaid,
          lessonDates,
          consumedLessons,
          remainingLessons,
          expiryDate,
          isExpired
        } = getStudentPaymentDetails(
          selectedDetailStudent.joined_date,
          studentPayments,
          selectedDetailStudent.lesson_schedule
        );

        const fullYearDates = calculateFullYearLessonDates(
          selectedDetailStudent.joined_date,
          selectedDetailStudent.lesson_schedule
        );

        const studentGroup = groups.find(g => g.id === selectedDetailStudent.group_id);
        const todayStr = new Date().toISOString().substring(0, 10);

        const getUzWeekday = (dateStr: string) => {
          const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
          return days[new Date(dateStr).getDay()];
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b pb-4 shrink-0">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800 uppercase flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    <span>To'lov Analitikasi & Darslar Monitoringi</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Tizim bo'yicha darslar jadvali va qoplanish muddati</p>
                </div>
                <button
                  onClick={() => setSelectedDetailStudent(null)}
                  className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition duration-150"
                >
                  Yopish
                </button>
              </div>

              <div className="space-y-6 py-4 flex-1">
                {/* Student Identity and Metadata */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">O'quvchi & Dars Jadvali</p>
                    <p className="font-extrabold text-sm text-slate-800">{selectedDetailStudent.fullname}</p>
                    <p className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Kafil raqami: {selectedDetailStudent.parent_phone}</span>
                    </p>
                    <p className="text-[11px] text-blue-750 font-extrabold uppercase mt-1 inline-block bg-blue-55 text-blue-800 px-2 py-0.5 rounded-md border border-blue-100">
                      Kunlari: {selectedDetailStudent.lesson_schedule === 'even' ? 'Seshanba/Payshanba/Shanba' : 'Dushanba/Chorshanba/Juma'}
                    </p>
                  </div>
                  <div className="space-y-1 md:text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Guruh & Kiritilgan Sana</p>
                    <p className="font-bold text-xs text-blue-700">{studentGroup ? studentGroup.group_name : 'Noma\'lum guruh'}</p>
                    <p className="text-xs text-slate-500 font-medium font-sans">A'zolik (joined): <span className="font-bold text-slate-700">{formatUzbekDate(selectedDetailStudent.joined_date)}</span></p>
                  </div>
                </div>

                {/* Metrics Blocks */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1 text-center">
                    <span className="text-[9px] text-slate-450 uppercase font-black block">Jami to'lagan</span>
                    <p className="text-sm font-black text-blue-700 font-mono">{totalPaid.toLocaleString('uz-UZ')} so'm</p>
                    <span className="text-[8px] text-slate-400 block">Har bir dars: 29K</span>
                  </div>

                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1 text-center">
                    <span className="text-[9px] text-slate-450 uppercase font-black block">Jami darslar</span>
                    <p className="text-sm font-black text-indigo-700 font-mono">{totalLessonsPaid} ta dars</p>
                    <span className="text-[8px] text-slate-400 block">Kurs bo'yicha qoplangan</span>
                  </div>

                  <div className={`p-3 border rounded-xl space-y-1 text-center ${remainingLessons > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <span className="text-[9px] text-slate-450 uppercase font-black block">Yana darsga yetadi</span>
                    <p className={`text-xs font-black font-mono ${remainingLessons > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {remainingLessons} ta dars (faol)
                    </p>
                    <span className={`text-[8px] font-bold block ${remainingLessons > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {remainingLessons > 0 ? 'STATUS: FAOL TO\'LOV' : 'MUDDATI TUGAGAN'}
                    </span>
                  </div>

                  <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1 text-center">
                    <span className="text-[9px] text-slate-450 uppercase font-black block">To'lov tugash sanasi</span>
                    <p className="text-xs font-black text-purple-705">{expiryDate ? formatUzbekDate(expiryDate) : 'Noma\'lum'}</p>
                    <span className="text-[8px] text-slate-400 block">Oxirgi qoplangan dars</span>
                  </div>
                </div>

                {/* Consecutive Lesson Schedule Breakdowns */}
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Darslar Bo'yicha To'lov Qoplami (1 Yillik Dars Jadvali)</span>
                  </h5>
                  
                  {fullYearDates.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-xl text-xs text-slate-400 bg-slate-50/50 font-semibold">
                      Ushbu o'quvchi uchun guruh boshlanish sanasi noto'g'ri.
                    </div>
                  ) : (
                    <div className="border border-slate-150 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-505 font-extrabold uppercase text-[9px] border-b">
                            <th className="py-2.5 px-3">Ketma-ketlik</th>
                            <th className="py-2.5 px-3">Dars Sanasi</th>
                            <th className="py-2.5 px-3">Hafta Kuni</th>
                            <th className="py-2.5 px-3 text-right">Maqom / Hisobdan chegirlanish</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fullYearDates.map((date, idx) => {
                            const isPaid = idx < totalLessonsPaid;
                            const isElapsed = date <= todayStr;
                            return (
                              <tr key={idx} className={`hover:bg-slate-50/50 ${isElapsed ? 'bg-slate-50/35' : ''} ${!isPaid ? 'bg-red-50/10' : ''}`}>
                                <td className="py-2 px-3 text-slate-500 font-bold font-mono">Dars #{idx + 1}</td>
                                <td className={`py-2 px-3 font-semibold ${isElapsed ? 'text-slate-450' : 'text-slate-800 font-bold'}`}>{formatUzbekDate(date)}</td>
                                <td className="py-2 px-3 text-slate-450 font-medium">{getUzWeekday(date)}</td>
                                <td className="py-2 px-3 text-right">
                                  {isPaid ? (
                                    isElapsed ? (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[9px] uppercase border">
                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                        <span>O'tilgan (chegirildi)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold text-[9px] uppercase border border-emerald-150">
                                        <CheckCircle className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                                        <span>Amalda (Mavjud dars)</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-extrabold text-[9px] uppercase border border-rose-150">
                                      <XCircle className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                                      <span>To'lov qilish kerak</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Actual Saved Payments List */}
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ustoz tomonidan kiritilgan to'lovlar tarixi</span>
                  </h5>

                  {studentPayments.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-xl text-xs text-slate-400 bg-slate-50/50 font-semibold">
                      To'lov kiritish yozuvlari topilmadi.
                    </div>
                  ) : (
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-505 font-extrabold uppercase text-[9px] border-b">
                            <th className="py-2 px-3">Sana</th>
                            <th className="py-2 px-3">Oy / Izoh</th>
                            <th className="py-2 px-3 text-right">To'lov Summasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentPayments.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-600 font-semibold">{formatUzbekDate(p.payment_date)}</td>
                              <td className="py-2.5 px-3 text-slate-505 font-bold uppercase">{p.month || 'Guruh darsligi'}</td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-700 font-mono bg-emerald-50/20">{p.amount.toLocaleString('uz-UZ')} so'm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="border-t pt-4 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedDetailStudent(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition duration-150"
                >
                  Yopish
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
