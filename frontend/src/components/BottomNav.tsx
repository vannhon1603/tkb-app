"use client";

import React from "react";
import { Sparkles, Calendar, BookOpen, Settings, Menu } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenMobileMenu: () => void;
}

export function BottomNav({
  activeTab,
  onTabChange,
  onOpenMobileMenu,
}: BottomNavProps) {
  const navItems = [
    {
      id: "so-bao-giang",
      label: "Báo giảng",
      icon: Sparkles,
      badge: "AI",
    },
    {
      id: "tkb",
      label: "TKB",
      icon: Calendar,
    },
    {
      id: "ppct",
      label: "PPCT",
      icon: BookOpen,
    },
    {
      id: "settings",
      label: "Cài đặt",
      icon: Settings,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-t border-[#d0d7de] dark:border-[#30363d] px-2 py-1.5 shadow-lg"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full animate-in fade-in zoom-in duration-150" />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.75]"
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 text-[8px] px-1 py-0.2 rounded-full bg-emerald-500 text-white font-extrabold leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More / Menu Drawer button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
        >
          <Menu className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px] mt-0.5 tracking-tight leading-tight">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}
