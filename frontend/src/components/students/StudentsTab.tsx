"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  Search,
  School,
  GraduationCap,
  Sparkles,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";

interface Student {
  id: number;
  class_name: string;
  name: string;
  gender: string;
  notes?: string;
  created_at?: string;
}

export function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [singleName, setSingleName] = useState("");
  const [singleClass, setSingleClass] = useState("10A1");
  const [singleGender, setSingleGender] = useState("Nam");
  const [bulkClass, setBulkClass] = useState("10A1");
  const [bulkText, setBulkText] = useState("");

  const sampleClasses = ["10A1", "10A2", "10A3", "11B1", "11B2", "12C1"];

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await apiClient<Student[]>("/api/students");
      setStudents(data);
    } catch (e: any) {
      console.error("Failed to load students", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const classList = useMemo(() => {
    const fromStudents = Array.from(new Set(students.map((s) => s.class_name)));
    const merged = Array.from(new Set([...sampleClasses, ...fromStudents]));
    return merged.sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === "ALL" || s.class_name === selectedClass;
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.class_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim() || !singleClass.trim()) {
      toast.error("Vui lòng nhập tên học sinh và lớp!");
      return;
    }

    try {
      await apiClient("/api/students", {
        method: "POST",
        body: JSON.stringify({
          name: singleName.trim(),
          class_name: singleClass.trim(),
          gender: singleGender,
        }),
      });
      toast.success(`Đã thêm học sinh ${singleName} vào lớp ${singleClass}!`);
      setSingleName("");
      setIsAddOpen(false);
      loadStudents();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi thêm học sinh");
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0 || !bulkClass.trim()) {
      toast.error("Vui lòng dán danh sách tên học sinh!");
      return;
    }

    try {
      const res = await apiClient<Student[]>("/api/students/bulk", {
        method: "POST",
        body: JSON.stringify({
          class_name: bulkClass.trim(),
          names,
        }),
      });
      toast.success(`Đã nạp nhanh ${res.length} học sinh vào lớp ${bulkClass}!`);
      setBulkText("");
      setIsBulkOpen(false);
      loadStudents();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi nạp danh sách học sinh");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa học sinh "${name}"?`)) return;
    try {
      await apiClient(`/api/students/${id}`, { method: "DELETE" });
      toast.success("Đã xóa học sinh!");
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      toast.error("Lỗi khi xóa");
    }
  };

  const handleSeedSampleStudents = async () => {
    const sample10A1 = [
      "Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Cường", "Phạm Thu Dung",
      "Vũ Hải Đăng", "Đặng Thùy Dương", "Bùi Quốc Hưng", "Hoàng Mai Hương",
      "Ngô Gia Khánh", "Đỗ Minh Khang", "Trịnh Thúy Kiều", "Hồ Nhật Nam"
    ];
    const sample11B1 = [
      "Phan Đình Phùng", "Đinh Tiên Hoàng", "Lý Thái Tổ", "Trần Hưng Đạo",
      "Võ Nguyên Giáp", "Nguyễn Huệ", "Lê Lợi", "Nguyễn Trãi"
    ];

    try {
      await apiClient("/api/students/bulk", {
        method: "POST",
        body: JSON.stringify({ class_name: "10A1", names: sample10A1 }),
      });
      await apiClient("/api/students/bulk", {
        method: "POST",
        body: JSON.stringify({ class_name: "11B1", names: sample11B1 }),
      });
      toast.success("Đã nạp bộ danh sách học sinh mẫu (10A1 & 11B1)!");
      loadStudents();
    } catch (e) {
      toast.error("Lỗi khi nạp mẫu");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
              Quản Lý Danh Sách Học Sinh & Lớp Học
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                {students.length} Học sinh
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quản lý sĩ số theo từng lớp, nạp danh sách trực tiếp hoặc dán nhanh từ Excel/Word
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {students.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeedSampleStudents}
              className="text-xs h-8 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Nạp mẫu học sinh
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkOpen(true)}
            className="text-xs h-8 border-[#d0d7de] dark:border-[#30363d]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Dán từ Excel (Ctrl+V)
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            Thêm học sinh
          </Button>
        </div>
      </div>

      {/* Filter bar & Class pills */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3.5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Class Select Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedClass("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedClass === "ALL"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Tất cả các lớp ({students.length})
            </button>
            {classList.map((cls) => {
              const count = students.filter((s) => s.class_name === cls).length;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedClass === cls
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Lớp {cls} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên học sinh, lớp..."
              className="h-8 pl-8 text-xs bg-slate-50 dark:bg-[#0d1117]"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                <th className="py-2.5 px-3.5">Họ và Tên</th>
                <th className="py-2.5 px-3.5 w-28 text-center">Lớp</th>
                <th className="py-2.5 px-3.5 w-24 text-center">Giới tính</th>
                <th className="py-2.5 px-3.5">Ghi chú</th>
                <th className="py-2.5 px-3.5 w-20 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Đang tải danh sách học sinh...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chưa có học sinh nào phù hợp với bộ lọc. Hãy nhấn <b>Thêm học sinh</b> hoặc <b>Dán từ Excel</b>.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
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
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {student.class_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center text-slate-600 dark:text-slate-400">
                      {student.gender || "Nam"}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                      {student.notes || "—"}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(student.id, student.name)}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Xóa học sinh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Single Student */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Thêm Mới Học Sinh
            </h3>

            <form onSubmit={handleAddSingle} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Họ và tên học sinh *
                </label>
                <Input
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Lớp học *
                  </label>
                  <Input
                    value={singleClass}
                    onChange={(e) => setSingleClass(e.target.value)}
                    placeholder="10A1"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Giới tính
                  </label>
                  <select
                    value={singleGender}
                    onChange={(e) => setSingleGender(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] px-2.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="h-8 text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Lưu học sinh
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Add From Excel */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Nạp Nhanh Danh Sách Học Sinh Từ Excel / Word
            </h3>
            <p className="text-[11px] text-slate-500">
              Copy cột danh sách tên học sinh từ Excel hoặc Word và dán vào ô bên dưới (mỗi dòng 1 tên học sinh).
            </p>

            <form onSubmit={handleBulkAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Chọn hoặc Nhập tên Lớp áp dụng *
                </label>
                <Input
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  placeholder="10A1"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Danh sách tên học sinh (mỗi dòng 1 học sinh) *
                </label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;Lê Văn C&#10;Phạm Hoàng D..."
                  className="w-full text-xs font-sans rounded-lg border border-[#d0d7de] dark:border-[#30363d] bg-slate-50 dark:bg-[#0d1117] p-3 text-slate-800 dark:text-slate-200 focus:outline-emerald-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkOpen(false)}
                  className="h-8 text-xs"
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Xác nhận Nạp Học Sinh
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
