import express from 'express';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to the database and lessons plan files
const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');
const LESSONS_PLAN_PATH = path.join(process.cwd(), 'src', 'data', 'lessons_plan.json');

// Memory cache for lessons plan and database
let dbCache: any = null;
let lessonsPlanCache: any[] = [];

// Helper: Ensure directories and files exist
function ensureDataFiles() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(DB_PATH)) {
    const defaultDb = {
      teachers: [
        { id: 't1', username: 'Nursaid_inno', password: 'password123', fullname: 'Nursaid Nasirdinov', role: 'teacher' },
        { id: 't2', username: 'admin', password: 'admin_campus_password', fullname: 'Tizim Administratori', role: 'admin' }
      ],
      groups: [],
      lesson_completions: [],
      custom_lessons: [],
      students: [],
      attendance: [],
      points_history: [],
      last_updated: 0
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

// Load DB from file safely
function loadDb() {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    dbCache = JSON.parse(raw);
    if (!dbCache.students) dbCache.students = [];
    if (!dbCache.attendance) dbCache.attendance = [];
    if (!dbCache.points_history) dbCache.points_history = [];
    if (!dbCache.payments) dbCache.payments = [];
    
    // Auto-compute payment status based on real payments and date elapsed
    let updated = false;
    
    // Helper inside server.ts for payment calculation
    const calcDates = (joinedDateStr: string, totalLessons: number, schedule?: 'odd' | 'even'): string[] => {
      const dates: string[] = [];
      if (!joinedDateStr || totalLessons <= 0) return dates;
      const start = new Date(joinedDateStr);
      if (isNaN(start.getTime())) return dates;
      
      let activeDays = [1, 3, 5];
      if (schedule === 'even') {
        activeDays = [2, 4, 6];
      } else if (schedule === 'odd') {
        activeDays = [1, 3, 5];
      } else {
        let startDay = start.getDay();
        if (startDay === 0) {
          start.setDate(start.getDate() + 1);
          startDay = 1;
        }
        const isOddLane = [1, 3, 5].includes(startDay);
        activeDays = isOddLane ? [1, 3, 5] : [2, 4, 6];
      }
      
      const current = new Date(start);
      let safety = 0;
      while (dates.length < totalLessons && safety < 1000) {
        safety++;
        const day = current.getDay();
        if (activeDays.includes(day)) {
          dates.push(current.toISOString().substring(0, 10));
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    dbCache.students.forEach((s: any) => {
      const studentPayments = (dbCache.payments || []).filter((p: any) => p.student_id === s.id);
      const totalPaid = studentPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
      const totalLessonsPaid = Math.floor(totalPaid / 29000);
      
      let expectedStatus = 'unpaid';
      if (totalLessonsPaid > 0 && s.joined_date) {
        const lessonDates = calcDates(s.joined_date, totalLessonsPaid, s.lesson_schedule);
        const todayStr = new Date().toISOString().substring(0, 10);
        const consumedLessons = lessonDates.filter((d: string) => d <= todayStr).length;
        const remainingLessons = totalLessonsPaid - consumedLessons;
        if (remainingLessons > 0) {
          expectedStatus = 'paid';
        }
      }
      
      if (s.payment_status !== expectedStatus) {
        s.payment_status = expectedStatus;
        updated = true;
      }
    });

    if (updated) {
      if (dbCache) {
        dbCache.last_updated = Date.now();
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2), 'utf8');
    }

    return dbCache;
  } catch (error) {
    console.error('Error reading db.json, returning empty template:', error);
    dbCache = { teachers: [], groups: [], lesson_completions: [], custom_lessons: [], students: [], attendance: [], points_history: [] };
    return dbCache;
  }
}

// Save DB to file safely
function saveDb(data?: any, updateTimestamp: boolean = true) {
  if (data !== undefined) {
    dbCache = data;
  }
  if (dbCache && updateTimestamp) {
    dbCache.last_updated = Date.now();
  }
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache || {}, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

// Load default lessons plan from fallback or cache
function loadLessonsPlan() {
  if (fs.existsSync(LESSONS_PLAN_PATH)) {
    try {
      const raw = fs.readFileSync(LESSONS_PLAN_PATH, 'utf8');
      lessonsPlanCache = JSON.parse(raw);
    } catch (err) {
      console.error('Error reading lessons plan JSON:', err);
      lessonsPlanCache = [];
    }
  } else {
    lessonsPlanCache = [];
  }
  return lessonsPlanCache;
}

// Populate the cache at server boot
loadDb();
loadLessonsPlan();

// Helper: Fetch Google Sheets and parse it matching Uzbek columns
async function syncLessonsFromGoogleSheets(): Promise<boolean> {
  const url = 'https://docs.google.com/spreadsheets/d/1lwykV1XumuQLTbI_oF09F7MR_tLC_JhRtQmgaBAM7qM/export?format=xlsx';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Failed to fetch from Google Sheets URL');
      return false;
    }
    const buf = await res.arrayBuffer();
    const wb = xlsx.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:H100');

    const lessonsList: any[] = [];

    for (let r = 1; r <= range.e.r; r++) {
      const getCellVal = (c: number) => {
        const addr = xlsx.utils.encode_cell({ r, c });
        const cell = ws[addr];
        return cell ? (cell.v !== undefined ? String(cell.v).trim() : '') : '';
      };

      const getCellLink = (c: number) => {
        const addr = xlsx.utils.encode_cell({ r, c });
        const cell = ws[addr];
        return cell && cell.l ? cell.l.Target : null;
      };

      const darsNoInput = getCellVal(0);
      if (!darsNoInput) continue;

      const darsNumMatch = darsNoInput.match(/(\d+)/);
      const lessonNumber = darsNumMatch ? parseInt(darsNumMatch[1], 10) : r;

      const platform = getCellVal(1);
      const title = getCellVal(2);
      const plan = getCellVal(3);
      const exercises = getCellVal(4);
      const goal = getCellVal(5);
      const rawDataField = getCellVal(6);
      const sources = getCellVal(7);

      const links: { title: string; url: string }[] = [];

      // Check if cells have explicit hyperlinks (.l)
      const linkG = getCellLink(6);
      const linkH = getCellLink(7);

      if (linkG) {
        links.push({ title: getCellVal(6).split(/\n/)[0].substring(0, 80) || 'Dars materiallari', url: linkG });
      }
      if (linkH) {
        links.push({ title: getCellVal(7).split(/\n/)[0].substring(0, 80) || 'Mavzu manbasi', url: linkH });
      }

      // Also parse regular URLs from the text
      const urlRegex = /(https?:\/\/[^\s\)\;\,\"\<\>]+)/g;
      const textG = getCellVal(6);
      const textH = getCellVal(7);

      const extractTextLinks = (text: string) => {
        const extraList: { title: string; url: string }[] = [];
        const linesList = text.split(/\n/);
        for (const line of linesList) {
          if (!line.trim()) continue;
          const urls = line.match(urlRegex);
          if (urls && urls.length > 0) {
            const urlStr = urls[0];
            let linkTitle = line.replace(urlStr, '').replace(/^-\s*/, '').replace(/:\s*$/, '').trim();
            if (!linkTitle) {
              linkTitle = 'Material havolasi';
            }
            extraList.push({ title: linkTitle, url: urlStr });
          }
        }
        return extraList;
      };

      const parsedG = extractTextLinks(textG);
      const parsedH = extractTextLinks(textH);

      const seenUrls = new Set(links.map(lk => lk.url));
      for (const lk of [...parsedG, ...parsedH]) {
        if (!seenUrls.has(lk.url)) {
          seenUrls.add(lk.url);
          links.push(lk);
        }
      }

      // Determine main PDF/drive resource URL with high precision
      let pdf_url = '';
      const driveLinks = links.filter(lk => lk.url.includes('drive.google.com') || lk.url.includes('/file/d/'));
      const directPdfLinks = links.filter(lk => lk.url.toLowerCase().includes('.pdf') || lk.url.toLowerCase().includes('.pptx') || lk.url.toLowerCase().includes('blob.core.windows.net') || lk.url.toLowerCase().includes('education.lego.com'));

      if (driveLinks.length > 0) {
        pdf_url = driveLinks[0].url;
      } else if (directPdfLinks.length > 0) {
        pdf_url = directPdfLinks[0].url;
      } else if (linkH && linkH.startsWith('http')) {
        pdf_url = linkH;
      } else if (linkG && linkG.startsWith('http')) {
        pdf_url = linkG;
      } else if (links.length > 0) {
        pdf_url = links[0].url;
      }

      lessonsList.push({
        id: `lesson_${lessonNumber}`,
        lessonNumber,
        lessonNoText: darsNoInput,
        platform,
        title,
        plan,
        exercises,
        goal,
        rawMaterials: rawDataField,
        links,
        sources,
        pdf_url,
        lesson_title: title
      });
    }

    lessonsList.sort((a, b) => a.lessonNumber - b.lessonNumber);
    
    // Save to disk and update cache
    fs.writeFileSync(LESSONS_PLAN_PATH, JSON.stringify(lessonsList, null, 2), 'utf8');
    lessonsPlanCache = lessonsList;
    console.log(`Synced ${lessonsPlanCache.length} lessons with Google Sheets successfully (XLSX hyperlinks enabled)`);
    return true;
  } catch (err) {
    console.error('Error syncing Google Sheets dynamic DB:', err);
    return false;
  }
}

// REST API Definition

// 1. Authentication Login Page
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username va parol talab qilinadi' });
  }

  const db = loadDb();
  const user = db.teachers.find(
    (t: any) => t.username.toLowerCase() === username.trim().toLowerCase() && t.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Username yoki parol xato' });
  }

  // Return teacher credentials safely
  res.json({
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    role: user.role || 'teacher',
    password: user.password,
    avatar: user.avatar || ''
  });
});

