"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Settings,
  User,
  Moon,
  Sun,
  Menu,
  BookOpen,
  Search,
  LogOut,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "./AuthProvider";
import { BackendStatusBadge } from "./BackendWarmup";
import LoginModal from "@/components/auth/LoginModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TAB_DESCRIPTIONS: Record<string, string> = {
  "so-bao-giang": "Sổ báo giảng & Theo dõi tiến độ dạy học thông minh",
  ppct: "Quản lý & Tải lên phân phối chương trình môn học",
  tkb: "Quản lý & Tải lên thời khóa biểu tuần của giáo viên",
  students: "Quản lý danh sách học sinh theo từng lớp học",
  attendance: "Sổ điểm danh chuyên cần theo ngày & theo tiết",
  "bonus-points": "Sổ theo dõi thi đua & Chấm điểm thưởng học sinh",
  tasks: "Kế hoạch công việc, soạn giáo án & Hạn chót",
  dashboard: "Tổng quan bảng điều khiển & Thống kê",
  "data-table": "Quản lý dữ liệu & Danh sách bản ghi",
  "form-editor": "Biên tập & Tạo mới biểu mẫu",
  analytics: "Báo cáo phân tích & Biểu đồ trực quan",
  settings: "Cài đặt tham số & Cấu hình Gemini Key",
  guide: "Tài liệu & Hướng dẫn sử dụng hệ thống",
};

interface NavbarProps {
  title: string;
  activeTab?: string;
  onMenuClick?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenApiKeyModal?: () => void;
}

export default function Navbar({
  title,
  activeTab = "so-bao-giang",
  onMenuClick,
  onNavigateTab,
  onOpenApiKeyModal,
}: NavbarProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, isGoogleUser, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 60_000);
    return () => clearInterval(timer);
  }, []);

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";
  const subtitle = TAB_DESCRIPTIONS[activeTab] || "";

  return (
    <header className="bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] px-3 sm:px-6 py-2 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mobile menu toggle + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-slate-600 dark:text-slate-400 hover:bg-[#e8ebed] dark:hover:bg-[#30363d] shrink-0"
            onClick={onMenuClick}
            aria-label="Mở menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-400 dark:text-slate-500 font-normal text-xs hidden sm:inline">
                Hệ Thống
              </span>
              <span className="text-slate-300 dark:text-slate-600 text-xs hidden sm:inline">
                /
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] truncate max-w-[130px] sm:max-w-xs">
                {title}
              </h1>
            </div>
            {/* Subtitle description */}
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate max-w-[180px] sm:max-w-sm hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Controls & actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Help Link */}
          {onNavigateTab && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("guide")}
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white h-8 px-2.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Hướng Dẫn</span>
            </Button>
          )}

          {/* Gemini API Key Button */}
          {onOpenApiKeyModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenApiKeyModal}
              className="h-8 text-xs gap-1.5 px-2 sm:px-3 border-[#d0d7de] dark:border-[#30363d] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              title="Cấu hình Gemini API Key"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Gemini Key</span>
            </Button>
          )}

          {/* Server Live Status Badge & Wakeup */}
          <BackendStatusBadge />

          {/* Clock badge */}
          {currentTime && (
            <div className="hidden xl:flex items-center px-2 py-1 bg-white/70 dark:bg-[#0d1117]/70 border border-[#d0d7de] dark:border-[#30363d] rounded text-[11px] font-mono text-slate-600 dark:text-slate-400">
              {currentTime}
            </div>
          )}

          {/* Dark / Light Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:bg-[#eaeef2] dark:hover:bg-[#21262d]"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              title={isDark ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </Button>
          )}

          {/* Notifications button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:bg-[#eaeef2] dark:hover:bg-[#21262d] relative"
            title="Thông báo"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#161b22]" />
          </Button>

          {/* Google Sign In / Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 pl-1.5 pr-2.5 gap-2 border border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] rounded-full"
              >
                {user?.picture ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-blue-400 shrink-0">
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="text-xs font-medium text-[#24292f] dark:text-[#c9d1d9] hidden md:inline max-w-[110px] truncate">
                  {user?.name || "Người dùng"}
                </span>
                {isGoogleUser && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 hidden sm:inline-block" title="Đã kết nối Google" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1.5">
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold leading-none text-[#24292f] dark:text-[#c9d1d9] truncate">
                      {user?.name || "Giáo viên"}
                    </p>
                    {isGoogleUser ? (
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                        Google
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        Giáo viên
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-none text-slate-500 truncate">
                    {user?.email || "giaovien@school.edu.vn"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsLoginModalOpen(true)}
                className="cursor-pointer text-xs"
              >
                <User className="mr-2 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Đăng nhập tài khoản Google
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onNavigateTab && onNavigateTab("settings")}
                className="cursor-pointer text-xs"
              >
                <Settings className="mr-2 h-3.5 w-3.5" />
                Cài đặt hệ thống
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onNavigateTab && onNavigateTab("guide")}
                className="cursor-pointer text-xs"
              >
                <BookOpen className="mr-2 h-3.5 w-3.5" />
                Tài liệu hướng dẫn
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer text-xs text-red-600 dark:text-red-400 focus:text-red-600"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Login & Google Auth Modal */}
      <LoginModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </header>
  );
}
