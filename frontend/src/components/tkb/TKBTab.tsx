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
  Copy,
  Scissors,
  ArrowLeftRight,
  Check,
  GripVertical,
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

/** Format week range: if from_week == to_week then 'Tuần X', otherwise 'Tuần X → Y' */
export function formatWeekRange(fromWeek?: number, toWeek?: number): string {
  const fw = fromWeek || 1;
  const tw = toWeek || 35;
  if (fw === tw) {
    return `Tuần ${fw}`;
  }
  return `Tuần ${fw} → ${tw}`;
}

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

  // Drag and Drop & Copy-Paste State
  const [draggedSlot, setDraggedSlot] = useState<TKBSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: number; period: number } | null>(null);
  const [isDragCopy, setIsDragCopy] = useState(false);
  const [copiedSlot, setCopiedSlot] = useState<{ slot: TKBSlot; isCut?: boolean } | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    slot?: TKBSlot;
    day?: number;
    period?: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

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

  // Global click & Escape handler for context menu and copy state
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        if (copiedSlot) {
          setCopiedSlot(null);
          toast("Đã hủy sao chép", { icon: "ℹ️" });
        }
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [copiedSlot]);

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

  // --- COPY & PASTE HANDLERS ---
  const handleCopySlot = (slot: TKBSlot, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCopiedSlot({ slot, isCut: false });
    setSelectedSlotId(slot.id);
    setContextMenu(null);
    toast.success(`📋 Đã sao chép tiết ${slot.class_name} (${slot.subject})! Bấm vào ô trống để dán.`);
  };

  const handleCutSlot = (slot: TKBSlot, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCopiedSlot({ slot, isCut: true });
    setSelectedSlotId(slot.id);
    setContextMenu(null);
    toast(`✂️ Đang cắt tiết ${slot.class_name}. Bấm vào ô trống để di chuyển đến.`, { icon: "✂️" });
  };

  const handleCancelCopy = () => {
    setCopiedSlot(null);
    setSelectedSlotId(null);
    toast("Đã hủy sao chép", { icon: "ℹ️" });
  };

  const handlePasteSlot = async (day: number, period: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!copiedSlot) return;

    const session = period <= 5 ? "Sáng" : "Chiều";
    const srcSlot = copiedSlot.slot;
    const targetExisting = getSlot(day, period);

    // If target has a slot and it's not the same slot
    if (targetExisting && targetExisting.id !== srcSlot.id) {
      if (copiedSlot.isCut) {
        // Swap slots between origin and target!
        const confirmSwap = confirm(
          `Hoán đổi vị trí giữa tiết [${srcSlot.class_name}] và tiết [${targetExisting.class_name}]?`
        );
        if (!confirmSwap) return;

        const originDay = srcSlot.day_of_week;
        const originPeriod = srcSlot.period;
        const originSession = originPeriod <= 5 ? "Sáng" : "Chiều";

        setSlots((prev) =>
          prev.map((s) => {
            if (s.id === srcSlot.id) {
              return { ...s, day_of_week: day, period, session };
            }
            if (s.id === targetExisting.id) {
              return { ...s, day_of_week: originDay, period: originPeriod, session: originSession };
            }
            return s;
          })
        );

        try {
          await Promise.all([
            apiClient(`/api/tkb/${srcSlot.id}`, {
              method: "PUT",
              body: JSON.stringify({ day_of_week: day, period, session }),
            }),
            apiClient(`/api/tkb/${targetExisting.id}`, {
              method: "PUT",
              body: JSON.stringify({ day_of_week: originDay, period: originPeriod, session: originSession }),
            }),
          ]);
          setCopiedSlot(null);
          toast.success(`Đã hoán đổi vị trí: [${srcSlot.class_name}] ⇄ [${targetExisting.class_name}]!`);
          loadTKB();
        } catch (err: any) {
          toast.error(err?.message || "Lỗi hoán đổi tiết dạy");
          loadTKB();
        }
        return;
      }

      // Copy mode -> Overwrite confirmation
      const confirmOverwrite = confirm(
        `Ô này đã có tiết [${targetExisting.class_name} - ${targetExisting.subject}]. Bạn có muốn ghi đè tiết này không?`
      );
      if (!confirmOverwrite) return;
    }

    try {
      if (copiedSlot.isCut) {
        if (targetExisting && targetExisting.id !== srcSlot.id) {
          await apiClient(`/api/tkb/${targetExisting.id}`, { method: "DELETE" });
        }
        const updated = await apiClient<TKBSlot>(`/api/tkb/${srcSlot.id}`, {
          method: "PUT",
          body: JSON.stringify({
            day_of_week: day,
            period: period,
            session,
          }),
        });
        setSlots((prev) =>
          prev
            .filter((s) => (targetExisting ? s.id !== targetExisting.id : true))
            .map((s) => (s.id === updated.id ? updated : s))
        );
        setCopiedSlot(null);
        toast.success(`Đã chuyển tiết ${srcSlot.class_name} đến Thứ ${day} - Tiết ${period}!`);
      } else {
        const newSlotData = {
          teacher_name: selectedTeacher !== "Tất cả" ? selectedTeacher : srcSlot.teacher_name,
          class_name: srcSlot.class_name,
          subject: srcSlot.subject,
          day_of_week: day,
          period: period,
          session,
          room: srcSlot.room || "",
          semester: srcSlot.semester || "Học kỳ 1",
          from_week: selectedWeekFilter !== "all" ? selectedWeekFilter : (srcSlot.from_week || 1),
          to_week: selectedWeekFilter !== "all" ? selectedWeekFilter : (srcSlot.to_week || 35),
        };

        if (targetExisting) {
          const updated = await apiClient<TKBSlot>(`/api/tkb/${targetExisting.id}`, {
            method: "PUT",
            body: JSON.stringify(newSlotData),
          });
          setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          toast.success(`Đã dán ghi đè tiết ${newSlotData.class_name} vào Thứ ${day} - Tiết ${period}!`);
        } else {
          const created = await apiClient<TKBSlot>("/api/tkb", {
            method: "POST",
            body: JSON.stringify(newSlotData),
          });
          setSlots((prev) => [...prev, created]);
          toast.success(`Đã dán tiết ${created.class_name} vào Thứ ${day} - Tiết ${period}!`);
        }
      }
      loadTKB();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi dán tiết dạy");
    }
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (slot: TKBSlot, e: React.DragEvent) => {
    isDraggingRef.current = true;
    setDraggedSlot(slot);
    setSelectedSlotId(slot.id);
    const isCopy = e.ctrlKey || e.altKey;
    setIsDragCopy(isCopy);
    e.dataTransfer.effectAllowed = isCopy ? "copy" : "move";
    try {
      e.dataTransfer.setData("text/plain", JSON.stringify({ id: slot.id }));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.altKey;
    setIsDragCopy(isCopy);
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    if (!dragOverCell || dragOverCell.day !== day || dragOverCell.period !== period) {
      setDragOverCell({ day, period });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverCell(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
    setDragOverCell(null);
    setIsDragCopy(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetDay: number,
    targetPeriod: number,
    existingSlot?: TKBSlot
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSlot) {
      handleDragEnd();
      return;
    }

    const currentDragged = draggedSlot;
    const isCopy = e.ctrlKey || e.altKey || isDragCopy;
    const targetSession = targetPeriod <= 5 ? "Sáng" : "Chiều";

    handleDragEnd();

    // Same cell dropped
    if (currentDragged.day_of_week === targetDay && currentDragged.period === targetPeriod) {
      return;
    }

    if (isCopy) {
      // DUPLICATE / COPY
      const newSlotData = {
        teacher_name: currentDragged.teacher_name,
        class_name: currentDragged.class_name,
        subject: currentDragged.subject,
        day_of_week: targetDay,
        period: targetPeriod,
        session: targetSession,
        room: currentDragged.room || "",
        semester: currentDragged.semester || "Học kỳ 1",
        from_week: currentDragged.from_week || 1,
        to_week: currentDragged.to_week || 35,
      };

      try {
        if (existingSlot) {
          const ok = confirm(`Ghi đè tiết [${existingSlot.class_name}] tại Thứ ${targetDay} - Tiết ${targetPeriod}?`);
          if (!ok) return;
          const updated = await apiClient<TKBSlot>(`/api/tkb/${existingSlot.id}`, {
            method: "PUT",
            body: JSON.stringify(newSlotData),
          });
          setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        } else {
          const created = await apiClient<TKBSlot>("/api/tkb", {
            method: "POST",
            body: JSON.stringify(newSlotData),
          });
          setSlots((prev) => [...prev, created]);
        }
        toast.success(`Đã sao chép tiết ${currentDragged.class_name} sang Thứ ${targetDay} - Tiết ${targetPeriod}!`);
        loadTKB();
      } catch (err: any) {
        toast.error(err?.message || "Lỗi sao chép tiết");
      }
      return;
    }

    // MOVE or SWAP
    if (!existingSlot) {
      // Move to empty cell
      setSlots((prev) =>
        prev.map((s) =>
          s.id === currentDragged.id
            ? {
                ...s,
                day_of_week: targetDay,
                period: targetPeriod,
                session: targetSession,
              }
            : s
        )
      );

      try {
        await apiClient(`/api/tkb/${currentDragged.id}`, {
          method: "PUT",
          body: JSON.stringify({
            day_of_week: targetDay,
            period: targetPeriod,
            session: targetSession,
          }),
        });
        toast.success(`Đã chuyển tiết [${currentDragged.class_name}] sang Thứ ${targetDay} - Tiết ${targetPeriod}!`);
        loadTKB();
      } catch (err: any) {
        toast.error(err?.message || "Lỗi chuyển vị trí");
        loadTKB();
      }
    } else {
      // Swap slots with existingSlot
      const originDay = currentDragged.day_of_week;
      const originPeriod = currentDragged.period;
      const originSession = originPeriod <= 5 ? "Sáng" : "Chiều";

      setSlots((prev) =>
        prev.map((s) => {
          if (s.id === currentDragged.id) {
            return {
              ...s,
              day_of_week: targetDay,
              period: targetPeriod,
              session: targetSession,
            };
          }
          if (s.id === existingSlot.id) {
            return {
              ...s,
              day_of_week: originDay,
              period: originPeriod,
              session: originSession,
            };
          }
          return s;
        })
      );

      try {
        await Promise.all([
          apiClient(`/api/tkb/${currentDragged.id}`, {
            method: "PUT",
            body: JSON.stringify({
              day_of_week: targetDay,
              period: targetPeriod,
              session: targetSession,
            }),
          }),
          apiClient(`/api/tkb/${existingSlot.id}`, {
            method: "PUT",
            body: JSON.stringify({
              day_of_week: originDay,
              period: originPeriod,
              session: originSession,
            }),
          }),
        ]);
        toast.success(
          `Đã hoán đổi vị trí: [${currentDragged.class_name}] ⇄ [${existingSlot.class_name}]!`
        );
        loadTKB();
      } catch (err: any) {
        toast.error(err?.message || "Lỗi hoán đổi tiết dạy");
        loadTKB();
      }
    }
  };

  // --- CONTEXT MENU HANDLERS ---
  const handleSlotContextMenu = (slot: TKBSlot, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      slot,
    });
  };

  const handleEmptyContextMenu = (day: number, period: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      day,
      period,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Quản Lý Thời Khóa Biểu (TKB Buổi Sáng & Buổi Chiều)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs w-full sm:w-auto justify-center font-semibold"
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
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] w-full sm:w-auto justify-center font-semibold"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Thêm tiết</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 w-full sm:w-auto justify-center font-semibold"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất Excel</span>
          </Button>

          {slots.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 w-full sm:w-auto justify-center font-semibold"
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
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 text-xs">Giáo viên:</span>
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
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 text-xs">Khoảng Tuần:</span>
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
          {/* Row 1 on Mobile: Session Filters (Cả ngày / Sáng / Chiều) */}
          <div className="flex items-center justify-between sm:justify-start border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-0.5 bg-slate-50 dark:bg-[#0d1117] text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSessionFilter("all")}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors text-center whitespace-nowrap ${
                sessionFilter === "all"
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 font-medium"
              }`}
            >
              Cả ngày ({allFilteredTeacherSlots.length})
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter("morning")}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                sessionFilter === "morning"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-900 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
              }`}
            >
              <span>☀️</span>
              <span className="inline sm:hidden">Sáng ({morningSlotsCount})</span>
              <span className="hidden sm:inline">Buổi Sáng ({morningSlotsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter("afternoon")}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                sessionFilter === "afternoon"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-indigo-900 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-medium"
              }`}
            >
              <span>🌙</span>
              <span className="inline sm:hidden">Chiều ({afternoonSlotsCount})</span>
              <span className="hidden sm:inline">Buổi Chiều ({afternoonSlotsCount})</span>
            </button>
          </div>

          {/* Row 2 on Mobile: View mode toggle (Ma trận / Danh sách) + Refresh button */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex items-center border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-0.5 bg-slate-50 dark:bg-[#0d1117] flex-1 sm:flex-initial">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`flex-1 sm:flex-initial h-8 px-3 text-xs gap-1.5 justify-center font-semibold ${
                  viewMode === "grid"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 font-medium"
                }`}
                title="Xem ma trận tuần"
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>Ma trận</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`flex-1 sm:flex-initial h-8 px-3 text-xs gap-1.5 justify-center font-semibold ${
                  viewMode === "list"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 font-medium"
                }`}
                title="Xem danh sách tiết"
              >
                <List className="w-3.5 h-3.5 shrink-0" />
                <span>Danh sách</span>
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={loadTKB}
              className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 border-[#d0d7de] dark:border-[#30363d] flex items-center justify-center shrink-0 sm:hidden gap-1 font-medium"
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={loadTKB}
              className="h-7 w-7 p-0 text-slate-500 hidden sm:flex items-center justify-center shrink-0"
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Copy / Cut Status Banner */}
      {copiedSlot && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/30 border-2 border-dashed border-emerald-400 dark:border-emerald-600/70 p-3 px-4 rounded-xl shadow-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              {copiedSlot.isCut ? <Scissors className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                {copiedSlot.isCut ? "Đang cắt tiết:" : "Đã sao chép tiết:"}
              </span>{" "}
              <Badge variant="outline" className="bg-white dark:bg-[#161b22] border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold ml-1 text-xs">
                {copiedSlot.slot.class_name} - {copiedSlot.slot.subject}
              </Badge>
              <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
                👉 Bấm vào ô bất kỳ trên bảng để dán (hoặc kéo thả để di chuyển). Nhấn Esc để hủy.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancelCopy}
            className="h-7 px-2.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Hủy</span>
          </Button>
        </div>
      )}

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
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-950/40 dark:to-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                        {d.label}
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">
                        ({daySlots.length} tiết)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenAddSlot(d.num)}
                      className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm tiết
                    </Button>
                  </div>

                  {/* Sáng: Tiết 1..5 */}
                  {sessionFilter !== "afternoon" && (
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <span>☀️</span>
                          <span>BUỔI SÁNG (Tiết 1 → 5)</span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        {morningPeriods.map((p) => {
                          const slot = getSlot(d.num, p);
                          if (!slot) {
                            return (
                              <div
                                key={`m-morning-${d.num}-${p}`}
                                className="p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-50/40 dark:bg-[#161b22]/30"
                              >
                                <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-400">
                                  Tiết {p}
                                </span>
                                <span className="italic text-xs text-slate-400/80">(Trống)</span>
                                <div className="flex items-center gap-1.5">
                                  {copiedSlot && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handlePasteSlot(d.num, p)}
                                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs font-semibold"
                                    >
                                      <ClipboardPaste className="w-3.5 h-3.5" /> Dán
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenAddSlot(d.num, p)}
                                    className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 font-semibold"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Thêm
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`m-slot-${slot.id}`}
                              className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded bg-white dark:bg-[#21262d] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono text-xs">
                                    Tiết {slot.period}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-600 text-white text-xs">
                                    {slot.class_name}
                                  </span>
                                  <span className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold text-xs">
                                    {slot.subject}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleCopySlot(slot, e)}
                                    className="h-7 w-7 text-slate-500 hover:text-emerald-600"
                                    title="Sao chép tiết"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditSlot(slot)}
                                    className="h-7 w-7 text-slate-500 hover:text-emerald-600"
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="h-7 w-7 text-slate-500 hover:text-red-600"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center justify-between">
                                <span>Áp dụng: {formatWeekRange(slot.from_week, slot.to_week)}</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{slot.teacher_name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chiều: Tiết 6..10 */}
                  {sessionFilter !== "morning" && (
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
                        <span className="flex items-center gap-1.5">
                          <span>🌙</span>
                          <span>BUỔI CHIỀU (Tiết 1 → 5 Chiều / Tiết 6 → 10)</span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        {afternoonPeriods.map((p) => {
                          const slot = getSlot(d.num, p);
                          const chieuNum = p - 5;
                          if (!slot) {
                            return (
                              <div
                                key={`m-afternoon-${d.num}-${p}`}
                                className="p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-50/40 dark:bg-[#161b22]/30"
                              >
                                <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-400">
                                  Tiết {p} (T{chieuNum} Chiều)
                                </span>
                                <span className="italic text-xs text-slate-400/80">(Trống)</span>
                                <div className="flex items-center gap-1.5">
                                  {copiedSlot && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handlePasteSlot(d.num, p)}
                                      className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-2xs font-semibold"
                                    >
                                      <ClipboardPaste className="w-3.5 h-3.5" /> Dán
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenAddSlot(d.num, p)}
                                    className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 font-semibold"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Thêm
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`m-slot-${slot.id}`}
                              className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded bg-white dark:bg-[#21262d] font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 font-mono text-xs">
                                    Tiết {slot.period} (T{chieuNum} Chiều)
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full font-bold bg-indigo-600 text-white text-xs">
                                    {slot.class_name}
                                  </span>
                                  <span className="px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-semibold text-xs">
                                    {slot.subject}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleCopySlot(slot, e)}
                                    className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                                    title="Sao chép tiết"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditSlot(slot)}
                                    className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="h-7 w-7 text-slate-500 hover:text-red-600"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center justify-between">
                                <span>Áp dụng: {formatWeekRange(slot.from_week, slot.to_week)}</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{slot.teacher_name}</span>
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
                <thead className="bg-[#1F4E78] text-white border-b border-[#d0d7de] dark:border-[#30363d] font-semibold text-xs">
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
                            <span className="text-xs font-normal text-amber-800/80 dark:text-amber-300/80 lowercase">
                              {morningSlotsCount} tiết đã xếp
                            </span>
                          </div>
                        </td>
                      </tr>
                      {[1, 2, 3, 4, 5].map((period) => (
                        <tr key={period} className="hover:bg-slate-50/60 dark:hover:bg-[#21262d]/40">
                          <td className="px-2.5 py-2.5 font-bold text-slate-700 dark:text-slate-200 border-r border-[#d0d7de] dark:border-[#30363d] bg-amber-50/20 dark:bg-amber-950/10">
                            <div>Tiết {period}</div>
                            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Sáng</div>
                          </td>
                          {DAYS.map((d) => {
                            const slot = getSlot(d.num, period);
                            const isOver = dragOverCell?.day === d.num && dragOverCell?.period === period;
                            const isCurrentDragged = draggedSlot?.id === slot?.id;
                            return (
                              <td
                                key={d.num}
                                onDragOver={(e) => handleDragOver(e, d.num, period)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, d.num, period, slot)}
                                onContextMenu={(e) =>
                                  slot
                                    ? handleSlotContextMenu(slot, e)
                                    : handleEmptyContextMenu(d.num, period, e)
                                }
                                onClick={() => {
                                  if (isDraggingRef.current) return;
                                  if (slot) {
                                    if (copiedSlot && copiedSlot.slot.id !== slot.id) {
                                      handlePasteSlot(d.num, period);
                                    } else {
                                      handleOpenEditSlot(slot);
                                    }
                                  } else if (copiedSlot) {
                                    handlePasteSlot(d.num, period);
                                  } else {
                                    handleOpenAddSlot(d.num, period);
                                  }
                                }}
                                className={`px-1.5 py-1.5 border-r border-[#d0d7de] dark:border-[#30363d] last:border-r-0 h-16 align-middle cursor-pointer transition-all relative group select-none ${
                                  isOver
                                    ? slot && !isCurrentDragged
                                      ? "bg-amber-100/70 dark:bg-amber-950/60 ring-2 ring-inset ring-amber-500"
                                      : "bg-emerald-100/70 dark:bg-emerald-950/60 ring-2 ring-inset ring-emerald-500"
                                    : draggedSlot && !slot
                                    ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-300 dark:border-emerald-800"
                                    : "hover:bg-slate-100/60 dark:hover:bg-[#30363d]/40"
                                }`}
                              >
                                {slot ? (
                                  <div
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(slot, e)}
                                    onDragEnd={handleDragEnd}
                                    className={`p-1.5 rounded relative shadow-2xs transition-all cursor-grab active:cursor-grabbing group/card ${
                                      isCurrentDragged
                                        ? "opacity-35 scale-95 border-2 border-dashed border-emerald-500"
                                        : copiedSlot?.slot?.id === slot.id
                                        ? copiedSlot.isCut
                                          ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/50 border border-amber-400"
                                          : "ring-2 ring-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/50 border border-emerald-400"
                                        : "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600"
                                    }`}
                                  >
                                    {/* Quick Action Buttons on Hover */}
                                    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-xs rounded-md shadow-xs p-0.5 z-10 border border-slate-200/80 dark:border-slate-700/80 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopySlot(slot, e)}
                                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                                        title="Sao chép tiết (Copy)"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCutSlot(slot, e)}
                                        className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-500 hover:text-amber-700 dark:hover:text-amber-300"
                                        title="Di chuyển tiết (Cắt)"
                                      >
                                        <Scissors className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditSlot(slot);
                                        }}
                                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                                        title="Sửa tiết"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 pr-1">
                                      <div className="flex items-center gap-0.5">
                                        <GripVertical className="w-3 h-3 text-slate-400 group-hover/card:text-emerald-600 shrink-0" />
                                        <p className="font-bold text-xs">{slot.class_name}</p>
                                      </div>
                                      {(slot.from_week !== 1 || slot.to_week !== 35) && (
                                        <span
                                          className="text-xs px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold font-mono"
                                          title={slot.from_week === slot.to_week ? `Áp dụng Tuần ${slot.from_week}` : `Áp dụng từ Tuần ${slot.from_week} đến Tuần ${slot.to_week}`}
                                        >
                                          {slot.from_week === slot.to_week ? `T${slot.from_week}` : `T${slot.from_week}-${slot.to_week}`}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate text-left pl-3.5">
                                      {slot.subject}
                                    </p>

                                    {/* Drag Over Existing Slot Indicator (Swap) */}
                                    {isOver && !isCurrentDragged && (
                                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-amber-600/90 text-white text-xs font-bold rounded shadow-lg backdrop-blur-[1px] animate-in fade-in zoom-in-95 duration-100">
                                        <ArrowLeftRight className="w-4 h-4 mb-0.5 animate-bounce" />
                                        <span>{isDragCopy ? "Ghi đè" : "Hoán đổi"}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full min-h-[44px]">
                                    {isOver ? (
                                      <div className="flex flex-col items-center justify-center py-1 px-2 rounded border-2 border-dashed border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-pulse w-full">
                                        <span>{isDragCopy ? "📋 Thả để chép" : "⬇️ Thả vào đây"}</span>
                                      </div>
                                    ) : copiedSlot ? (
                                      <button
                                        type="button"
                                        onClick={(e) => handlePasteSlot(d.num, period, e)}
                                        className="w-full h-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/70 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 rounded-lg border-2 border-dashed border-emerald-500 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                                        title={`Bấm để ${copiedSlot.isCut ? "chuyển" : "dán"} ${copiedSlot.slot.class_name} vào đây`}
                                      >
                                        {copiedSlot.isCut ? (
                                          <>
                                            <Scissors className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                            <span>Chuyển vào đây</span>
                                          </>
                                        ) : (
                                          <>
                                            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                                            <span>Dán vào đây</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <div className="text-slate-300 dark:text-slate-700 text-xs group-hover:text-emerald-500 font-semibold transition-colors">
                                        +
                                      </div>
                                    )}
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
                            <span className="text-xs font-normal text-indigo-800/80 dark:text-indigo-300/80 lowercase">
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
                              <div className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">Tiết {chieuNum} Chiều</div>
                            </td>
                            {DAYS.map((d) => {
                              const slot = getSlot(d.num, period);
                              const isOver = dragOverCell?.day === d.num && dragOverCell?.period === period;
                              const isCurrentDragged = draggedSlot?.id === slot?.id;
                              return (
                                <td
                                  key={d.num}
                                  onDragOver={(e) => handleDragOver(e, d.num, period)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, d.num, period, slot)}
                                  onContextMenu={(e) =>
                                    slot
                                      ? handleSlotContextMenu(slot, e)
                                      : handleEmptyContextMenu(d.num, period, e)
                                  }
                                  onClick={() => {
                                    if (isDraggingRef.current) return;
                                    if (slot) {
                                      handleOpenEditSlot(slot);
                                    } else if (copiedSlot) {
                                      handlePasteSlot(d.num, period);
                                    } else {
                                      handleOpenAddSlot(d.num, period);
                                    }
                                  }}
                                  className={`px-1.5 py-1.5 border-r border-[#d0d7de] dark:border-[#30363d] last:border-r-0 h-16 align-middle cursor-pointer transition-all relative group select-none ${
                                    isOver
                                      ? slot && !isCurrentDragged
                                        ? "bg-amber-100/70 dark:bg-amber-950/60 ring-2 ring-inset ring-amber-500"
                                        : "bg-indigo-100/70 dark:bg-indigo-950/60 ring-2 ring-inset ring-indigo-500"
                                      : "hover:bg-slate-100/60 dark:hover:bg-[#30363d]/40"
                                  }`}
                                >
                                  {slot ? (
                                    <div
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(slot, e)}
                                      onDragEnd={handleDragEnd}
                                      className={`p-1.5 rounded relative shadow-2xs transition-all cursor-grab active:cursor-grabbing group/card ${
                                        isCurrentDragged
                                          ? "opacity-35 scale-95 border-2 border-dashed border-indigo-500"
                                          : copiedSlot?.slot?.id === slot.id
                                          ? copiedSlot.isCut
                                            ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/50 border border-amber-400"
                                            : "ring-2 ring-indigo-500 bg-indigo-100/50 dark:bg-indigo-950/50 border border-indigo-400"
                                          : "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600"
                                      }`}
                                    >
                                      {/* Quick Action Buttons on Hover */}
                                      <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-xs rounded-md shadow-xs p-0.5 z-10 border border-slate-200/80 dark:border-slate-700/80 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopySlot(slot, e)}
                                          className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                                          title="Sao chép tiết (Copy)"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleCutSlot(slot, e)}
                                          className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-500 hover:text-amber-700 dark:hover:text-amber-300"
                                          title="Di chuyển tiết (Cắt)"
                                        >
                                          <Scissors className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEditSlot(slot);
                                          }}
                                          className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                                          title="Sửa tiết"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>

                                      <div className="flex items-center justify-between gap-1 pr-1">
                                        <div className="flex items-center gap-0.5">
                                          <GripVertical className="w-3 h-3 text-slate-400 group-hover/card:text-indigo-600 shrink-0" />
                                          <p className="font-bold text-xs">{slot.class_name}</p>
                                        </div>
                                        {(slot.from_week !== 1 || slot.to_week !== 35) && (
                                          <span
                                            className="text-xs px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-semibold font-mono"
                                            title={slot.from_week === slot.to_week ? `Áp dụng Tuần ${slot.from_week}` : `Áp dụng từ Tuần ${slot.from_week} đến Tuần ${slot.to_week}`}
                                          >
                                            {slot.from_week === slot.to_week ? `T${slot.from_week}` : `T${slot.from_week}-${slot.to_week}`}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium truncate text-left pl-3.5">
                                        {slot.subject}
                                      </p>

                                      {/* Drag Over Existing Slot Indicator (Swap) */}
                                      {isOver && !isCurrentDragged && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-amber-600/90 text-white text-xs font-bold rounded shadow-lg backdrop-blur-[1px] animate-in fade-in zoom-in-95 duration-100">
                                          <ArrowLeftRight className="w-4 h-4 mb-0.5 animate-bounce" />
                                          <span>{isDragCopy ? "Ghi đè" : "Hoán đổi"}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full min-h-[44px]">
                                      {isOver ? (
                                        <div className="flex flex-col items-center justify-center py-1 px-2 rounded border-2 border-dashed border-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 text-xs font-bold animate-pulse w-full">
                                          <span>{isDragCopy ? "📋 Thả để chép" : "⬇️ Thả vào đây"}</span>
                                        </div>
                                      ) : copiedSlot ? (
                                        <button
                                          type="button"
                                          onClick={(e) => handlePasteSlot(d.num, period, e)}
                                          className="w-full h-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-100/70 dark:bg-indigo-950/60 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 rounded-lg border-2 border-dashed border-indigo-500 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                                          title={`Bấm để ${copiedSlot.isCut ? "chuyển" : "dán"} ${copiedSlot.slot.class_name} vào đây`}
                                        >
                                          {copiedSlot.isCut ? (
                                            <>
                                              <Scissors className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                              <span>Chuyển vào đây</span>
                                            </>
                                          ) : (
                                            <>
                                              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                                              <span>Dán vào đây</span>
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <div className="text-slate-300 dark:text-slate-700 text-xs group-hover:text-indigo-500 font-semibold transition-colors">
                                          +
                                        </div>
                                      )}
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
            <div className="p-2.5 bg-slate-50 dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>💡 <strong>Mẹo:</strong></span>
                <span>• Kéo thả vào ô trống để chuyển tiết</span>
                <span>• Kéo thả vào tiết khác để hoán đổi (Swap)</span>
                <span>• Giữ Ctrl khi kéo để nhân bản</span>
                <span>• Bấm 📋 hoặc chuột phải để Copy/Paste</span>
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
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
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-emerald-700 dark:text-emerald-400 font-bold text-xs font-mono border border-slate-200 dark:border-slate-700">
                          Tiết {slot.period} {slot.period > 5 && `(T${slot.period - 5} Chiều)`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs">
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
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 font-medium">
                            ☀️ Sáng
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 font-medium">
                            🌙 Chiều
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {formatWeekRange(fw, tw)}
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
                <thead className="bg-[#1F4E78] text-white border-b border-[#d0d7de] dark:border-[#30363d] font-semibold text-xs">
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
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-xs">
                                ☀️ Sáng
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300 text-xs">
                                🌙 Chiều
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400">
                            {slot.class_name}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{slot.subject}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {formatWeekRange(fw, tw)}
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
                  <span className="text-xs text-slate-500 block mb-0.5 font-medium">Từ Tuần:</span>
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
                  <span className="text-xs text-slate-500 block mb-0.5 font-medium">Đến Tuần:</span>
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
              <div className="flex items-center gap-2 mr-auto">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSlot(editingSlot.id)}
                  className="text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Xóa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    handleCopySlot(editingSlot);
                    setSlotDialogOpen(false);
                  }}
                  className="text-xs h-8 gap-1 text-slate-700 dark:text-slate-200"
                  title="Sao chép tiết này để dán vào vị trí khác"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                  Sao chép
                </Button>
              </div>
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
              <span className="text-xs font-semibold text-slate-500 mr-1">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => { setUploadFromWeek(1); setUploadToWeek(35); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                    Chọn file Excel (.xlsx) hoặc PDF (.pdf) Thời Khóa Biểu
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    Dán ma trận hoặc danh sách TKB (từ Excel/Website/Word):
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="h-8 text-xs gap-1 px-2.5 border-[#d0d7de] self-start sm:self-auto shrink-0 whitespace-nowrap"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Ảnh chụp ma trận Thời Khóa Biểu:
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteImageFromClipboard}
                    className="h-8 text-xs gap-1.5 px-2.5 border-[#d0d7de] self-start sm:self-auto shrink-0 whitespace-nowrap"
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
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 px-1 gap-2">
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
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Nhấn Ctrl+V để dán ảnh chụp TKB từ Clipboard
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Hoặc bấm vào đây để chọn file ảnh (.png, .jpg, .jpeg, .webp)
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
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

      {/* Context Menu on Right Click */}
      {contextMenu?.visible && (
        <div
          style={{
            top: Math.min(contextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 220),
            left: Math.min(contextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 210),
          }}
          className="fixed z-50 min-w-[190px] bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 text-xs text-slate-700 dark:text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.slot ? (
            <>
              <div className="px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
                <span>{contextMenu.slot.class_name} - {contextMenu.slot.subject}</span>
                <span className="text-xs text-slate-400 font-normal font-mono">Tiết {contextMenu.slot.period}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopySlot(contextMenu.slot!)}
                className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sao chép tiết (Copy)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCutSlot(contextMenu.slot!)}
                className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-2 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-600" />
                <span>Cắt tiết (Di chuyển)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = contextMenu.slot!;
                  setContextMenu(null);
                  handleOpenEditSlot(s);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#21262d] flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Chỉnh sửa chi tiết</span>
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  const sid = contextMenu.slot!.id;
                  setContextMenu(null);
                  handleDeleteSlot(sid);
                }}
                className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tiết này</span>
              </button>
            </>
          ) : contextMenu.day && contextMenu.period ? (
            <>
              <div className="px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
                Thứ {contextMenu.day} - Tiết {contextMenu.period} ({contextMenu.period <= 5 ? "Sáng" : "Chiều"})
              </div>
              <button
                type="button"
                onClick={() => {
                  const d = contextMenu.day!;
                  const p = contextMenu.period!;
                  setContextMenu(null);
                  handleOpenAddSlot(d, p);
                }}
                className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thêm tiết mới tại đây</span>
              </button>
              {copiedSlot && (
                <button
                  type="button"
                  onClick={() => {
                    const d = contextMenu.day!;
                    const p = contextMenu.period!;
                    setContextMenu(null);
                    handlePasteSlot(d, p);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dán tiết ({copiedSlot.slot.class_name} - {copiedSlot.slot.subject})</span>
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Floating Action Bar when Copy/Cut is active */}
      {copiedSlot && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-2 border-emerald-500 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-200 select-none max-w-[95vw]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              copiedSlot.isCut ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
            }`}>
              {copiedSlot.isCut ? <Scissors className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                <span>{copiedSlot.isCut ? "Đang di chuyển:" : "Đang sao chép:"}</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 font-mono text-xs">
                  {copiedSlot.slot.class_name} - {copiedSlot.slot.subject}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                👉 Nhấp ô trống trên bảng để {copiedSlot.isCut ? "chuyển đến" : "dán (có thể dán nhiều ô)"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
            <Button
              size="sm"
              onClick={handleCancelCopy}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 font-semibold rounded-lg shadow-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Hoàn tất
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelCopy}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 rounded-lg"
              title="Hủy (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