// 2. Fetch Reference Lessons (Dynamic from current Memory Cache)
app.get('/api/lessons-plan', (req, res) => {
  res.json(lessonsPlanCache);
});

// Trigger dynamic Sheets update API
app.post('/api/sync-sheets', async (req, res) => {
  const success = await syncLessonsFromGoogleSheets();
  if (success) {
    res.json({ message: "Google Sheets muvaffaqiyatli sinxronizatsiya qilindi!", count: lessonsPlanCache.length });
  } else {
    res.status(500).json({ error: "Google Sheets ulana olmadi. Local ma'lumotlar foydalanildi." });
  }
});

// 3. Teachers CRUD (Admin only)
app.get('/api/teachers', (req, res) => {
  const db = loadDb();
  res.json(db.teachers.map((t: any) => ({
    id: t.id,
    username: t.username,
    fullname: t.fullname,
    role: t.role || 'teacher',
    password: t.password,
    avatar: t.avatar || ''
  })));
});

app.post('/api/teachers', (req, res) => {
  const { username, password, fullname, role, avatar } = req.body;
  if (!username || !password || !fullname) {
    return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
  }

  const db = loadDb();
  const exists = db.teachers.some((t: any) => t.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Bunday foydalanuvchi nomi tizimda mavjud' });
  }

  const newTeacher = {
    id: 't_' + Math.random().toString(36).substr(2, 9),
    username: username.trim(),
    password: password.trim(),
    fullname: fullname.trim(),
    role: role || 'teacher',
    avatar: avatar || ''
  };

  db.teachers.push(newTeacher);
  saveDb(db);

  res.status(201).json({
    id: newTeacher.id,
    username: newTeacher.username,
    fullname: newTeacher.fullname,
    role: newTeacher.role,
    password: newTeacher.password,
    avatar: newTeacher.avatar
  });
});

