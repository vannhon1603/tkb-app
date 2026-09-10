"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Key, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";

interface ApiKeyBannerProps {
  onOpenModal: () => void;
  refreshTrigger?: number;
}

export function ApiKeyBanner({ onOpenModal, refreshTrigger }: ApiKeyBannerProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkKeyStatus = async () => {
      try {
        const res = await apiClient<{ configured: boolean }>("/api/gemini/status");
        setIsConfigured(res.configured);
      } catch {
        // If backend offline or error, check localStorage
        const localKey = localStorage.getItem("custom_gemini_key");
        setIsConfigured(!!localKey);
      }
    };
    checkKeyStatus();
  }, [refreshTrigger]);

  if (isConfigured === true || isConfigured === null || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 sticky top-[53px] z-30 backdrop-blur-xs">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="truncate">
          <span className="font-semibold">Chưa cấu hình Gemini API Key:</span> Vui lòng nhập API Key để sử dụng tính năng AI hỗ trợ phân tích và tự động sinh sổ báo giảng.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenModal}
          className="h-7 text-xs bg-amber-600 text-white border-transparent hover:bg-amber-700 hover:text-white gap-1 px-2.5 shadow-xs font-semibold"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Điền & Xem hướng dẫn lấy Key</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-400 hover:text-amber-900 p-1 rounded cursor-pointer"
          title="Tạm thời ẩn thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
