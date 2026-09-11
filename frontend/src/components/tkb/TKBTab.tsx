"use client";

import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from "react";
import {
  Calendar,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  Loader2,
  Users,
  Clock,
  Sparkles,
  CheckCircle,
  ClipboardPaste,
  Edit2,
  Download,
  LayoutGrid,
  List,
  Search,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  Camera,
  X,
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
import { apiClient } from "@/lib/api";
import { toast } from "react-hot-toast";

interface TKBSlot {
  id: number;
  teacher_name: string;
  class_name: string;
  subject: string;
  day_of_week: number; // 2..7
  period: number;      // 1..10
  session?: string;
  room?: string;
  semester?: string;
  from_week?: number;
  to_week?: number;
}

const DAYS = [
  { num: 2, label: "Thứ Hai" },
  { num: 3, label: "Thứ Ba" },
  { num: 4, label: "Thứ Tư" },
  { num: 5, label: "Thứ Năm" },
  { num: 6, label: "Thứ Sáu" },
  { num: 7, label: "Thứ Bảy" },
];

export function TKBTab() {
  const [slots, setSlots] = useState<TKBSlot[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("Tất cả");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "all">("all");
  const [weekRanges, setWeekRanges] = useState<{ from_week: number; to_week: number; label: string }[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sessionFilter, setSessionFilter] = useState<"all" | "morning" | "afternoon">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "paste" | "image">("file");
  const [uploadTeacherName, setUploadTeacherName] = useState("Giáo viên Toán");
  const [uploadFromWeek, setUploadFromWeek] = useState<number>(1);
  const [uploadToWeek, setUploadToWeek] = useState<number>(35);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.0-flash-lite");
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [pastedTKBText, setPastedTKBText] = useState("");
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Slot Create / Edit Dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TKBSlot | null>(null);
  const [slotForm, setSlotForm] = useState({
    teacher_name: "Giáo viên",
    class_name: "",
    subject: "Toán",
    day_of_week: 2,
    period: 1,
    session: "Sáng",
    room: "",
    from_week: 1,
    to_week: 35,
  });

  const checkGeminiStatus = async () => {
    try {
      const res = await apiClient<{ configured: boolean }>("/api/gemini/status");
      const savedKey =
        typeof window !== "undefined"
          ? localStorage.getItem("gemini_api_key") || localStorage.getItem("custom_gemini_key") || ""
          : "";
      if (savedKey) {
        setGeminiApiKey(savedKey);
        localStorage.setItem("gemini_api_key", savedKey);
        localStorage.setItem("custom_gemini_key", savedKey);
      }
      
      if (typeof window !== "undefined") {
        const savedModel = localStorage.getItem("gemini_selected_model");
        if (savedModel) setSelectedGeminiModel(savedModel);
      }

      if (res.configured || (savedKey && savedKey.trim().length > 10)) {
        setIsGeminiConfigured(true);
      } else {
        setIsGeminiConfigured(false);
      }
    } catch {
      const savedKey =
        typeof window !== "undefined"
          ? localStorage.getItem("gemini_api_key") || localStorage.getItem("custom_gemini_key") || ""
          : "";
      if (savedKey && savedKey.trim().length > 10) {
        setIsGeminiConfigured(true);
        setGeminiApiKey(savedKey);
      }
    }
  };

  const handleSaveAndSyncKey = async (keyToSave: string) => {
    const trimmed = keyToSave.trim();
    if (!trimmed) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("gemini_api_key", trimmed);
        localStorage.setItem("custom_gemini_key", trimmed);
      }
      await apiClient("/api/gemini/set-key", {
        method: "POST",
        body: JSON.stringify({ api_key: trimmed }),
      });
      setIsGeminiConfigured(true);
    } catch (e) {
      console.error("Save key error:", e);
    }
  };

  const loadTKB = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<TKBSlot[]>("/api/tkb");
      setSlots(data);
      const teacherList = await apiClient<string[]>("/api/tkb/teachers");
      setTeachers(teacherList);
      if (teacherList.length > 0 && selectedTeacher === "Tất cả") {
        setSelectedTeacher(teacherList[0]);
      }
      const ranges = await apiClient<{ from_week: number; to_week: number; label: string }[]>("/api/tkb/ranges");
      setWeekRanges(ranges);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTKB();
    checkGeminiStatus();
  }, []);

  // Global paste handler to capture pasted screenshots anywhere
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setPastedImage(file);
            setImagePreviewUrl(URL.createObjectURL(file));
            setUploadTab("image");
            setUploadDialogOpen(true);
            const savedKey =
              typeof window !== "undefined"
                ? localStorage.getItem("gemini_api_key") || localStorage.getItem("custom_gemini_key") || ""
                : "";
            if (savedKey) {
              setGeminiApiKey(savedKey);
              setIsGeminiConfigured(true);
              handleSaveAndSyncKey(savedKey);
            }
            toast.success("📸 Đã nhận diện ảnh chụp TKB từ Clipboard! Nhấn 'Trích xuất AI' để quét lịch dạy.");
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("teacher_name", uploadTeacherName);
    formData.append("from_week", String(uploadFromWeek));
    formData.append("to_week", String(uploadToWeek));
    formData.append("overwrite", "true");

    setIsUploading(true);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/api/tkb/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload thất bại");
      }

      const result = await res.json();
      toast.success(`Đã nạp thành công ${result.total_slots} tiết TKB (Áp dụng Tuần ${uploadFromWeek} → ${uploadToWeek})!`);
      setUploadDialogOpen(false);
      loadTKB();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xử lý file TKB");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setPastedTKBText(clipText);
          toast.success("Đã dán nội dung TKB từ Clipboard!");
        } else {
          toast.error("Clipboard đang trống");
        }
      }
    } catch {
      toast.error("Vui lòng dán trực tiếp bằng phím Ctrl+V vào ô bên dưới");
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedTKBText.trim()) {
      toast.error("Vui lòng nhập hoặc dán nội dung thời khóa biểu (Ctrl+V)");
      return;
    }

    setIsUploading(true);
    try {
      const result = await apiClient<{ total_slots: number }>("/api/tkb/paste", {
        method: "POST",
        body: JSON.stringify({
          text: pastedTKBText.trim(),
          teacher_name: uploadTeacherName,
          from_week: uploadFromWeek,
          to_week: uploadToWeek,
          overwrite: true,
        }),
      });

      toast.success(`Đã nạp thành công ${result.total_slots} tiết TKB (Áp dụng Tuần ${uploadFromWeek} → ${uploadToWeek})!`);
      setUploadDialogOpen(false);
      setPastedTKBText("");
      loadTKB();
    } catch (err: any) {
      toast.error(err?.message || "Không thể nhận diện lịch dạy từ nội dung dán");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPastedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePasteImageFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        toast.error("Trình duyệt không hỗ trợ đọc Clipboard trực tiếp. Hãy nhấn tổ hợp phím Ctrl+V!");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard_tkb_${Date.now()}.png`, { type: imageType });
          setPastedImage(file);
          setImagePreviewUrl(URL.createObjectURL(file));
          toast.success("📸 Đã dán ảnh TKB từ Clipboard thành công!");
          return;
        }
      }
      toast.error("Không tìm thấy ảnh trong Clipboard. Vui lòng chụp ảnh màn hình TKB trước rồi bấm Ctrl+V!");
    } catch {
      toast.error("Vui lòng nhấn phím Ctrl+V để dán ảnh trực tiếp.");
    }
  };

  const handleVisionImageSubmit = async () => {
    if (!pastedImage) {
      toast.error("Vui lòng dán ảnh chụp hoặc chọn file ảnh Thời Khóa Biểu");
      return;
    }

    const effectiveKey =
      geminiApiKey.trim() ||
      (typeof window !== "undefined"
        ? localStorage.getItem("gemini_api_key") || localStorage.getItem("custom_gemini_key") || ""
        : "");

    if (!effectiveKey && !isGeminiConfigured) {
      toast.error("⚠️ Vui lòng cấu hình Gemini API Key trong tab Cài Đặt hoặc biểu tượng Key trên thanh tiêu đề để AI xử lý!", {
        duration: 6000,
      });
      return;
    }

    setIsVisionAnalyzing(true);
    try {
      if (effectiveKey) {
        handleSaveAndSyncKey(effectiveKey);
      }
      const formData = new FormData();
      formData.append("file", pastedImage);
      formData.append("teacher_name", uploadTeacherName);
      formData.append("from_week", String(uploadFromWeek));
      formData.append("to_week", String(uploadToWeek));
      formData.append("overwrite", "true");
      formData.append("model_name", selectedGeminiModel);
      if (effectiveKey) {
        formData.append("api_key", effectiveKey);
      }

      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/api/tkb/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Trích xuất ảnh TKB thất bại");
      }

      const result = await res.json();
      toast.success(`✨ AI Vision đã trích xuất thành công ${result.total_slots} tiết dạy TKB (Áp dụng Tuần ${uploadFromWeek} → ${uploadToWeek})!`);
      setUploadDialogOpen(false);
      setPastedImage(null);
      setImagePreviewUrl(null);
      loadTKB();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi trích xuất dữ liệu từ ảnh chụp TKB");
    } finally {
      setIsVisionAnalyzing(false);
    }
  };

  const handleClear = async () => {
    const confirmMsg =
      selectedTeacher !== "Tất cả"
        ? `Bạn có chắc muốn xóa TKB của giáo viên "${selectedTeacher}"?`
        : "Bạn có chắc muốn xóa toàn bộ dữ liệu Thời khóa biểu?";
    if (!confirm(confirmMsg)) return;

    try {
      await apiClient("/api/tkb/clear", {
        method: "DELETE",
        params: selectedTeacher !== "Tất cả" ? { teacher_name: selectedTeacher } : undefined,
      });
      toast.success("Đã xóa thời khóa biểu!");
      loadTKB();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa");
    }
  };

  const handleOpenAddSlot = (day?: number, period?: number) => {
    setEditingSlot(null);
    setSlotForm({
      teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên",
      class_name: "",
      subject: "Toán",
      day_of_week: day || 2,
      period: period || 1,
      session: period && period > 5 ? "Chiều" : "Sáng",
      room: "",
      from_week: selectedWeekFilter !== "all" ? selectedWeekFilter : 1,
      to_week: selectedWeekFilter !== "all" ? selectedWeekFilter : 35,
    });
    setSlotDialogOpen(true);
  };

  const handleOpenEditSlot = (slot: TKBSlot) => {
    setEditingSlot(slot);
    setSlotForm({
      teacher_name: slot.teacher_name,
      class_name: slot.class_name,
      subject: slot.subject,
      day_of_week: slot.day_of_week,
      period: slot.period,
      session: slot.session || (slot.period > 5 ? "Chiều" : "Sáng"),
      room: slot.room || "",
      from_week: slot.from_week || 1,
      to_week: slot.to_week || 35,
    });
    setSlotDialogOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!slotForm.class_name.trim()) {
      toast.error("Vui lòng nhập tên lớp dạy (ví dụ: 10A1)");
      return;
    }

    try {
      if (editingSlot) {
        // Update slot
        const updated = await apiClient<TKBSlot>(`/api/tkb/${editingSlot.id}`, {
          method: "PUT",
          body: JSON.stringify(slotForm),
        });
        setSlots(slots.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("Đã cập nhật tiết dạy!");
      } else {
        // Create slot
        const newSlot = await apiClient<TKBSlot>("/api/tkb", {
          method: "POST",
          body: JSON.stringify(slotForm),
        });
        setSlots([...slots, newSlot]);
        toast.success("Đã thêm tiết dạy vào TKB!");
      }
      setSlotDialogOpen(false);
      setEditingSlot(null);
      loadTKB();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi lưu tiết dạy");
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm("Bạn có chắc muốn xóa tiết dạy này khỏi TKB?")) return;
    try {
      await apiClient(`/api/tkb/${slotId}`, { method: "DELETE" });
      setSlots(slots.filter((s) => s.id !== slotId));
      setSlotDialogOpen(false);
      toast.success("Đã xóa tiết dạy!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa");
    }
  };

  const handleExportExcel = () => {
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const teacherParam = encodeURIComponent(
      selectedTeacher !== "Tất cả" ? selectedTeacher : "Giáo viên"
    );
    const weekParam = selectedWeekFilter !== "all" ? `&week_number=${selectedWeekFilter}` : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    const url = `${BASE_URL}/api/tkb/export/excel?teacher_name=${teacherParam}${weekParam}${tokenParam}`;
    window.open(url, "_blank");
  };

  const deferredSearch = React.useDeferredValue(searchQuery);

  const filteredSlots = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return slots.filter((slot) => {
      const matchTeacher =
        selectedTeacher === "Tất cả" || slot.teacher_name === selectedTeacher;
      const matchSearch =
        !query ||
        slot.class_name.toLowerCase().includes(query) ||
        slot.subject.toLowerCase().includes(query);
      const matchSession =
        sessionFilter === "all" ||
        (sessionFilter === "morning" && (slot.period <= 5 || slot.session === "Sáng")) ||
        (sessionFilter === "afternoon" && (slot.period > 5 || slot.session === "Chiều"));
      const matchWeek =
        selectedWeekFilter === "all" ||
        ((slot.from_week || 1) <= selectedWeekFilter && (slot.to_week || 35) >= selectedWeekFilter);
      return matchTeacher && matchSearch && matchSession && matchWeek;
    });
  }, [slots, selectedTeacher, deferredSearch, sessionFilter, selectedWeekFilter]);

  const allFilteredTeacherSlots = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return slots.filter((slot) => {
      const matchTeacher =
        selectedTeacher === "Tất cả" || slot.teacher_name === selectedTeacher;
      const matchSearch =
        !query ||
        slot.class_name.toLowerCase().includes(query) ||
        slot.subject.toLowerCase().includes(query);
      const matchWeek =
        selectedWeekFilter === "all" ||
        ((slot.from_week || 1) <= selectedWeekFilter && (slot.to_week || 35) >= selectedWeekFilter);
      return matchTeacher && matchSearch && matchWeek;
    });
  }, [slots, selectedTeacher, deferredSearch, selectedWeekFilter]);

  const morningSlotsCount = useMemo(
    () => allFilteredTeacherSlots.filter((s) => s.period <= 5 || s.session === "Sáng").length,
    [allFilteredTeacherSlots]
  );

  const afternoonSlotsCount = useMemo(
    () => allFilteredTeacherSlots.filter((s) => s.period > 5 || s.session === "Chiều").length,
    [allFilteredTeacherSlots]
  );

  // Fast O(1) lookup map for grid rendering
  const slotMap = useMemo(() => {
    const map = new Map<string, TKBSlot>();
    allFilteredTeacherSlots.forEach((s) => {
      map.set(`${s.day_of_week}-${s.period}`, s);
    });
    return map;
  }, [allFilteredTeacherSlots]);

  const getSlot = (day: number, period: number) => {
    return slotMap.get(`${day}-${period}`);
  };

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Quản Lý Thời Khóa Biểu (TKB Buổi Sáng & Buổi Chiều)
          </h2>
          <p className="text-[11px] text-slate-500">
            Quản lý ma trận tiết dạy Sáng / Chiều theo từng khoảng tuần áp dụng (Tuần X → Tuần Y)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => {
              setUploadTab("file");
              setUploadDialogOpen(true);
            }}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs w-full sm:w-auto justify-center"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Nạp TKB</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              handleOpenAddSlot();
            }}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Thêm tiết</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 w-full sm:w-auto justify-center"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất Excel</span>
          </Button>

          {slots.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Xóa TKB</span>
            </Button>
          )}
        </div>
      </div>

      {/* Teacher & Week Selector Toolbar */}
      <div className="flex flex-col gap-2.5 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3 rounded-lg text-xs shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          <div className="flex items-center gap-2 w-full">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Giáo viên:</span>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Chọn giáo viên" />
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

          <div className="flex items-center gap-2 w-full">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Khoảng Tuần:</span>
            <Select
              value={String(selectedWeekFilter)}
              onValueChange={(val) => setSelectedWeekFilter(val === "all" ? "all" : Number(val))}
            >
              <SelectTrigger className="h-8 w-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <SelectValue placeholder="Chọn tuần áp dụng" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">Tất cả khoảng tuần ({slots.length} tiết)</SelectItem>
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                  const count = slots.filter(
                    (s) =>
                      (selectedTeacher === "Tất cả" || s.teacher_name === selectedTeacher) &&
                      (s.from_week || 1) <= w &&
                      (s.to_week || 35) >= w
                  ).length;
                  return (
                    <SelectItem key={w} value={String(w)}>
                      Tuần {w} {count > 0 ? `(${count} tiết)` : "(Trống)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Tìm lớp hoặc môn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-850">
          {/* Session Filters (Sáng / Chiều / Cả ngày) */}
          <div className="flex items-center border border-[#d0d7de] dark:border-[#30363d] rounded-md p-0.5 bg-slate-50 dark:bg-[#0d1117] text-xs">
            <button
              type="button"
              onClick={() => setSessionFilter("all")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                sessionFilter === "all"
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Cả ngày ({allFilteredTeacherSlots.length})
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter("morning")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                sessionFilter === "morning"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <span>☀️ Buổi Sáng ({morningSlotsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter("afternoon")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                sessionFilter === "afternoon"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              }`}
            >
              <span>🌙 Buổi Chiều ({afternoonSlotsCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* View mode toggle */}
            <div className="flex items-center border border-[#d0d7de] dark:border-[#30363d] rounded-md p-0.5 bg-slate-50 dark:bg-[#0d1117]">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-7 px-2 text-xs gap-1 ${
                  viewMode === "grid"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "text-slate-600"
                }`}
                title="Xem ma trận tuần"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Ma trận
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-7 px-2 text-xs gap-1 ${
                  viewMode === "list"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "text-slate-600"
                }`}
                title="Xem danh sách tiết"
              >
                <List className="w-3.5 h-3.5" />
                Danh sách
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={loadTKB}
              className="h-7 w-7 p-0 text-slate-500 hidden sm:flex items-center justify-center"
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* View 1: Weekly Schedule Grid */}
      {viewMode === "grid" && (
        <div className="space-y-3">
          {/* MOBILE VIEW (block md:hidden): Vertical Stack of All Days (Thứ Hai -> Thứ Bảy) */}
          <div className="block md:hidden space-y-4">
            {DAYS.map((d) => {
              const daySlots = allFilteredTeacherSlots.filter((s) => s.day_of_week === d.num);
              const morningPeriods = [1, 2, 3, 4, 5];
              const afternoonPeriods = [6, 7, 8, 9, 10];

              return (
                <div
                  key={`day-card-${d.num}`}
                  id={`tkb-day-${d.num}`}
                  className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs"
                >
                  {/* Header for Day */}
                  <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-950/40 dark:to-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {d.label}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({daySlots.length} tiết)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenAddSlot(d.num)}
                      className="h-6 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-medium"
                    >
                      <Plus className="w-3 h-3" /> Thêm tiết
                    </Button>
                  </div>

                  {/* Sáng: Tiết 1..5 */}
                  {sessionFilter !== "afternoon" && (
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <span>☀️</span>
                          <span>BUỔI SÁNG (Tiết 1 → 5)</span>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {morningPeriods.map((p) => {
                          const slot = getSlot(d.num, p);
                          if (!slot) {
                            return (
                              <div
                                key={`m-morning-${d.num}-${p}`}
                                className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-50/40 dark:bg-[#161b22]/30"
                              >
                                <span className="font-mono font-medium text-[11px] text-slate-500">
                                  Tiết {p}
                                </span>
                                <span className="italic text-[11px] text-slate-400/80">(Trống)</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenAddSlot(d.num, p)}
                                  className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-0.5"
                                >
                                  <Plus className="w-3 h-3" /> Thêm
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`m-slot-${slot.id}`}
                              className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#21262d] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono text-[11px]">
                                    Tiết {slot.period}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white text-[11px]">
                                    {slot.class_name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-medium text-[11px]">
                                    {slot.subject}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditSlot(slot)}
                                    className="h-6 w-6 text-slate-400 hover:text-emerald-600"
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="h-6 w-6 text-slate-400 hover:text-red-600"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                                <span>Áp dụng: Tuần {slot.from_week || 1} → {slot.to_week || 35}</span>
                                <span>{slot.teacher_name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chiều: Tiết 6..10 */}
                  {sessionFilter !== "morning" && (
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
                        <span className="flex items-center gap-1.5">
                          <span>🌙</span>
                          <span>BUỔI CHIỀU (Tiết 1 → 5 Chiều / Tiết 6 → 10)</span>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {afternoonPeriods.map((p) => {
                          const slot = getSlot(d.num, p);
                          const chieuNum = p - 5;
                          if (!slot) {
                            return (
                              <div
                                key={`m-afternoon-${d.num}-${p}`}
                                className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-50/40 dark:bg-[#161b22]/30"
                              >
                                <span className="font-mono font-medium text-[11px] text-slate-500">
                                  Tiết {p} (T{chieuNum} Chiều)
                                </span>
                                <span className="italic text-[11px] text-slate-400/80">(Trống)</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenAddSlot(d.num, p)}
                                  className="h-6 px-2 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-0.5"
                                >
                                  <Plus className="w-3 h-3" /> Thêm
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`m-slot-${slot.id}`}
                              className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#21262d] font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 font-mono text-[11px]">
                                    Tiết {slot.period} (T{chieuNum} Chiều)
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-600 text-white text-[11px]">
                                    {slot.class_name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-medium text-[11px]">
                                    {slot.subject}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditSlot(slot)}
                                    className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="h-6 w-6 text-slate-400 hover:text-red-600"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                                <span>Áp dụng: Tuần {slot.from_week || 1} → {slot.to_week || 35}</span>
                                <span>{slot.teacher_name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (hidden md:block): Multi-Column Schedule Matrix */}
          <div className="hidden md:block bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[650px] text-center text-xs border-collapse">
                <thead className="bg-[#1F4E78] text-white border-b border-[#d0d7de] dark:border-[#30363d] font-semibold text-[11px]">
                  <tr>
                    <th className="px-3 py-3 w-24 border-r border-white/20">Tiết / Buổi</th>
                    {DAYS.map((d) => (
                      <th
                        key={d.num}
                        className="px-3 py-3 border-r border-white/20 last:border-r-0"
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                  {/* Sáng: Tiết 1..5 */}
                  {sessionFilter !== "afternoon" && (
                    <>
                      <tr className="bg-gradient-to-r from-amber-50 to-emerald-50/50 dark:from-amber-950/30 dark:to-emerald-950/20 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider border-b border-[#d0d7de] dark:border-[#30363d]">
                        <td colSpan={7} className="py-2 px-4 text-left">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="text-amber-500 text-sm">☀️</span>
                              <span>BUỔI SÁNG (Tiết 1 → 5)</span>
                            </span>
                            <span className="text-[11px] font-normal text-amber-800/80 dark:text-amber-300/80 lowercase">
                              {morningSlotsCount} tiết đã xếp
                            </span>
                          </div>
                        </td>
                      </tr>
                      {[1, 2, 3, 4, 5].map((period) => (
                        <tr key={period} className="hover:bg-slate-50/60 dark:hover:bg-[#21262d]/40">
                          <td className="px-2.5 py-2.5 font-bold text-slate-700 dark:text-slate-200 border-r border-[#d0d7de] dark:border-[#30363d] bg-amber-50/20 dark:bg-amber-950/10">
                            <div>Tiết {period}</div>
                            <div className="text-[9px] text-amber-600 dark:text-amber-400 font-normal">Sáng</div>
                          </td>
                          {DAYS.map((d) => {
                            const slot = getSlot(d.num, period);
                            return (
                              <td
                                key={d.num}
                                onClick={() => (slot ? handleOpenEditSlot(slot) : handleOpenAddSlot(d.num, period))}
                                className="px-2 py-2 border-r border-[#d0d7de] dark:border-[#30363d] last:border-r-0 h-14 align-middle cursor-pointer transition-colors hover:bg-slate-100/60 dark:hover:bg-[#30363d]/40 group"
                              >
                                {slot ? (
                                  <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-0.5 relative shadow-2xs">
                                    <div className="flex items-center justify-between gap-1">
                                      <p className="font-bold text-xs">{slot.class_name}</p>
                                      {(slot.from_week !== 1 || slot.to_week !== 35) && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold" title={`Áp dụng từ Tuần ${slot.from_week} đến Tuần ${slot.to_week}`}>
                                          T{slot.from_week}-{slot.to_week}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                                      {slot.subject}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-slate-300 dark:text-slate-700 text-xs group-hover:text-emerald-500 font-semibold">
                                    +
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Chiều: Tiết 6..10 (Tiết 1..5 Chiều) */}
                  {sessionFilter !== "morning" && (
                    <>
                      <tr className="bg-gradient-to-r from-indigo-50 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20 text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider border-t-2 border-b border-[#d0d7de] dark:border-[#30363d]">
                        <td colSpan={7} className="py-2 px-4 text-left">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="text-indigo-500 text-sm">🌙</span>
                              <span>BUỔI CHIỀU (Tiết 1 → 5 Chiều / Tiết 6 → 10)</span>
                            </span>
                            <span className="text-[11px] font-normal text-indigo-800/80 dark:text-indigo-300/80 lowercase">
                              {afternoonSlotsCount} tiết đã xếp
                            </span>
                          </div>
                        </td>
                      </tr>
                      {[6, 7, 8, 9, 10].map((period) => {
                        const chieuNum = period - 5;
                        return (
                          <tr key={period} className="hover:bg-slate-50/60 dark:hover:bg-[#21262d]/40">
                            <td className="px-2.5 py-2.5 font-bold text-slate-700 dark:text-slate-200 border-r border-[#d0d7de] dark:border-[#30363d] bg-indigo-50/20 dark:bg-indigo-950/10">
                              <div>Tiết {period}</div>
                              <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-normal">Tiết {chieuNum} Chiều</div>
                            </td>
                            {DAYS.map((d) => {
                              const slot = getSlot(d.num, period);
                              return (
                                <td
                                  key={d.num}
                                  onClick={() => (slot ? handleOpenEditSlot(slot) : handleOpenAddSlot(d.num, period))}
                                  className="px-2 py-2 border-r border-[#d0d7de] dark:border-[#30363d] last:border-r-0 h-14 align-middle cursor-pointer transition-colors hover:bg-slate-100/60 dark:hover:bg-[#30363d]/40 group"
                                >
                                  {slot ? (
                                    <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 space-y-0.5 shadow-2xs">
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="font-bold text-xs">{slot.class_name}</p>
                                        {(slot.from_week !== 1 || slot.to_week !== 35) && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-semibold" title={`Áp dụng từ Tuần ${slot.from_week} đến Tuần ${slot.to_week}`}>
                                            T{slot.from_week}-{slot.to_week}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                        {slot.subject}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-slate-300 dark:text-slate-700 text-xs group-hover:text-indigo-500 font-semibold">
                                      +
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
              <span>💡 Nhấn vào ô để thêm tiết hoặc chỉnh sửa trực tiếp trên ma trận</span>
              <span className="font-medium text-emerald-600">
                {selectedWeekFilter === "all" ? "Đang hiển thị toàn bộ các tuần" : `Đang lọc theo Tuần ${selectedWeekFilter}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* View 2: List / Table View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {/* MOBILE VIEW (block md:hidden): Touch-Friendly Cards */}
          <div className="block md:hidden space-y-2.5">
            {filteredSlots.length === 0 ? (
              <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-8 text-center text-slate-400 text-xs">
                Chưa có tiết dạy nào được ghi nhận.
              </div>
            ) : (
              filteredSlots.map((slot) => {
                const dayLabel = DAYS.find((d) => d.num === slot.day_of_week)?.label || `Thứ ${slot.day_of_week}`;
                const isMorning = slot.period <= 5 || slot.session === "Sáng";
                const fw = slot.from_week || 1;
                const tw = slot.to_week || 35;

                return (
                  <div
                    key={`mobile-slot-list-${slot.id}`}
                    className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {dayLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-emerald-700 dark:text-emerald-400 font-bold text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                          Tiết {slot.period} {slot.period > 5 && `(T${slot.period - 5} Chiều)`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px]">
                          {slot.class_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditSlot(slot)}
                          className="h-7 w-7 text-slate-400 hover:text-emerald-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Môn: <strong>{slot.subject}</strong>
                        </span>
                        {isMorning ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300">
                            ☀️ Sáng
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300">
                            🌙 Chiều
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Tuần {fw} → {tw}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP VIEW (hidden md:block): Multi-Column List Table */}
          <div className="hidden md:block bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-[#1F4E78] text-white border-b border-[#d0d7de] dark:border-[#30363d] font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3 border-r border-white/20">Thứ</th>
                    <th className="px-4 py-3 text-center border-r border-white/20">Tiết TKB</th>
                    <th className="px-4 py-3 text-center border-r border-white/20">Buổi</th>
                    <th className="px-4 py-3 font-bold border-r border-white/20">Lớp</th>
                    <th className="px-4 py-3 border-r border-white/20">Môn học</th>
                    <th className="px-4 py-3 text-center border-r border-white/20">Áp dụng</th>
                    <th className="px-4 py-3 border-r border-white/20">Giáo viên</th>
                    <th className="px-4 py-3 w-28 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                  {filteredSlots.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Chưa có tiết dạy nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    filteredSlots.map((slot) => {
                      const dayLabel = DAYS.find((d) => d.num === slot.day_of_week)?.label || `Thứ ${slot.day_of_week}`;
                      const isMorning = slot.period <= 5 || slot.session === "Sáng";
                      const fw = slot.from_week || 1;
                      const tw = slot.to_week || 35;
                      return (
                        <tr key={slot.id} className="hover:bg-slate-50 dark:hover:bg-[#21262d]/50">
                          <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                            {dayLabel}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-emerald-600">
                            Tiết {slot.period} {slot.period > 5 && `(Tiết ${slot.period - 5} Chiều)`}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isMorning ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px]">
                                ☀️ Sáng
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300 text-[10px]">
                                🌙 Chiều
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400">
                            {slot.class_name}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{slot.subject}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Tuần {fw} → {tw}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{slot.teacher_name}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditSlot(slot)}
                                className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Sửa tiết dạy"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Xóa tiết dạy"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
      )}

      {/* Add / Edit Slot Dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              {editingSlot ? <Edit2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Plus className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{editingSlot ? "Chỉnh Sửa Tiết Dạy TKB" : "Thêm Tiết Dạy Vào TKB"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Giáo viên phụ trách</label>
              <Input
                value={slotForm.teacher_name}
                onChange={(e) => setSlotForm({ ...slotForm, teacher_name: e.target.value })}
                className="h-8 text-xs w-full"
              />
            </div>

            {/* Week Range Selector */}
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
              <label className="font-semibold block text-emerald-900 dark:text-emerald-200">
                📅 Khoảng tuần áp dụng tiết dạy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Từ Tuần:</span>
                  <Input
                    type="number"
                    min={1}
                    max={35}
                    value={slotForm.from_week}
                    onChange={(e) => setSlotForm({ ...slotForm, from_week: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 text-xs bg-white dark:bg-[#161b22]"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Đến Tuần:</span>
                  <Input
                    type="number"
                    min={1}
                    max={35}
                    value={slotForm.to_week}
                    onChange={(e) => setSlotForm({ ...slotForm, to_week: Math.max(1, parseInt(e.target.value) || 35) })}
                    className="h-8 text-xs bg-white dark:bg-[#161b22]"
                  />
                </div>
              </div>
            </div>

            {/* Session Selector (Buổi Sáng / Buổi Chiều) */}
            <div>
              <label className="font-semibold block mb-1">Buổi giảng dạy</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newPeriod = slotForm.period > 5 ? slotForm.period - 5 : slotForm.period;
                    setSlotForm({ ...slotForm, session: "Sáng", period: newPeriod });
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    slotForm.session === "Sáng" || slotForm.period <= 5
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161b22] text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>☀️ Buổi Sáng (Tiết 1 - 5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newPeriod = slotForm.period <= 5 ? slotForm.period + 5 : slotForm.period;
                    setSlotForm({ ...slotForm, session: "Chiều", period: newPeriod });
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    slotForm.session === "Chiều" || slotForm.period > 5
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161b22] text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>🌙 Buổi Chiều (Tiết 6 - 10)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Lớp dạy (Ví dụ: 10A1) <span className="text-red-500">*</span></label>
                <Input
                  value={slotForm.class_name}
                  onChange={(e) => setSlotForm({ ...slotForm, class_name: e.target.value })}
                  placeholder="10A1"
                  className="h-8 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Môn học</label>
                <Select
                  value={slotForm.subject}
                  onValueChange={(val) => setSlotForm({ ...slotForm, subject: val })}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toán">Toán</SelectItem>
                    <SelectItem value="HĐTN">HĐTN (Hoạt động trải nghiệm)</SelectItem>
                    <SelectItem value="Chào cờ">Chào cờ (SHDC)</SelectItem>
                    <SelectItem value="Sinh hoạt lớp">Sinh hoạt lớp (SHL)</SelectItem>
                    <SelectItem value="Ngữ văn">Ngữ văn</SelectItem>
                    <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
                    <SelectItem value="Vật lí">Vật lí</SelectItem>
                    <SelectItem value="Hóa học">Hóa học</SelectItem>
                    <SelectItem value="Sinh học">Sinh học</SelectItem>
                    <SelectItem value="Lịch sử">Lịch sử</SelectItem>
                    <SelectItem value="Địa lí">Địa lí</SelectItem>
                    <SelectItem value="GDKT&PL">GDKT & PL / GDCD</SelectItem>
                    <SelectItem value="Tin học">Tin học</SelectItem>
                    <SelectItem value="Công nghệ">Công nghệ</SelectItem>
                    <SelectItem value="GDTC">GDTC / Thể dục</SelectItem>
                    <SelectItem value="GDQP">GDQP - AN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Thứ trong tuần</label>
                <Select
                  value={String(slotForm.day_of_week)}
                  onValueChange={(val) => setSlotForm({ ...slotForm, day_of_week: Number(val) })}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.num} value={String(d.num)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {slotForm.session === "Chiều" || slotForm.period > 5
                    ? "Tiết dạy Chiều (Tiết 6..10)"
                    : "Tiết dạy Sáng (Tiết 1..5)"}
                </label>
                <Select
                  value={String(slotForm.period)}
                  onValueChange={(val) => {
                    const p = Number(val);
                    setSlotForm({
                      ...slotForm,
                      period: p,
                      session: p <= 5 ? "Sáng" : "Chiều",
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-bold w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slotForm.session === "Chiều" || slotForm.period > 5 ? (
                      <>
                        <SelectItem value="6">Tiết 6 (Tiết 1 Chiều)</SelectItem>
                        <SelectItem value="7">Tiết 7 (Tiết 2 Chiều)</SelectItem>
                        <SelectItem value="8">Tiết 8 (Tiết 3 Chiều)</SelectItem>
                        <SelectItem value="9">Tiết 9 (Tiết 4 Chiều)</SelectItem>
                        <SelectItem value="10">Tiết 10 (Tiết 5 Chiều)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="1">Tiết 1 (Sáng)</SelectItem>
                        <SelectItem value="2">Tiết 2 (Sáng)</SelectItem>
                        <SelectItem value="3">Tiết 3 (Sáng)</SelectItem>
                        <SelectItem value="4">Tiết 4 (Sáng)</SelectItem>
                        <SelectItem value="5">Tiết 5 (Sáng)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between items-center pt-2">
            {editingSlot && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteSlot(editingSlot.id)}
                className="text-xs h-8 mr-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Xóa tiết này
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSlotDialogOpen(false)}
                className="text-xs h-8"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSlot}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {editingSlot ? "Lưu thay đổi" : "Thêm vào TKB"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload & Paste Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] md:max-w-[760px] p-5 sm:p-7 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Nạp Thời Khóa Biểu Theo Khoảng Tuần</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Tên giáo viên sở hữu TKB</label>
                <Input
                  value={uploadTeacherName}
                  onChange={(e) => setUploadTeacherName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="h-8 text-xs w-full"
                />
              </div>

              {/* Week Range Selection for Upload */}
              <div>
                <label className="font-semibold block mb-1 text-emerald-700 dark:text-emerald-400">
                  Áp dụng từ Tuần → Đến Tuần:
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={35}
                    value={uploadFromWeek}
                    onChange={(e) => setUploadFromWeek(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-xs text-center font-bold"
                  />
                  <span className="font-bold text-slate-400">→</span>
                  <Input
                    type="number"
                    min={1}
                    max={35}
                    value={uploadToWeek}
                    onChange={(e) => setUploadToWeek(Math.max(1, parseInt(e.target.value) || 35))}
                    className="h-8 text-xs text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets for Week Ranges */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-[#d0d7de] dark:border-[#30363d]">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => { setUploadFromWeek(1); setUploadToWeek(35); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  uploadFromWeek === 1 && uploadToWeek === 35
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Cả năm (Tuần 1 - 35)
              </button>
              <button
                type="button"
                onClick={() => { setUploadFromWeek(1); setUploadToWeek(18); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  uploadFromWeek === 1 && uploadToWeek === 18
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Học kỳ 1 (Tuần 1 - 18)
              </button>
              <button
                type="button"
                onClick={() => { setUploadFromWeek(19); setUploadToWeek(35); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  uploadFromWeek === 19 && uploadToWeek === 35
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Học kỳ 2 (Tuần 19 - 35)
              </button>
              <button
                type="button"
                onClick={() => { setUploadFromWeek(1); setUploadToWeek(9); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  uploadFromWeek === 1 && uploadToWeek === 9
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Giữa HK1 (Tuần 1 - 9)
              </button>
              <button
                type="button"
                onClick={() => { setUploadFromWeek(10); setUploadToWeek(18); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  uploadFromWeek === 10 && uploadToWeek === 18
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Cuối HK1 (Tuần 10 - 18)
              </button>
            </div>

            {/* Tabs for File vs Clipboard Text vs Clipboard Image */}
            <div className="flex border-b border-[#d0d7de] dark:border-[#30363d] gap-2 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setUploadTab("file")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  uploadTab === "file"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Tải file (.xlsx / .pdf)</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadTab("paste")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  uploadTab === "paste"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Dán văn bản (Ctrl+V)</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadTab("image")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  uploadTab === "image"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Dán ảnh chụp (Ctrl+V)</span>
                {pastedImage && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                )}
              </button>
            </div>

            {uploadTab === "file" ? (
              <div className="border-2 border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-lg p-4 sm:p-6 text-center space-y-2 hover:bg-slate-50 dark:hover:bg-[#21262d]/50 transition-colors">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Chọn file Excel (.xlsx) hoặc PDF (.pdf) Thời Khóa Biểu
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    File ma trận tuần hoặc bảng danh sách tiết dạy (Hệ thống hỗ trợ AI trích xuất PDF)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block mx-auto text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer pt-2 max-w-full"
                />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold pt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang nhận diện ma trận tiết dạy...
                  </div>
                )}
              </div>
            ) : uploadTab === "paste" ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Dán ma trận hoặc danh sách TKB (từ Excel/Website/Word):
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="h-7 text-[11px] gap-1 px-2.5 border-[#d0d7de] self-start sm:self-auto shrink-0 whitespace-nowrap"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Dán nhanh Clipboard
                  </Button>
                </div>
                <textarea
                  value={pastedTKBText}
                  onChange={(e) => setPastedTKBText(e.target.value)}
                  placeholder={`Dán các ô bảng TKB vào đây (Ctrl+V). Ví dụ:\nThứ 2\tThứ 3\tThứ 4\tThứ 5\tThứ 6\tThứ 7\n10A1\t10A2\t\t11B1\t12C1\t\n10A1\t\t11B2\t\t\t`}
                  rows={6}
                  className="w-full rounded-md border border-[#d0d7de] dark:border-[#30363d] bg-transparent p-2.5 font-mono text-xs text-[#24292f] dark:text-[#c9d1d9] focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold pt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích dữ liệu lịch dạy...
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Ảnh chụp ma trận Thời Khóa Biểu:
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteImageFromClipboard}
                    className="h-7 text-[11px] gap-1.5 px-2.5 border-[#d0d7de] self-start sm:self-auto shrink-0 whitespace-nowrap"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Dán ảnh từ Clipboard
                  </Button>
                </div>

                {imagePreviewUrl ? (
                  <div className="relative border-2 border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-xl p-3 text-center space-y-2">
                    <div className="relative max-h-60 overflow-hidden rounded-lg flex items-center justify-center bg-black/5 dark:bg-black/40">
                      <img
                        src={imagePreviewUrl}
                        alt="Ảnh chụp TKB"
                        className="max-h-56 object-contain rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPastedImage(null);
                          setImagePreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-transform hover:scale-105"
                        title="Xóa ảnh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 px-1 gap-2">
                      <span className="truncate max-w-[320px] font-medium text-left">
                        {pastedImage?.name || "Ảnh từ Clipboard"} (
                        {pastedImage ? `${(pastedImage.size / 1024).toFixed(0)} KB` : ""})
                      </span>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="text-emerald-600 hover:underline font-semibold shrink-0 whitespace-nowrap"
                      >
                        Đổi ảnh khác
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-xl p-6 text-center space-y-2.5 bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto text-emerald-600">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        Nhấn Ctrl+V để dán ảnh chụp TKB từ Clipboard
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Hoặc bấm vào đây để chọn file ảnh (.png, .jpg, .jpeg, .webp)
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Gemini Vision AI tự động đọc bảng ma trận Thứ/Tiết/Lớp học
                    </div>
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {isVisionAnalyzing && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                    <span>Gemini Vision AI đang nhận diện ma trận Thời Khóa Biểu, vui lòng chờ...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(false)}
              className="text-xs h-8 px-3"
              disabled={isUploading || isVisionAnalyzing}
            >
              Hủy
            </Button>
            {uploadTab === "paste" && (
              <Button
                size="sm"
                onClick={handlePasteSubmit}
                disabled={isUploading || !pastedTKBText.trim()}
                className="text-xs h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Nhập TKB đã dán
              </Button>
            )}
            {uploadTab === "image" && (
              <Button
                size="sm"
                onClick={handleVisionImageSubmit}
                disabled={isVisionAnalyzing || !pastedImage}
                className="text-xs h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm whitespace-nowrap"
              >
                {isVisionAnalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                AI Trích xuất từ ảnh chụp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