app.put('/api/teachers/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, fullname, role, avatar } = req.body;

  const db = loadDb();
  const index = db.teachers.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'O\'qituvchi topilmadi' });
  }

  if (username) {
    const exists = db.teachers.some((t: any) => t.id !== id && t.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Bunday foydalanuvchi nomi tizimda mavjud' });
    }
  }

  const teacher = db.teachers[index];
  if (fullname !== undefined) teacher.fullname = fullname.trim();
  if (username !== undefined) teacher.username = username.trim();
  if (password !== undefined) teacher.password = password.trim();
  if (role !== undefined) teacher.role = role;
  if (avatar !== undefined) teacher.avatar = avatar.trim();

  saveDb(db);

  res.json({
    id: teacher.id,
    username: teacher.username,
    fullname: teacher.fullname,
    role: teacher.role || 'teacher',
    password: teacher.password,
    avatar: teacher.avatar || ''
  });
});

app.delete('/api/teachers/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  
  if (id === 't2') { // Don't delete master admin
    return res.status(400).json({ error: 'Asosiy admin foydalanuvchisini o\'chirib bo\'lmaydi' });
  }

  db.teachers = db.teachers.filter((t: any) => t.id !== id);
  // Also clean up or reassoc their groups? Let's keep groups but their teacher ID remains or is removed.
  saveDb(db);
  res.json({ message: 'O\'qituvchi muvaffaqiyatli o\'chirildi' });
});

