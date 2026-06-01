import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle, FileText, ChevronDown, ChevronUp, Search, Eye, Filter, RefreshCw, AlertCircle, Edit3, Save, PlusCircle, Trash, ExternalLink, Users } from 'lucide-react';
import { Lesson, Group, UserSession } from '../types';
import StudentManagement from './StudentManagement';

interface LessonsTrackerProps {
  group: Group;
  currentUser: UserSession;
  onBack: () => void;
}

export default function LessonsTracker({ group, currentUser, onBack }: LessonsTrackerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeModule, setActiveModule] = useState<'lessons' | 'students'>('lessons');
  
  // Expanded lesson row index list (to show/hide chronological details, vocab, soft skills)
  const [expandedLessons, setExpandedLessons] = useState<{ [num: number]: boolean }>({});

  // States for the Admin Edit Modal
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPlatform, setEditPlatform] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editExpenses, setEditExpenses] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editRawMaterials, setEditRawMaterials] = useState('');
  const [editLinks, setEditLinks] = useState<{ title: string; url: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // States for PDF viewer modal
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingPdfTitle, setViewingPdfTitle] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupLessons();
  }, [group.id]);

  const fetchGroupLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}/lessons`);
      if (!res.ok) throw new Error('Darslarni drayvdan yuklab bo\'lmadi');
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const toggleLessonCompletion = async (lessonNumber: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI updates
    setLessons(prev => prev.map(l => l.lesson_number === lessonNumber ? { ...l, completed: newStatus } : l));

    try {
      const res = await fetch(`/api/groups/${group.id}/lessons/${lessonNumber}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newStatus })
      });
      if (!res.ok) {
        throw new Error('Sinxronizatsiya muvaffaqiyatsiz tugadi');
      }
    } catch (err) {
      // Revert optimistic update on failure
      setLessons(prev => prev.map(l => l.lesson_number === lessonNumber ? { ...l, completed: currentStatus } : l));
      alert('Dars holatini o\'zgartirishda xato yuz berdi');
    }
  };

  const handleToggleExpand = (lessonNum: number) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonNum]: !prev[lessonNum]
    }));
  };

  const handleOpenPdf = (title: string, url: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  // Admin Lesson Editing Flow
  const handleOpenEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditPlatform(lesson.platform);
    setEditPlan(lesson.plan);
    setEditExpenses(lesson.exercises);
    setEditGoal(lesson.goal);
    setEditRawMaterials(lesson.rawMaterials);
    setEditLinks([...lesson.links]);
  };

  const handleAddLinkInForm = () => {
    setEditLinks(prev => [...prev, { title: 'Yangi havola', url: '' }]);
  };

  const handleRemoveLinkInForm = (idx: number) => {
    setEditLinks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    setEditLinks(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;

    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/lessons/${editingLesson.lesson_number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          platform: editPlatform,
          plan: editPlan,
          exercises: editExpenses,
          goal: editGoal,
          rawMaterials: editRawMaterials,
          links: editLinks
        })
      });

      if (!res.ok) throw new Error('Darsni tahrirlashda xatolik yuz berdi');
      
      // Update local state
      setLessons(prev => prev.map(l => l.lesson_number === editingLesson.lesson_number ? {
        ...l,
        title: editTitle,
        platform: editPlatform,
        plan: editPlan,
        exercises: editExpenses,
        goal: editGoal,
        rawMaterials: editRawMaterials,
        links: editLinks
      } : l));

      setEditingLesson(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Computed Properties for Progress Bar and statistics
  const completedCount = lessons.filter(l => l.completed).length;
  const totalCount = lessons.length || 48;
  const progressPercentage = Math.round((completedCount / totalCount) * 100) || 0;

  // Filter lessons
  const filteredLessons = lessons.filter(lesson => {
    // Search filter matching title or platform
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lesson.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(lesson.lesson_number).includes(searchTerm);
    
    // Status checkboxes filter
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'completed' ? lesson.completed :
      !lesson.completed;

    return matchesSearch && matchesStatus;
  });

  if (activeModule === 'students') {
    return (
      <StudentManagement 
        group={group} 
        currentUser={currentUser} 
        onBack={() => setActiveModule('lessons')} 
      />
    );
  }

  return (
    <div className="space-y-6" id="lessons-tracker-workspace">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition duration-200"
            id="btn-tracker-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full uppercase">Guruh darslari</span>
              <span className="text-xs text-slate-400 font-medium">Bosh sahifa &raquo; Guruh</span>
            </div>
            <div className="flex items-center space-x-3 mt-1.5 flex-wrap gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{group.group_name}</h3>
              <button
                onClick={() => setActiveModule('students')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition duration-200 flex items-center space-x-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>O‘quvchilar tarkibi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detailed quick stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 font-semibold uppercase">O‘zlashtirish darajasi</p>
            <p className="text-lg font-extrabold text-slate-800">{completedCount} / {totalCount} dars bajarildi</p>
          </div>
          <div className="relative h-16 w-16 shrink-0 flex items-center justify-center bg-blue-50 border-4 border-blue-100 rounded-full font-bold text-blue-700 text-md">
            {progressPercentage}%
          </div>
        </div>
      </div>

      {/* Progress Bar Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-800">Kurs dasturining umumiy yakunlanishi ({progressPercentage}%)</span>
          <span className="text-slate-400 font-mono">{completedCount}/{totalCount} dars</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-xs" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="flex space-x-4 text-xs font-semibold text-slate-500 pl-1 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span>Bajarildi ({completedCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-200"></span>
            <span>O‘tilishi kutilayotgan ({totalCount - completedCount})</span>
          </div>
        </div>
      </div>

      {/* Toolbar for Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="w-full lg:max-w-[260px] relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Darsni izlash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl pl-8.5 pr-3 py-1.5 text-xs outline-hidden transition duration-200 shadow-3xs"
          />
        </div>

        <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2">
          {/* View Mode Grid/List buttons */}
          <div className="flex items-center space-x-1 bg-slate-200 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Matritsa (Super Zich)
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Tafsilotli Ro‘yxat
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Barchasi ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              ✓ Bajarilgan ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                statusFilter === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              ⬜ ({totalCount - completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Lessons List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <span>Guruh dars silsilasi drayvdan yuklanmoqda...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold">Dars rejalarini yuklab bo‘lmadi</p>
            <p className="text-sm">{error}. Pls verify dynamic server connectivity and database format.</p>
            <button onClick={fetchGroupLessons} className="mt-3 bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">Qayta yuklash</button>
          </div>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-400 font-medium">
          Dars qidiruv natijasi bo'yicha hech qanday ma'lumot topilmadi.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5" id="lessons-grid-container">
          {filteredLessons.map((lesson) => {
            const hasPdf = lesson.links && lesson.links.length > 0;
            return (
              <div 
                key={lesson.lesson_number}
                className={`relative p-3.5 rounded-xl border flex flex-col justify-between min-h-[140px] transition-all duration-200 ${
                  lesson.completed 
                    ? 'border-green-200 bg-emerald-50/20 text-green-800' 
                    : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs'
                }`}
                id={`lesson-card-grid-${lesson.lesson_number}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm font-mono ${
                      lesson.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{String(lesson.lesson_number).padStart(2, '0')}
                    </span>
                    
                    <button
                      onClick={() => toggleLessonCompletion(lesson.lesson_number, lesson.completed)}
                      className={`transition duration-200 p-0.5 rounded-md focus:outline-hidden ${
                        lesson.completed ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'
                      }`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="w-5 h-5 fill-emerald-55" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <h5 className={`text-xs font-bold text-slate-900 leading-snug line-clamp-2 ${lesson.completed ? 'line-through text-slate-450' : ''}`}>
                    {lesson.title}
                  </h5>

                  {lesson.platform && (
                    <span className="inline-block text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1 py-0.5 rounded-sm font-extrabold max-w-full truncate">
                      {lesson.platform}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  {(() => {
                    const title = lesson.lesson_title || lesson.title || "PDF";
                    const pdfUrl = lesson.pdf_url;
                    
                    if (!pdfUrl) {
                      return (
                        <button
                          disabled
                          className="text-[9px] bg-slate-100 border border-slate-200 text-slate-400 px-1.5 py-1 rounded-md font-bold truncate max-w-[90px] inline-flex items-center space-x-1 opacity-50 cursor-not-allowed"
                          title="PDF mavjud emas"
                        >
                          <FileText className="w-3 h-3 text-slate-300 shrink-0" />
                          <span className="truncate">Yo'q</span>
                        </button>
                      );
                    }
                    
                    if (!pdfUrl.startsWith('http')) {
                      return (
                        <button
                          disabled
                          className="text-[9px] bg-red-50 border border-red-200 text-red-650 px-1.5 py-1 rounded-md font-bold truncate max-w-[90px] inline-flex items-center space-x-1 cursor-not-allowed"
                          title="PDF not available"
                        >
                          <FileText className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="truncate text-red-600 font-extrabold">PDF not available</span>
                        </button>
                      );
                    }
                    
                    return (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-1.5 py-1 rounded-md font-extrabold truncate max-w-[90px] inline-flex items-center space-x-1 transition hover:scale-105"
                        title={title}
                      >
                        <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">{title}</span>
                      </a>
                    );
                  })()}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleOpenEdit(lesson)}
                        className="p-1 border border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-500 rounded-md bg-white hover:bg-blue-50 transition"
                        title="Tahrirlash"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setViewMode('list');
                        setExpandedLessons({ [lesson.lesson_number]: true });
                      }}
                      className="p-1 border border-slate-200 text-slate-400 hover:text-slate-700 rounded-md bg-white hover:bg-slate-50 transition"
                      title="Tafsilot"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLessons.map((lesson) => {
            const isExpanded = !!expandedLessons[lesson.lesson_number];
            return (
              <div 
                key={lesson.lesson_number} 
                className={`transition-all duration-200 rounded-2xl border bg-white shadow-3xs overflow-hidden ${
                  lesson.completed 
                    ? 'border-green-150 bg-emerald-50/10' 
                    : 'border-slate-200 hover:border-slate-350 hover:shadow-2xs'
                }`}
              >
                {/* Lesson Header Block */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    {/* Checkbox input */}
                    <button
                      onClick={() => toggleLessonCompletion(lesson.lesson_number, lesson.completed)}
                      className={`mt-1 shrink-0 transition duration-200 p-0.5 rounded-lg focus:outline-hidden ${
                        lesson.completed ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'
                      }`}
                      id={`checkbox-lesson-${lesson.lesson_number}`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="w-6 h-6 fill-emerald-50" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          lesson.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {lesson.lesson_number}-Dars
                        </span>
                        {lesson.platform && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                            {lesson.platform}
                          </span>
                        )}
                      </div>
                      <h4 className={`text-base font-bold text-slate-950 ${lesson.completed ? 'line-through text-slate-500' : ''}`}>
                        {lesson.title}
                      </h4>
                      {lesson.goal && (
                        <p className="text-xs text-slate-500 max-w-xl line-clamp-1">
                          <span className="font-semibold text-slate-600">Natija:</span> {lesson.goal}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-end space-x-3 shrink-0 self-end sm:self-center">
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleOpenEdit(lesson)}
                        className="p-2 border border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition duration-150"
                        title="Tahrirlash"
                        id={`btn-edit-lesson-${lesson.lesson_number}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* PDF Materials Button */}
                    {(() => {
                      const title = lesson.lesson_title || lesson.title || "PDF";
                      const pdfUrl = lesson.pdf_url;
                      
                      if (!pdfUrl) {
                        return (
                          <button
                            disabled
                            className="bg-slate-100 border border-slate-200 text-slate-400 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 opacity-50 cursor-not-allowed pr-2"
                            title="PDF mavjud emas"
                          >
                            <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="truncate max-w-[120px]">{title}</span>
                          </button>
                        );
                      }
                      
                      if (!pdfUrl.startsWith('http')) {
                        return (
                          <button
                            disabled
                            className="bg-red-50 border border-red-200 text-red-650 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-not-allowed pr-2"
                            title="PDF not available"
                          >
                            <FileText className="w-4 h-4 shrink-0 text-red-500" />
                            <span className="truncate max-w-[120px] text-red-600">PDF not available</span>
                          </button>
                        );
                      }
                      
                      return (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition duration-150 transform hover:scale-[1.02] shadow-3xs"
                          id={`btn-pdf-lesson-${lesson.lesson_number}`}
                          title={title}
                        >
                          <FileText className="w-4 h-4 shrink-0 text-blue-600" />
                          <span className="truncate max-w-[120px]">{title}</span>
                        </a>
                      );
                    })()}

                    {/* Expand chronological detail */}
                    <button
                      onClick={() => handleToggleExpand(lesson.lesson_number)}
                      className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition duration-150 inline-flex items-center"
                    >
                      <span className="text-xs font-semibold px-1 hidden sm:inline">{isExpanded ? 'Yopish' : 'Tafsilot'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded lesson plan details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-fadeIn text-sm text-slate-700 space-y-4">
                    {/* Expected pedagogical targets */}
                    {lesson.exercises && (
                      <div className="bg-white p-4 rounded-xl border border-slate-150">
                        <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 mb-2">Bajariladigan mashqlar va o‘yinlar</h5>
                        <p className="text-slate-800 leading-relaxed font-medium">{lesson.exercises}</p>
                      </div>
                    )}

                    {lesson.plan && (
                      <div className="bg-white p-4 rounded-xl border border-slate-150">
                        <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 mb-2">2 soatlik dars reja (Xronologiya)</h5>
                        <div className="whitespace-pre-wrap text-slate-800 leading-relaxed prose prose-sm max-w-none">
                          {lesson.plan}
                        </div>
                      </div>
                    )}

                    {/* Other resources and extra Links */}
                    {lesson.links && lesson.links.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-150">
                        <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 mb-2">Qo‘shimcha manbalar va PDF materiallar</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {lesson.links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 text-blue-700 rounded-xl transition duration-150 inline-flex items-center justify-between font-semibold"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="truncate text-xs">{link.title}</span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Modal Viewer */}
      {viewingPdfUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">PDF hujjat faol vizualizer</p>
                <h4 className="text-sm font-bold truncate max-w-md sm:max-w-xl">{viewingPdfTitle}</h4>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={viewingPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition duration-150 inline-flex items-center space-x-1"
                >
                  <span>Yangi oynada ochish</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => { setViewingPdfUrl(null); setViewingPdfTitle(null); }}
                  className="text-slate-400 hover:text-white text-xl font-bold bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-lg flex items-center justify-center transition duration-150"
                >
                  &times;
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 flex flex-col justify-between relative">
              {/* Check if dynamic drive doc or traditional embed */}
              {viewingPdfUrl.includes('drive.google.com') && !viewingPdfUrl.includes('/preview') ? (
                // Google Drive files can be displayed cleanly by transforming to preview URL
                <iframe
                  src={viewingPdfUrl.replace(/\/view(\?.*)?$/, '/preview')}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              ) : (
                <iframe
                  src={viewingPdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-800 font-sans">
                {editingLesson.lesson_number}-dars: Metama'lumotlarni Tahrirlash
              </h3>
              <button
                onClick={() => setEditingLesson(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mavzu Sarlavhasi (Uzbek)</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Texnologik Platforma</label>
                  <input
                    type="text"
                    required
                    value={editPlatform}
                    onChange={(e) => setEditPlatform(e.target.value)}
                    placeholder="GCompris / Scratch / WeDo"
                    className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sinf dars maqsadi</label>
                  <input
                    type="text"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Xronologiya / 2 soatlik dars reja</label>
                <textarea
                  rows={4}
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-hidden"
                  placeholder="Xronologiya matni..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bajariladigan mashqlar va ko'rib chiqiladigan o'yinlar</label>
                <textarea
                  rows={2}
                  value={editExpenses}
                  onChange={(e) => setEditExpenses(e.target.value)}
                  className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-hidden"
                />
              </div>

              {/* Dynamic Links Editor Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-extrabold text-slate-600 uppercase">Lesson PDF / Drive Material havolalari</span>
                  <button
                    type="button"
                    onClick={handleAddLinkInForm}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center space-x-1"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Havola qo‘shish</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {editLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Havola sarlavhasi (masalan: Lesson PDF)"
                          value={link.title}
                          onChange={(e) => handleLinkChange(idx, 'title', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs outline-hidden"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Havola manzili (URL)"
                          value={link.url}
                          onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLinkInForm(idx)}
                        className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition duration-150"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editLinks.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">Hozircha hech qanday PDF havola mavjud emas.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{submittingEdit ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
