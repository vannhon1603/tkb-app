"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Award,
  PlusCircle,
  MinusCircle,
  Trophy,
  History,
  Trash2,
  Sparkles,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
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
}

interface BonusPointRecord {
  id: number;
  student_id: number;
  class_name: string;
  points: number;
  date: string;
  reason: string;
}

interface LeaderboardItem {
  student_id: number;
  student_name: string;
  class_name: string;
  total_points: number;
  positive_count: number;
  negative_count: number;
}

export function BonusPointsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<BonusPointRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("10A1");
  const [activeSubTab, setActiveSubTab] = useState<"fast" | "leaderboard" | "history">("fast");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes, recRes, leadRes] = await Promise.all([
        apiClient<Student[]>("/api/students"),
        apiClient<BonusPointRecord[]>("/api/bonus-points", {
          params: { class_name: selectedClass },
        }),
        apiClient<LeaderboardItem[]>("/api/bonus-points/leaderboard", {
          params: { class_name: selectedClass },
        }),
      ]);
      setStudents(stuRes);
      setRecords(recRes);
      setLeaderboard(leadRes);
    } catch (e) {
      console.error("Failed to load bonus points", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const classList = useMemo(() => {
    const defaultClasses = ["10A1", "10A2", "11B1", "12C1"];
    const fromStudents = Array.from(new Set(students.map((s) => s.class_name)));
    return Array.from(new Set([...defaultClasses, ...fromStudents])).sort();
  }, [students]);

  const classStudents = useMemo(() => {
    return students.filter((s) => s.class_name === selectedClass);
  }, [students, selectedClass]);

  const handleAddPoint = async (student: Student, delta: number) => {
    const reason = delta > 0 ? "Phát biểu tốt / Trả lời đúng" : "Chưa thuộc bài / Vi phạm";
    try {
      await apiClient("/api/bonus-points", {
        method: "POST",
        body: JSON.stringify({
          student_id: student.id,
          class_name: student.class_name,
          points: delta,
          date: getTodayDateString(),
          reason,
        }),
      });
      toast.success(
        delta > 0
          ? `+${delta} điểm cho ${student.name}!`
          : `${delta} điểm đối với ${student.name}!`
      );
      loadData();
    } catch (e) {
      toast.error("Lỗi khi chấm điểm");
    }
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      await apiClient(`/api/bonus-points/${id}`, { method: "DELETE" });
      toast.success("Đã xóa bản ghi điểm");
      loadData();
    } catch (e) {
      toast.error("Lỗi khi xóa");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
              Sổ Theo Dõi Thi Đua & Điểm Thưởng Học Sinh
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                {classStudents.length} Học sinh
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Khích lệ học sinh phát biểu, làm bài tốt (+1, +2) hoặc nhắc nhở (-1) theo thời gian thực
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-[#0d1117] p-1 rounded-lg border border-slate-200 dark:border-[#30363d]">
          <button
            type="button"
            onClick={() => setActiveSubTab("fast")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "fast"
                ? "bg-white dark:bg-[#21262d] text-emerald-600 dark:text-emerald-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Chấm nhanh
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("leaderboard")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "leaderboard"
                ? "bg-white dark:bg-[#21262d] text-amber-600 dark:text-amber-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Bảng vinh danh
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "history"
                ? "bg-white dark:bg-[#21262d] text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử ({records.length})
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3.5 rounded-xl flex items-center gap-2">
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
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Lớp {cls}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Fast Grading View */}
      {activeSubTab === "fast" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classStudents.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl text-slate-400">
              Chưa có học sinh nào trong lớp <b>{selectedClass}</b>. Chuyển qua tab <b>Học Sinh</b> để thêm danh sách lớp!
            </div>
          ) : (
            classStudents.map((student) => {
              const studentPoints = records
                .filter((r) => r.student_id === student.id)
                .reduce((acc, curr) => acc + curr.points, 0);

              return (
                <div
                  key={student.id}
                  className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3.5 rounded-xl shadow-2xs flex items-center justify-between gap-3 hover:border-amber-400 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {student.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">Lớp {student.class_name}</span>
                      <span
                        className={`text-xs font-mono font-extrabold ${
                          studentPoints > 0
                            ? "text-emerald-600"
                            : studentPoints < 0
                            ? "text-red-500"
                            : "text-slate-400"
                        }`}
                      >
                        {studentPoints > 0 ? `+${studentPoints}` : studentPoints} điểm
                      </span>
                    </div>
                  </div>

                  {/* Grading Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAddPoint(student, 1)}
                      className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      title="Cộng 1 điểm"
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddPoint(student, 2)}
                      className="h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                      title="Cộng 2 điểm xuất sắc"
                    >
                      +2
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPoint(student, -1)}
                      className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 font-bold"
                      title="Trừ 1 điểm"
                    >
                      -1
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Leaderboard View */}
      {activeSubTab === "leaderboard" && (
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Bảng Vinh Danh Học Sinh Tích Cực (Lớp {selectedClass})
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Cập nhật thời gian thực</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3.5 w-16 text-center">Hạng</th>
                  <th className="py-2.5 px-3.5">Học Sinh</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Lớp</th>
                  <th className="py-2.5 px-3.5 w-28 text-center text-emerald-600">Lượt khen (+)</th>
                  <th className="py-2.5 px-3.5 w-28 text-center text-red-500">Lượt phạt (-)</th>
                  <th className="py-2.5 px-3.5 w-28 text-right font-bold">Tổng Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Chưa có dữ liệu thi đua cho lớp {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((item, idx) => (
                    <tr
                      key={item.student_id}
                      className={`hover:bg-slate-50 dark:hover:bg-[#21262d]/50 transition-colors ${
                        idx === 0 ? "bg-amber-50/40 dark:bg-amber-950/20 font-bold" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white font-bold text-xs shadow-2xs">
                            🥇
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-xs">
                            🥈
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/60 text-white font-bold text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {item.student_name}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                        {item.class_name}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-emerald-600 font-semibold">
                        +{item.positive_count}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-red-500 font-semibold">
                        -{item.negative_count}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        <span
                          className={
                            item.total_points > 0
                              ? "text-emerald-600"
                              : item.total_points < 0
                              ? "text-red-500"
                              : "text-slate-400"
                          }
                        >
                          {item.total_points > 0 ? `+${item.total_points}` : item.total_points}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. History View */}
      {activeSubTab === "history" && (
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3.5 w-28">Ngày</th>
                  <th className="py-2.5 px-3.5">Học Sinh</th>
                  <th className="py-2.5 px-3.5 w-20 text-center">Lớp</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Điểm</th>
                  <th className="py-2.5 px-3.5">Lý Do / Nhận Xét</th>
                  <th className="py-2.5 px-3.5 w-16 text-right">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Chưa có nhật ký chấm điểm nào trong lớp {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const student = students.find((s) => s.id === r.student_id);
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#21262d]/50 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 font-mono text-slate-500">
                          {formatDateVi(r.date)}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {student?.name || `ID #${r.student_id}`}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                          {r.class_name}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold">
                          <span
                            className={
                              r.points > 0
                                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded"
                                : "text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded"
                            }
                          >
                            {r.points > 0 ? `+${r.points}` : r.points}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                          {r.reason}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteRecord(r.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