// 4. Groups CRUD
// Fetch groups (if teacher filter for teacher, if admin show all)
app.get('/api/groups', (req, res) => {
  const teacherId = req.query.teacherId as string;
  const db = loadDb();

  if (teacherId) {
    const filtered = db.groups.filter((g: any) => g.teacher_id === teacherId);
    return res.json(filtered);
  }

  res.json(db.groups);
});

// Create Group: Automatically generate all 40 lessons tracking mapping
app.post('/api/groups', (req, res) => {
  const { group_name, teacher_id } = req.body;
  
  if (!group_name || !teacher_id) {
    return res.status(400).json({ error: 'Guruh nomi va o\'qituvchi talab etiladi' });
  }

  const db = loadDb();
  // We can let the user name duplicates but let's check or just let it be.
  const newGroupId = 'g_' + Math.random().toString(36).substr(2, 9);
  const newGroup = {
    id: newGroupId,
    teacher_id,
    group_name: group_name.trim(),
    created_date: new Date().toISOString()
  };

  db.groups.push(newGroup);

  // Automatically generate completions for standard lessons (Lesson 1 to maximum available in Sheet)
  const maxLessonNum = lessonsPlanCache.length > 0 
    ? Math.max(48, ...lessonsPlanCache.map((l: any) => l.lessonNumber))
    : 48;

  for (let num = 1; num <= maxLessonNum; num++) {
    db.lesson_completions.push({
      id: `comp_${newGroupId}_${num}`,
      group_id: newGroupId,
      lesson_number: num,
      completed: false
    });
  }

  saveDb(db);
  res.status(201).json(newGroup);
});

app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDb();

  db.groups = db.groups.filter((g: any) => g.id !== id);
  db.lesson_completions = db.lesson_completions.filter((c: any) => c.group_id !== id);
  db.custom_lessons = db.custom_lessons.filter((c: any) => c.group_id !== id);
  db.students = db.students.filter((s: any) => s.group_id !== id);
  db.attendance = db.attendance.filter((a: any) => a.group_id !== id);
  db.points_history = db.points_history.filter((ph: any) => ph.group_id !== id);
  if (Array.isArray(db.payments)) {
    db.payments = db.payments.filter((p: any) => p.group_id !== id);
  }

  saveDb(db);
  res.json({ message: 'Guruh muvaffaqiyatli o\'chirildi' });
});

