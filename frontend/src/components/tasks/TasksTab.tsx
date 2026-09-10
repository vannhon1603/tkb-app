"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
  ListTodo,
  Tag,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { formatDateVi, getTodayDateString } from "@/lib/curriculumData";
import toast from "react-hot-toast";

interface Task {
  id: number;
  title: string;
  due_date?: string;
  priority: string;
  completed: boolean;
  created_at?: string;
}

export function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Add task inputs
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("Trung bình");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await apiClient<Task[]>("/api/tasks");
      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await apiClient("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          due_date: newDueDate || null,
          priority: newPriority,
          completed: false,
        }),
      });
      toast.success("Đã thêm công việc mới!");
      setNewTitle("");
      setNewDueDate("");
      loadTasks();
    } catch (e: any) {
      toast.error("Lỗi khi thêm công việc");
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await apiClient(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          completed: !task.completed,
        }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
      toast.success(task.completed ? "Đã mở lại công việc" : "Đã hoàn thành công việc! 🎉");
    } catch (e) {
      toast.error("Lỗi khi cập nhật");
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await apiClient(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Đã xóa công việc");
    } catch (e) {
      toast.error("Lỗi khi xóa");
    }
  };

  const handleSeedSampleTasks = async () => {
    const samples = [
      { title: "Soạn kế hoạch bài dạy (Giáo án) Tuần 2", priority: "Cao", due_date: getTodayDateString() },
      { title: "Nộp phiếu điểm danh và sổ theo dõi thi đua tháng 9", priority: "Trung bình", due_date: getTodayDateString() },
      { title: "Dự giờ đồng nghiệp tiết 3 Thứ Năm (10A2)", priority: "Trung bình", due_date: "" },
      { title: "Ra đề kiểm tra 15 phút chương Mệnh đề & Tập hợp", priority: "Cao", due_date: "" },
      { title: "Họp tổ bộ môn Toán triển khai chuyên đề mới", priority: "Thấp", due_date: "" },
    ];

    try {
      for (const s of samples) {
        await apiClient("/api/tasks", { method: "POST", body: JSON.stringify(s) });
      }
      toast.success("Đã nạp bộ công việc mẫu!");
      loadTasks();
    } catch (e) {
      toast.error("Lỗi nạp mẫu");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "active") return !t.completed;
      if (filter === "completed") return t.completed;
      return true;
    });
  }, [tasks, filter]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
              Kế Hoạch & Công Việc Giáo Viên (To-Do List)
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                {activeCount} Việc cần làm
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quản lý danh sách soạn giáo án, nộp sổ sách, ra đề kiểm tra, dự giờ và hạn chót
            </p>
          </div>
        </div>

        {tasks.length === 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeedSampleTasks}
            className="text-xs h-8 border-[#d0d7de] dark:border-[#30363d] text-purple-700 dark:text-purple-400 hover:bg-purple-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Nạp mẫu công việc
          </Button>
        )}
      </div>

      {/* Add Task Input Form */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-xl shadow-2xs">
        <form onSubmit={handleCreateTask} className="flex flex-col sm:flex-row items-center gap-2.5">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nhập tên công việc mới (Ví dụ: Soạn giáo án bài 2, Nộp đề kiểm tra...)"
            className="h-9 text-xs flex-1 bg-slate-50 dark:bg-[#0d1117]"
            required
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-9 text-xs w-36 bg-slate-50 dark:bg-[#0d1117] font-mono"
              title="Hạn chót hoàn thành"
            />

            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="h-9 text-xs rounded-md border border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] px-2.5 text-slate-800 dark:text-slate-200 shrink-0"
            >
              <option value="Cao">🔴 Ưu tiên Cao</option>
              <option value="Trung bình">🟡 Trung bình</option>
              <option value="Thấp">🟢 Thấp</option>
            </select>

            <Button
              type="submit"
              size="sm"
              className="h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shrink-0 gap-1"
            >
              <Plus className="w-4 h-4" />
              Thêm việc
            </Button>
          </div>
        </form>
      </div>

      {/* Task Filters and List */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs">
        {/* Filter Tabs */}
        <div className="p-3 bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Tất cả ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === "active"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Chưa làm ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("completed")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === "completed"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Đã xong ({completedCount})
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            {completedCount} / {tasks.length} việc đã xong ({tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%)
          </span>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
          {loading ? (
            <div className="py-8 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
              Đang tải danh sách công việc...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Không có công việc nào trong danh mục này.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#21262d]/50 transition-colors ${
                  task.completed ? "opacity-60 bg-slate-50/50 dark:bg-black/10" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold text-slate-800 dark:text-slate-200 truncate ${
                        task.completed ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.due_date && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Hạn: {formatDateVi(task.due_date)}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          task.priority === "Cao"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900"
                            : task.priority === "Thấp"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteTask(task.id)}
                  className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
