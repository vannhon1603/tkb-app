"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "next-themes";
import {
  Sparkles,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  School,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

export function GoogleAuthScreen() {
  const { loginWithGoogle } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  const gsiInitializedRef = useRef(false);

  // Handle Google Credential Callback
  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (response?.credential) {
        try {
          const success = await loginWithGoogle(response.credential);
          if (success) {
            toast.success("Đăng nhập bằng tài khoản Google thành công!");
          }
        } catch (e: any) {
          toast.error("Đăng nhập Google thất bại: " + (e?.message || ""));
        }
      }
    },
    [loginWithGoogle]
  );

  // Initialize GSI and render button
  useEffect(() => {
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "359719086023-56nmtffqumnu4n0gkqqiq2r97com31ou.apps.googleusercontent.com";

    const initGsi = () => {
      if (typeof window === "undefined" || !(window as any).google?.accounts?.id) return;

      const google = (window as any).google;
      try {
        if (!gsiInitializedRef.current) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });
          gsiInitializedRef.current = true;
        }

        const btnElement = document.getElementById("google-main-signin-btn");
        if (btnElement) {
          btnElement.innerHTML = "";
          google.accounts.id.renderButton(btnElement, {
            theme: currentTheme === "dark" ? "filled_black" : "outline",
            size: "large",
            width: 320,
            shape: "pill",
            text: "signin_with",
            logo_alignment: "left",
          });
        }
      } catch (e) {
        console.error("Failed to render Google button:", e);
      }
    };

    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGsi();
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [currentTheme, handleCredentialResponse]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 dark:from-[#0d1117] dark:via-[#161b22] dark:to-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/15 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[#d0d7de] dark:border-[#30363d] bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-xl shadow-2xl overflow-hidden relative z-10">
        {/* Left Col: Hero Showcase */}
        <div className="lg:col-span-7 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold shadow-inner">
              <School className="w-4 h-4 text-emerald-300" />
              <span>Hệ Thống Quản Lý Giáo Dục Thông Minh</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                Tự Động Sinh Sổ Báo Giảng & Lịch Dạy TKB
              </h1>
              <p className="text-xs md:text-sm text-white/85 leading-relaxed">
                Giải pháp số hóa phân phối chương trình, đối soát thời khóa biểu và sinh sổ báo giảng tự động chuẩn Bộ GD&ĐT chỉ với 1 click.
              </p>
            </div>

            {/* Feature Points */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
                <div className="p-1.5 rounded-lg bg-white/20 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white">Tự động ghép nối bài giảng</p>
                  <p className="text-white/75 text-[11px]">Tự động đối chiếu PPCT với TKB từng tuần chính xác 100%</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
                <div className="p-1.5 rounded-lg bg-white/20 shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white">Nhận diện Excel, Word & PDF (AI)</p>
                  <p className="text-white/75 text-[11px]">Nạp nhanh file hoặc dán trực tiếp bảng từ Clipboard (Ctrl+V)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
                <div className="p-1.5 rounded-lg bg-white/20 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white">Xuất File Chuẩn Bộ GD&ĐT</p>
                  <p className="text-white/75 text-[11px]">Xuất file Excel và Word định dạng chuẩn sẵn sàng in ấn</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center justify-between text-[11px] text-white/70">
            <span>© 2026 TKB & Sổ Báo Giảng System</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Bảo mật OAuth 2.0
            </span>
          </div>
        </div>

        {/* Right Col: Google Sign-In Card */}
        <div className="lg:col-span-5 p-8 md:p-10 flex flex-col justify-center items-center text-center space-y-6">
          <div className="space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Đăng Nhập Hệ Thống
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Vui lòng đăng nhập bằng tài khoản Google để đồng bộ dữ liệu giáo viên và sử dụng hệ thống.
            </p>
          </div>

          {/* Google Sign-In Button Container */}
          <div className="w-full space-y-4">
            <div className="flex justify-center min-h-[44px]">
              <div id="google-main-signin-btn" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
