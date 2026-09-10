"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard,
  Table,
  FileEdit,
  BarChart3,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Database,
  Calendar,
  Clock,
  LogOut,
  SlidersHorizontal,
  X,
  Users,
  ClipboardCheck,
  Award,
  ListTodo,
} from "lucide-react";
import { TabGroup } from "@/types";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const tabGroups: TabGroup[] = useMemo(
    () => [
      {
        label: "Nghiệp Vụ Giảng Dạy",
        tabs: [
          { id: "so-bao-giang", label: "Sổ Báo Giảng Tự Động", icon: Sparkles, badge: "AI" },
          { id: "ppct", label: "Phân Phối CT (PPCT)", icon: BookOpen },
          { id: "tkb", label: "Thời Khóa Biểu (TKB)", icon: Calendar },
        ],
      },
      {
        label: "Học Sinh & Lớp Học",
        tabs: [
          { id: "students", label: "Danh Sách Học Sinh", icon: Users },
          { id: "attendance", label: "Sổ Điểm Danh Lớp", icon: ClipboardCheck },
          { id: "bonus-points", label: "Thi Đua & Điểm Thưởng", icon: Award },
        ],
      },
      {
        label: "Kế Hoạch & Báo Cáo",
        tabs: [
          { id: "dashboard", label: "Bảng Điều Khiển", icon: LayoutDashboard },
          { id: "tasks", label: "Công Việc & Giáo Án", icon: ListTodo },
          { id: "analytics", label: "Thống Kê Tiến Độ", icon: BarChart3 },
        ],
      },
      {
        label: "Hệ Thống",
        tabs: [
          { id: "settings", label: "Cài Đặt & Gemini Key", icon: Settings },
          { id: "guide", label: "Tài Liệu Hướng Dẫn", icon: BookOpen },
        ],
      },
    ],
    []
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#f6f8fa] dark:bg-[#0d1117] border-r border-[#d0d7de] dark:border-[#30363d] transition-all duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#d0d7de] dark:border-[#30363d] min-h-[53px]">
        <div
          onClick={() => onTabChange("dashboard")}
          className="flex items-center gap-2.5 cursor-pointer select-none overflow-hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-[#24292f] dark:text-[#c9d1d9] tracking-tight leading-none truncate">
                TKB App
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-tight mt-0.5">
                Template v1.0
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {setIsMobileMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-7 w-7 text-slate-500"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation Menu Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
        {tabGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                    title={isCollapsed ? tab.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md text-xs sm:text-xs font-medium transition-all group relative text-left min-h-[38px] sm:min-h-0 ${
                      isActive
                        ? "bg-[#eaeef2] dark:bg-[#21262d] text-emerald-700 dark:text-emerald-400 font-semibold shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-[#ebf0f4] dark:hover:bg-[#161b22] hover:text-[#24292f] dark:hover:text-[#c9d1d9]"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-600 dark:bg-emerald-400 rounded-r" />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate flex-1">{tab.label}</span>
                    )}
                    {!isCollapsed && tab.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Info & Logout on Mobile */}
      {user && (
        <div className="md:hidden p-3 border-t border-[#d0d7de] dark:border-[#30363d] bg-white/60 dark:bg-[#161b22]/60 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user.name ? user.name[0] : "GV"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user.name || "Giáo viên"}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user.email}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full h-8 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </Button>
        </div>
      )}

      {/* Collapse / Expand Toggle (Desktop Only) */}
      <div className="hidden md:flex items-center justify-between p-2 border-t border-[#d0d7de] dark:border-[#30363d] bg-white/40 dark:bg-[#0d1117]/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="w-full h-7 text-xs text-slate-500 dark:text-slate-400 hover:bg-[#eaeef2] dark:hover:bg-[#21262d] flex items-center justify-center gap-1.5"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[11px]">Thu gọn menu</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 z-30 ${
          isCollapsed ? "w-14" : "w-56"
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
