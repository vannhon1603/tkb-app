"use client";

import { useState } from "react";
import {
  Save,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
  Clock,
  FileText,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";

export function FormEditorTab() {
  const [formData, setFormData] = useState({
    title: "Kế hoạch xếp lịch giảng dạy Học kỳ 1",
    code: "SCH-2026-01",
    semester: "Học kỳ 1 (2026-2027)",
    grade: "Khối 10",
    totalSlots: 35,
    autoOptimize: true,
    allowOverlap: false,
    notifyTeachers: true,
    description: "Kế hoạch phân bổ phòng học và số tiết cho giáo viên bộ môn Toán, Lý, Hóa theo khung chuẩn chương trình mới.",
  });

  const handleReset = () => {
    setFormData({
      title: "",
      code: "",
      semester: "Học kỳ 1 (2026-2027)",
      grade: "Khối 10",
      totalSlots: 30,
      autoOptimize: true,
      allowOverlap: false,
      notifyTeachers: true,
      description: "",
    });
    toast.success("Đã hoàn tác dữ liệu biểu mẫu!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Vui lòng điền tiêu đề kế hoạch!");
      return;
    }
    toast.success("Đã lưu thông tin cấu hình thành công!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">
            Biên Tập & Cấu Hình Biểu Mẫu
          </h2>
          <p className="text-[11px] text-slate-500">
            Điền các tham số thiết lập cho thuật toán hoặc quy trình nghiệp vụ mới
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs h-8 gap-1.5 border-[#d0d7de] dark:border-[#30363d]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Làm mới
          </Button>
          <Button
            type="submit"
            size="sm"
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu cấu hình
          </Button>
        </div>
      </div>

      {/* Form sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#d0d7de] dark:border-[#30363d] pb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Thông tin cơ bản
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Tiêu đề biểu mẫu / Kế hoạch <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Kế hoạch phân bổ tuần 1..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Mã kế hoạch
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Học kỳ áp dụng
                  </label>
                  <Select
                    value={formData.semester}
                    onValueChange={(val) => setFormData({ ...formData, semester: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Học kỳ 1 (2026-2027)">Học kỳ 1 (2026-2027)</SelectItem>
                      <SelectItem value="Học kỳ 2 (2026-2027)">Học kỳ 2 (2026-2027)</SelectItem>
                      <SelectItem value="Học kỳ Hè 2026">Học kỳ Hè 2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Mô tả chi tiết / Ghi chú
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-[#d0d7de] dark:border-[#30363d] bg-transparent p-2.5 text-xs text-[#24292f] dark:text-[#c9d1d9] focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side Parameters & Switches */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#d0d7de] dark:border-[#30363d] pb-2 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
              Tham số xử lý
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Số tiết tối đa / tuần
                </label>
                <Input
                  type="number"
                  value={formData.totalSlots}
                  onChange={(e) => setFormData({ ...formData, totalSlots: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Tối ưu hóa tự động</p>
                    <p className="text-[10px] text-slate-400">Sử dụng thuật toán xếp lịch AI</p>
                  </div>
                  <Switch
                    checked={formData.autoOptimize}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoOptimize: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Cho phép trùng phòng</p>
                    <p className="text-[10px] text-slate-400">Chỉ áp dụng với tiết ghép</p>
                  </div>
                  <Switch
                    checked={formData.allowOverlap}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowOverlap: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Gửi thông báo Email</p>
                    <p className="text-[10px] text-slate-400">Báo ngay khi có thay đổi</p>
                  </div>
                  <Switch
                    checked={formData.notifyTeachers}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyTeachers: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