// 5. Lesson Tracker Mapping for a Group
app.get('/api/groups/:groupId/lessons', (req, res) => {
  const { groupId } = req.params;
  const db = loadDb();

  const group = db.groups.find((g: any) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Guruh topilmadi' });
  }

  // Find all completions for this group
  const completions = db.lesson_completions.filter((c: any) => c.group_id === groupId);
  
  // Custom lessons override/additional details (e.g. customized by Admin)
  const customLessons = db.custom_lessons.filter((cl: any) => cl.group_id === groupId);

  // Map the lessons dynamically. Check sheet's max lesson number.
  const maxLessonNum = lessonsPlanCache.length > 0 
    ? Math.max(48, ...lessonsPlanCache.map((l: any) => l.lessonNumber))
    : 48;

  const mappedLessons = [];

  for (let num = 1; num <= maxLessonNum; num++) {
    // Check completion
    const compRecord = completions.find((c: any) => c.lesson_number === num);
    const completed = compRecord ? compRecord.completed : false;

    // Check if admin customized this lesson metadata
    const customized = customLessons.find((cl: any) => cl.lesson_number === num);

    // Get reference template from Google Sheet
    const refPlan = lessonsPlanCache.find((l: any) => l.lessonNumber === num);

    const finalTitle = customized?.title || refPlan?.title || `Dars ${num}`;
    let pdf_url = customized?.pdf_url || refPlan?.pdf_url || '';
    if (!pdf_url) {
      const activeLinks = customized?.links || refPlan?.links || [];
      const driveOrPdf = activeLinks.find((lk: any) => lk.url.includes('drive.google.com') || lk.url.toLowerCase().includes('.pdf'));
      pdf_url = driveOrPdf ? driveOrPdf.url : (activeLinks[0]?.url || '');
    }

    mappedLessons.push({
      lesson_number: num,
      title: finalTitle,
      platform: customized?.platform || refPlan?.platform || 'Noma\'lum',
      plan: customized?.plan || refPlan?.plan || 'Mavzu rejasi mavjud emas.',
      exercises: customized?.exercises || refPlan?.exercises || '',
      goal: customized?.goal || refPlan?.goal || '',
      links: customized?.links || refPlan?.links || [],
      rawMaterials: customized?.rawMaterials || refPlan?.rawMaterials || '',
      completed: completed,
      sources: customized?.sources || refPlan?.sources || '',
      pdf_url: pdf_url,
      lesson_title: finalTitle
    });
  }

  res.json({
    group,
    lessons: mappedLessons
  });
});

// 6. Toggle single Lesson completion checkbox
app.post('/api/groups/:groupId/lessons/:lessonNumber/toggle', (req, res) => {
  const { groupId, lessonNumber } = req.params;
  const { completed } = req.body;

  const num = parseInt(lessonNumber, 10);
  if (isNaN(num)) {
    return res.status(400).json({ error: 'Noto\'g\'ri dars raqami' });
  }

  const db = loadDb();
  let compRecord = db.lesson_completions.find(
    (c: any) => c.group_id === groupId && c.lesson_number === num
  );

  if (compRecord) {
    compRecord.completed = !!completed;
  } else {
    compRecord = {
      id: `comp_${groupId}_${num}`,
      group_id: groupId,
      lesson_number: num,
      completed: !!completed
    };
    db.lesson_completions.push(compRecord);
  }

  saveDb(db);
  res.json({ success: true, lesson_number: num, completed: compRecord.completed });
});

// 7. Edit lesson elements (Admin features to modify title/PDF URLs or raw materials custom updates)
app.put('/api/groups/:groupId/lessons/:lessonNumber', (req, res) => {
  const { groupId, lessonNumber } = req.params;
  const { title, platform, plan, exercises, goal, links, rawMaterials } = req.body;
  const num = parseInt(lessonNumber, 10);

  if (isNaN(num)) {
    return res.status(400).json({ error: 'Noto\'g\'ri dars raqami' });
  }

  const db = loadDb();
  let customRecord = db.custom_lessons.find(
    (c: any) => c.group_id === groupId && c.lesson_number === num
  );

  if (!customRecord) {
    customRecord = {
      id: `cl_${groupId}_${num}`,
      group_id: groupId,
      lesson_number: num
    };
    db.custom_lessons.push(customRecord);
  }

  if (title !== undefined) customRecord.title = title;
  if (platform !== undefined) customRecord.platform = platform;
  if (plan !== undefined) customRecord.plan = plan;
  if (exercises !== undefined) customRecord.exercises = exercises;
  if (goal !== undefined) customRecord.goal = goal;
  if (links !== undefined) customRecord.links = links;
  if (rawMaterials !== undefined) customRecord.rawMaterials = rawMaterials;

  saveDb(db);
  res.json({ success: true, lesson_number: num, data: customRecord });
});

