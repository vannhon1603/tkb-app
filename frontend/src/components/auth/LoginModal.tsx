"use client";

import React, { useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "next-themes";
import {
  LogOut,
  ShieldCheck,
  User,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { user, isGoogleUser, loginWithGoogle, logout } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  const gsiInitializedRef = useRef(false);

  // Handle Google Credential Callback
  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (response?.credential) {
        try {
          await loginWithGoogle(response.credential);
          onOpenChange(false);
        } catch (e: any) {
          toast.error("Đăng nhập Google thất bại");
        }
      }
    },
    [loginWithGoogle, onOpenChange]
  );

  // Initialize GSI and render button
  useEffect(() => {
    if (!open) return;

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

        const btnElement = document.getElementById("google-signin-btn-container");
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

    // Retry until script is ready
    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGsi();
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [open, currentTheme, handleCredentialResponse]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-2xl">
        {/* Header decoration banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 sm:p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -left-8 -top-8 w-28 h-28 bg-emerald-300/20 rounded-full blur-xl" />
          
          <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-white">
            Tài Khoản Giáo Viên
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-white/80 mt-1 max-w-xs mx-auto">
            Đăng nhập với Google để đồng bộ thời khóa biểu và sổ báo giảng theo tài khoản của bạn.
          </DialogDescription>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* If user is already logged in, show profile card */}
          {user && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-[#d0d7de] dark:border-[#30363d] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tài khoản hiện tại
                </span>
                {isGoogleUser ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Google Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    <User className="w-3 h-3" />
                    Giáo viên
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0 shadow-xs flex items-center justify-center bg-emerald-100 text-emerald-800 font-bold text-sm">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email || "Chưa có email"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Đăng xuất
                </Button>
              </div>
            </div>
          )}

          {/* Google Login Section */}
          <div className="space-y-4 text-center">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3.5 text-left text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đăng nhập tài khoản Google
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Sử dụng tài khoản Google để đăng nhập an toàn, tiện lợi và tự động đồng bộ thời khóa biểu.
              </p>
            </div>

            {/* Rendered Google Identity Button */}
            <div className="flex justify-center items-center min-h-[50px] py-1">
              <div id="google-signin-btn-container" className="inline-block" />
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-[#30363d]">
            Hệ thống Thời Khóa Biểu & Sổ Báo Giảng Tự Động © {new Date().getFullYear()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
