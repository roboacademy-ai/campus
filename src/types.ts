export interface Teacher {
  id: string;
  username: string;
  fullname: string;
  role: 'teacher' | 'admin';
  avatar?: string;
  password?: string;
}

export interface Group {
  id: string;
  teacher_id: string;
  group_name: string;
  created_date: string;
  // Computed extra flags
  teacher_name?: string;
  completion_percentage?: number;
  completed_count?: number;
}

export interface LessonLink {
  title: string;
  url: string;
}

export interface Lesson {
  lesson_number: number;
  title: string;
  platform: string;
  plan: string;
  exercises: string;
  goal: string;
  links: LessonLink[];
  rawMaterials: string;
  completed: boolean;
  sources?: string;
  pdf_url?: string;
  lesson_title?: string;
}

export interface GroupLessonsResponse {
  group: Group;
  lessons: Lesson[];
}

export interface UserSession {
  id: string;
  username: string;
  fullname: string;
  role: 'teacher' | 'admin';
  avatar?: string;
  password?: string;
}

export interface Student {
  id: string;
  group_id: string;
  fullname: string;
  phone: string;
  parent_phone: string;
  joined_date: string;
  current_points: number;
  notes?: string;
  age?: number;
  payment_status?: 'paid' | 'unpaid';
  lesson_schedule?: 'odd' | 'even';
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  group_id: string;
  lesson_number: number;
  status: 'present' | 'absent' | 'late';
  date: string;
}

export interface PointsHistoryEntry {
  id: string;
  student_id: string;
  group_id: string;
  reason: string;
  points_change: number; // e.g. -5, +10
  date: string;
}

export interface PaymentRecord {
  id: string;
  student_id: string;
  group_id: string;
  amount: number;
  lessons_covered: number;
  payment_date: string;
  month?: string;
}

