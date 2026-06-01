/**
 * Helper to calculate lesson dates for a student starting from their joined_date.
 * Schedule can be 'odd' (Mon-Wed-Fri: 1, 3, 5) or 'even' (Tue-Thu-Sat: 2, 4, 6).
 */
export function calculateLessonDates(
  joinedDateStr: string,
  totalLessons: number,
  schedule?: 'odd' | 'even'
): string[] {
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
    // Determine lane automatically based on joined_date: Mon-Wed-Fri (1, 3, 5) or Tue-Thu-Sat (2, 4, 6)
    let startDay = start.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (startDay === 0) {
      // sunday shifted to monday
      start.setDate(start.getDate() + 1);
      startDay = 1;
    }
    const isOddLane = [1, 3, 5].includes(startDay);
    activeDays = isOddLane ? [1, 3, 5] : [2, 4, 6];
  }

  const current = new Date(start);
  let safetyCounter = 0;
  while (dates.length < totalLessons && safetyCounter < 1000) {
    safetyCounter++;
    const day = current.getDay();
    if (activeDays.includes(day)) {
      dates.push(current.toISOString().substring(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Calculates a full year of lesson dates for a student starting from their joined_date.
 */
export function calculateFullYearLessonDates(
  joinedDateStr: string,
  schedule?: 'odd' | 'even'
): string[] {
  const dates: string[] = [];
  if (!joinedDateStr) return dates;

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
  const endLimit = new Date(start);
  endLimit.setFullYear(endLimit.getFullYear() + 1); // Limit to 1 year ahead

  let safetyCounter = 0;
  while (current <= endLimit && safetyCounter < 1000) {
    safetyCounter++;
    const day = current.getDay();
    if (activeDays.includes(day)) {
      dates.push(current.toISOString().substring(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Calculates payment breakdown for a student.
 */
export interface PaymentDetails {
  totalPaid: number;
  totalLessonsPaid: number;
  lessonDates: string[];
  consumedLessons: number;
  remainingLessons: number;
  expiryDate: string;
  isExpired: boolean;
}

export function getStudentPaymentDetails(
  joinedDateStr: string,
  studentPayments: any[],
  schedule?: 'odd' | 'even'
): PaymentDetails {
  const totalPaid = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalLessonsPaid = Math.floor(totalPaid / 29000);

  if (!joinedDateStr || totalLessonsPaid <= 0) {
    return {
      totalPaid,
      totalLessonsPaid,
      lessonDates: [],
      consumedLessons: 0,
      remainingLessons: 0,
      expiryDate: '',
      isExpired: true
    };
  }

  const lessonDates = calculateLessonDates(joinedDateStr, totalLessonsPaid, schedule);
  
  // Use current local date in Tashkent/Uzbekistan or standard ISO string for comparison
  const todayStr = new Date().toISOString().substring(0, 10);
  
  const consumedLessons = lessonDates.filter(d => d <= todayStr).length;
  const remainingLessons = Math.max(0, totalLessonsPaid - consumedLessons);
  const expiryDate = lessonDates.length > 0 ? lessonDates[lessonDates.length - 1] : '';
  const isExpired = remainingLessons <= 0;

  return {
    totalPaid,
    totalLessonsPaid,
    lessonDates,
    consumedLessons,
    remainingLessons,
    expiryDate,
    isExpired
  };
}

/**
 * Formats standard dates YYYY-MM-DD into "D,Month,YYYY" in Uzbek language.
 * E.g., '2026-06-01' -> '1,iyun,2026'
 */
export function formatUzbekDate(dateStr: string): string {
  if (!dateStr) return '';
  // Support formatting standard YYYY-MM-DD
  const parts = dateStr.substring(0, 10).split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    if (monthIndex >= 1 && monthIndex <= 12) {
      return `${day},${months[monthIndex - 1]},${year}`;
    }
  }

  // Fallback to JS parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const day = d.getDate();
    const months = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    return `${day},${months[monthIndex]},${year}`;
  }
  return dateStr;
}

/**
 * Parses user input in DD-MM-YYYY or DD.MM.YYYY or DD/MM/YYYY
 * into standard YYYY-MM-DD for database persistence.
 */
export function parseUzbekDateInput(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Try matching DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY
  const delimiterRegex = /[-./]/;
  const parts = trimmed.split(delimiterRegex);
  
  if (parts.length === 3) {
    // If the first part has 4 digits, it's already YYYY-MM-DD
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Otherwise, assume it is DD-MM-YYYY
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    let fullYear = year;
    if (year.length === 2) {
      fullYear = '20' + year;
    }
    
    return `${fullYear}-${month}-${day}`;
  }
  
  return trimmed;
}

/**
 * Formats standard YYYY-MM-DD date into DD-MM-YYYY format for display in a text input field.
 */
export function formatUzbekInputDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.substring(0, 10).split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

