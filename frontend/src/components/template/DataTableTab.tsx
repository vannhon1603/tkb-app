"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Download,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";

interface ItemRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  priority: "Cao" | "Trung bình" | "Thấp";
  status: "Hoạt động" | "Chờ xử lý" | "Tạm ngưng";
  updatedAt: string;
}

const INITIAL_DATA: ItemRecord[] = [
  { id: "1", code: "TKB-01", name: "Thời khóa biểu Khối 10 - Học kỳ 1", category: "Khối 10", priority: "Cao", status: "Hoạt động", updatedAt: "2026-09-08 14:30" },
  { id: "2", code: "TKB-02", name: "Thời khóa biểu Khối 11 - Học kỳ 1", category: "Khối 11", priority: "Cao", status: "Hoạt động", updatedAt: "2026-09-08 15:10" },
  { id: "3", code: "TKB-03", name: "Thời khóa biểu Khối 12 - Luyện thi", category: "Khối 12", priority: "Cao", status: "Hoạt động", updatedAt: "2026-09-07 10:00" },
  { id: "4", code: "TKB-04", name: "Lịch phòng thực hành Tin học", category: "Phòng máy", priority: "Trung bình", status: "Chờ xử lý", updatedAt: "2026-09-06 09:20" },
  { id: "5", code: "TKB-05", name: "Lịch thi giữa kỳ các bộ môn Tự nhiên", category: "Khảo thí", priority: "Cao", status: "Chờ xử lý", updatedAt: "2026-09-05 16:45" },
  { id: "6", code: "TKB-06", name: "Phân công tiết dạy giáo viên thỉnh giảng", category: "Nhân sự", priority: "Thấp", status: "Tạm ngưng", updatedAt: "2026-09-04 11:30" },
  { id: "7", code: "TKB-07", name: "Kế hoạch dạy bồi dưỡng học sinh giỏi", category: "Chuyên môn", priority: "Trung bình", status: "Hoạt động", updatedAt: "2026-09-03 08:15" },
];

export function DataTableTab() {
  const [items, setItems] = useState<ItemRecord[]>(INITIAL_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "Khối 10",
    priority: "Trung bình" as "Cao" | "Trung bình" | "Thấp",
    status: "Hoạt động" as "Hoạt động" | "Chờ xử lý" | "Tạm ngưng",
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      code: `TKB-0${items.length + 1}`,
      name: "",
      category: "Khối 10",
      priority: "Trung bình",
      status: "Hoạt động",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: ItemRecord) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.category,
      priority: item.priority,
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
      setItems(items.filter((item) => item.id !== id));
      toast.success("Đã xóa bản ghi thành công!");
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên bản ghi!");
      return;
    }

    if (editingItem) {
      setItems(
        items.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...formData,
                updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
              }
            : item
        )
      );
      toast.success("Đã cập nhật bản ghi thành công!");
    } else {
      const newItem: ItemRecord = {
        id: String(Date.now()),
        ...formData,
        updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };
      setItems([newItem, ...items]);
      toast.success("Đã thêm bản ghi mới thành công!");
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo mã hoặc tiêu đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Hoạt động">Hoạt động</SelectItem>
              <SelectItem value="Chờ xử lý">Chờ xử lý</SelectItem>
              <SelectItem value="Tạm ngưng">Tạm ngưng</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tiêu đề / Tên</th>
                <th className="px-4 py-3">Phân loại</th>
                <th className="px-4 py-3">Mức ưu tiên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy bản ghi phù hợp
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#21262d]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-[#24292f] dark:text-[#c9d1d9]">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#24292f] dark:text-[#c9d1d9] max-w-xs truncate">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          item.priority === "Cao"
                            ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                            : item.priority === "Trung bình"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${
                          item.status === "Hoạt động"
                            ? "border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30"
                            : item.status === "Chờ xử lý"
                            ? "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30"
                            : "border-slate-300 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">
                      {item.updatedAt}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => handleOpenEdit(item)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & pagination */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between text-xs text-slate-500">
          <span>Hiển thị {filteredItems.length} trên {items.length} bản ghi</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled>
              Trước
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 active bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold border-emerald-300">
              1
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled>
              Sau
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingItem ? "Chỉnh sửa bản ghi" : "Tạo bản ghi mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Mã định danh
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Tên / Tiêu đề <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tiêu đề hoặc tên thời khóa biểu..."
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Phân loại
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Khối 10">Khối 10</SelectItem>
                    <SelectItem value="Khối 11">Khối 11</SelectItem>
                    <SelectItem value="Khối 12">Khối 12</SelectItem>
                    <SelectItem value="Phòng máy">Phòng máy</SelectItem>
                    <SelectItem value="Khảo thí">Khảo thí</SelectItem>
                    <SelectItem value="Nhân sự">Nhân sự</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Mức ưu tiên
                </label>
                <Select
                  value={formData.priority}
                  onValueChange={(val: any) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cao">Cao</SelectItem>
                    <SelectItem value="Trung bình">Trung bình</SelectItem>
                    <SelectItem value="Thấp">Thấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Trạng thái
              </label>
              <Select
                value={formData.status}
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hoạt động">Hoạt động</SelectItem>
                  <SelectItem value="Chờ xử lý">Chờ xử lý</SelectItem>
                  <SelectItem value="Tạm ngưng">Tạm ngưng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs h-8"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
