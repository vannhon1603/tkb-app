"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  School,
  Layers,
  LayoutGrid,
  List,
  Check,
  CalendarDays,
  Settings2,
  Flame,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api";
import { toast } from "react-hot-toast";
import { formatPPCTLessonNumber, isChuyenDeLesson } from "@/lib/utils";

interface SoBaoGiangEntry {
  id: number;
  teacher_name: string;
  week_number: number;
  start_date: string;
  day_of_week: number;
  date_str: string;
  period: number;
  class_name: string;
  subject: string;
  ppct_lesson_number?: number;
  lesson_title: string;
  notes?: string;
  is_custom?: boolean;
  is_taught?: boolean;
  status?: string;
  taught_at?: string;
}

interface ProgressStats {
  total_lessons: number;
  taught_lessons: number;
  pending_lessons: number;
  delayed_lessons: number;
  completion_rate: number;
  by_class: Record<string, { total: number; taught: number; pending: number }>;
  by_subject: Record<string, { total: number; taught: number; pending: number }>;
}

const DAY_NAMES: Record<number, string> = {
  2: "Thứ Hai",
  3: "Thứ Ba",
  4: "Thứ Tư",
  5: "Thứ Năm",
  6: "Thứ Sáu",
  7: "Thứ Bảy",
  8: "Chủ Nhật",
};