// ============================================
// STUDENT MANAGEMENT API ENDPOINTS
// ============================================

// 0. Get All Students (global)
app.get('/api/students', (req, res) => {
  const db = loadDb();
  res.json(db.students);
});

// 1. Get Students for a Group
app.get('/api/groups/:groupId/students', (req, res) => {
  const { groupId } = req.params;
  const db = loadDb();
  const filtered = db.students.filter((s: any) => s.group_id === groupId);
  res.json(filtered);
});

// 2. Add New Student manually
app.post('/api/groups/:groupId/students', (req, res) => {
  const { groupId } = req.params;
  const { fullname, phone, parent_phone, joined_date, age, notes, lesson_schedule } = req.body;

  if (!fullname || !phone || !parent_phone) {
    return res.status(400).json({ error: 'FIO va telefon raqamlari talab etiladi!' });
  }

  const db = loadDb();
  const studentId = 'std_' + Math.random().toString(36).substr(2, 9);
  
  const newStudent = {
    id: studentId,
    group_id: groupId,
    fullname: fullname.trim(),
    phone: phone.trim(),
    parent_phone: parent_phone.trim(),
    joined_date: joined_date || new Date().toISOString().substring(0, 10),
    current_points: 100, // Starts with 100 points
    notes: notes ? notes.trim() : '',
    age: age ? parseInt(age, 10) : undefined,
    payment_status: 'unpaid',
    lesson_schedule: lesson_schedule || 'odd'
  };

  db.students.push(newStudent);

  // Automatically add first points history log
  db.points_history.push({
    id: 'ph_' + Math.random().toString(36).substr(2, 9),
    student_id: studentId,
    group_id: groupId,
    reason: 'Tizimga muvaffaqiyatli qo‘shildi',
    points_change: 100,
    date: new Date().toISOString()
  });

  saveDb(db);
  res.status(201).json(newStudent);
});

// 3. Edit Student Details
app.put('/api/students/:studentId', (req, res) => {
  const { studentId } = req.params;
  const { fullname, phone, parent_phone, joined_date, current_points, notes, age, payment_status, lesson_schedule } = req.body;

  const db = loadDb();
  const student = db.students.find((s: any) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'O‘quvchi topilmadi!' });
  }

  if (fullname !== undefined) student.fullname = fullname.trim();
  if (phone !== undefined) student.phone = phone.trim();
  if (parent_phone !== undefined) student.parent_phone = parent_phone.trim();
  if (joined_date !== undefined) student.joined_date = joined_date;
  if (current_points !== undefined) student.current_points = parseInt(current_points, 10);
  if (notes !== undefined) student.notes = notes.trim();
  if (age !== undefined) student.age = age ? parseInt(age, 10) : undefined;
  if (payment_status !== undefined) student.payment_status = payment_status;
  if (lesson_schedule !== undefined) student.lesson_schedule = lesson_schedule;

  saveDb(db);
  res.json(student);
});

// 4. Delete Student
app.delete('/api/students/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = loadDb();

  db.students = db.students.filter((s: any) => s.id !== studentId);
  db.attendance = db.attendance.filter((a: any) => a.student_id !== studentId);
  db.points_history = db.points_history.filter((p: any) => p.student_id !== studentId);

  saveDb(db);
  res.json({ success: true, message: 'O‘quvchi guruhdan o‘chirib tashlandi!' });
});

// 5. Get Attendance logs for Group
app.get('/api/groups/:groupId/attendance', (req, res) => {
  const { groupId } = req.params;
  const db = loadDb();
  const records = db.attendance.filter((a: any) => a.group_id === groupId);
  res.json(records);
});

