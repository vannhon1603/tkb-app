"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Laptop,
  Palette,
  Server,
  Key,
  Database,
  Download,
  Sparkles,
  Trash2,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Cpu,
  Layers,
  FileSpreadsheet,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { toast } from "react-hot-toast";

interface DatabaseInfo {
  status: string;
  engine: string;
  version: string;
  journal_mode: string;
  database_url: string;
  file_path: string;
  file_size: string;
  file_size_bytes: number;
  last_modified: string | null;
  counts: {
    ppct: number;
    tkb_slots: number;
    so_bao_giang_entries: number;
    items: number;
    settings: number;
    total_records: number;
  };
}

interface ServerHealthInfo {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  keep_alive?: {
    enabled: boolean;
    target_url: string;
    interval_seconds: number;
    total_pings: number;
    successful_pings: number;
    failed_pings: number;
    last_ping_time: string | null;
    uptime_seconds: number;
    is_running: boolean;
  };
}

export function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [geminiKey, setGeminiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [healthInfo, setHealthInfo] = useState<ServerHealthInfo | null>(null);

  const loadDbInfo = async () => {
    setIsLoadingDb(true);
    try {
      const data = await apiClient<DatabaseInfo>("/api/database/info");
      setDbInfo(data);
    } catch (e) {
      console.error("Failed to load db info", e);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const loadHealthInfo = async () => {
    try {
      const data = await apiClient<ServerHealthInfo>("/api/health");
      setHealthInfo(data);
    } catch (e) {
      console.error("Failed to load health info", e);
    }
  };

  useEffect(() => {
    loadDbInfo();
    loadHealthInfo();
    if (typeof window !== "undefined") {
      const savedKey =
        localStorage.getItem("custom_gemini_key") ||
        localStorage.getItem("gemini_api_key") ||
        "";
      if (savedKey) setGeminiKey(savedKey);

      const savedModel =
        localStorage.getItem("gemini_selected_model") ||
        localStorage.getItem("custom_gemini_model") ||
        "gemini-2.0-flash-lite";
      setSelectedModel(savedModel);

      const savedUrl = localStorage.getItem("custom_api_url");
      if (savedUrl) setApiUrl(savedUrl);
    }
  }, []);

  const handleSaveAndSyncKey = async (key: string) => {
    const trimmed = key.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("custom_gemini_key", trimmed);
      localStorage.setItem("gemini_api_key", trimmed);
    }
    try {
      await apiClient("/api/gemini/set-key", {
        method: "POST",
        body: JSON.stringify({ api_key: trimmed }),
      });
    } catch (e) {
      console.error("Failed to sync gemini key:", e);
    }
  };

  const handleSaveSettings = async () => {
    localStorage.setItem("custom_api_url", apiUrl);
    if (geminiKey.trim()) {
      await handleSaveAndSyncKey(geminiKey);
    }
    toast.success("Đã lưu cấu hình hệ thống thành công!");
  };

  const handleDownloadBackup = () => {
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    window.open(`${BASE_URL}/api/database/backup`, "_blank");
    toast.success("Đang tải xuống file sao lưu SQLite (app.db)...");
  };

  const handleVacuumDb = async () => {
    setIsVacuuming(true);
    try {
      const res = await apiClient<{ message: string; current_size: string }>("/api/database/vacuum", {
        method: "POST",
      });
      toast.success(res.message);
      loadDbInfo();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi tối ưu SQLite");
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await apiClient<{ message: string }>("/api/settings/seed-demo", {
        method: "POST",
      });
      toast.success(res.message);
      loadDbInfo();
    } catch (e: any) {
      toast.error(e?.message || "Không thể nạp dữ liệu mẫu");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetDb = async () => {
    if (
      !confirm(
        "CẢNH BÁO: Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu PPCT, TKB và Sổ Báo Giảng trong SQLite không?"
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await apiClient<{ message: string }>("/api/database/reset", {
        method: "POST",
      });
      toast.success(res.message);
      loadDbInfo();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi đặt lại CSDL");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <h2 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">
          Cài Đặt Hệ Thống & Quản Lý Cơ Sở Dữ Liệu SQLite
        </h2>
        <p className="text-[11px] text-slate-500">
          Quản lý lưu trữ SQLite, sao lưu file .db, cấu hình Gemini AI API Key, Model AI và kết nối Backend
        </p>
      </div>

      {/* Gemini API Key & Model Configuration Banner matching screenshot */}
      <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
        <div className="flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Gemini API Key (Dùng để AI Vision & Multimodal trích xuất 100%):
          </span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-normal"
          >
            Lấy Key miễn phí ↗
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
          <div className="sm:col-span-2 flex items-center gap-2">
            <Input
              type="password"
              placeholder="Dán mã API Key (AIzaSy...) vào đây..."
              value={geminiKey}
              onChange={(e) => {
                const val = e.target.value;
                setGeminiKey(val);
                if (typeof window !== "undefined") {
                  localStorage.setItem("custom_gemini_key", val);
                  localStorage.setItem("gemini_api_key", val);
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleSaveAndSyncKey(e.target.value);
                }
              }}
              className="h-8 text-xs bg-white dark:bg-[#0d1117] border-amber-300 dark:border-amber-700 flex-1 font-mono"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isTestingKey}
              onClick={async () => {
                if (!geminiKey.trim()) {
                  toast.error("Vui lòng nhập API Key");
                  return;
                }
                setIsTestingKey(true);
                try {
                  const trimmed = geminiKey.trim();
                  await handleSaveAndSyncKey(trimmed);
                  const res = await apiClient<{ success: boolean; message: string }>("/api/gemini/test", {
                    method: "POST",
                    body: JSON.stringify({ api_key: trimmed }),
                  });
                  if (res.success) {
                    toast.success("✅ " + res.message);
                  } else {
                    toast.error("❌ " + res.message);
                  }
                } catch (err: any) {
                  toast.error(err?.message || "Lỗi kiểm tra key");
                } finally {
                  setIsTestingKey(false);
                }
              }}
              className="h-8 text-xs shrink-0 bg-white dark:bg-[#0d1117] border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-semibold"
            >
              {isTestingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Lưu & Test Key
            </Button>
          </div>
          <div>
            <Select
              value={selectedModel}
              onValueChange={(val) => {
                setSelectedModel(val);
                if (typeof window !== "undefined") {
                  localStorage.setItem("gemini_selected_model", val);
                  localStorage.setItem("custom_gemini_model", val);
                }
                toast.success(`Đã chọn mô hình: ${val}`);
              }}
            >
              <SelectTrigger className="h-8 text-[11px] bg-white dark:bg-[#0d1117] border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-medium">
                <SelectValue placeholder="Chọn Model AI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.0-flash-lite">⚡ 2.0 Flash Lite (Siêu tốc)</SelectItem>
                <SelectItem value="gemini-2.0-flash">🚀 2.0 Flash (Mới nhất)</SelectItem>
                <SelectItem value="gemini-1.5-flash-8b">⚡ 1.5 Flash 8B (Nhẹ)</SelectItem>
                <SelectItem value="gemini-1.5-flash">⚡ 1.5 Flash (Chuẩn)</SelectItem>
                <SelectItem value="gemini-1.5-pro">💎 1.5 Pro (Độ nét cao)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-amber-700/80 dark:text-amber-400/80 pt-0.5">
          <span>* Hệ thống tự động gửi API Key và Model được chọn cho mọi lượt trích xuất.</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Model hiện tại: {selectedModel}
          </span>
        </div>
      </div>

      {/* SQLite Database Management Card */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d0d7de] dark:border-[#30363d] pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Cơ Sở Dữ Liệu SQLite (app.db)
          </h3>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 font-mono font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              SQLite3 {dbInfo?.version ? `v${dbInfo.version}` : "Active"} (WAL Mode)
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadDbInfo}
              disabled={isLoadingDb}
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
              title="Làm mới thông tin CSDL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Database Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-[#d0d7de] dark:border-[#30363d] space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              Dung lượng file
            </div>
            <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
              {dbInfo?.file_size || "112.0 KB"}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-[#d0d7de] dark:border-[#30363d] space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              Tiết PPCT
            </div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {dbInfo?.counts.ppct ?? 0} tiết
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-[#d0d7de] dark:border-[#30363d] space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
              Tiết dạy TKB
            </div>
            <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
              {dbInfo?.counts.tkb_slots ?? 0} tiết
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-[#d0d7de] dark:border-[#30363d] space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              Sổ Báo Giảng
            </div>
            <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
              {dbInfo?.counts.so_bao_giang_entries ?? 0} dòng
            </div>
          </div>
        </div>

        {/* Database File Path Note */}
        {dbInfo?.file_path && (
          <div className="p-2.5 bg-slate-50 dark:bg-[#0d1117] rounded-md border border-[#d0d7de] dark:border-[#30363d] text-[11px] text-slate-500 font-mono break-all">
            📁 Vị trí lưu trữ: <span className="text-slate-700 dark:text-slate-300">{dbInfo.file_path}</span>
          </div>
        )}

        {/* Database Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleDownloadBackup}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Sao Lưu CSDL SQLite (.db)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleVacuumDb}
            disabled={isVacuuming}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVacuuming ? "animate-spin" : ""}`} />
            Tối ưu hóa (VACUUM)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="h-8 text-xs gap-1.5 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Nạp Dữ Liệu Mẫu (Demo)
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetDb}
            disabled={isResetting}
            className="h-8 text-xs gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Làm sạch CSDL
          </Button>
        </div>
      </div>

      {/* Theme & Appearance */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#d0d7de] dark:border-[#30363d] pb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-emerald-600" />
          Chế độ giao diện (Appearance)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-2 ${
              theme === "light"
                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600"
                : "border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d]"
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-semibold">Giao diện Sáng (Light)</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-2 ${
              theme === "dark"
                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600"
                : "border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d]"
            }`}
          >
            <Moon className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold">Giao diện Tối (Dark)</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-3.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-2 ${
              theme === "system"
                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600"
                : "border-[#d0d7de] dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d]"
            }`}
          >
            <Laptop className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-semibold">Theo hệ điều hành</span>
          </button>
        </div>
      </div>

      {/* Backend API Configuration & Status */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#d0d7de] dark:border-[#30363d] pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            Kết nối Backend (FastAPI) & Trạng thái Keep-Alive
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadHealthInfo}
            className="h-7 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            Kiểm tra trạng thái
          </Button>
        </div>

        {healthInfo && (
          <div className="p-3 bg-slate-50 dark:bg-[#0d1117] rounded-lg border border-[#d0d7de] dark:border-[#30363d] space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Server: {healthInfo.service} ({healthInfo.environment})
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                {healthInfo.status.toUpperCase()}
              </Badge>
            </div>
            {healthInfo.keep_alive && (
              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span>Keep-Alive Auto-Ping:</span>
                  <span className="font-semibold text-emerald-600">
                    {healthInfo.keep_alive.enabled ? "Đang bật (Mỗi 10 phút)" : "Tắt"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tổng số pings thành công:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {healthInfo.keep_alive.successful_pings} / {healthInfo.keep_alive.total_pings}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 text-xs max-w-md">
          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Địa chỉ Backend Endpoint (API URL)
            </label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="h-8 text-xs font-mono"
            />
          </div>

          <Button
            size="sm"
            onClick={handleSaveSettings}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}

