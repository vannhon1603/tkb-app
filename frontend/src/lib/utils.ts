import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Checks if a lesson is a Specialized Topic (Chuyên đề học tập)
 */
export function isChuyenDeLesson(
  lessonNumber?: number | string | null,
  notes?: string | null,
  title?: string | null
): boolean {
  if (notes && /chuyên\s*đề|\bcđ\b/i.test(notes)) return true;
  if (title && /chuyên\s*đề|\bcđ\d*[\s\-\.:]/i.test(title)) return true;
  if (typeof lessonNumber === "string" && /cđ|cd/i.test(lessonNumber)) return true;
  if (typeof lessonNumber === "number" && lessonNumber > 105 && lessonNumber <= 150) return true;
  return false;
}

/**
 * Formats PPCT lesson number:
 * Regular lessons: "1", "2", ... "105"
 * Specialized lessons: "1CĐ", "2CĐ", ... "35CĐ"
 */
export function formatPPCTLessonNumber(
  lessonNumber?: number | string | null,
  notes?: string | null,
  title?: string | null
): string {
  if (lessonNumber === null || lessonNumber === undefined || lessonNumber === "") return "-";
  
  const strVal = String(lessonNumber).trim();
  if (/^\d+\s*cđ$/i.test(strVal) || /^\d+\s*cd$/i.test(strVal)) {
    return strVal.toUpperCase();
  }

  const n = parseInt(strVal, 10);
  const isCD = isChuyenDeLesson(lessonNumber, notes, title);

  if (isCD) {
    if (!isNaN(n)) {
      const cdNum = n > 105 ? n - 105 : n;
      return `${cdNum}CĐ`;
    }
    return `${strVal}CĐ`;
  }

  return isNaN(n) ? strVal : `${n}`;
}

