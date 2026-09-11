"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Server, CheckCircle2, AlertTriangle, RefreshCw, Zap } from "lucide-react";

export type BackendHealthStatus = "checking" | "waking" | "online" | "error";

interface BackendContextType {
  status: BackendHealthStatus;
  responseTime: number | null;
  retryPing: () => void;
  lastPingTime: Date | null;
}

const BackendContext = createContext<BackendContextType>({
  status: "checking",
  responseTime: null,
  retryPing: () => {},
  lastPingTime: null,
});

export function useBackendStatus() {
  return useContext(BackendContext);
}

export function BackendWarmupProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BackendHealthStatus>("checking");
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  };

  const pingBackend = useCallback(async (isRetry = false) => {
    const backendUrl = getBackendUrl();
    const startTime = Date.now();

    // If initial ping or retry, set waking state if it takes longer than 1.5s
    const slowTimer = setTimeout(() => {
      if (isMountedRef.current && status !== "online") {
        setStatus("waking");
      }
    }, 1500);

    try {
      // Abort controller with 45s timeout (Render free instance boot takes ~30-40s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(`${backendUrl}/api/v1/health`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      }).catch(async () => {
        // Fallback to root endpoint if /api/v1/health is unreachable
        return await fetch(`${backendUrl}/`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
      });

      clearTimeout(timeoutId);
      clearTimeout(slowTimer);

      if (!isMountedRef.current) return;

      if (res && res.ok) {
        const duration = Date.now() - startTime;
        setResponseTime(duration);
        setLastPingTime(new Date());
        setStatus("online");
      } else {
        throw new Error(`Server returned ${res?.status}`);
      }
    } catch (err) {
      clearTimeout(slowTimer);
      if (!isMountedRef.current) return;

      console.warn("Backend ping attempt failed, server may be waking up...", err);
      setStatus("waking");

      // Auto retry every 3.5 seconds while waking
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          pingBackend(true);
        }
      }, 3500);
    }
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // 1. Immediate wakeup ping upon opening the website
    pingBackend();

    // 2. Periodic keep-alive ping every 10 minutes to prevent Render free instance from sleeping
    const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const interval = setInterval(() => {
      pingBackend();
    }, KEEP_ALIVE_INTERVAL);

    // 3. Ping on tab visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pingBackend();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pingBackend]);

  return (
    <BackendContext.Provider
      value={{
        status,
        responseTime,
        retryPing: () => pingBackend(true),
        lastPingTime,
      }}
    >
      {children}
    </BackendContext.Provider>
  );
}

/**
 * Compact Status Badge for Navbar or Footer
 */
export function BackendStatusBadge() {
  const { status, responseTime, retryPing } = useBackendStatus();

  if (status === "online") {
    return (
      <div
        className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded text-[11px] text-emerald-700 dark:text-emerald-400 font-medium"
        title={`Máy chủ hoạt động bình thường (${responseTime || 0}ms)`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-sans">Server Online</span>
      </div>
    );
  }

  if (status === "waking" || status === "checking") {
    return (
      <button
        onClick={retryPing}
        className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded text-[11px] text-amber-700 dark:text-amber-400 font-medium hover:bg-amber-100 transition-colors"
        title="Máy chủ đang khởi động lại, bấm để thử lại"
      >
        <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
        <span className="font-sans">Đang kết nối Server...</span>
      </button>
    );
  }

  return (
    <button
      onClick={retryPing}
      className="flex items-center gap-1.5 px-2 py-1 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded text-[11px] text-rose-700 dark:text-rose-400 font-medium hover:bg-rose-100 transition-colors"
      title="Không thể kết nối máy chủ, bấm để thử lại"
    >
      <AlertTriangle className="h-3 w-3 text-rose-500" />
      <span className="font-sans">Thử kết nối lại</span>
    </button>
  );
}
