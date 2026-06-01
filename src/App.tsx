import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, Settings, LogOut, User, Plus, Search, 
  RefreshCw, FileText, CheckCircle, Clock, LayoutGrid, Calendar,
  Key, Shield, Menu, X, ArrowLeft, Heart, Award, ChevronRight, Upload,
  GraduationCap, Percent, Trophy, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { Group, UserSession } from './types';
import { formatUzbekDate } from './utils/paymentCalculator';
import LandingPage from './components/LandingPage';
import LessonsTracker from './components/LessonsTracker';
import TeachersList from './components/TeachersList';
import SyncSettings from './components/SyncSettings';
import AdminStatsDashboard from './components/AdminStatsDashboard';

export default function App() {
  // Navigation & session state
  const [showLanding, setShowLanding] = useState(true);
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'profile' | 'teachers' | 'sync'>('groups');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Group deletion state
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullname, setEditFullname] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  
  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Group list state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Group creation modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Responsive sidebar mobile state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync state tracking
  const [lastSyncDate, setLastSyncDate] = useState<string>('Bajarilmagan');

  // Interactive Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);

  // Admin-specific overall stats states
  const [adminTeachers, setAdminTeachers] = useState<any[]>([]);
  const [adminAllStudents, setAdminAllStudents] = useState<any[]>([]);
  const [adminAllPayments, setAdminAllPayments] = useState<any[]>([]);
  const [adminSelectedTeacherId, setAdminSelectedTeacherId] = useState<string | null>(null);
  const [adminSelectedGroupId, setAdminSelectedGroupId] = useState<string | null>(null);

  const fetchAdminTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        setAdminTeachers(data);
      }
    } catch (e) {
      console.error('Error fetching admin teachers:', e);
    }
  };

  const fetchAdminAllStudents = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setAdminAllStudents(data);
      }
    } catch (e) {
      console.error('Error fetching admin students:', e);
    }
  };

  const fetchAdminAllPayments = async () => {
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        setAdminAllPayments(data);
      }
    } catch (e) {
      console.error('Error fetching admin payments:', e);
    }
  };

  const handleToggleStudentPayment = async (studentId: string, currentStatus: 'paid' | 'unpaid') => {
    try {
      const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus })
      });
      if (res.ok) {
        fetchAdminAllStudents();
        fetchAdminAllPayments();
        if (user) {
          fetchAnalytics(user.id, user.role);
        }
      }
    } catch (e) {
      console.error('Error toggling payment status:', e);
    }
  };

  const fetchAnalytics = async (userId: string, role: string) => {
    setLoadingAnalytics(true);
    try {
      const url = role === 'admin' ? '/api/analytics' : `/api/analytics?teacherId=${userId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('campus_lms_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setShowLanding(false);
        fetchGroups(parsed.id, parsed.role);
      } catch (err) {
        localStorage.removeItem('campus_lms_user');
      }
    }
  }, []);

  // Background Auto-Save & Server Auto-Restoration system
  useEffect(() => {
    if (!user) return;

    const syncAndBackup = async () => {
      try {
        // 1. Fetch current server state
        const getRes = await fetch('/api/backup/get-all');
        if (getRes.ok) {
          const serverDb = await getRes.json();
          
          // 2. Load local copy from browser localStorage
          const localBackupStr = localStorage.getItem('campus_lms_backup_db');
          
          if (localBackupStr) {
            const localDbObj = JSON.parse(localBackupStr);
            const serverLastUpdated = serverDb.last_updated || 0;
            const localLastUpdated = localDbObj.last_updated || 0;

            // The server is considered reset if its timestamp is 0 or very small (meaning it's the template)
            const isServerReset = (serverLastUpdated === 0 || serverLastUpdated < 1500000000000) && localLastUpdated > 0;
            const shouldRestore = isServerReset || (localLastUpdated > serverLastUpdated);

            if (shouldRestore) {
              console.log("Restoring server database from durable browser local storage backup (local storage is newer)...");
              const restoreRes = await fetch('/api/backup/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localDbObj)
              });
              
              if (restoreRes.ok) {
                console.log("Database successfully restored on the server!");
                fetchGroups(user.id, user.role);
              }
            } else {
              // Server has current or newer data. Update browser's durable local backup copy!
              localStorage.setItem('campus_lms_backup_db', JSON.stringify(serverDb));
            }
          } else {
            // No browser backup yet, so just populate it from the server
            localStorage.setItem('campus_lms_backup_db', JSON.stringify(serverDb));
          }
        }
      } catch (err) {
        console.error("Auto-sync background error:", err);
      }
    };

    // Run immediately and then set an interval
    syncAndBackup();
    const interval = setInterval(syncAndBackup, 5000); // Check every 5 seconds for safety
    return () => clearInterval(interval);
  }, [user]);

  const fetchGroups = async (userId: string, role: string) => {
    setLoadingGroups(true);
    fetchAnalytics(userId, role);
    if (role === 'admin') {
      fetchAdminTeachers();
      fetchAdminAllStudents();
      fetchAdminAllPayments();
    }
    try {
      // If user is a teacher, only fetch their groups, otherwise if admin fetch all
      const url = role === 'admin' ? '/api/groups' : `/api/groups?teacherId=${userId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Guruhlarni yuklashda muammo yuz berdi');
      const data = await res.json();
      
      // Calculate completion percentages for each group dynamically
      const groupsWithCompletions = await Promise.all(
        data.map(async (group: Group) => {
          try {
            const lessonsRes = await fetch(`/api/groups/${group.id}/lessons`);
            if (lessonsRes.ok) {
              const lessonsData = await lessonsRes.json();
              const lessonsList = lessonsData.lessons || [];
              const doneCount = lessonsList.filter((l: any) => l.completed).length;
              return {
                ...group,
                completed_count: doneCount,
                completion_percentage: Math.round((doneCount / 48) * 100) || 0
              };
            }
          } catch (e) {
            // ignore
          }
          return {
            ...group,
            completed_count: 0,
            completion_percentage: 0
          };
        })
      );

      setGroups(groupsWithCompletions);
    } catch (err) {
      console.error('Groups loading error:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'profile') {
      setEditFullname(user.fullname || '');
      setEditUsername(user.username || '');
      setEditPassword(user.password || '');
      setEditAvatar(user.avatar || '');
      setProfileError(null);
      setProfileSuccess(null);
      setIsEditingProfile(false);
    }
  }, [activeTab, user]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 2 * 1024 * 1024) {
        setProfileError("Rasm hajmi juda katta (maksimal 2 MB gacha ruxsat etiladi)");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditAvatar(reader.result);
          setProfileError(null);
        }
      };
      reader.onerror = () => {
        setProfileError("Rasmni o'qishda xatolik yuz berdi");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch(`/api/teachers/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: editFullname,
          username: editUsername,
          password: editPassword,
          avatar: editAvatar
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Profilni saqlashda xato yuz berdi');
      }

      const updatedUser = await res.json();
      
      // Update session locally
      const newSession = {
        ...user,
        fullname: updatedUser.fullname,
        username: updatedUser.username,
        password: updatedUser.password,
        avatar: updatedUser.avatar
      };
      setUser(newSession);
      localStorage.setItem('campus_lms_user', JSON.stringify(newSession));
      setProfileSuccess('Profil ma’lumotlari muvaffaqiyatli yangilandi!');
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Xatolik yuz berdi');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError('Iltimos, username va parolni toʻliq kiriting');
      return;
    }

    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Kirish taqiqlangan');
      }

      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('campus_lms_user', JSON.stringify(userData));
      
      // Reset inputs & close modal/landing page
      setLoginUsername('');
      setLoginPassword('');
      setShowLoginModal(false);
      setShowLanding(false);
      setActiveTab('groups');
      setSelectedGroup(null);
      
      // Fetch relevant groups
      fetchGroups(userData.id, userData.role);
    } catch (err: any) {
      setLoginError(err.message || 'Username yoki parol xato');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('campus_lms_user');
    setSelectedGroup(null);
    setShowLanding(true);
    setShowLoginModal(false);
    setMobileSidebarOpen(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    setSubmittingGroup(true);
    setGroupError(null);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: newGroupName,
          teacher_id: user.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Guruh yaratishda xato yuz berdi');
      }

      // Reload groups
      await fetchGroups(user.id, user.role);
      
      // Close modal and reset form
      setNewGroupName('');
      setShowAddModal(false);
    } catch (err: any) {
      setGroupError(err.message);
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleDeleteGroup = (groupId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    setGroupToDelete({ id: groupId, name });
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      const res = await fetch(`/api/groups/${groupToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Guruhni oʻchirib boʻlmadi');
      
      // Refresh groups list
      if (user) {
        fetchGroups(user.id, user.role);
      }
    } catch (err) {
      console.error('Xatolik: Guruhni oʻchira olmadik', err);
    } finally {
      setGroupToDelete(null);
    }
  };

  // Searching groups by name or code
  const filteredGroups = groups.filter(g => 
    g.group_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Triggering the Sync process
  const triggerSync = async () => {
    const success = await fetch('/api/sync-sheets', { method: 'POST' });
    if (success.ok) {
      setLastSyncDate(new Date().toLocaleTimeString());
      if (user) {
        fetchGroups(user.id, user.role);
      }
    }
  };

  // Switch pages
  const handleNav = (tab: 'groups' | 'profile' | 'teachers' | 'sync') => {
    setActiveTab(tab);
    setSelectedGroup(null);
    setMobileSidebarOpen(false);
    if (tab === 'groups') {
      setAdminSelectedTeacherId(null);
      setAdminSelectedGroupId(null);
    }
  };

  const handleOpenGroupTracker = (group: Group) => {
    setSelectedGroup(group);
    setMobileSidebarOpen(false);
  };

  // Render Section Selector based on authentication and states
  if (showLanding && !user) {
    return (
      <>
        <LandingPage 
          onGoToLogin={() => setShowLoginModal(true)} 
          isAuthenticated={!!user}
          onGoToDashboard={() => {
            setShowLanding(false);
            if (user) fetchGroups(user.id, user.role);
          }}
        />

        {/* Login modal overlay */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn" id="login-modal-box">
              {/* Login header decorative */}
              <div className="bg-blue-600 px-6 py-8 text-white relative">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white font-bold bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition duration-200 text-lg"
                >
                  &times;
                </button>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-white text-blue-600 p-2 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Campus LMS Portal</h4>
                    <p className="text-blue-100 text-xs font-semibold">O‘QUV MARKAZIGA KIRISH</p>
                  </div>
                </div>
              </div>

              {/* Login form payload */}
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                {loginError && (
                  <div className="bg-red-50 text-red-700 border border-red-200 p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-pulse">
                    <span>⚠️ {loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">Foydalanuvchi nomi</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Foydalanuvchi nomini kiriting..."
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-10 py-2.5 text-sm outline-hidden transition duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">Maxfiy kalit (Parol)</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Parolingizni kiriting..."
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-10 py-2.5 text-sm outline-hidden transition duration-200"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition duration-200 shadow-md shadow-blue-500/10 disabled:opacity-50 inline-flex items-center justify-center space-x-2"
                  >
                    <span>{loggingIn ? 'Haqiqiylik tekshirilmoqda...' : 'Kirish'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Loaded full dashboard UI
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col md:flex-row" id="campus-lms-panel">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Campus</h1>
            <span className="text-[10px] text-blue-600 font-extrabold block -mt-1 leading-none">O‘QUV MARKAZI</span>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform md:sticky md:top-0 md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-brand-sidebar text-slate-300 flex flex-col justify-between z-50 border-r border-slate-800 md:h-screen h-full
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} id="campus-sidebar">
        
        {/* Upper nav section */}
        <div className="p-6 space-y-6">
          {/* Logo container Desktop */}
          <div className="hidden md:flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl cursor-pointer" onClick={() => setShowLanding(true)}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wider leading-tight uppercase font-display">Campus</h2>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block -mt-0.5">O‘QUV MARKAZI</span>
            </div>
          </div>

          {/* Current login Profile Badge */}
          {user && (
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-750 space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 border border-blue-400 overflow-hidden flex items-center justify-center">
                  <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Teacher" className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-white font-semibold text-sm truncate">{user.username}</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate">{user.role === 'admin' ? 'Senior Administrator' : 'Senior Mentor'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => handleNav('groups')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-extrabold tracking-wide uppercase transition duration-150 ${
                  activeTab === 'groups' && !selectedGroup ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                id="link-sidebar-groups"
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>{user?.role === 'admin' ? 'Umumiy Statistika' : 'Mening Guruhlarim'}</span>
              </button>
            </li>

            {user?.role === 'admin' && (
              <li>
                <button
                  onClick={() => handleNav('teachers')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-extrabold tracking-wide uppercase transition duration-150 ${
                    activeTab === 'teachers' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  id="link-sidebar-teachers"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>O‘qituvchilar</span>
                </button>
              </li>
            )}

            <li>
              <button
                onClick={() => handleNav('sync')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-extrabold tracking-wide uppercase transition duration-150 ${
                  activeTab === 'sync' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                id="link-sidebar-sync"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Jadval Sozlamalari</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => handleNav('profile')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-extrabold tracking-wide uppercase transition duration-150 ${
                  activeTab === 'profile' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                id="link-sidebar-profile"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Mening Profilim</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Bottom nav section */}
        <div className="p-5 border-t border-slate-800 space-y-4">
          <button
            onClick={() => setShowLanding(true)}
            className="w-full text-slate-400 hover:text-white transition text-xs font-bold flex items-center space-x-2 px-1"
          >
            <span>Landing sahifaga o'tish</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/30 hover:bg-red-900/20 text-red-400 hover:text-red-300 border border-slate-800 transition duration-150"
            id="btn-sidebar-logout"
          >
            <div className="flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Chiqish</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex flex-col min-w-0" id="campus-workspace">
        <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Active tracker view rendering */}
          {selectedGroup ? (
            <LessonsTracker 
              group={selectedGroup} 
              currentUser={user!} 
              onBack={() => { setSelectedGroup(null); fetchGroups(user!.id, user!.role); }} 
            />
          ) : activeTab === 'teachers' && user?.role === 'admin' ? (
            <TeachersList onBackToDashboard={() => setActiveTab('groups')} />
          ) : activeTab === 'sync' ? (
            <SyncSettings />
          ) : activeTab === 'profile' && user ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6" id="profile-card">
              <div className="flex items-center justify-between border-b pb-5 flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-bold text-xl uppercase overflow-hidden">
                    <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-800">{user.fullname}</h3>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{user.role === 'admin' ? 'Katta Administrator' : "O'qituvchi"}</p>
                  </div>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => {
                      setEditFullname(user.fullname);
                      setEditUsername(user.username);
                      setEditPassword(user.password || '');
                      setEditAvatar(user.avatar || '');
                      setIsEditingProfile(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Profilni tahrirlash
                  </button>
                )}
              </div>

              {profileSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold animate-fade-in">
                  {profileSuccess}
                </div>
              )}

              {profileError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold animate-fade-in">
                  {profileError}
                </div>
              )}

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Foydalanuvchi to'liq ismi (F.I.SH)</label>
                      <input
                        type="text"
                        required
                        value={editFullname}
                        onChange={(e) => setEditFullname(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition"
                        placeholder="Masalan: Nursaid Nasirdinov"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Foydalanuvchi nomi (login)</label>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition"
                        placeholder="Masalan: Nursaid_inno"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Kirish paroli</label>
                      <input
                        type="text"
                        required
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition"
                        placeholder="Parolni kiriting..."
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 pt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Profil rasmini yuklash (Kompyuter / Galereyadan)</label>
                        <div className="relative group border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 bg-slate-50 transition flex flex-col items-center justify-center cursor-pointer min-h-[96px]">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500 mb-1" />
                          <span className="text-xs text-slate-500 group-hover:text-blue-600 font-semibold text-center leading-none">Rasm tanlang... (max: 2MB)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Yoki profil rasmi URL manzili</label>
                        <input
                          type="url"
                          value={editAvatar.startsWith('data:') ? '' : editAvatar}
                          onChange={(e) => setEditAvatar(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition"
                          placeholder="https://example.com/rasm.jpg..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">Yana bir usul: Yuqoridan rasm yuklasangiz, u avtomatik tarzda saqlanadi.</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile avatar link preview helper */}
                  {editAvatar && (
                    <div className="p-3 bg-slate-50 border border-dashed rounded-xl flex items-center space-x-3">
                      <img src={editAvatar} alt="Rasm previu" className="w-10 h-10 rounded-full object-cover border" onError={(e) => { (e.target as any).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${editUsername}` }} />
                      <span className="text-xs text-slate-500 font-medium">Kiritilgan profil rasmi yuklanish ko'rinishi (agar havola ishlamasa tizim avtomatik rasm beradi)</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 rounded-xl transition duration-200 disabled:opacity-50 inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>{profileSaving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-5 py-3 rounded-xl transition duration-150 cursor-pointer"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Foydalanuvchi nomi (username)</span>
                    <p className="font-bold text-slate-800">@{user.username}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Lavozim dars ruxsatnomasi</span>
                    <p className="font-bold text-slate-800">{user.role === 'admin' ? 'Barcha guruhlar va to\'liq dars jadvali mudiriyati' : 'Shaxsiy guruh darsligini belgilash'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Kirish paroli</span>
                    <p className="font-bold text-slate-800 font-mono">•••••••• (tahrirlash tugmasini bosib ko'rishingiz mumkin)</p>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'groups' && user?.role === 'admin' ? (
            <AdminStatsDashboard 
              groups={groups}
              teachers={adminTeachers}
              allStudents={adminAllStudents}
              allPayments={adminAllPayments}
              onTogglePayment={handleToggleStudentPayment}
            />
          ) : (
            // Default Groups dashboard
            <div className="space-y-6">
              
              {/* Dynamic KPI Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stats 1 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between shadow-xs">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">Umumiy guruhlar</h4>
                    <p className="text-2xl font-extrabold text-slate-950 mt-1 font-display">{groups.length} ta</p>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">✓ Tizim faolligi</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-slate-100 flex items-center justify-center text-[10px] font-bold text-blue-600 font-mono shrink-0">
                    {groups.length}/20
                  </div>
                </div>

                {/* Stats 2 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between shadow-xs">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans font-medium">Jami O‘quvchilar</h4>
                    <p className="text-2xl font-extrabold text-slate-950 mt-1 font-display">
                      {analytics ? `${analytics.totalStudents} nafar` : '0 nafar'}
                    </p>
                    <span className="text-[10px] text-blue-600 font-bold block mt-0.5">LMS ro'yxatdagilar</span>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Stats 3 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans font-medium">O‘rtacha Davomat</h4>
                    <p className="text-2xl font-extrabold text-slate-950 mt-1 font-display">
                      {analytics ? `${analytics.attendanceRate}%` : '100%'}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Barcha darslardan</span>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>

                {/* Stats 4 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans font-medium">Hozirgi Maqsad</h4>
                    <p className="text-sm font-extrabold text-slate-950 mt-1.5 truncate">LEGO & Savodxonlik</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Har bir guruhda 48 ta dars</p>
                  </div>
                  <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Dynamic Teacher Analytics Panel */}
              {analytics && (analytics.highestScorers.length > 0 || analytics.recentActivity.length > 0) && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Guruhlar Tahlilnomasi (LMS Dashboard)</span>
                      <h4 className="text-xl font-extrabold text-slate-900 mt-1">O‘quv Markazi Umumiy Holati</h4>
                    </div>
                    <span className="text-xs bg-white border border-slate-200 text-slate-500 font-bold px-3 py-1 rounded-xl">
                      Jonli yangilanish
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leaders & Warnings Column */}
                    <div className="space-y-6">
                      {/* Top Scorers Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                          <h5 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span>Reyting Yetakchilari (Top 5)</span>
                          </h5>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">Oltin Gvardiya</span>
                        </div>
                        <div className="space-y-2">
                          {analytics.highestScorers.map((s: any, idx: number) => (
                            <div key={s.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition">
                              <span className="font-bold text-slate-700">{idx + 1}. {s.fullname} <span className="text-[10px] text-slate-400 font-normal">({s.group_name})</span></span>
                              <span className="font-semibold text-emerald-600 font-mono">{s.current_points} ball</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Lowest Scorers Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                          <h5 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span>E’tibor talab o‘quvchilar (Top 5 ogohlantirish)</span>
                          </h5>
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase">Nazoratda</span>
                        </div>
                        <div className="space-y-2">
                          {analytics.lowestScorers.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-1 text-center">Barcha o‘quvchilar ko‘rsatkichlari yuqori!</p>
                          ) : (
                            analytics.lowestScorers.map((s: any, idx: number) => (
                              <div key={s.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition">
                                <span className="font-bold text-slate-700">{idx + 1}. {s.fullname} <span className="text-[10px] text-slate-400 font-normal">({s.group_name})</span></span>
                                <span className="font-semibold text-red-500 font-mono">{s.current_points} ball</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline & Penalties Column */}
                    <div className="space-y-6">
                      {/* Recent Activities */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                          <h5 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>Oxirgi faollik loglari</span>
                          </h5>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Tarix jurnali</span>
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {analytics.recentActivity.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 text-center">Hozircha hech qanday harakat sodir bo'lmadi.</p>
                          ) : (
                            analytics.recentActivity.map((act: any) => (
                              <div key={act.id} className="flex justify-between items-center text-xs p-2 rounded-lg border border-slate-100 bg-slate-50/40">
                                <div className="space-y-0.5 max-w-[240px]">
                                  <p className="font-bold text-slate-800 leading-none">{act.student_name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{act.reason}</p>
                                </div>
                                <span className={`font-bold font-mono ${act.points_change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {act.points_change >= 0 ? `+${act.points_change}` : act.points_change}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Recent Penalties logs */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                          <h5 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            <span>Oxirgi jarimalar ro'yxati</span>
                          </h5>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">Intizomsizlik</span>
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {analytics.recentPenalties.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 text-center">Hech qanday jarima qo'llanilmagan. Intizom a'lo darajada!</p>
                          ) : (
                            analytics.recentPenalties.map((pen: any) => (
                              <div key={pen.id} className="flex justify-between items-center text-xs p-2 rounded-lg border border-red-100 bg-red-50/20">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 leading-none">{pen.student_name}</p>
                                  <p className="text-[10px] text-slate-400">{pen.reason}</p>
                                </div>
                                <span className="font-bold font-mono text-red-600">
                                  {pen.points_change}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Toolbar Section: Add Group Modal and Searches */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:max-w-md relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Guruh nomini qidiring (masalan: DU08/30)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-hidden transition duration-200"
                  />
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-sm inline-flex items-center justify-center space-x-2"
                  id="btn-add-group-pannel"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi Guruh Yaratish</span>
                </button>
              </div>

                        {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
                  <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200">
                    <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-800 font-sans">Yangi O‘quv Guruhi Qo‘shish</h4>
                      <button
                        onClick={() => setShowAddModal(false)}
                        className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                      >
                        &times;
                      </button>
                    </div>

                    <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                      {groupError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">
                          <span>{groupError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 pl-0.5">Guruhning Kodlash Nomi</label>
                        <input
                          type="text"
                          required
                          placeholder="Masalan: DU08/30 yoki FN07/15"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-hidden transition"
                        />
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-50">
                        O‘quv guruh yaratilishi bilan tizim avtomatik ravishda dars rejalarini (Dars 1'dan 40'gacha) generatsiya etib ro'yxatga oladi.
                      </p>

                      <div className="flex items-center justify-end space-x-3 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition duration-200"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="submit"
                          disabled={submittingGroup}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition duration-200 shadow-sm disabled:opacity-50"
                        >
                          {submittingGroup ? 'Guruh ochilmoqda...' : 'Guruh Ochish'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Group Delete Modal Overlay */}
              {groupToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
                  <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200">
                    <div className="bg-red-50 border-b border-red-100 p-5 flex items-center justify-between">
                      <h4 className="text-base font-bold text-red-800 font-sans">Guruhni o'chirishni tasdiqlash</h4>
                      <button
                        onClick={() => setGroupToDelete(null)}
                        className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Haqiqatan ham <strong className="text-slate-900">"{groupToDelete.name}"</strong> guruhini o'chirmoqchimisiz?
                      </p>
                      
                      <div className="text-xs text-red-650 bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
                        Ushbu guruhga oid barcha darsliklar va topshiriqlarni belgilash ko'rsatkichlari butunlay o'chib ketadi! Ushbu amalni qaytarib bo'lmaydi.
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => setGroupToDelete(null)}
                          className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition duration-200"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="button"
                          onClick={confirmDeleteGroup}
                          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition duration-200 shadow-sm"
                        >
                          Ha, butunlay o'chirilsin
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Groups Lists Cards Render */}
              {loadingGroups ? (
                <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-500 text-sm">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <span>Guruhlar ro‘yxati drayvdan yuklanmoqda...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
                  <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="font-bold text-slate-700 text-md">Hozircha hech qanday guruh topilmadi</p>
                  <p className="text-sm text-slate-400 mt-1">Siz boshqaradigan guruhni rasmilahtirish uchun yangisini yarating.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGroups.map((group) => {
                    const percentage = group.completion_percentage || 0;
                    return (
                      <div
                        key={group.id}
                        onClick={() => handleOpenGroupTracker(group)}
                        className="bg-white border border-slate-205 hover:border-blue-400 rounded-2xl p-6 shadow-3xs hover:shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between group relative"
                        id={`group-card-${group.id}`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                              48 ta dars qamrovi
                            </span>
                            
                            <button
                              onClick={(e) => handleDeleteGroup(group.id, group.group_name, e)}
                              className="relative z-10 text-slate-300 hover:text-red-600 hover:bg-slate-100 p-1.5 rounded-lg transition duration-150 inline-flex"
                              title="Guruhni o'chirish"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div>
                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition truncate">{group.group_name}</h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Yaratilgan: {formatUzbekDate(group.created_date)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Completion bar inside card */}
                        <div className="space-y-2 mt-6 border-t border-slate-100 pt-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-semibold uppercase font-sans">O‘zlashtirildi:</span>
                            <span className="text-blue-700 font-extrabold">{percentage}% ({group.completed_count || 0}/48)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