// Helper: Parse DD/MM/YYYY to Date object
function parseDateStr(dStr?: string): Date | null {
  if (!dStr) return null;
  const parts = dStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

// Helper: Calculate Monday of Week N from a base Monday date
function getMondayOfWeek(baseMondayStr: string, week: number): string {
  try {
    const d = new Date(baseMondayStr);
    if (isNaN(d.getTime())) return baseMondayStr;
    d.setDate(d.getDate() + (week - 1) * 7);
    return d.toISOString().split("T")[0];
  } catch {
    return baseMondayStr;
  }
}

export function SoBaoGiangTab() {
  const [entries, setEntries] = useState<SoBaoGiangEntry[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "taught" | "delayed">("all");
  const [showEmptyPeriods, setShowEmptyPeriods] = useState<boolean>(true);
  
  // Semester Start Date (Tuần 1)
  const [semesterStartDate, setSemesterStartDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tkb_semester_start_date");
      if (saved) return saved;
    }
    // Default to the nearest previous Monday or current week Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split("T")[0];
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return getMondayOfWeek(semesterStartDate, 1);
  });

  const [showConfigStartDate, setShowConfigStartDate] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [totalWeeksToGenerate, setTotalWeeksToGenerate] = useState<number>(35);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("Tất cả");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Edit / Manual Add modal
  const [editingEntry, setEditingEntry] = useState<SoBaoGiangEntry | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    teacher_name: "Giáo viên",
    day_of_week: 2,
    period: 1,
    class_name: "",
    subject: "Toán",
    ppct_lesson_number: 1,
    lesson_title: "",
    notes: "",
    is_taught: false,
  });

  // Calculate startDate whenever weekNumber or semesterStartDate changes
  useEffect(() => {
    const calculated = getMondayOfWeek(semesterStartDate, weekNumber);
    setStartDate(calculated);
  }, [weekNumber, semesterStartDate]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<SoBaoGiangEntry[]>("/api/so-bao-giang", {
        params: {
          week_number: weekNumber,
          start_date: startDate,
          teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : undefined,
        },
      });
      setEntries(data);

      const teacherList = await apiClient<string[]>("/api/tkb/teachers");
      setTeachers(teacherList);
      if (teacherList.length > 0 && selectedTeacher === "Tất cả") {
        setSelectedTeacher(teacherList[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [weekNumber, startDate, selectedTeacher]);

  // Handle Changing Semester Start Date
  const handleSaveSemesterStartDate = (newStartDate: string) => {
    setSemesterStartDate(newStartDate);
    if (typeof window !== "undefined") {
      localStorage.setItem("tkb_semester_start_date", newStartDate);
    }
    const calculated = getMondayOfWeek(newStartDate, weekNumber);
    setStartDate(calculated);
    toast.success(`Đã đặt ngày bắt đầu TKB (Tuần 1) là: ${newStartDate}`);
    setShowConfigStartDate(false);
  };

  // Adjust startDate when week changes
  const handleChangeWeek = (newWeek: number) => {
    if (newWeek < 1 || newWeek > 35) return;
    setWeekNumber(newWeek);
  };

  // Quick Toggle Taught Status
  const handleToggleTaught = async (entry: SoBaoGiangEntry) => {
    const newStatus = !entry.is_taught;
    setTogglingId(entry.id);

    // Optimistic UI update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? {
              ...e,
              is_taught: newStatus,
              status: newStatus ? "completed" : "pending",
              taught_at: newStatus ? new Date().toISOString() : undefined,
            }
          : e
      )
    );

    try {
      await apiClient<SoBaoGiangEntry>(`/api/so-bao-giang/${entry.id}/toggle-taught`, {
        method: "PATCH",
        body: JSON.stringify({ is_taught: newStatus }),
      });
      if (newStatus) {
        toast.success(`Đã đánh dấu ĐÃ DẠY: ${entry.class_name} - ${entry.lesson_title.slice(0, 25)}...`, {
          icon: "✅",
          duration: 2000,
        });
      } else {
        toast(`Đã chuyển về CHƯA DẠY: ${entry.class_name}`, {
          icon: "↩️",
          duration: 1800,
        });
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, is_taught: entry.is_taught, status: entry.status }
            : e
        )
      );
      toast.error(err?.message || "Lỗi khi cập nhật trạng thái tiết dạy");
    } finally {
      setTogglingId(null);
    }
  };

  // Batch Toggle Taught Status for entire current week
  const handleBatchToggleWeekTaught = async (isTaught: boolean) => {
    if (entries.length === 0) {
      toast.error("Không có tiết nào trong tuần này");
      return;
    }
    setIsBatchUpdating(true);
    try {
      const res = await apiClient<{ updated_count: number; is_taught: boolean; message: string }>(
        "/api/so-bao-giang/batch-toggle-taught",
        {
          method: "POST",
          body: JSON.stringify({
            week_number: weekNumber,
            teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : undefined,
            is_taught: isTaught,
          }),
        }
      );
      toast.success(res.message);
      loadEntries();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi cập nhật trạng thái cả tuần");
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleSeedDemoData = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient<{ message: string }>("/api/settings/seed-demo", {
        method: "POST",
      });
      toast.success(res.message);
      loadEntries();
    } catch (err: any) {
      toast.error(err?.message || "Không thể nạp dữ liệu mẫu");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate for Current Week Only
  const handleGenerateCurrentWeek = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient<{ entries: SoBaoGiangEntry[]; total_entries: number }>(
        "/api/so-bao-giang/generate",
        {
          method: "POST",
          body: JSON.stringify({
            week_number: weekNumber,
            start_date: startDate,
            teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : undefined,
            overwrite: true,
          }),
        }
      );
      setEntries(res.entries);
      setGenerateDialogOpen(false);
      toast.success(
        `Đã tự động sinh thành công ${res.total_entries} tiết trong Sổ Báo Giảng Tuần ${weekNumber}!`
      );
    } catch (err: any) {
      toast.error(
        err?.message || "Không thể sinh sổ báo giảng. Vui lòng nạp TKB và PPCT trước."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate for ALL 35 Weeks in one click
  const handleGenerateAllWeeks = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient<{ total_weeks: number; total_entries: number; teacher_name: string; message: string }>(
        "/api/so-bao-giang/generate-all",
        {
          method: "POST",
          body: JSON.stringify({
            semester_start_date: semesterStartDate,
            total_weeks: totalWeeksToGenerate || 35,
            teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : undefined,
            overwrite: true,
            preserve_taught: true,
          }),
        }
      );
      setGenerateDialogOpen(false);
      toast.success(
        `✨ ${res.message || `Đã sinh thành công ${res.total_entries} tiết cho ${res.total_weeks} tuần!`}`,
        {
          duration: 6000,
          icon: "🎉",
        }
      );
      loadEntries();
    } catch (err: any) {
      toast.error(
        err?.message || "Không thể sinh sổ báo giảng cho tất cả các tuần. Vui lòng kiểm tra TKB và PPCT."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Default handler for "Tự Động Sinh Sổ" button
  const handleGenerate = () => {
    setGenerateDialogOpen(true);
  };

  const handleClearWeek = async () => {
    if (!confirm(`Bạn có chắc muốn xóa toàn bộ tiết báo giảng của Tuần ${weekNumber}?`)) return;
    try {
      await apiClient(`/api/so-bao-giang/week/${weekNumber}`, {
        method: "DELETE",
        params: selectedTeacher !== "Tất cả" ? { teacher_name: selectedTeacher } : undefined,
      });
      setEntries([]);
      toast.success(`Đã xóa sổ báo giảng Tuần ${weekNumber}!`);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa");
    }
  };

  const handleOpenAddManual = () => {
    setEditingEntry(null);
    setEntryForm({
      teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên",
      day_of_week: 2,
      period: 1,
      class_name: "",
      subject: "Toán",
      ppct_lesson_number: 1,
      lesson_title: "",
      notes: "",
      is_taught: false,
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (entry: SoBaoGiangEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      teacher_name: entry.teacher_name,
      day_of_week: entry.day_of_week,
      period: entry.period,
      class_name: entry.class_name,
      subject: entry.subject,
      ppct_lesson_number: entry.ppct_lesson_number || 1,
      lesson_title: entry.lesson_title,
      notes: entry.notes || "",
      is_taught: entry.is_taught || false,
    });
    setAddModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.lesson_title.trim() || !entryForm.class_name.trim()) {
      toast.error("Vui lòng điền đủ tên lớp và tên bài dạy");
      return;
    }

    try {
      if (editingEntry) {
        // Update entry
        const updated = await apiClient<SoBaoGiangEntry>(`/api/so-bao-giang/${editingEntry.id}`, {
          method: "PUT",
          body: JSON.stringify(entryForm),
        });
        setEntries(entries.map((e) => (e.id === updated.id ? updated : e)));
        toast.success("Đã cập nhật tiết báo giảng!");
      } else {
        // Compute date_str from startDate + (day_of_week - 2)
        const mon = new Date(startDate);
        mon.setDate(mon.getDate() + (entryForm.day_of_week - 2));
        const dStr = `${String(mon.getDate()).padStart(2, "0")}/${String(
          mon.getMonth() + 1
        ).padStart(2, "0")}/${mon.getFullYear()}`;

        const newEntry = await apiClient<SoBaoGiangEntry>("/api/so-bao-giang", {
          method: "POST",
          body: JSON.stringify({
            ...entryForm,
            week_number: weekNumber,
            start_date: startDate,
            date_str: dStr,
          }),
        });
        setEntries([...entries, newEntry]);
        toast.success("Đã thêm tiết mới vào Sổ Báo Giảng!");
      }
      setAddModalOpen(false);
      setEditingEntry(null);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi lưu");
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa tiết này khỏi sổ báo giảng?")) return;
    try {
      await apiClient(`/api/so-bao-giang/${id}`, { method: "DELETE" });
      setEntries(entries.filter((e) => e.id !== id));
      toast.success("Đã xóa tiết!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa");
    }
  };

  const handleDownloadExcel = () => {
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const teacherParam = encodeURIComponent(
      selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên"
    );
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    const url = `${BASE_URL}/api/so-bao-giang/export/excel?week_number=${weekNumber}&start_date=${startDate}&teacher_name=${teacherParam}${tokenParam}`;
    window.open(url, "_blank");
  };

  const handleDownloadWord = () => {
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const teacherParam = encodeURIComponent(
      selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên"
    );
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    const url = `${BASE_URL}/api/so-bao-giang/export/word?week_number=${weekNumber}&start_date=${startDate}&teacher_name=${teacherParam}${tokenParam}`;
    window.open(url, "_blank");
  };

  // Compute live progress stats directly from entries
  const progressStats = useMemo(() => {
    const total = entries.length;
    const taught = entries.filter((e) => e.is_taught).length;
    const pending = total - taught;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let delayed = 0;
    const byClass: Record<string, { total: number; taught: number; pending: number }> = {};
    const bySubject: Record<string, { total: number; taught: number; pending: number }> = {};

    entries.forEach((e) => {
      // Check delayed
      if (!e.is_taught) {
        const d = parseDateStr(e.date_str);
        if (d && d < today) {
          delayed += 1;
        }
      }

      // Breakdown by class
      const cls = e.class_name || "Khác";
      if (!byClass[cls]) byClass[cls] = { total: 0, taught: 0, pending: 0 };
      byClass[cls].total += 1;
      if (e.is_taught) byClass[cls].taught += 1;
      else byClass[cls].pending += 1;

      // Breakdown by subject
      const sub = e.subject || "Khác";
      if (!bySubject[sub]) bySubject[sub] = { total: 0, taught: 0, pending: 0 };
      bySubject[sub].total += 1;
      if (e.is_taught) bySubject[sub].taught += 1;
      else bySubject[sub].pending += 1;
    });

    const completionRate = total > 0 ? Math.round((taught / total) * 100) : 0;

    return {
      total,
      taught,
      pending,
      delayed,
      completionRate,
      byClass,
      bySubject,
    };
  }, [entries]);

  // Filtered entries by status filter
  const filteredEntries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return entries.filter((e) => {
      if (statusFilter === "taught") return e.is_taught;
      if (statusFilter === "pending") return !e.is_taught;
      if (statusFilter === "delayed") {
        const d = parseDateStr(e.date_str);
        return !e.is_taught && d && d < today;
      }
      return true;
    });
  }, [entries, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Sổ Báo Giảng & Theo Dõi Tiến Độ Dạy Học Tự Động
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tự động sinh sổ cho toàn bộ 35 tuần năm học, đối chiếu PPCT & TKB, tick chọn tiết đã dạy và thống kê tiến độ
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5 shadow-xs font-semibold w-full sm:w-auto justify-center col-span-2 sm:col-span-1"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span>{isGenerating ? "Đang xử lý..." : "Tự Động Sinh Sổ (Tất Cả Tuần)"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenAddManual}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm tiết</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadExcel}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 w-full sm:w-auto justify-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadWord}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 w-full sm:w-auto justify-center"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất Word</span>
          </Button>
        </div>
      </div>

      {/* Filter, Week Navigation & Semester Start Date Toolbar */}
      <div className="flex flex-col gap-2.5 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3 rounded-lg text-xs shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full">
          {/* Week Selector with prev / next */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1 border border-[#d0d7de] dark:border-[#30363d] rounded-md p-0.5 bg-slate-50 dark:bg-[#0d1117]">
              <Button
                variant="ghost"
                size="icon"
                disabled={weekNumber <= 1}
                onClick={() => handleChangeWeek(weekNumber - 1)}
                className="h-7 w-7 text-slate-600"
                title="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold px-2 text-xs font-mono text-emerald-700 dark:text-emerald-400">
                Tuần {weekNumber}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={weekNumber >= 35}
                onClick={() => handleChangeWeek(weekNumber + 1)}
                className="h-7 w-7 text-slate-600"
                title="Tuần sau"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Select Week */}
            <Select
              value={String(weekNumber)}
              onValueChange={(val) => handleChangeWeek(Number(val))}
            >
              <SelectTrigger className="h-8 w-[95px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    Tuần {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monday of Current Week */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Thứ Hai:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs flex-1 sm:w-[135px]"
            />
          </div>

          {/* Semester Start Date Config Trigger */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigStartDate(!showConfigStartDate)}
              className="h-8 text-xs gap-1.5 border-dashed border-[#d0d7de] dark:border-[#30363d] text-slate-700 dark:text-slate-300 hover:border-emerald-500 w-full sm:w-auto"
              title="Cài đặt ngày bắt đầu TKB (Tuần 1)"
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bắt đầu TKB (Tuần 1): <strong className="text-emerald-700 dark:text-emerald-400">{semesterStartDate}</strong></span>
            </Button>
          </div>

          {/* Teacher Selector */}
          {teachers.length > 0 && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Giáo viên:</span>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="h-8 flex-1 sm:w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả giáo viên</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Start Date Configuration Dropdown / Inline Popover */}
        {showConfigStartDate && (
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md animate-in fade-in slide-in-from-top-2 duration-150 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
                  Cấu hình ngày bắt đầu thời khóa biểu (Tuần 1)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Khi bạn thay đổi ngày này, toàn bộ ngày Thứ Hai của các Tuần 1 → 35 sẽ tự động được tính chính xác mà không cần chọn lại từng tuần.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  defaultValue={semesterStartDate}
                  id="semester-start-input"
                  className="h-8 text-xs bg-white dark:bg-[#161b22] w-[145px]"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  onClick={() => {
                    const el = document.getElementById("semester-start-input") as HTMLInputElement;
                    if (el?.value) {
                      handleSaveSemesterStartDate(el.value);
                    }
                  }}
                >
                  Lưu ngày bắt đầu
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Actions & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Status filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === "all"
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Tất cả ({progressStats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
              }`}
            >
              Chưa dạy ({progressStats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("taught")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === "taught"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              ✓ Đã dạy ({progressStats.taught})
            </button>
            {progressStats.delayed > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("delayed")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === "delayed"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 hover:bg-red-100"
                }`}
              >
                ⚠️ Trễ hạn ({progressStats.delayed})
              </button>
            )}
          </div>

          {/* Batch Quick Mark Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
            {entries.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant={showEmptyPeriods ? "default" : "outline"}
                  onClick={() => setShowEmptyPeriods(!showEmptyPeriods)}
                  className={`h-7 text-[11px] gap-1 px-2.5 font-medium ${
                    showEmptyPeriods
                      ? "bg-slate-700 text-white hover:bg-slate-800"
                      : "text-slate-600 dark:text-slate-400 border-[#d0d7de] dark:border-[#30363d]"
                  }`}
                  title="Bật/Tắt hiển thị các dòng tiết trống theo mẫu chuẩn Bộ GD&ĐT"
                >
                  <span>{showEmptyPeriods ? "✓ Hiện tiết trống" : "Ẩn tiết trống"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBatchUpdating}
                  onClick={() => handleBatchToggleWeekTaught(true)}
                  className="h-7 text-[11px] gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 hover:bg-emerald-100"
                  title="Đánh dấu tất cả các tiết trong tuần này là đã dạy"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>Đã dạy cả tuần {weekNumber}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBatchUpdating}
                  onClick={() => handleBatchToggleWeekTaught(false)}
                  className="h-7 text-[11px] gap-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  title="Hủy đánh dấu tất cả các tiết trong tuần này"
                >
                  <span>↩️ Bỏ tick tuần</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearWeek}
                  className="h-7 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 px-1.5"
                  title="Xóa tiết tuần này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={loadEntries}
              className="h-7 text-xs gap-1 text-slate-500 px-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* Progress & Live Statistics Bar */}
      {entries.length > 0 && (
        <div className="bg-white dark:bg-[#161b22] border border-emerald-200/80 dark:border-emerald-900/40 rounded-lg p-3.5 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Progress Metrics */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                  Đã dạy: {progressStats.taught}/{progressStats.total} tiết
                </span>
                <span className="font-bold text-[11px] text-emerald-600 ml-1">
                  ({progressStats.completionRate}%)
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Chưa dạy: {progressStats.pending} tiết
                </span>
              </div>

              {progressStats.delayed > 0 ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                    Trễ tiến độ: {progressStats.delayed} tiết
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs">
                  <span>✅ Đúng tiến độ</span>
                </div>
              )}
            </div>

            {/* View mode toggle: Table vs Cards */}
            <div className="flex items-center border border-[#d0d7de] dark:border-[#30363d] rounded-md p-0.5 bg-slate-50 dark:bg-[#0d1117] shrink-0 self-start sm:self-auto">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={`h-7 px-2.5 text-xs gap-1.5 ${
                  viewMode === "table"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Bảng Chuẩn</span>
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className={`h-7 px-2.5 text-xs gap-1.5 ${
                  viewMode === "cards"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Lịch Ngày</span>
              </Button>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressStats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Breakdown by classes */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Tiến độ theo lớp:</span>
            {Object.entries(progressStats.byClass).map(([cls, stat]) => (
              <Badge
                key={cls}
                variant="outline"
                className={`text-[10px] px-2 py-0.5 font-medium transition-colors ${
                  stat.taught === stat.total
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-[#161b22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {cls}: {stat.taught}/{stat.total}t {stat.taught === stat.total && "✓"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main Sổ Báo Giảng Content */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-12 text-center text-slate-400 shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">Đang tải dữ liệu Sổ Báo Giảng...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-12 text-center text-slate-400 space-y-3 shadow-2xs">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              Chưa có dữ liệu Sổ Báo Giảng cho Tuần {weekNumber}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Đảm bảo bạn đã nạp file PPCT và TKB, sau đó nhấn nút{" "}
              <strong>"Tự Động Sinh Sổ (Tất Cả Tuần)"</strong> ở góc trên.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleGenerateAllWeeks}
              disabled={isGenerating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Tự động sinh cho TOÀN BỘ 35 Tuần
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateCurrentWeek}
              disabled={isGenerating}
              className="text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d]"
            >
              <span>Chỉ sinh cho Tuần {weekNumber}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSeedDemoData}
              disabled={isGenerating}
              className="text-xs gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Nạp dữ liệu mẫu thử nghiệm
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenAddManual}
              className="text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d]"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm tiết thủ công
            </Button>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-10 text-center text-slate-400 space-y-2 shadow-2xs">
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
            Không có tiết dạy nào phù hợp với bộ lọc "{statusFilter === "taught" ? "Đã dạy" : statusFilter === "pending" ? "Chưa dạy" : "Trễ hạn"}"
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter("all")}
            className="text-xs h-7"
          >
            Hiển thị tất cả ({entries.length} tiết)
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* View 1: Standard Education Table on Desktop + Responsive Mobile Cards on Mobile */
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden shadow-2xs">
          
          {/* MOBILE VIEW (block md:hidden): Beautiful Touch-Friendly Card Layout */}
          <div className="block md:hidden divide-y divide-[#d0d7de] dark:divide-[#30363d]">
            {Object.keys(DAY_NAMES).map((dayKey) => {
              const dayNum = Number(dayKey);
              const dayEntries = filteredEntries.filter((e) => e.day_of_week === dayNum);
              if (dayEntries.length === 0) return null;

              const dayTaughtCount = dayEntries.filter((e) => e.is_taught).length;
              const maxPeriod = Math.max(...dayEntries.map((e) => e.period), 5);
              const dayPeriods = showEmptyPeriods && statusFilter === "all"
                ? (maxPeriod <= 5 ? [1, 2, 3, 4, 5] : Array.from({ length: Math.max(10, maxPeriod) }, (_, i) => i + 1))
                : dayEntries.map((e) => e.period);

              return (
                <div key={`mobile-day-${dayNum}`} className="space-y-0">
                  {/* Day Header */}
                  <div className="bg-slate-100/90 dark:bg-[#0d1117] px-3.5 py-2.5 flex items-center justify-between border-b border-[#d0d7de] dark:border-[#30363d]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
                      <span className="text-emerald-900 dark:text-emerald-300 font-bold text-xs">
                        {DAY_NAMES[dayNum]}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        ({dayEntries[0]?.date_str})
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {dayTaughtCount}/{dayEntries.length} tiết đã dạy
                    </span>
                  </div>

                  {/* Day Lessons List */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dayPeriods.map((periodNum) => {
                      const entry = dayEntries.find((e) => e.period === periodNum);

                      if (!entry) {
                        return (
                          <div
                            key={`mobile-empty-${dayNum}-${periodNum}`}
                            className="p-3 bg-slate-50/40 dark:bg-[#161b22]/30 flex items-center justify-between text-xs text-slate-400"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] font-mono">
                                Tiết {periodNum} {periodNum > 5 && `(T${periodNum - 5} Chiều)`}
                              </span>
                              <span className="italic text-[11px] text-slate-400/80">(Tiết trống)</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEntry(null);
                                setEntryForm({
                                  teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên",
                                  day_of_week: dayNum,
                                  period: periodNum,
                                  class_name: "",
                                  subject: "Toán",
                                  ppct_lesson_number: 1,
                                  lesson_title: "",
                                  notes: "",
                                  is_taught: false,
                                });
                                setAddModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 font-medium"
                            >
                              <Plus className="w-3 h-3" /> Thêm tiết
                            </Button>
                          </div>
                        );
                      }

                      const isTaught = !!entry.is_taught;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const lessonDate = parseDateStr(entry.date_str);
                      const isDelayed = !isTaught && lessonDate && lessonDate < today;

                      return (
                        <div
                          key={`mobile-entry-${entry.id}`}
                          className={`p-3 transition-colors ${
                            isTaught
                              ? "bg-emerald-50/30 dark:bg-emerald-950/20"
                              : isDelayed
                              ? "bg-amber-50/30 dark:bg-amber-950/15"
                              : "bg-white dark:bg-[#161b22]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Tap-Friendly Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleTaught(entry)}
                              disabled={togglingId === entry.id}
                              className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                isTaught
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-[#0d1117]"
                              }`}
                              title={isTaught ? "Click để chuyển về Chưa dạy" : "Click để tick Đã dạy"}
                            >
                              {isTaught && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            {/* Main Lesson Info */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Badges Row: Explicitly distinguish Tiết TKB vs Tiết PPCT */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* 1. Tiết TKB (thứ tự trong ngày) */}
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-slate-800 dark:text-slate-200 font-bold text-[11px] font-mono border border-slate-300 dark:border-slate-700">
                                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>Tiết TKB {entry.period}</span>
                                    {entry.period > 5 && <span className="text-[10px] text-slate-500 font-normal">(Chiều)</span>}
                                  </span>

                                  {/* 2. Lớp học */}
                                  <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px]">
                                    {entry.class_name}
                                  </span>

                                  {/* 3. Môn học */}
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                                    {entry.subject}
                                  </span>

                                  {/* 4. Tiết PPCT (theo phân phối chương trình) */}
                                  {isChuyenDeLesson(entry.ppct_lesson_number, entry.notes, entry.lesson_title) ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[11px]">
                                      <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span>Tiết PPCT {formatPPCTLessonNumber(entry.ppct_lesson_number, entry.notes, entry.lesson_title)}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
                                      <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span>{entry.ppct_lesson_number ? `Tiết PPCT ${entry.ppct_lesson_number}` : "PPCT: -"}</span>
                                    </span>
                                  )}
                                </div>

                              {/* Lesson Title */}
                              <p
                                className={`text-xs font-semibold leading-relaxed ${
                                  isTaught
                                    ? "text-emerald-950 dark:text-emerald-200"
                                    : "text-slate-900 dark:text-slate-100"
                                }`}
                              >
                                {entry.lesson_title}
                              </p>

                              {/* Notes / ĐDDH */}
                              {entry.notes && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                  ĐDDH: {entry.notes}
                                </p>
                              )}

                              {/* Bottom Status & Action Buttons */}
                              <div className="flex items-center justify-between pt-1 gap-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTaught(entry)}
                                    disabled={togglingId === entry.id}
                                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                                      isTaught
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isTaught ? "bg-white" : "bg-slate-400"}`} />
                                    <span>{isTaught ? "Đã dạy" : "Chưa dạy"}</span>
                                  </button>

                                  {entry.is_custom && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                                      Đã sửa
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(entry)}
                                    className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    title="Sửa tiết"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    title="Xóa tiết"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (hidden md:block): Multi-Column Standard Education Table */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-[#1F4E78] text-white border-b border-[#d0d7de] dark:border-[#30363d] font-semibold text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-16 text-center border-r border-white/20" title="Tick chọn khi đã dạy xong tiết này">
                    Đã dạy
                  </th>
                  <th className="px-3 py-3 w-28 text-center border-r border-white/20">Thứ / Ngày</th>
                  <th className="px-2.5 py-3 w-20 text-center border-r border-white/20">Tiết TKB</th>
                  <th className="px-2.5 py-3 w-20 text-center border-r border-white/20">Lớp</th>
                  <th className="px-3 py-3 w-24 text-center border-r border-white/20">Môn học</th>
                  <th className="px-2.5 py-3 w-24 text-center border-r border-white/20">Tiết PPCT</th>
                  <th className="px-4 py-3 border-r border-white/20">Tên bài dạy / Nội dung giảng dạy</th>
                  <th className="px-3 py-3 w-36 border-r border-white/20">Ghi chú / ĐDDH</th>
                  <th className="px-3 py-3 w-28 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                {Object.keys(DAY_NAMES).map((dayKey) => {
                  const dayNum = Number(dayKey);
                  const dayEntries = filteredEntries.filter((e) => e.day_of_week === dayNum);
                  if (dayEntries.length === 0) return null;

                  const dayTaughtCount = dayEntries.filter((e) => e.is_taught).length;
                  const maxPeriod = Math.max(...dayEntries.map((e) => e.period), 5);
                  const dayPeriods = showEmptyPeriods && statusFilter === "all"
                    ? (maxPeriod <= 5 ? [1, 2, 3, 4, 5] : Array.from({ length: Math.max(10, maxPeriod) }, (_, i) => i + 1))
                    : dayEntries.map((e) => e.period);

                  return (
                    <React.Fragment key={`day-group-${dayNum}`}>
                      {/* Day Header Divider */}
                      <tr className="bg-slate-100/90 dark:bg-[#161b22] border-t-2 border-b border-[#d0d7de] dark:border-[#30363d]">
                        <td colSpan={9} className="py-2 px-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
                              <span className="text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                {DAY_NAMES[dayNum]}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                ({dayEntries[0]?.date_str})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                {dayTaughtCount}/{dayEntries.length} tiết đã dạy
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Day Lessons & Empty Periods */}
                      {dayPeriods.map((periodNum, periodIdx) => {
                        const entry = dayEntries.find((e) => e.period === periodNum);

                        if (!entry) {
                          // Render Empty Period Row
                          return (
                            <tr
                              key={`empty-${dayNum}-${periodNum}`}
                              className="bg-slate-50/25 dark:bg-[#161b22]/20 hover:bg-slate-50/70 dark:hover:bg-[#21262d]/40 transition-colors text-slate-400 group"
                            >
                              <td className="px-3 py-2 text-center border-r border-[#d0d7de] dark:border-[#30363d] text-slate-300 dark:text-slate-600 font-mono text-xs">
                                -
                              </td>
                              <td className="px-3 py-2 text-center font-normal text-slate-400 dark:text-slate-500 border-r border-[#d0d7de] dark:border-[#30363d]">
                                <span className="text-[11px]">{DAY_NAMES[dayNum]}</span>
                              </td>
                              <td className="px-2.5 py-2 text-center border-r border-[#d0d7de] dark:border-[#30363d]">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100/70 dark:bg-[#21262d]/70 text-slate-500 dark:text-slate-400 font-bold text-xs font-mono">
                                  Tiết {periodNum} {periodNum > 5 && `(T${periodNum - 5} Chiều)`}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-center border-r border-[#d0d7de] dark:border-[#30363d] text-slate-400 dark:text-slate-500 font-mono">
                                -
                              </td>
                              <td className="px-3 py-2 text-center border-r border-[#d0d7de] dark:border-[#30363d] text-slate-400 dark:text-slate-500">
                                -
                              </td>
                              <td className="px-2.5 py-2 text-center border-r border-[#d0d7de] dark:border-[#30363d] text-slate-400 dark:text-slate-500 font-mono">
                                -
                              </td>
                              <td className="px-4 py-2 border-r border-[#d0d7de] dark:border-[#30363d] text-slate-400 dark:text-slate-500 text-[11px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="italic text-slate-400/80 dark:text-slate-500/80 font-normal">
                                    (Tiết trống)
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingEntry(null);
                                      setEntryForm({
                                        teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên",
                                        day_of_week: dayNum,
                                        period: periodNum,
                                        class_name: "",
                                        subject: "Toán",
                                        ppct_lesson_number: 1,
                                        lesson_title: "",
                                        notes: "",
                                        is_taught: false,
                                      });
                                      setAddModalOpen(true);
                                    }}
                                    className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                                    title="Thêm tiết dạy vào khung giờ này"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Thêm tiết
                                  </Button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-slate-400 dark:text-slate-500 text-[11px] border-r border-[#d0d7de] dark:border-[#30363d]">
                                -
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingEntry(null);
                                    setEntryForm({
                                      teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên",
                                      day_of_week: dayNum,
                                      period: periodNum,
                                      class_name: "",
                                      subject: "Toán",
                                      ppct_lesson_number: 1,
                                      lesson_title: "",
                                      notes: "",
                                      is_taught: false,
                                    });
                                    setAddModalOpen(true);
                                  }}
                                  className="h-7 w-7 text-slate-300 dark:text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  title="Thêm tiết vào khung giờ này"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        }

                        const isTaught = !!entry.is_taught;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const lessonDate = parseDateStr(entry.date_str);
                        const isDelayed = !isTaught && lessonDate && lessonDate < today;

                        return (
                          <tr
                            key={entry.id}
                            className={`transition-colors ${
                              isTaught
                                ? "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/60"
                                : isDelayed
                                ? "bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/50"
                                : periodIdx % 2 === 1
                                ? "bg-slate-50/40 dark:bg-[#161b22]/40 hover:bg-slate-100/60"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {/* Checkbox Tick Tiết Đã Dạy */}
                            <td className="px-3 py-2.5 text-center border-r border-[#d0d7de] dark:border-[#30363d]">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={isTaught}
                                  onCheckedChange={() => handleToggleTaught(entry)}
                                  disabled={togglingId === entry.id}
                                  aria-label="Tick chọn tiết đã dạy"
                                  title={isTaught ? "Đã dạy (Click để hủy)" : "Chưa dạy (Click để tick đã dạy)"}
                                />
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-400 border-r border-[#d0d7de] dark:border-[#30363d]">
                              <span className="text-[11px]">{DAY_NAMES[entry.day_of_week]}</span>
                            </td>

                            <td className="px-2.5 py-2.5 text-center border-r border-[#d0d7de] dark:border-[#30363d]">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-slate-700 dark:text-slate-300 font-bold text-xs font-mono border border-slate-200 dark:border-slate-700">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Tiết {entry.period}</span>
                              </span>
                            </td>

                            <td className="px-2.5 py-2.5 text-center border-r border-[#d0d7de] dark:border-[#30363d]">
                              <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs">
                                {entry.class_name}
                              </span>
                            </td>

                            <td className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-[#d0d7de] dark:border-[#30363d]">
                              {entry.subject}
                            </td>

                            <td className="px-2.5 py-2.5 text-center border-r border-[#d0d7de] dark:border-[#30363d]">
                              {isChuyenDeLesson(entry.ppct_lesson_number, entry.notes, entry.lesson_title) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs shadow-2xs">
                                  <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>Tiết {formatPPCTLessonNumber(entry.ppct_lesson_number, entry.notes, entry.lesson_title)}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs">
                                  <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{entry.ppct_lesson_number ? `Tiết ${entry.ppct_lesson_number}` : "-"}</span>
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-2.5 border-r border-[#d0d7de] dark:border-[#30363d]">
                              <div className="flex items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <span
                                    className={`font-semibold leading-snug ${
                                      isTaught
                                        ? "text-emerald-900 dark:text-emerald-200"
                                        : "text-slate-900 dark:text-slate-100"
                                    }`}
                                  >
                                    {entry.lesson_title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* 2-State Toggle Button: [✓ Đã dạy] ⇄ [Chưa dạy] */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTaught(entry)}
                                    disabled={togglingId === entry.id}
                                    className={`relative inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors duration-150 cursor-pointer shadow-2xs select-none ${
                                      isTaught
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 border border-emerald-600"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-slate-700"
                                    }`}
                                    title={isTaught ? "Trạng thái: Đã dạy (Nhấn để chuyển sang Chưa dạy)" : "Trạng thái: Chưa dạy (Nhấn để chuyển sang Đã dạy)"}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isTaught ? "bg-white" : "bg-slate-400"
                                      }`}
                                    />
                                    {isTaught ? (
                                      <span className="flex items-center gap-1 font-bold">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        <span>Đã dạy</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 font-medium">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>Chưa dạy</span>
                                      </span>
                                    )}
                                  </button>

                                  {/* Badge Đã sửa (nếu có tùy chỉnh) */}
                                  {entry.is_custom && (
                                    <span
                                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300"
                                      title="Tiết này đã được tùy chỉnh nội dung"
                                    >
                                      Đã sửa
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 text-[11px] border-r border-[#d0d7de] dark:border-[#30363d] max-w-xs truncate">
                              {entry.notes || "-"}
                            </td>

                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(entry)}
                                  className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  title="Chỉnh sửa nội dung tiết"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  title="Xóa tiết"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Tổng cộng: <strong className="text-emerald-600">{entries.length}</strong> tiết báo giảng (
              <strong className="text-emerald-700">{progressStats.taught}</strong> đã dạy,{" "}
              <strong className="text-slate-600">{progressStats.pending}</strong> chưa dạy)
            </span>
            <span className="text-[11px] text-slate-400">
              💡 Bấm vào ô vuông đầu mỗi hàng để tick nhanh tiết đã dạy
            </span>
          </div>
        </div>
      ) : (
        /* View 2: Daily Cards Timeline View (Great for Mobile & Quick Reading) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {Object.keys(DAY_NAMES).map((dayKey) => {
            const dayNum = Number(dayKey);
            const dayEntries = filteredEntries.filter((e) => e.day_of_week === dayNum);
            if (dayEntries.length === 0) return null;

            const dayTaughtCount = dayEntries.filter((e) => e.is_taught).length;

            return (
              <div
                key={`card-day-${dayNum}`}
                className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs flex flex-col"
              >
                {/* Card Header */}
                <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {DAY_NAMES[dayNum]}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      {dayEntries[0]?.date_str}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white dark:bg-[#0d1117] border-emerald-300 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] px-2 py-0.5"
                  >
                    {dayTaughtCount}/{dayEntries.length} đã dạy
                  </Badge>
                </div>

                {/* Lesson Timeline Items */}
                <div className="p-3 space-y-2.5 flex-1 divide-y divide-slate-100 dark:divide-[#30363d]">
                  {(() => {
                    const maxPeriod = Math.max(...dayEntries.map((e) => e.period), 5);
                    const dayPeriods = showEmptyPeriods && statusFilter === "all"
                      ? (maxPeriod <= 5 ? [1, 2, 3, 4, 5] : Array.from({ length: Math.max(10, maxPeriod) }, (_, i) => i + 1))
                      : dayEntries.map((e) => e.period);

                    return dayPeriods.map((periodNum) => {
                      const entry = dayEntries.find((e) => e.period === periodNum);

                      if (!entry) {
                        return (
                          <div
                            key={`empty-card-${dayNum}-${periodNum}`}
                            className="pt-2.5 first:pt-0 p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-100/60 dark:bg-[#21262d]/60 font-mono text-[11px] font-medium text-slate-500">
                                Tiết {periodNum} {periodNum > 5 && `(T${periodNum - 5} Chiều)`}
                              </span>
                              <span className="italic text-[11px] text-slate-400">(Tiết trống)</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEntry(null);
                                setEntryForm({
                                  teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên",
                                  day_of_week: dayNum,
                                  period: periodNum,
                                  class_name: "",
                                  subject: "Toán",
                                  ppct_lesson_number: 1,
                                  lesson_title: "",
                                  notes: "",
                                  is_taught: false,
                                });
                                setAddModalOpen(true);
                              }}
                              className="h-6 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Thêm
                            </Button>
                          </div>
                        );
                      }

                      const isTaught = !!entry.is_taught;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const lessonDate = parseDateStr(entry.date_str);
                      const isDelayed = !isTaught && lessonDate && lessonDate < today;

                      return (
                        <div
                          key={entry.id}
                          className={`pt-2.5 first:pt-0 space-y-1.5 group p-2 rounded-lg transition-colors ${
                            isTaught
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                              : isDelayed
                              ? "bg-amber-50/30 dark:bg-amber-950/15"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isTaught}
                                onCheckedChange={() => handleToggleTaught(entry)}
                                disabled={togglingId === entry.id}
                                aria-label="Tick tiết đã dạy"
                              />
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-slate-700 dark:text-slate-300 font-bold text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Tiết TKB {entry.period}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                                {entry.class_name}
                              </span>
                              {isChuyenDeLesson(entry.ppct_lesson_number, entry.notes, entry.lesson_title) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] shadow-2xs">
                                  <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>Tiết PPCT {formatPPCTLessonNumber(entry.ppct_lesson_number, entry.notes, entry.lesson_title)}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px]">
                                  <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{entry.ppct_lesson_number ? `Tiết PPCT ${entry.ppct_lesson_number}` : "PPCT: -"}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(entry)}
                                className="h-6 w-6 text-slate-400 hover:text-emerald-600"
                                title="Sửa"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="h-6 w-6 text-slate-400 hover:text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="pl-7 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`font-semibold text-xs leading-snug ${
                                  isTaught
                                    ? "text-emerald-900 dark:text-emerald-200"
                                    : "text-slate-900 dark:text-slate-100"
                                }`}
                              >
                                {entry.lesson_title}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* 2-State Toggle Button: [✓ Đã dạy] ⇄ [Chưa dạy] */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaught(entry)}
                                  disabled={togglingId === entry.id}
                                  className={`relative inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors duration-150 cursor-pointer shadow-2xs select-none ${
                                    isTaught
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 border border-emerald-600"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-slate-700"
                                  }`}
                                  title={isTaught ? "Trạng thái: Đã dạy (Nhấn để chuyển sang Chưa dạy)" : "Trạng thái: Chưa dạy (Nhấn để chuyển sang Đã dạy)"}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isTaught ? "bg-white" : "bg-slate-400"
                                    }`}
                                  />
                                  {isTaught ? (
                                    <span className="flex items-center gap-1 font-bold">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      <span>Đã dạy</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 font-medium">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                      <span>Chưa dạy</span>
                                    </span>
                                  )}
                                </button>

                                {entry.is_custom && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                                    Đã sửa
                                  </span>
                                )}
                              </div>
                            </div>

                            {entry.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                ĐDDH: {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generation Selection Dialog (All Weeks vs Current Week) */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[560px] p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Tự Động Sinh Sổ Báo Giảng</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Hệ thống sẽ tự động đối soát ma trận Thời khóa biểu theo từng khoảng tuần áp dụng (Tuần 1-8, Tuần 9-18, v.v.) và toàn bộ Phân phối chương trình để tự động điền Tiết PPCT, Tên bài dạy và Ngày dạy chính xác.
            </p>

            {/* Option 1: Generate All 35 Weeks (Default & Highlighted) */}
            <div className="border-2 border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    KHUYÊN DÙNG
                  </span>
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs">
                    Sinh Sổ Toàn Bộ Năm Học (35 Tuần) - Tự Động Theo TKB Từng Tuần
                  </h4>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                Tự động nối tiếp bài dạy từ Tuần 1 đến Tuần 35 theo đúng TKB có hiệu lực của từng tuần. Toàn bộ ngày trong năm học được tính từ ngày bắt đầu ({semesterStartDate}). Các tiết bạn đã tick đã dạy sẽ được giữ nguyên.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <span>Số tuần cần sinh:</span>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={totalWeeksToGenerate}
                    onChange={(e) => setTotalWeeksToGenerate(Number(e.target.value) || 35)}
                    className="h-7 w-16 text-center font-bold text-xs bg-white dark:bg-[#161b22]"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleGenerateAllWeeks}
                  disabled={isGenerating}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-4 gap-1.5 shadow-sm justify-center"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  <span>Sinh toàn bộ {totalWeeksToGenerate} tuần</span>
                </Button>
              </div>
            </div>

            {/* Option 2: Generate Current Week Only */}
            <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 space-y-2 bg-slate-50/50 dark:bg-[#161b22]/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  Chỉ sinh cho Tuần {weekNumber} ({startDate})
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateCurrentWeek}
                  disabled={isGenerating}
                  className="text-xs h-7 px-3 border-[#d0d7de] w-full sm:w-auto justify-center"
                >
                  Sinh riêng Tuần {weekNumber}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Chỉ tạo lại các tiết báo giảng cho riêng tuần đang chọn trên màn hình.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateDialogOpen(false)}
              className="text-xs h-8"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Add Entry Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              {editingEntry ? <Edit2 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
              {editingEntry ? "Chỉnh Sửa Tiết Báo Giảng" : "Thêm Tiết Vào Sổ Báo Giảng"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Thứ trong tuần</label>
                <Select
                  value={String(entryForm.day_of_week)}
                  onValueChange={(val) =>
                    setEntryForm({ ...entryForm, day_of_week: Number(val) })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {DAY_NAMES[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Tiết TKB</label>
                <Select
                  value={String(entryForm.period)}
                  onValueChange={(val) =>
                    setEntryForm({ ...entryForm, period: Number(val) })
                  }
                >
                  <SelectTrigger className="h-8 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        Tiết {p} ({p <= 5 ? "Sáng" : "Chiều"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Lớp <span className="text-red-500">*</span></label>
                <Input
                  value={entryForm.class_name}
                  onChange={(e) => setEntryForm({ ...entryForm, class_name: e.target.value })}
                  placeholder="10A1"
                  className="h-8 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Môn học</label>
                <Input
                  value={entryForm.subject}
                  onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Tiết PPCT</label>
                <Input
                  type="number"
                  value={entryForm.ppct_lesson_number}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, ppct_lesson_number: Number(e.target.value) })
                  }
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">
                Tên bài dạy / Nội dung giảng dạy <span className="text-red-500">*</span>
              </label>
              <textarea
                value={entryForm.lesson_title}
                onChange={(e) => setEntryForm({ ...entryForm, lesson_title: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-[#d0d7de] dark:border-[#30363d] bg-transparent p-2.5 text-xs text-[#24292f] dark:text-[#c9d1d9] focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                placeholder="Nhập tên bài dạy..."
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Ghi chú / Thiết bị ĐDDH</label>
              <Input
                value={entryForm.notes}
                onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                placeholder="Ví dụ: Máy chiếu, bài kiểm tra 15p..."
                className="h-8 text-xs"
              />
            </div>

            {/* Checkbox Trạng thái Đã dạy trong Modal */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="modal-is-taught"
                checked={entryForm.is_taught}
                onCheckedChange={(checked) =>
                  setEntryForm({ ...entryForm, is_taught: !!checked })
                }
              />
              <label
                htmlFor="modal-is-taught"
                className="text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
              >
                Đã hoàn thành giảng dạy tiết này
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddModalOpen(false)}
              className="text-xs h-8"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEntry}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editingEntry ? "Lưu thay đổi" : "Thêm vào sổ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