// 6. Mark Attendance
app.post('/api/attendance', (req, res) => {
  const { student_id, group_id, lesson_number, status, date } = req.body;

  if (!student_id || !group_id || !lesson_number || !status) {
    return res.status(400).json({ error: 'Ma‘lumotlar to‘liq emas!' });
  }

  const db = loadDb();

  // Find existing record
  let record = db.attendance.find(
    (a: any) => a.student_id === student_id && a.lesson_number === parseInt(lesson_number, 10)
  );

  if (record) {
    record.status = status;
    record.date = date || new Date().toISOString().substring(0, 10);
  } else {
    record = {
      id: 'att_' + Math.random().toString(36).substr(2, 9),
      student_id,
      group_id,
      lesson_number: parseInt(lesson_number, 10),
      status,
      date: date || new Date().toISOString().substring(0, 10)
    };
    db.attendance.push(record);
  }

  saveDb(db);
  res.json(record);
});

// 7. Get Points History logs for Group
app.get('/api/groups/:groupId/points-history', (req, res) => {
  const { groupId } = req.params;
  const db = loadDb();
  const filterList = db.points_history.filter((ph: any) => ph.group_id === groupId);
  res.json(filterList);
});

// 8. Add Bonus or Penalty (Modifies points_history & student current_points)
app.post('/api/points-history', (req, res) => {
  const { student_id, group_id, reason, points_change } = req.body;

  if (!student_id || !group_id || !reason || points_change === undefined) {
    return res.status(400).json({ error: 'Ma‘lumotlar to‘liq emas!' });
  }

  const db = loadDb();
  const student = db.students.find((s: any) => s.id === student_id);
  if (!student) {
    return res.status(404).json({ error: 'O‘quvchi topilmadi!' });
  }

  // Adjust current score
  student.current_points = (student.current_points || 0) + parseInt(points_change, 10);

  const entry = {
    id: 'ph_' + Math.random().toString(36).substr(2, 9),
    student_id,
    group_id,
    reason: reason.trim(),
    points_change: parseInt(points_change, 10),
    date: new Date().toISOString()
  };

  db.points_history.push(entry);

  saveDb(db);
  res.status(201).json({ entry, student });
});

// 8.5. Payments API Endpoints
app.get('/api/groups/:groupId/payments', (req, res) => {
  const { groupId } = req.params;
  const db = loadDb();
  const filterList = (db.payments || []).filter((p: any) => p.group_id === groupId);
  res.json(filterList);
});

app.get('/api/payments', (req, res) => {
  const db = loadDb();
  res.json(db.payments || []);
});

app.post('/api/payments', (req, res) => {
  const { student_id, group_id, amount, payment_date, month } = req.body;
  if (!student_id || !group_id || !amount) {
    return res.status(400).json({ error: 'Foydalanuvchi ID, Guruh ID va Summa belgilanishi shart!' });
  }

  const db = loadDb();
  if (!db.payments) db.payments = [];

  const student = db.students.find((s: any) => s.id === student_id);
  if (!student) {
    return res.status(404).json({ error: 'O‘quvchi topilmadi!' });
  }

  const lessonPrice = 29000;
  const lessonsCovered = Math.floor(parseInt(amount, 10) / lessonPrice);

  const entry = {
    id: 'py_' + Math.random().toString(36).substr(2, 9),
    student_id,
    group_id,
    amount: parseInt(amount, 10),
    lessons_covered: lessonsCovered,
    payment_date: payment_date || new Date().toISOString().substring(0, 10),
    month: month || new Date().toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
  };

  db.payments.push(entry);

  // Mark student as paid
  student.payment_status = 'paid';

  saveDb(db);
  res.status(201).json({ entry, student });
});

app.delete('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  if (!db.payments) db.payments = [];
  const index = db.payments.findIndex((p: any) => p.id === id);
  if (index > -1) {
    const pRecord = db.payments[index];
    db.payments.splice(index, 1);
    
    // Check if student has other payments, if not, set to unpaid
    const remainingPayments = db.payments.filter((p: any) => p.student_id === pRecord.student_id);
    if (remainingPayments.length === 0) {
      const student = db.students.find((s: any) => s.id === pRecord.student_id);
      if (student) {
        student.payment_status = 'unpaid';
      }
    }
    saveDb(db);
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'To‘lov topilmadi!' });
});

