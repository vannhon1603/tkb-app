import re, json

with open('reference_index.html', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract K10 and K11 templates
k10_match = re.search(r'const K10_TEMPLATE_LESSONS\s*=\s*(\[.*?\]);\s*const', code, re.DOTALL)
k11_match = re.search(r'const K11_TEMPLATE_LESSONS\s*=\s*(\[.*?\]);\s*const', code, re.DOTALL)

k10_data = json.loads(k10_match.group(1)) if k10_match else []
k11_data = json.loads(k11_match.group(1)) if k11_match else []

ts_template = """// Built-in Complete Curriculum Templates & Synchronization Logic
// Extracted and optimized from Teacher Hub Pro 2026

export interface CurriculumTemplateItem {
  week: number;
  period: number;
  lessonName: string;
  topic?: string;
  expectedDate?: string;
}

export const K10_TEMPLATE_LESSONS: CurriculumTemplateItem[] = """ + json.dumps(k10_data, ensure_ascii=False, indent=2) + """;

export const K11_TEMPLATE_LESSONS: CurriculumTemplateItem[] = """ + json.dumps(k11_data, ensure_ascii=False, indent=2) + """;

export const DAY_NAMES: Record<number, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật'
};

export const formatDateVi = (dateString?: string): string => {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  if (!d || !m || !y) return dateString;
  return `${d}/${m}/${y}`;
};

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateForWeekDay = (week: number, dayOfWeek: number, schoolYearStart: string): string => {
  if (!schoolYearStart || !week || !dayOfWeek) return '';
  try {
    const start = new Date(schoolYearStart + 'T00:00:00');
    const daysOffset = (week - 1) * 7 + (dayOfWeek - 2);
    const result = new Date(start);
    result.setDate(start.getDate() + daysOffset);
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, '0');
    const d = String(result.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    return '';
  }
};

export const getWeekDatesForWeekNum = (weekNum: number, schoolYearStart: string) => {
  const dates = [];
  for (let day = 2; day <= 8; day++) {
    const dateStr = getDateForWeekDay(weekNum, day, schoolYearStart);
    dates.push({
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      dateString: dateStr,
      displayDate: dateStr ? formatDateVi(dateStr) : ''
    });
  }
  return dates;
};

export const recomputeAllCurriculumDates = (
  curriculum: any[],
  timetable: any[],
  schoolYearStart: string
): any[] => {
  if (!curriculum || curriculum.length === 0) return [];
  if (!timetable || timetable.length === 0 || !schoolYearStart) {
    return curriculum.map((c) => ({ ...c }));
  }

  const classNames = [...new Set(curriculum.map((c) => c.grade || c.class_name || c.className))];
  const updated: any[] = [];

  classNames.forEach((cls) => {
    const regTkb = timetable
      .filter((t) => (t.class_name === cls || t.className === cls || t.classId === cls) && (!t.session_type || t.session_type !== 'specialized'))
      .sort((a, b) => (a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.period - b.period));

    const specTkb = timetable
      .filter((t) => (t.class_name === cls || t.className === cls || t.classId === cls) && (t.session_type === 'specialized' || t.subjectType === 'specialized'))
      .sort((a, b) => (a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.period - b.period));

    const classLessons = curriculum.filter((c) => c.grade === cls || c.class_name === cls || c.className === cls);
    const weeks = [...new Set(classLessons.map((c) => parseInt(c.week)))].sort((a, b) => a - b);

    weeks.forEach((w) => {
      // Regular lessons in week w
      const regLessons = classLessons
        .filter((c) => parseInt(c.week) === w && c.notes !== 'Chuyên đề' && c.topic !== 'Chuyên đề')
        .sort((a, b) => parseInt(a.lesson_number || a.period) - parseInt(b.lesson_number || b.period));

      regLessons.forEach((lesson, idx) => {
        let expDate = lesson.expected_date || lesson.expectedDate || '';
        if (regTkb.length > 0) {
          const tkbSlot = regTkb[idx % regTkb.length];
          expDate = getDateForWeekDay(w, tkbSlot.day_of_week || tkbSlot.dayOfWeek, schoolYearStart);
        }
        updated.push({ ...lesson, expected_date: expDate, expectedDate: expDate });
      });

      // Specialized lessons in week w
      const specLessons = classLessons
        .filter((c) => parseInt(c.week) === w && (c.notes === 'Chuyên đề' || c.topic === 'Chuyên đề'))
        .sort((a, b) => parseInt(a.lesson_number || a.period) - parseInt(b.lesson_number || b.period));

      specLessons.forEach((lesson, idx) => {
        let expDate = lesson.expected_date || lesson.expectedDate || '';
        if (specTkb.length > 0) {
          const tkbSlot = specTkb[idx % specTkb.length];
          expDate = getDateForWeekDay(w, tkbSlot.day_of_week || tkbSlot.dayOfWeek, schoolYearStart);
        }
        updated.push({ ...lesson, expected_date: expDate, expectedDate: expDate });
      });
    });
  });

  const processedIds = new Set(updated.map((u) => u.id));
  curriculum.forEach((c) => {
    if (!processedIds.has(c.id)) {
      updated.push({ ...c });
    }
  });

  return updated;
};
"""

with open('frontend/src/lib/curriculumData.ts', 'w', encoding='utf-8') as out:
    out.write(ts_template)

print(f"Generated frontend/src/lib/curriculumData.ts with {len(k10_data)} K10 lessons and {len(k11_data)} K11 lessons.")
