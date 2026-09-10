"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  UserX,
  Users,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { getTodayDateString, formatDateVi } from "@/lib/curriculumData";
import toast from "react-hot-toast";

interface Student {
  id: number;
  class_name: string;
  name: string;
  gender: string;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  class_name: string;
  date: string;
  status: "present" | "excused" | "unexcused" | "late" | string;
  notes?: string;
}

export function AttendanceTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("10A1");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        apiClient<Student[]>("/api/students"),
        apiClient<AttendanceRecord[]>("/api/attendance", {
          params: { date: selectedDate },
        }),
      ]);
      setStudents(stuRes);
      setAttendanceList(attRes);
    } catch (e) {
      console.error("Failed to load attendance", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const classList = useMemo(() => {
    const defaultClasses = ["10A1", "10A2", "11B1", "12C1"];
    const fromStudents = Array.from(new Set(students.map((s) => s.class_name)));
    return Array.from(new Set([...defaultClasses, ...fromStudents])).sort();
  }, [students]);

  const classStudents = useMemo(() => {
    return students.filter((s) => s.class_name === selectedClass);
  }, [students, selectedClass]);

  const handleSetStatus = async (
    studentId: number,
    status: "present" | "excused" | "unexcused" | "late"
  ) => {
    try {
      await apiClient("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          class_name: selectedClass,
          date: selectedDate,
          status,
        }),
      });

      setAttendanceList((prev) => {
        const filtered = prev.filter(
          (a) => !(a.student_id === studentId && a.date === selectedDate)
        );
        return [
          ...filtered,
          {
            id: Date.now(),
            student_id: studentId,
            class_name: selectedClass,
            date: selectedDate,
            status,
          },
        ];
      });
    } catch (e: any) {
      toast.error("Lỗi khi cập nhật điểm danh");
    }
  };

  const handleMarkAllPresent = async () => {
    if (classStudents.length === 0) return;
    try {
      for (const s of classStudents) {
        await apiClient("/api/attendance", {
          method: "POST",
          body: JSON.stringify({
            student_id: s.id,
            class_name: selectedClass,
            date: selectedDate,
            status: "present",
          }),
        });
      }
      toast.success(`Đã điểm danh CÓ MẶT cả lớp ${selectedClass}!`);
      loadData();
    } catch (e) {
      toast.error("Lỗi khi điểm danh cả lớp");
    }
  };

  const stats = useMemo(() => {
    let present = 0,
      excused = 0,
      unexcused = 0,
      late = 0;
    classStudents.forEach((s) => {
      const rec = attendanceList.find(
        (a) => a.student_id === s.id && a.date === selectedDate
      );
      const st = rec ? rec.status : "present";
      if (st === "present") present++;
      else if (st === "excused") excused++;
      else if (st === "unexcused") unexcused++;
      else if (st === "late") late++;
    });
    return { present, excused, unexcused, late, total: classStudents.length };
  }, [classStudents, attendanceList, selectedDate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
              Sổ Điểm Danh Học Sinh Theo Ngày
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                {formatDateVi(selectedDate)}
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Điểm danh nhanh theo từng lớp: Có mặt, Vắng có phép (P), Vắng không phép (K), Đi muộn (M)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleMarkAllPresent}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Có mặt cả lớp
          </Button>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-xl space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Class Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              Chọn Lớp:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              {classList.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedClass === cls
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Lớp {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              Ngày:
            </span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-xs w-36 bg-slate-50 dark:bg-[#0d1117] font-mono"
            />
          </div>
        </div>

        {/* Quick Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              ✓ Có mặt:
            </span>
            <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {stats.present} / {stats.total}
            </span>
          </div>

          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              P (Có phép):
            </span>
            <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
              {stats.excused}
            </span>
          </div>

          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-center justify-between">
            <span className="text-xs font-semibold text-red-800 dark:text-red-300">
              K (Không phép):
            </span>
            <span className="text-sm font-bold font-mono text-red-700 dark:text-red-400">
              {stats.unexcused}
            </span>
          </div>

          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
              M (Đi muộn):
            </span>
            <span className="text-sm font-bold font-mono text-purple-700 dark:text-purple-400">
              {stats.late}
            </span>
          </div>
        </div>
      </div>

      {/* Attendance Grid / Table */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                <th className="py-2.5 px-3.5">Họ và Tên Học Sinh</th>
                <th className="py-2.5 px-3.5 w-24 text-center">Lớp</th>
                <th className="py-2.5 px-3.5 text-center w-64">Trạng Thái Điểm Danh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải dữ liệu điểm danh...
                  </td>
                </tr>
              ) : classStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Chưa có học sinh nào trong lớp <b>{selectedClass}</b>. Chuyển qua tab <b>Học Sinh</b> để thêm danh sách lớp!
                  </td>
                </tr>
              ) : (
                classStudents.map((student, idx) => {
                  const record = attendanceList.find(
                    (a) => a.student_id === student.id && a.date === selectedDate
                  );
                  const currentStatus = record ? record.status : "present";

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50 dark:hover:bg-[#21262d]/50 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {student.name}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {student.class_name}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 text-center">
                        <div className="inline-flex items-center bg-slate-100 dark:bg-[#0d1117] p-1 rounded-lg gap-1 border border-slate-200 dark:border-[#30363d]">
                          {/* Present button */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "present")}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                              currentStatus === "present"
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
                            }`}
                          >
                            Có mặt
                          </button>

                          {/* Excused button */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "excused")}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                              currentStatus === "excused"
                                ? "bg-amber-500 text-white shadow-2xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-amber-600"
                            }`}
                          >
                            P (Phép)
                          </button>

                          {/* Unexcused button */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "unexcused")}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                              currentStatus === "unexcused"
                                ? "bg-red-600 text-white shadow-2xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-red-600"
                            }`}
                          >
                            K (K.Phép)
                          </button>

                          {/* Late button */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.id, "late")}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                              currentStatus === "late"
                                ? "bg-purple-600 text-white shadow-2xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
                            }`}
                          >
                            M (Muộn)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
