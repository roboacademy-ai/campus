import React from 'react';
import { BookOpen, Award, Users, CheckCircle, ArrowRight, Settings, RefreshCw, FileText, GraduationCap } from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  isAuthenticated: boolean;
  onGoToDashboard: () => void;
}

export default function LandingPage({ onGoToLogin, isAuthenticated, onGoToDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between" id="landing-page">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Campus</h1>
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 block -mt-1">O‘QUV MARKAZI</span>
            </div>
          </div>
          <div>
            {isAuthenticated ? (
              <button
                onClick={onGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm inline-flex items-center space-x-2"
                id="btn-goto-dashboard"
              >
                <span>Shaxsiy Kabinet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onGoToLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm inline-flex items-center space-x-2"
                id="btn-goto-login"
              >
                <span>Tizimga Kirish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col lg:flex-row items-center gap-12">
          {/* Main Content */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Kichik Kurslar & LEGO Robototexnika tizimi</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              O‘qituvchilar uchun <br />
              <span className="text-blue-600">Darslarni Boshqarish</span> <br />
              LMS Platformasi
            </h2>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              "Campus O‘quv Markazi" oʻqituvchilarini boshqarish va dars rejalarini integratsiya qilish tizimi. Guruhlar oching, Google Sheets orqali 48 ta dars materiallarini dinamik kuzatib boring, PDF taqdimotlarni o'qing va har bir o'quvchi guruhining o'zlashtirish foizini nazorat qiling.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              {isAuthenticated ? (
                <button
                  onClick={onGoToDashboard}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-md shadow-blue-500/10 inline-flex items-center justify-center space-x-2 text-base"
                >
                  <span>Boshqaruv paneliga o‘tish</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={onGoToLogin}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-md shadow-blue-500/10 inline-flex items-center justify-center space-x-2 text-base"
                >
                  <span>Pedagog kabinetiga kirish</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
              <a
                href="#features-section"
                className="w-full sm:w-auto border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 inline-flex items-center justify-center"
              >
                Tizim afzalliklari
              </a>
            </div>
          </div>

          {/* Graphical Mockup card representation */}
          <div className="flex-1 w-full max-w-lg mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative">
            <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-xs animate-bounce">
              Live Sinxron
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center space-x-2">
                <span className="w-3" style={{ height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span>
                <span className="w-3" style={{ height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
                <span className="w-3" style={{ height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                <span className="font-mono text-xs text-slate-400 pl-2">LMS Preview</span>
              </div>
              <div className="bg-slate-100 px-2.5 py-1 rounded text-xs text-slate-500 font-mono">
                DU08/30 guruh
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Darslar o‘zlashtirilishi</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">75%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-5 w-5 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">1-dars: GCompris bilan ishlash</p>
                    <p className="text-[10px] text-slate-400">Sichqoncha bilan ilk tanishuv</p>
                  </div>
                  <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-bold">Bajarildi</span>
                </div>

                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-5 w-5 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">2-dars: Sichqoncha ustasi</p>
                    <p className="text-[10px] text-slate-400">Bosish va tortish mashqlari (drag/drop)</p>
                  </div>
                  <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-bold">Bajarildi</span>
                </div>

                <div className="flex items-center space-x-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 animate-pulse">
                  <div className="h-5 w-5 rounded-md bg-slate-200 text-slate-400 flex items-center justify-center font-mono">
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-blue-900 truncate">3-dars: Klaviatura bilan tanishuv</p>
                    <p className="text-[10px] text-blue-600 font-medium">Tuxum yig‘ish o'yini</p>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold animate-pulse">Navbatda</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <section id="features-section" className="bg-white py-16 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Tizimning Asosiy Imkoniyatlari
              </h3>
              <p className="text-slate-500 mt-3 text-base leading-relaxed">
                Campus O‘quv Markazi pedagoglari faoliyatini soddalashtirish uchun yaratilgan zamonaviy ichki axborot xizmati.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-all duration-200 border border-slate-100 group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform duration-200">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Shaxsiy guruhlar nazorati</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Har bir o‘qituvchi faqat o‘ziga tegishli guruhlarni (masalan: DU08/30, FN07/15) ko‘radi, guruh ochishi yoki guruh dasturidagi darslarni o‘zgartirishi mumkin.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-all duration-200 border border-slate-100 group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform duration-200">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Google Sheets integratsiyasi</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Barcha 48 ta dars mavzusi va PDF fayl havolalari Google Sheets'ga ko'milgan. Sheets o‘zgarganda tizim dars jadvalini avtomatik yangilaydi.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-all duration-200 border border-slate-100 group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform duration-200">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">48 ta Mukammal Dars Rejalar</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Har bir guruh uchun Lesson 1'dan Lesson 48'gacha batafsil xronologik dars rejalari, metodik o'yinlar va PDF materiallar integratsiya qilingan.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="font-semibold text-white">Campus O‘quv Markazi — Teachers Management System</p>
          <p>&copy; 2026 Campus. Barcha huquqlar himoyalangan. Tizim mas'uliyat bilan yaratilgan.</p>
        </div>
      </footer>
    </div>
  );
}