// Backup & Persistence Endpoint to survive Cloud Run ephemerality
app.get('/api/backup/get-all', (req, res) => {
  const db = loadDb();
  res.json(db);
});

app.post('/api/backup/restore', (req, res) => {
  const { teachers, groups, lesson_completions, custom_lessons, students, attendance, points_history, payments, last_updated } = req.body;
  const db = loadDb();
  
  if (Array.isArray(teachers) && teachers.length > 0) db.teachers = teachers;
  if (Array.isArray(groups)) db.groups = groups;
  if (Array.isArray(lesson_completions)) db.lesson_completions = lesson_completions;
  if (Array.isArray(custom_lessons)) db.custom_lessons = custom_lessons;
  if (Array.isArray(students)) db.students = students;
  if (Array.isArray(attendance)) db.attendance = attendance;
  if (Array.isArray(points_history)) db.points_history = points_history;
  if (Array.isArray(payments)) db.payments = payments;
  
  if (last_updated) {
    db.last_updated = last_updated;
  } else {
    db.last_updated = Date.now();
  }

  saveDb(db, false);
  res.json({ success: true, message: 'Tizim ma\'lumotlari to\'liq tiklandi!' });
});

// 9. Dashboard Analytics Endpoint (Get aggregated statistics)
app.get('/api/analytics', (req, res) => {
  const teacherId = req.query.teacherId as string;
  const db = loadDb();

  // If filtered by teacher
  let userGroups = db.groups;
  if (teacherId) {
    userGroups = db.groups.filter((g: any) => g.teacher_id === teacherId);
  }

  const groupIds = userGroups.map((g: any) => g.id);
  const students = db.students.filter((s: any) => groupIds.includes(s.group_id));
  const attendance = db.attendance.filter((a: any) => groupIds.includes(a.group_id));
  const pointsHistory = db.points_history.filter((ph: any) => groupIds.includes(ph.group_id));

  // Compute stats
  const totalGroups = userGroups.length;
  const totalStudents = students.length;

  // Top/Bottom scoring students
  const highestScorers = [...students]
    .sort((a, b) => b.current_points - a.current_points)
    .slice(0, 5)
    .map(s => ({
      id: s.id,
      fullname: s.fullname,
      current_points: s.current_points,
      group_name: userGroups.find((g: any) => g.id === s.group_id)?.group_name || 'Noma‘lum'
    }));

  const lowestScorers = [...students]
    .sort((a, b) => a.current_points - b.current_points)
    .slice(0, 5)
    .map(s => ({
      id: s.id,
      fullname: s.fullname,
      current_points: s.current_points,
      group_name: userGroups.find((g: any) => g.id === s.group_id)?.group_name || 'Noma‘lum'
    }));

  // Attendance rate %
  const totalAtts = attendance.length;
  const presents = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = totalAtts > 0 ? Math.round((presents / totalAtts) * 100) : 100;

  // Recent Activity details
  const recentPenalties = pointsHistory
    .filter((ph: any) => ph.points_change < 0)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((ph: any) => {
      const stdObj = students.find((s: any) => s.id === ph.student_id);
      return {
        id: ph.id,
        student_name: stdObj ? stdObj.fullname : 'O‘quvchi',
        reason: ph.reason,
        points_change: ph.points_change,
        date: ph.date
      };
    });

  const recentActivity = pointsHistory
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map((ph: any) => {
      const stdObj = students.find((s: any) => s.id === ph.student_id);
      return {
        id: ph.id,
        student_name: stdObj ? stdObj.fullname : 'O‘quvchi',
        reason: ph.reason,
        points_change: ph.points_change,
        date: ph.date
      };
    });

  res.json({
    totalGroups,
    totalStudents,
    attendanceRate,
    highestScorers,
    lowestScorers,
    recentPenalties,
    recentActivity
  });
});



// Serve files in production/HMR development

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for all client-side routes (SPA)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Campus LMS full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
