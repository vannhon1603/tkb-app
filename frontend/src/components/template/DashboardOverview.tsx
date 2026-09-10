"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  TrendingUp,
  Users,
  ClipboardCheck,
  Award,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { formatDateVi, getTodayDateString, DAY_NAMES } from "@/lib/curriculumData";
import { toast } from "react-hot-toast";

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
}

export function DashboardOverview({ onNavigateTab }: DashboardProps) {
  const [stats, setStats] = useState({
    totalPpct: 0,
    totalTkbSlots: 0,
    totalSoBaoGiang: 0,
    isGeminiReady: false,
    teachersCount: 0,
    classesCount: 0,
    totalStudents: 0,
    pendingTasks: 0,
  });
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [ppctProgress, setPpctProgress] = useState<{ grade: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      const todayDayOfWeek = new Date().getDay() === 0 ? 8 : new Date().getDay() + 1; // 2..8

      const [ppctStats, tkbStats, geminiStatus, sbgList, students, tasks, tkbSlots] = await Promise.all([
        apiClient<{ total: number; grades?: { grade: string; count: number }[] }>("/api/ppct/stats").catch(() => ({ total: 0, grades: [] })),
        apiClient<{ total_slots: number; total_teachers: number; total_classes: number }>(
          "/api/tkb/stats"
        ).catch(() => ({ total_slots: 0, total_teachers: 0, total_classes: 0 })),
        apiClient<{ configured: boolean }>("/api/gemini/status").catch(() => ({ configured: false })),
        apiClient<any[]>("/api/so-bao-giang").catch(() => []),
        apiClient<any[]>("/api/students").catch(() => []),
        apiClient<any[]>("/api/tasks?completed=false").catch(() => []),
        apiClient<any[]>("/api/tkb").catch(() => []),
      ]);

      setStats({
        totalPpct: ppctStats.total || 0,
        totalTkbSlots: tkbStats.total_slots || 0,
        totalSoBaoGiang: sbgList.length || 0,
        isGeminiReady: geminiStatus.configured || !!localStorage.getItem("custom_gemini_key"),
        teachersCount: tkbStats.total_teachers || 0,
        classesCount: tkbStats.total_classes || 0,
        totalStudents: students.length || 0,
        pendingTasks: tasks.length || 0,
      });

      setPpctProgress(ppctStats.grades || []);

      // Filter slots for today (Mon=2..Sun=8)
      const todayTkb = tkbSlots
        .filter((t: any) => t.day_of_week === todayDayOfWeek)
        .sort((a: any, b: any) => a.period - b.period);
      setTodaySlots(todayTkb);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await apiClient<{ message: string }>("/api/settings/seed-demo", {
        method: "POST",
      });
      toast.success(res.message);
      loadDashboardStats();
    } catch (e: any) {
      toast.error(e?.message || "Không thể nạp dữ liệu mẫu");
    } finally {
      setIsSeeding(false);
    }
  };

  const dayOfWeekNum = new Date().getDay() === 0 ? 8 : new Date().getDay() + 1;
  const todayLabel = DAY_NAMES[dayOfWeekNum] || "Hôm nay";

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold border border-white/30 text-white shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Hệ Thống Quản Lý Giảng Dạy & Thời Khóa Biểu PRO 2026</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Sổ Báo Giảng & Trợ Lý Giáo Viên Thông Minh
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed">
              Giải pháp toàn diện tự động ghép bài giảng PPCT với TKB, quản lý điểm danh, sổ thi đua học sinh, kế hoạch công việc và xuất báo cáo chuẩn Bộ GD&ĐT chỉ với 1 click.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Button
              onClick={() => onNavigateTab("so-bao-giang")}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs h-9 px-4 shadow-md gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Mở Sổ Báo Giảng Ngay
            </Button>

            <Button
              variant="outline"
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs h-9 px-4 gap-2"
            >
              {isSeeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              Nạp Dữ Liệu Mẫu Thử Nghiệm
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (6 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onNavigateTab("ppct")}
          className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 shadow-2xs hover:border-emerald-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">PPCT</span>
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xl font-black text-slate-800 dark:text-slate-100">
            {stats.totalPpct} <span className="text-xs font-normal text-slate-400">tiết</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("tkb")}
          className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 shadow-2xs hover:border-blue-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">TKB Tuần</span>
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1.5 text-xl font-black text-slate-800 dark:text-slate-100">
            {stats.totalTkbSlots} <span className="text-xs font-normal text-slate-400">tiết</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("students")}
          className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 shadow-2xs hover:border-cyan-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Học Sinh</span>
            <Users className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="mt-1.5 text-xl font-black text-slate-800 dark:text-slate-100">
            {stats.totalStudents} <span className="text-xs font-normal text-slate-400">em</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("tasks")}
          className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 shadow-2xs hover:border-purple-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Việc Cần Làm</span>
            <ListTodo className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1.5 text-xl font-black text-slate-800 dark:text-slate-100">
            {stats.pendingTasks} <span className="text-xs font-normal text-slate-400">việc</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("so-bao-giang")}
          className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 shadow-2xs hover:border-amber-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Sổ Báo Giảng</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 text-xl font-black text-slate-800 dark:text-slate-100">
            {stats.totalSoBaoGiang} <span className="text-xs font-normal text-slate-400">dòng</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("settings")}
          className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3.5 shadow-2xs hover:border-emerald-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">AI Gemini</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xs font-bold text-emerald-600 flex items-center gap-1">
            {stats.isGeminiReady ? "✓ Sẵn sàng" : "Chưa cấu hình"}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Today's Schedule & Quick Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col (7): Today's Teaching Schedule */}
        <div className="lg:col-span-7 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#d0d7de] dark:border-[#30363d] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Lịch Dạy Hôm Nay ({todayLabel} - {formatDateVi(getTodayDateString())})
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
              {todaySlots.length} tiết dạy
            </Badge>
          </div>

          {todaySlots.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <p className="text-xs">Hôm nay ({todayLabel}) bạn không có tiết dạy theo Thời khóa biểu.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab("tkb")}
                className="text-xs h-7 text-emerald-700 border-emerald-300"
              >
                Xem toàn bộ Thời khóa biểu tuần
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#d0d7de] dark:border-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      T{slot.period}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Lớp {slot.class_name} — Môn {slot.subject}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {slot.session || "Sáng"} • {slot.room ? `Phòng ${slot.room}` : "Lớp học chính"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateTab("attendance")}
                    className="h-7 text-[11px] text-blue-600 hover:bg-blue-50"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                    Điểm danh
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col (5): Quick Modules Navigation */}
        <div className="lg:col-span-5 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 space-y-3.5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#d0d7de] dark:border-[#30363d] pb-2.5 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Các Phân Hệ Nghiệp Vụ Chính
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab("students")}
              className="w-full p-2.5 rounded-lg border border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-cyan-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Quản Lý Học Sinh</p>
                  <p className="text-[10px] text-slate-400">Danh sách lớp, dán từ Excel (Ctrl+V)</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("attendance")}
              className="w-full p-2.5 rounded-lg border border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Sổ Điểm Danh Lớp</p>
                  <p className="text-[10px] text-slate-400">Điểm danh theo ngày & theo tiết</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("bonus-points")}
              className="w-full p-2.5 rounded-lg border border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Thi Đua & Điểm Thưởng</p>
                  <p className="text-[10px] text-slate-400">Chấm điểm nhanh (+1, -1) & Bảng vinh danh</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("tasks")}
              className="w-full p-2.5 rounded-lg border border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ListTodo className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Công Việc & Kế Hoạch</p>
                  <p className="text-[10px] text-slate-400">Soạn bài, nộp sổ sách, đặt deadline</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

