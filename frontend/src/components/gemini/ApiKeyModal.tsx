"use client";

import { useState, useEffect } from "react";
import {
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  BookOpen,
  Copy,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { toast } from "react-hot-toast";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeySaved?: () => void;
  defaultTab?: "input" | "guide";
}

export function ApiKeyModal({ open, onOpenChange, onKeySaved, defaultTab = "input" }: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<"input" | "guide">(defaultTab);
  const [apiKey, setApiKey] = useState("");
  const [keySource, setKeySource] = useState<"custom" | "env" | "none">("none");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      const storedKey = localStorage.getItem("custom_gemini_key") || "";
      setApiKey(storedKey);
      setTestResult(null);

      // Check backend key status to see if loaded from .env
      apiClient<{ configured: boolean; source: string; masked_key?: string }>("/api/gemini/status")
        .then((res) => {
          if (res.configured) {
            setKeySource(res.source as any);
            if (!storedKey && res.masked_key) {
              setApiKey(res.masked_key);
            }
          }
        })
        .catch(() => {});
    }
  }, [open, defaultTab]);

  const handleTestKey = async () => {
    // If testing masked key from env, pass empty or stored
    const keyToTest = apiKey.includes("...") ? undefined : apiKey.trim();

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient<{ success: boolean; message: string }>("/api/gemini/test", {
        method: "POST",
        body: JSON.stringify(keyToTest ? { api_key: keyToTest } : {}),
      });
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || "Lỗi kiểm tra API Key";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Vui lòng nhập API Key");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient("/api/gemini/set-key", {
        method: "POST",
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      localStorage.setItem("custom_gemini_key", apiKey.trim());
      setKeySource("custom");
      toast.success("Đã lưu Gemini API Key thành công!");
      if (onKeySaved) onKeySaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Không thể lưu API Key");
    } finally {
      setIsSaving(false);
    }
  };


  const handleCopySample = () => {
    navigator.clipboard.writeText("https://aistudio.google.com/app/apikey");
    toast.success("Đã sao chép đường dẫn Google AI Studio!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 sm:p-5 text-white relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-white leading-tight">
                  Cấu Hình & Hướng Dẫn Gemini API Key
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-white/80 mt-0.5">
                  Mô hình Google Gemini 2.0 / 1.5 Flash hoàn toàn miễn phí
                </DialogDescription>
              </div>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 text-xs bg-white text-emerald-800 font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-50 transition-colors shrink-0 w-full sm:w-auto"
            >
              Mở AI Studio <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4 border-t border-white/20 pt-2.5 sm:pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("input")}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "input"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Điền & Kiểm tra Key
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "guide"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Hướng dẫn lấy Key (5 bước)
            </button>
          </div>
        </div>

        {/* Tab 1: Input & Test Key */}
        {activeTab === "input" && (
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Hoàn toàn Miễn phí & An toàn</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Google cung cấp gói <strong>Free Tier</strong> miễn phí cho Gemini API với hạn mức lớn mỗi ngày. API Key của bạn được lưu an toàn cục bộ trong trình duyệt và backend của bạn.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  Nhập Google Gemini API Key
                  {keySource === "env" && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      ⚡ Đang dùng từ .env
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("guide")}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-normal text-[11px]"
                >
                  <HelpCircle className="w-3 h-3" /> Chưa có key? Xem hướng dẫn
                </button>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  className="pl-9 text-xs font-mono h-9"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {keySource === "env" ? (
                  <span>Hệ thống đã nhận diện khóa API từ file <code className="font-mono text-blue-600">.env</code>. Bạn có thể bấm "Kiểm tra kết nối" ngay bên dưới.</span>
                ) : (
                  <span>Khóa thường bắt đầu bằng chuỗi ký tự <code className="font-mono text-emerald-600">AIzaSy...</code></span>
                )}
              </p>
            </div>


            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  testResult.success
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span className="leading-snug">{testResult.message}</span>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0 border-t border-slate-100 dark:border-[#30363d]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestKey}
                disabled={isTesting || isSaving || !apiKey.trim()}
                className="text-xs h-8 mr-auto border-[#d0d7de] dark:border-[#30363d]"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Kiểm tra kết nối
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Đóng
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isTesting || !apiKey.trim()}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Lưu API Key
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Tab 2: Step-by-Step Guide */}
        {activeTab === "guide" && (
          <div className="p-5 space-y-4 text-xs max-h-[460px] overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-slate-200/60 dark:border-[#30363d]">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Truy cập trang Google AI Studio
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mở trang quản lý khóa API của Google tại đường dẫn:
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#161b22] border border-emerald-300 dark:border-emerald-800 rounded text-emerald-700 dark:text-emerald-400 font-mono text-[11px] hover:underline"
                    >
                      https://aistudio.google.com/app/apikey
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopySample}
                      className="h-6 text-[10px] px-1.5 text-slate-400 hover:text-slate-700"
                      title="Sao chép link"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-slate-200/60 dark:border-[#30363d]">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Đăng nhập bằng tài khoản Google (Gmail)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Đăng nhập tài khoản Google cá nhân của bạn và đồng ý các điều khoản sử dụng miễn phí của Google AI Studio.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-slate-200/60 dark:border-[#30363d]">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Nhấn nút "Create API Key" (Tạo Khóa API)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ở góc trên bên trái giao diện, bấm vào nút màu xanh có chữ <strong>"Create API key"</strong> hoặc <strong>"Get API key"</strong>.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-slate-200/60 dark:border-[#30363d]">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Chọn "Create key in new project"
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Chọn dự án hiện có hoặc chọn <strong>"Create key in new project"</strong> rồi nhấn <strong>"Create key"</strong>. Hệ thống sẽ sinh ra một chuỗi mã API Key.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-slate-200/60 dark:border-[#30363d]">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  5
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Sao chép mã & Dán vào ứng dụng
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Bấm <strong>Copy</strong> đoạn mã (dạng <code className="font-mono text-emerald-600 font-bold">AIzaSy...</code>) và chuyển sang tab <strong>"Điền & Kiểm tra Key"</strong> để dán vào và nhấn <strong>Lưu API Key</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-[#30363d]">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold text-xs"
              >
                Mở Google AI Studio ngay <ExternalLink className="w-3 h-3" />
              </a>

              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab("input")}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
              >
                Đã có Key, chuyển sang Nhập Key <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
