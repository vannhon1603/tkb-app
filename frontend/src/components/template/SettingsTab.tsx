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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [geminiKey, setGeminiKey] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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

  useEffect(() => {
    loadDbInfo();
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("custom_gemini_key") || localStorage.getItem("gemini_api_key") || "";
      if (savedKey) setGeminiKey(savedKey);
    }
  }, []);

  const handleSaveSettings = async () => {
    localStorage.setItem("custom_api_url", apiUrl);
    if (geminiKey.trim()) {
      const trimmed = geminiKey.trim();
      localStorage.setItem("custom_gemini_key", trimmed);
      localStorage.setItem("gemini_api_key", trimmed);
      try {
        await apiClient("/api/gemini/set-key", {
          method: "POST",
          body: JSON.stringify({ api_key: trimmed }),
        });
      } catch (e) {
        console.error("Failed to sync gemini key:", e);
      }
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
    if (!confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu PPCT, TKB và Sổ Báo Giảng trong SQLite không?")) {
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
          Quản lý lưu trữ SQLite, sao lưu file .db, tùy chỉnh giao diện và cấu hình kết nối AI
        </p>
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

      {/* Gemini API Key Configuration */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#d0d7de] dark:border-[#30363d] pb-2 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-emerald-600" />
          Google Gemini AI API Key (Dùng cho AI Vision OCR & Phân tích PPCT)
        </h3>

        <div className="space-y-3 text-xs max-w-lg">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold block text-slate-700 dark:text-slate-300">
                API Key (Google AI Studio)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                Lấy mã API Key miễn phí ↗
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                value={geminiKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setGeminiKey(val);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("custom_gemini_key", val.trim());
                    localStorage.setItem("gemini_api_key", val.trim());
                  }
                }}
                placeholder="Dán mã API Key (AIzaSy...) vào đây..."
                className="h-8 text-xs font-mono flex-1"
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
                    if (typeof window !== "undefined") {
                      localStorage.setItem("custom_gemini_key", trimmed);
                      localStorage.setItem("gemini_api_key", trimmed);
                    }
                    await apiClient("/api/gemini/set-key", {
                      method: "POST",
                      body: JSON.stringify({ api_key: trimmed }),
                    });
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
                className="h-8 text-xs shrink-0 border-[#d0d7de] hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400"
              >
                {isTestingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Lưu & Test Key
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Khóa API được lưu vào hệ thống để dùng cho OCR ảnh chụp, đọc file PDF và tự động đối chiếu PPCT.
            </p>
          </div>
        </div>
      </div>

      {/* Backend API Configuration */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#d0d7de] dark:border-[#30363d] pb-2 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-emerald-600" />
          Kết nối Backend (FastAPI)
        </h3>

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
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
