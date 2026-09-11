"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Loader2,
  Layers,
  BookOpen,
  ClipboardPaste,
  Copy,
  Edit2,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Camera,
  X,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { K10_TEMPLATE_LESSONS, K11_TEMPLATE_LESSONS, K12_TEMPLATE_LESSONS } from "@/lib/curriculumData";
import { formatPPCTLessonNumber, isChuyenDeLesson } from "@/lib/utils";

interface PPCTItem {
  id: number;
  grade: string;
  subject: string;
  week: number;
  lesson_number: number;
  lesson_title: string;
  notes?: string;
  semester?: string;
}

export function PPCTTab() {
  const [items, setItems] = useState<PPCTItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("Khối 10");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-select for bulk delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Upload Form Dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "paste" | "image">("file");
  const [uploadGrade, setUploadGrade] = useState("Khối 10");
  const [uploadSubject, setUploadSubject] = useState("Toán");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.0-flash-lite");
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Add / Edit Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PPCTItem | null>(null);
  const [manualForm, setManualForm] = useState({
    grade: "Khối 10",
    subject: "Toán",
    week: 1,
    lesson_number: 1,
    lesson_title: "",
    notes: "",
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

  const loadPPCT = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<PPCTItem[]>("/api/ppct");
      setItems(data);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPPCT();
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
            toast.success("📸 Đã nhận diện ảnh chụp từ Clipboard! Nhấn 'Trích xuất AI' để quét dữ liệu.");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const effectiveKey =
      geminiApiKey.trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") || "" : "");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("grade", uploadGrade);
    formData.append("subject", uploadSubject);
    formData.append("overwrite", "true");
    formData.append("model_name", selectedGeminiModel);
    if (effectiveKey.trim()) {
      formData.append("api_key", effectiveKey.trim());
      handleSaveAndSyncKey(effectiveKey);
    }

    setIsUploading(true);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/api/ppct/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Tải lên thất bại");
      }

      const result = await res.json();
      const detectedGrade = result.grade || uploadGrade;
      const detectedSubject = result.subject || uploadSubject;
      toast.success(
        `✨ Đã nạp thành công ${result.total_imported} tiết PPCT (bao gồm cả Chuyên đề) môn ${detectedSubject} (${detectedGrade})!`
      );
      setSelectedGrade(detectedGrade);
      if (detectedSubject) setSelectedSubject(detectedSubject);
      setUploadDialogOpen(false);
      loadPPCT();
      checkGeminiStatus();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xử lý file PPCT");
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
          setPastedText(clipText);
          toast.success("Đã dán nội dung từ Clipboard!");
        } else {
          toast.error("Clipboard đang trống");
        }
      }
    } catch {
      toast.error("Vui lòng dán trực tiếp bằng phím Ctrl+V vào ô bên dưới");
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) {
      toast.error("Vui lòng nhập hoặc dán nội dung văn bản (Ctrl+V)");
      return;
    }

    const effectiveKey =
      geminiApiKey.trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") || "" : "");

    setIsUploading(true);
    try {
      if (effectiveKey) {
        handleSaveAndSyncKey(effectiveKey);
      }
      const result = await apiClient<{ total_imported: number; grade?: string; subject?: string }>("/api/ppct/paste", {
        method: "POST",
        body: JSON.stringify({
          text: pastedText.trim(),
          grade: uploadGrade,
          subject: uploadSubject,
          overwrite: true,
          api_key: effectiveKey || undefined,
          model_name: selectedGeminiModel,
        }),
      });

      const detectedGrade = result.grade || uploadGrade;
      const detectedSubject = result.subject || uploadSubject;
      toast.success(`Đã nạp thành công ${result.total_imported} tiết PPCT từ nội dung đã dán!`);
      setSelectedGrade(detectedGrade);
      if (detectedSubject) setSelectedSubject(detectedSubject);
      setUploadDialogOpen(false);
      setPastedText("");
      loadPPCT();
    } catch (err: any) {
      toast.error(err?.message || "Không thể xử lý nội dung dán");
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
          const file = new File([blob], `clipboard_${Date.now()}.png`, { type: imageType });
          setPastedImage(file);
          setImagePreviewUrl(URL.createObjectURL(file));
          toast.success("📸 Đã dán ảnh từ Clipboard thành công!");
          return;
        }
      }
      toast.error("Không tìm thấy ảnh trong Clipboard. Vui lòng chụp ảnh màn hình trước rồi bấm Ctrl+V!");
    } catch {
      toast.error("Vui lòng nhấn phím Ctrl+V để dán ảnh trực tiếp.");
    }
  };

  const handleVisionImageSubmit = async () => {
    if (!pastedImage) {
      toast.error("Vui lòng dán ảnh chụp hoặc chọn file ảnh PPCT");
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
      formData.append("grade", uploadGrade);
      formData.append("subject", uploadSubject);
      formData.append("overwrite", "true");
      formData.append("model_name", selectedGeminiModel);
      if (effectiveKey) {
        formData.append("api_key", effectiveKey);
      }

      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/api/ppct/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Trích xuất ảnh thất bại");
      }

      const result = await res.json();
      const detectedGrade = result.grade || uploadGrade;
      const detectedSubject = result.subject || uploadSubject;
      toast.success(`✨ AI Vision đã trích xuất thành công ${result.total_imported} tiết PPCT từ ảnh chụp!`);
      setSelectedGrade(detectedGrade);
      if (detectedSubject) setSelectedSubject(detectedSubject);
      setUploadDialogOpen(false);
      setPastedImage(null);
      setImagePreviewUrl(null);
      loadPPCT();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi trích xuất dữ liệu từ ảnh chụp");
    } finally {
      setIsVisionAnalyzing(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tiết học này khỏi PPCT?")) return;
    try {
      await apiClient(`/api/ppct/${id}`, { method: "DELETE" });
      setItems(items.filter((i) => i.id !== id));
      setSelectedIds(selectedIds.filter((selId) => selId !== id));
      toast.success("Đã xóa tiết PPCT!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} tiết PPCT đã chọn?`)) return;

    try {
      await apiClient("/api/ppct/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      setItems(items.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      toast.success("Đã xóa các tiết đã chọn!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa hàng loạt");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ danh sách PPCT?")) return;
    try {
      await apiClient("/api/ppct/clear", { method: "DELETE" });
      setItems([]);
      setSelectedIds([]);
      toast.success("Đã xóa toàn bộ PPCT!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa");
    }
  };

  const handleOpenAddManual = () => {
    const maxLesson = items.length > 0 ? Math.max(...items.map((i) => i.lesson_number)) + 1 : 1;
    setEditingItem(null);
    setManualForm({
      grade: selectedGrade !== "all" ? selectedGrade : "Khối 10",
      subject: selectedSubject !== "all" ? selectedSubject : "Toán",
      week: selectedWeek !== "all" ? Number(selectedWeek) : 1,
      lesson_number: maxLesson,
      lesson_title: "",
      notes: "",
    });
    setAddDialogOpen(true);
  };

  const handleOpenEdit = (item: PPCTItem) => {
    setEditingItem(item);
    setManualForm({
      grade: item.grade,
      subject: item.subject,
      week: item.week,
      lesson_number: item.lesson_number,
      lesson_title: item.lesson_title,
      notes: item.notes || "",
    });
    setAddDialogOpen(true);
  };

  const handleSaveManualOrEdit = async () => {
    if (!manualForm.lesson_title.trim()) {
      toast.error("Vui lòng nhập tên bài dạy");
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const updated = await apiClient<PPCTItem>(`/api/ppct/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify(manualForm),
        });
        setItems(items.map((i) => (i.id === updated.id ? updated : i)));
        toast.success("Đã cập nhật tiết PPCT!");
      } else {
        // Create new item
        const newItem = await apiClient<PPCTItem>("/api/ppct", {
          method: "POST",
          body: JSON.stringify(manualForm),
        });
        setItems([...items, newItem]);
        toast.success("Đã thêm tiết dạy vào PPCT!");
      }
      setAddDialogOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi lưu dữ liệu");
    }
  };

  const handleDuplicateItem = async (item: PPCTItem) => {
    try {
      const newItem = await apiClient<PPCTItem>("/api/ppct", {
        method: "POST",
        body: JSON.stringify({
          grade: item.grade,
          subject: item.subject,
          week: item.week,
          lesson_number: item.lesson_number + 1,
          lesson_title: `${item.lesson_title} (Tiếp theo)`,
          notes: item.notes,
        }),
      });
      setItems([...items, newItem]);
      toast.success("Đã nhân bản tiết học!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi nhân bản");
    }
  };

  const handleExportExcel = () => {
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const gradeParam = selectedGrade !== "all" ? encodeURIComponent(selectedGrade) : "";
    const subjectParam = selectedSubject !== "all" ? encodeURIComponent(selectedSubject) : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    const url = `${BASE_URL}/api/ppct/export/excel?grade=${gradeParam}&subject=${subjectParam}${tokenParam}`;
    window.open(url, "_blank");
  };

  const handleLoadPresetCurriculum = async (gradeNum: 10 | 11 | 12) => {
    const template =
      gradeNum === 10
        ? K10_TEMPLATE_LESSONS
        : gradeNum === 11
        ? K11_TEMPLATE_LESSONS
        : K12_TEMPLATE_LESSONS;
    const gradeStr = `Khối ${gradeNum}`;
    if (
      !confirm(
        `Bạn có chắc chắn muốn NẠP NHANH toàn bộ PPCT Toán ${gradeNum} (${template.length} tiết: 105 chính khóa + 35 chuyên đề)? Dữ liệu PPCT cũ của Khối ${gradeNum} Môn Toán sẽ được cập nhật tự động.`
      )
    )
      return;

    setIsLoading(true);
    try {
      const rawPpct = template.map((t) => ({
        grade: gradeStr,
        subject: "Toán",
        week: t.week,
        lesson_number: t.period,
        lesson_title: t.lessonName,
        notes: t.topic || "",
      }));

      await apiClient("/api/ppct/bulk", {
        method: "POST",
        body: JSON.stringify({
          grade: gradeStr,
          subject: "Toán",
          items: rawPpct,
          overwrite: true,
        }),
      });
      toast.success(`✨ Đã nạp thành công trọn bộ ${template.length} tiết PPCT Toán ${gradeNum}!`);
      setSelectedGrade(gradeStr);
      loadPPCT();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi nạp PPCT mẫu");
    } finally {
      setIsLoading(false);
    }
  };

  const deferredSearch = React.useDeferredValue(searchQuery);

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchGrade = selectedGrade === "all" || item.grade === selectedGrade;
      const matchSubject = selectedSubject === "all" || item.subject === selectedSubject;
      const matchWeek = selectedWeek === "all" || item.week === Number(selectedWeek);
      const matchSearch =
        !query ||
        item.lesson_title.toLowerCase().includes(query) ||
        String(item.lesson_number).includes(query);
      return matchGrade && matchSubject && matchWeek && matchSearch;
    });
  }, [items, selectedGrade, selectedSubject, selectedWeek, deferredSearch]);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleToggleSelectItem = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const summaryStats = useMemo(() => {
    // For summary calculation, filter by grade and subject only (so search box typing doesn't recompute summary)
    const activeItems = items.filter((item) => {
      const matchGrade = selectedGrade === "all" || item.grade === selectedGrade;
      const matchSubject = selectedSubject === "all" || item.subject === selectedSubject;
      return matchGrade && matchSubject;
    });

    // Total count
    const total = activeItems.length;

    // Sách giáo khoa (chính khóa) vs Chuyên đề học tập
    const sgk = activeItems.filter((x) => !isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title));
    const cd = activeItems.filter((x) => isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title));
    const sgkTotal = sgk.length;
    const cdTotal = cd.length;

    // Học kỳ 1 (Tuần 1 -> 18 hoặc theo semester)
    const hk1All = activeItems.filter((x) => x.week <= 18 || x.semester === "Học kỳ 1");
    const hk1SGK = hk1All.filter((x) => !isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title));
    const hk1CD = hk1All.filter((x) => isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title));
    const hk1Total = hk1All.length;
    const hk1SGKCount = hk1SGK.length;
    const hk1CDCount = hk1CD.length;

    // Số tuần thực tế có tiết trong HK1
    const hk1WeeksSet = new Set(hk1All.map((x) => x.week));
    const hk1WeeksCount = hk1WeeksSet.size > 0 ? hk1WeeksSet.size : (hk1All.length > 0 ? Math.max(...hk1All.map((x) => x.week)) : 18);
    const hk1TotalPerWeek = hk1WeeksCount > 0 ? hk1Total / hk1WeeksCount : 0;
    const hk1SGKPerWeek = hk1WeeksCount > 0 ? hk1SGKCount / hk1WeeksCount : 0;
    const hk1CDPerWeek = hk1WeeksCount > 0 ? hk1CDCount / hk1WeeksCount : 0;

    // Học kỳ 2 (Tuần 19 -> 35 hoặc theo semester)
    const hk2All = activeItems.filter((x) => x.week > 18 || x.semester === "Học kỳ 2");
    const hk2SGK = hk2All.filter((x) => !isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title));
    const hk2CD = hk2All.filter((x) => isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title));
    const hk2Total = hk2All.length;
    const hk2SGKCount = hk2SGK.length;
    const hk2CDCount = hk2CD.length;

    // Số tuần thực tế có tiết trong HK2
    const hk2WeeksSet = new Set(hk2All.map((x) => x.week));
    const hk2WeeksCount = hk2WeeksSet.size > 0 ? hk2WeeksSet.size : (hk2All.length > 0 ? Math.max(...hk2All.map((x) => x.week)) - 18 : 17);
    const hk2TotalPerWeek = hk2WeeksCount > 0 ? hk2Total / hk2WeeksCount : 0;
    const hk2SGKPerWeek = hk2WeeksCount > 0 ? hk2SGKCount / hk2WeeksCount : 0;
    const hk2CDPerWeek = hk2WeeksCount > 0 ? hk2CDCount / hk2WeeksCount : 0;

    const formatPerWeek = (num: number) => {
      if (num === 0) return "0";
      return Number.isInteger(num) ? `${num}` : num.toFixed(1);
    };

    return {
      total,
      sgkTotal,
      cdTotal,
      hk1Total,
      hk1SGKCount,
      hk1CDCount,
      hk1WeeksCount,
      hk1TotalPerWeek: formatPerWeek(hk1TotalPerWeek),
      hk1SGKPerWeek: formatPerWeek(hk1SGKPerWeek),
      hk1CDPerWeek: formatPerWeek(hk1CDPerWeek),
      hk2Total,
      hk2SGKCount,
      hk2CDCount,
      hk2WeeksCount,
      hk2TotalPerWeek: formatPerWeek(hk2TotalPerWeek),
      hk2SGKPerWeek: formatPerWeek(hk2SGKPerWeek),
      hk2CDPerWeek: formatPerWeek(hk2CDPerWeek),
    };
  }, [items, selectedGrade, selectedSubject]);

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3 rounded-lg shadow-2xs">
        <div className="shrink-0">
          <h2 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Phân Phối Chương Trình (PPCT)</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Quản lý bài dạy, tải file Excel/Word/PDF hoặc nạp mẫu Toán 10, 11, 12
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 justify-start lg:justify-end">
          {/* Preset Buttons Group */}
          <div className="flex items-center rounded-md border border-[#d0d7de] dark:border-[#30363d] p-0.5 bg-slate-50/80 dark:bg-[#0d1117]">
            <span className="text-[10px] font-medium text-slate-500 px-1.5 hidden sm:flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Nạp mẫu:
            </span>
            <button
              type="button"
              onClick={() => handleLoadPresetCurriculum(10)}
              className="px-2 py-0.5 text-xs font-semibold rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 transition-colors"
              title="Nạp nhanh 140 tiết PPCT Toán 10 có sẵn"
            >
              Toán 10
            </button>
            <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
            <button
              type="button"
              onClick={() => handleLoadPresetCurriculum(11)}
              className="px-2 py-0.5 text-xs font-semibold rounded hover:bg-blue-100 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-400 transition-colors"
              title="Nạp nhanh 140 tiết PPCT Toán 11 có sẵn"
            >
              Toán 11
            </button>
            <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
            <button
              type="button"
              onClick={() => handleLoadPresetCurriculum(12)}
              className="px-2 py-0.5 text-xs font-semibold rounded hover:bg-purple-100 dark:hover:bg-purple-950/60 text-purple-700 dark:text-purple-400 transition-colors"
              title="Nạp nhanh 140 tiết PPCT Toán 12 có sẵn"
            >
              Toán 12
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              checkGeminiStatus();
              setUploadTab("file");
              setUploadDialogOpen(true);
            }}
            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Nạp File / Ảnh</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenAddManual}
            className="h-7 px-2 text-xs gap-1 border-[#d0d7de] dark:border-[#30363d]"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Thêm tiết</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="h-7 px-2 text-xs gap-1 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất Excel</span>
          </Button>

          {selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              className="h-7 px-2 text-xs gap-1"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Xóa ({selectedIds.length})</span>
            </Button>
          )}

          {items.length > 0 && selectedIds.length === 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearAll}
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Xóa hết</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-3 rounded-lg text-xs shadow-2xs">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Tìm tên bài dạy hoặc số tiết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs w-full"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Grade filter */}
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="h-8 w-full sm:w-[120px] text-xs">
              <SelectValue placeholder="Chọn khối" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khối</SelectItem>
              <SelectItem value="Khối 10">Khối 10</SelectItem>
              <SelectItem value="Khối 11">Khối 11</SelectItem>
              <SelectItem value="Khối 12">Khối 12</SelectItem>
            </SelectContent>
          </Select>

          {/* Subject filter */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
              <SelectValue placeholder="Chọn môn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả môn</SelectItem>
              <SelectItem value="Toán">Toán</SelectItem>
              <SelectItem value="Hoạt động trải nghiệm, hướng nghiệp">HĐTN, HN</SelectItem>
              <SelectItem value="Ngữ văn">Ngữ văn</SelectItem>
              <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
              <SelectItem value="Vật lí">Vật lí</SelectItem>
              <SelectItem value="Hóa học">Hóa học</SelectItem>
              <SelectItem value="Sinh học">Sinh học</SelectItem>
              <SelectItem value="Lịch sử">Lịch sử</SelectItem>
              <SelectItem value="Địa lí">Địa lí</SelectItem>
              <SelectItem value="Giáo dục kinh tế và pháp luật">GDKT & PL / GDCD</SelectItem>
              <SelectItem value="Tin học">Tin học</SelectItem>
              <SelectItem value="Công nghệ">Công nghệ</SelectItem>
              <SelectItem value="Giáo dục thể chất">GDTC / Thể dục</SelectItem>
              <SelectItem value="Giáo dục quốc phòng và an ninh">GDQP - AN</SelectItem>
            </SelectContent>
          </Select>

          {/* Week filter */}
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="h-8 w-full sm:w-[110px] text-xs col-span-2 sm:col-span-1">
              <SelectValue placeholder="Chọn tuần" />
            </SelectTrigger>
            <SelectContent className="max-h-52">
              <SelectItem value="all">Tất cả tuần</SelectItem>
              {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Tuần {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="ghost"
            onClick={loadPPCT}
            className="h-8 text-xs text-slate-500 hidden sm:flex"
            title="Tải lại"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Bảng Tổng Hợp Kế Hoạch Số Tiết / Khung Phân Phối Chương Trình */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 dark:from-[#0d1117] dark:via-[#161b22] dark:to-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
              Khung Kế Hoạch Tổng Hợp & Phân Bổ Số Tiết ({selectedSubject !== "all" ? selectedSubject : "Toán"} - {selectedGrade !== "all" ? selectedGrade : "Khối 10"})
            </h3>
          </div>
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono">
            Chuẩn GDPT 2018 (35 tuần)
          </Badge>
        </div>

        {/* MOBILE VIEW (block md:hidden): 3-Card Summary */}
        <div className="block md:hidden p-3 space-y-2.5">
          <div className="p-3 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
              📊 Tổng cả năm: <span className="text-emerald-600">{summaryStats.total} tiết</span>
            </div>
            <div className="text-[11px] text-slate-500">
              SGK chính khóa: <strong>{summaryStats.sgkTotal}</strong> tiết • Chuyên đề: <strong>{summaryStats.cdTotal}</strong> tiết
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/40 space-y-1">
              <span className="font-bold text-[11px] text-blue-900 dark:text-blue-300">
                Học kỳ 1 ({summaryStats.hk1WeeksCount} tuần)
              </span>
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                {summaryStats.hk1Total} tiết ({summaryStats.hk1TotalPerWeek} t/tuần)
              </div>
              <div className="text-[10px] text-slate-500">
                SGK: {summaryStats.hk1SGKCount} • CĐ: {summaryStats.hk1CDCount}
              </div>
            </div>

            <div className="p-2.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900/40 space-y-1">
              <span className="font-bold text-[11px] text-purple-900 dark:text-purple-300">
                Học kỳ 2 ({summaryStats.hk2WeeksCount} tuần)
              </span>
              <div className="text-xs font-bold text-purple-700 dark:text-purple-400">
                {summaryStats.hk2Total} tiết ({summaryStats.hk2TotalPerWeek} t/tuần)
              </div>
              <div className="text-[10px] text-slate-500">
                SGK: {summaryStats.hk2SGKCount} • CĐ: {summaryStats.hk2CDCount}
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW (hidden md:block): Multi-Column Summary Table */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar p-3">
          <table className="w-full text-center text-xs border-collapse border border-slate-300 dark:border-slate-700">
            <thead>
              <tr className="bg-slate-100 dark:bg-[#21262d] font-bold text-[#24292f] dark:text-[#c9d1d9]">
                <th className="border border-slate-300 dark:border-slate-700 py-3 px-3 w-1/3">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Cả năm: {summaryStats.total} tiết
                  </div>
                  <div className="text-[11px] font-normal italic text-slate-600 dark:text-slate-400 mt-0.5">
                    (SGK {summaryStats.sgkTotal} tiết; CĐHT {summaryStats.cdTotal} tiết)
                  </div>
                </th>
                <th className="border border-slate-300 dark:border-slate-700 py-3 px-3 w-1/3">
                  <div className="text-sm font-bold uppercase text-slate-900 dark:text-slate-100">
                    CHƯƠNG TRÌNH SÁCH GIÁO KHOA
                  </div>
                  <div className="text-[11px] font-normal italic text-slate-600 dark:text-slate-400 mt-0.5">
                    Cả năm: {summaryStats.sgkTotal} tiết
                  </div>
                </th>
                <th className="border border-slate-300 dark:border-slate-700 py-3 px-3 w-1/3">
                  <div className="text-sm font-bold uppercase text-purple-800 dark:text-purple-300">
                    CHUYÊN ĐỀ HỌC TẬP
                  </div>
                  <div className="text-[11px] font-normal italic text-slate-600 dark:text-slate-400 mt-0.5">
                    Cả năm: {summaryStats.cdTotal} tiết
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Học kỳ 1 */}
              <tr className="hover:bg-slate-50/80 dark:hover:bg-[#1f242c]/50">
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Học kì 1: {summaryStats.hk1WeeksCount} tuần ({summaryStats.hk1Total} tiết)
                  </div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono">
                    ({summaryStats.hk1WeeksCount} tuần) x ({summaryStats.hk1TotalPerWeek} tiết) = {summaryStats.hk1Total} tiết
                  </div>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {summaryStats.hk1SGKCount} tiết
                  </div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono">
                    ({summaryStats.hk1WeeksCount} tuần) x ({summaryStats.hk1SGKPerWeek} tiết) = {summaryStats.hk1SGKCount} tiết
                  </div>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3">
                  <div className="font-bold text-purple-700 dark:text-purple-400">
                    {summaryStats.hk1CDCount} tiết
                  </div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono">
                    ({summaryStats.hk1WeeksCount} tuần) x ({summaryStats.hk1CDPerWeek} tiết) = {summaryStats.hk1CDCount} tiết
                  </div>
                </td>
              </tr>

              {/* Học kỳ 2 */}
              <tr className="hover:bg-slate-50/80 dark:hover:bg-[#1f242c]/50">
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Học kì 2: {summaryStats.hk2WeeksCount} tuần ({summaryStats.hk2Total} tiết)
                  </div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono">
                    ({summaryStats.hk2WeeksCount} tuần) x ({summaryStats.hk2TotalPerWeek} tiết) = {summaryStats.hk2Total} tiết
                  </div>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {summaryStats.hk2SGKCount} tiết
                  </div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono">
                    ({summaryStats.hk2WeeksCount} tuần) x ({summaryStats.hk2SGKPerWeek} tiết) = {summaryStats.hk2SGKCount} tiết
                  </div>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3">
                  <div className="font-bold text-purple-700 dark:text-purple-400">
                    {summaryStats.hk2CDCount} tiết
                  </div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono">
                    ({summaryStats.hk2WeeksCount} tuần) x ({summaryStats.hk2CDPerWeek} tiết) = {summaryStats.hk2CDCount} tiết
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PPCT Lessons Container */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden shadow-2xs">
        {/* MOBILE VIEW (block md:hidden): Touch-Friendly Week Grouped Cards */}
        <div className="block md:hidden divide-y divide-[#d0d7de] dark:divide-[#30363d]">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
              Đang tải dữ liệu PPCT...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                Chưa có dữ liệu Phân phối chương trình
              </p>
            </div>
          ) : (
            (() => {
              // Group items by week
              const weeksMap = new Map<number, PPCTItem[]>();
              filteredItems.forEach((item) => {
                if (!weeksMap.has(item.week)) {
                  weeksMap.set(item.week, []);
                }
                weeksMap.get(item.week)!.push(item);
              });

              return Array.from(weeksMap.entries()).map(([weekNum, weekLessons]) => {
                const isEvenWeek = weekNum % 2 === 0;
                const chinhKhoa = weekLessons.filter((x) => !isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title)).length;
                const chuyenDe = weekLessons.filter((x) => isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title)).length;

                return (
                  <div key={`m-ppct-week-${weekNum}`} className="space-y-0">
                    {/* Week Header */}
                    <div
                      className={`px-3.5 py-2 flex items-center justify-between border-b ${
                        isEvenWeek
                          ? "bg-blue-50/80 dark:bg-[#1a2333] border-blue-200 dark:border-blue-900/60"
                          : "bg-emerald-50/80 dark:bg-[#132320] border-emerald-200 dark:border-emerald-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isEvenWeek ? "bg-blue-500" : "bg-emerald-500"}`} />
                        <span className={`font-bold text-xs ${isEvenWeek ? "text-blue-900 dark:text-blue-300" : "text-emerald-900 dark:text-emerald-300"}`}>
                          TUẦN {weekNum} {weekNum <= 18 ? "(HK1)" : "(HK2)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        {weekLessons.length} tiết ({chinhKhoa} chính khóa{chuyenDe > 0 ? ` + ${chuyenDe} CĐ` : ""})
                      </span>
                    </div>

                    {/* Week Lesson Items */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {weekLessons.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <div
                            key={`m-item-${item.id}`}
                            className={`p-3 space-y-1.5 transition-colors ${
                              isSelected
                                ? "bg-emerald-100/50 dark:bg-emerald-950/40"
                                : "bg-white dark:bg-[#161b22]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleSelectItem(item.id)}
                                  className="mt-0.5"
                                />
                                {isChuyenDeLesson(item.lesson_number, item.notes, item.lesson_title) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[11px]">
                                    <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                                    <span>Tiết PPCT {formatPPCTLessonNumber(item.lesson_number, item.notes, item.lesson_title)}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
                                    <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>Tiết PPCT {item.lesson_number}</span>
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                                  {item.grade} - {item.subject}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(item)}
                                  className="h-6 w-6 text-slate-400 hover:text-emerald-600"
                                  title="Sửa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicateItem(item)}
                                  className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                  title="Nhân bản"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="h-6 w-6 text-slate-400 hover:text-red-600"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug pl-6">
                              {item.lesson_title}
                            </p>

                            {item.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pl-6">
                                Ghi chú / ĐDDH: {item.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* DESKTOP VIEW (hidden md:block): Multi-Column Table */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        filteredItems.length > 0 && selectedIds.length === filteredItems.length
                      }
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </div>
                </th>
                <th className="px-3 py-3 w-16 text-center">Tuần</th>
                <th className="px-3 py-3 w-20 text-center">Tiết PPCT</th>
                <th className="px-4 py-3 w-24">Khối</th>
                <th className="px-4 py-3 w-28">Môn</th>
                <th className="px-4 py-3">Tên bài dạy / Nội dung</th>
                <th className="px-4 py-3 w-44">Ghi chú / Thiết bị</th>
                <th className="px-4 py-3 w-32 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Đang tải dữ liệu PPCT...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      Chưa có dữ liệu Phân phối chương trình
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Nhấn vào nút "Nạp PPCT" để tải file Excel/Word/PDF hoặc dán trực tiếp bảng từ Clipboard (Ctrl+V).
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isFirstOfThisWeek = idx === 0 || item.week !== filteredItems[idx - 1].week;
                  const isEvenWeek = item.week % 2 === 0;
                  const weekItems = isFirstOfThisWeek ? filteredItems.filter((x) => x.week === item.week) : [];
                  const chinhKhoaCount = isFirstOfThisWeek
                    ? weekItems.filter((x) => !isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title)).length
                    : 0;
                  const chuyenDeCount = isFirstOfThisWeek
                    ? weekItems.filter((x) => isChuyenDeLesson(x.lesson_number, x.notes, x.lesson_title)).length
                    : 0;

                  return (
                    <React.Fragment key={item.id}>
                      {/* Week Separator Header Row */}
                      {isFirstOfThisWeek && (
                        <tr
                          className={`border-t-2 border-b ${
                            isEvenWeek
                              ? "bg-blue-50/70 dark:bg-[#1a2333] border-blue-200 dark:border-blue-900/60"
                              : "bg-emerald-50/70 dark:bg-[#132320] border-emerald-200 dark:border-emerald-900/60"
                          }`}
                        >
                          <td colSpan={8} className="py-2 px-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full inline-block shadow-xs ${
                                    isEvenWeek ? "bg-blue-500" : "bg-emerald-500"
                                  }`}
                                />
                                <span
                                  className={`font-bold text-xs tracking-wide ${
                                    isEvenWeek
                                      ? "text-blue-900 dark:text-blue-300"
                                      : "text-emerald-900 dark:text-emerald-300"
                                  }`}
                                >
                                  TUẦN {item.week} {item.week <= 18 ? "(Học kỳ 1)" : "(Học kỳ 2)"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                  {weekItems.length} tiết (
                                  <strong className={isEvenWeek ? "text-blue-700 dark:text-blue-400" : "text-emerald-700 dark:text-emerald-400"}>
                                    {chinhKhoaCount} chính khóa
                                  </strong>
                                  {chuyenDeCount > 0 && (
                                    <>
                                      {" + "}
                                      <strong className="text-purple-700 dark:text-purple-400">
                                        {chuyenDeCount} chuyên đề
                                      </strong>
                                    </>
                                  )}
                                  )
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Lesson Row */}
                      <tr
                        className={`transition-colors border-b border-[#d0d7de] dark:border-[#30363d] ${
                          selectedIds.includes(item.id)
                            ? "bg-emerald-100/50 dark:bg-emerald-950/40"
                            : isEvenWeek
                            ? "bg-blue-50/20 dark:bg-[#161e2b]/40 hover:bg-blue-50/50 dark:hover:bg-[#1a2536]"
                            : "bg-white dark:bg-[#0d1117] hover:bg-emerald-50/30 dark:hover:bg-[#12221e]"
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedIds.includes(item.id)}
                              onCheckedChange={() => handleToggleSelectItem(item.id)}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-medium">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              isEvenWeek
                                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                            }`}
                          >
                            T.{item.week}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold">
                          {isChuyenDeLesson(item.lesson_number, item.notes, item.lesson_title) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-2xs">
                              {formatPPCTLessonNumber(item.lesson_number, item.notes, item.lesson_title)}
                            </span>
                          ) : (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                              {item.lesson_number}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{item.grade}</td>
                        <td className="px-4 py-2.5 font-medium">{item.subject}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#24292f] dark:text-[#c9d1d9]">
                          {item.lesson_title}
                        </td>

                        <td className="px-4 py-2.5 text-slate-500 text-[11px] truncate max-w-xs">
                          {item.notes || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicateItem(item)}
                              className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              title="Nhân bản tiết tiếp theo"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            Hiển thị: <strong>{filteredItems.length}</strong> / {items.length} tiết PPCT
          </span>
          {selectedIds.length > 0 && (
            <span className="text-emerald-600 font-semibold">
              Đang chọn {selectedIds.length} tiết
            </span>
          )}
        </div>
      </div>

      {/* Upload & Paste Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] md:max-w-[760px] p-5 sm:p-7 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Nạp PPCT (File hoặc Dán Ctrl+V)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Khối lớp áp dụng</label>
                <Select value={uploadGrade} onValueChange={setUploadGrade}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Khối 10">Khối 10</SelectItem>
                    <SelectItem value="Khối 11">Khối 11</SelectItem>
                    <SelectItem value="Khối 12">Khối 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Môn học</label>
                <Select value={uploadSubject} onValueChange={setUploadSubject}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toán">Toán</SelectItem>
                    <SelectItem value="Hoạt động trải nghiệm, hướng nghiệp">HĐTN, HN (Hoạt động trải nghiệm)</SelectItem>
                    <SelectItem value="Ngữ văn">Ngữ văn</SelectItem>
                    <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
                    <SelectItem value="Vật lí">Vật lí</SelectItem>
                    <SelectItem value="Hóa học">Hóa học</SelectItem>
                    <SelectItem value="Sinh học">Sinh học</SelectItem>
                    <SelectItem value="Lịch sử">Lịch sử</SelectItem>
                    <SelectItem value="Địa lí">Địa lí</SelectItem>
                    <SelectItem value="Giáo dục kinh tế và pháp luật">GDKT & PL / GDCD</SelectItem>
                    <SelectItem value="Tin học">Tin học</SelectItem>
                    <SelectItem value="Công nghệ">Công nghệ</SelectItem>
                    <SelectItem value="Giáo dục thể chất">GDTC / Thể dục</SelectItem>
                    <SelectItem value="Giáo dục quốc phòng và an ninh">GDQP - AN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <span>Tải file (.xlsx / .docx / .pdf)</span>
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
                    Chọn file Excel (.xlsx), Word (.docx) hoặc PDF (.pdf)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    File PDF được gửi trực tiếp lên Gemini Multimodal AI để trích xuất toàn diện 100% chính xác
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.docx,.pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block mx-auto text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer pt-2 max-w-full"
                />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold pt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini AI đang đọc và trích xuất dữ liệu PPCT...</span>
                  </div>
                )}
              </div>
            ) : uploadTab === "paste" ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Dán nội dung bảng sao chép (từ Excel, Word hoặc PDF):
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="h-6 text-[11px] gap-1 px-2 border-[#d0d7de] self-start sm:self-auto"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Dán nhanh Clipboard
                  </Button>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Dán các dòng tiết học vào đây (Ctrl+V). Ví dụ:\n1\tBài 1: Mệnh đề\tPhiếu học tập 1\n2\tBài 2: Tập hợp\t\n3\tBài 3: Các phép toán trên tập hợp`}
                  rows={6}
                  className="w-full rounded-md border border-[#d0d7de] dark:border-[#30363d] bg-transparent p-2.5 font-mono text-xs text-[#24292f] dark:text-[#c9d1d9] focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold pt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích dữ liệu dán...
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Ảnh chụp bảng phân phối chương trình:
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteImageFromClipboard}
                    className="h-6 text-[11px] gap-1 px-2 border-[#d0d7de] self-start sm:self-auto"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Dán ảnh từ Clipboard
                  </Button>
                </div>

                {imagePreviewUrl ? (
                  <div className="relative border-2 border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-xl p-3 text-center space-y-2">
                    <div className="relative max-h-56 overflow-hidden rounded-lg flex items-center justify-center bg-black/5 dark:bg-black/40">
                      <img
                        src={imagePreviewUrl}
                        alt="Ảnh chụp PPCT"
                        className="max-h-52 object-contain rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPastedImage(null);
                          setImagePreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-transform hover:scale-105"
                        title="Xóa ảnh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 px-1">
                      <span className="truncate max-w-[200px] font-medium">
                        {pastedImage?.name || "Ảnh từ Clipboard"} (
                        {pastedImage ? `${(pastedImage.size / 1024).toFixed(0)} KB` : ""})
                      </span>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="text-emerald-600 hover:underline font-semibold"
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
                        Nhấn Ctrl+V để dán ảnh chụp từ Clipboard
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Hoặc bấm vào đây để chọn file ảnh (.png, .jpg, .jpeg, .webp)
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Gemini Vision AI tự động nhận diện tuần, tiết và tên bài học
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
                    <span>Gemini Vision AI đang phân tích ảnh bảng PPCT, vui lòng chờ giây lát...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(false)}
              className="text-xs h-8"
              disabled={isUploading || isVisionAnalyzing}
            >
              Hủy
            </Button>
            {uploadTab === "paste" && (
              <Button
                size="sm"
                onClick={handlePasteSubmit}
                disabled={isUploading || !pastedText.trim()}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Nhập dữ liệu đã dán
              </Button>
            )}
            {uploadTab === "image" && (
              <Button
                size="sm"
                onClick={handleVisionImageSubmit}
                disabled={isVisionAnalyzing || !pastedImage}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
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

      {/* Manual Add / Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              {editingItem ? <Edit2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Plus className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{editingItem ? "Chỉnh Sửa Tiết PPCT" : "Thêm Tiết Dạy Vào PPCT"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Khối</label>
                <Select
                  value={manualForm.grade}
                  onValueChange={(val) => setManualForm({ ...manualForm, grade: val })}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Khối 10">Khối 10</SelectItem>
                    <SelectItem value="Khối 11">Khối 11</SelectItem>
                    <SelectItem value="Khối 12">Khối 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Môn học</label>
                <Select
                  value={manualForm.subject}
                  onValueChange={(val) => setManualForm({ ...manualForm, subject: val })}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toán">Toán</SelectItem>
                    <SelectItem value="Hoạt động trải nghiệm, hướng nghiệp">HĐTN, HN (Hoạt động trải nghiệm)</SelectItem>
                    <SelectItem value="Ngữ văn">Ngữ văn</SelectItem>
                    <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
                    <SelectItem value="Vật lí">Vật lí</SelectItem>
                    <SelectItem value="Hóa học">Hóa học</SelectItem>
                    <SelectItem value="Sinh học">Sinh học</SelectItem>
                    <SelectItem value="Lịch sử">Lịch sử</SelectItem>
                    <SelectItem value="Địa lí">Địa lí</SelectItem>
                    <SelectItem value="Giáo dục kinh tế và pháp luật">GDKT & PL / GDCD</SelectItem>
                    <SelectItem value="Tin học">Tin học</SelectItem>
                    <SelectItem value="Công nghệ">Công nghệ</SelectItem>
                    <SelectItem value="Giáo dục thể chất">GDTC / Thể dục</SelectItem>
                    <SelectItem value="Giáo dục quốc phòng và an ninh">GDQP - AN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Tuần thứ</label>
                <Input
                  type="number"
                  value={manualForm.week}
                  onChange={(e) => setManualForm({ ...manualForm, week: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Tiết PPCT</label>
                <Input
                  type="number"
                  value={manualForm.lesson_number}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, lesson_number: Number(e.target.value) })
                  }
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">
                Tên bài dạy / Nội dung <span className="text-red-500">*</span>
              </label>
              <Input
                value={manualForm.lesson_title}
                onChange={(e) => setManualForm({ ...manualForm, lesson_title: e.target.value })}
                placeholder="Ví dụ: Bài 1: Mệnh đề toán học..."
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Ghi chú / Thiết bị ĐDDH</label>
              <Input
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                placeholder="Ví dụ: Máy chiếu, phiếu học tập số 1..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(false)}
              className="text-xs h-8"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveManualOrEdit}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editingItem ? "Lưu thay đổi" : "Thêm vào PPCT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
