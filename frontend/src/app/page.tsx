"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { GoogleAuthScreen } from "@/components/auth/GoogleAuthScreen";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiKeyBanner } from "@/components/gemini/ApiKeyBanner";
import { ApiKeyModal } from "@/components/gemini/ApiKeyModal";
import { SoBaoGiangTab } from "@/components/so-bao-giang/SoBaoGiangTab";
import { PPCTTab } from "@/components/ppct/PPCTTab";
import { TKBTab } from "@/components/tkb/TKBTab";
import { StudentsTab } from "@/components/students/StudentsTab";
import { AttendanceTab } from "@/components/attendance/AttendanceTab";
import { BonusPointsTab } from "@/components/bonus-points/BonusPointsTab";
import { TasksTab } from "@/components/tasks/TasksTab";
import { DashboardOverview } from "@/components/template/DashboardOverview";
import { DataTableTab } from "@/components/template/DataTableTab";
import { FormEditorTab } from "@/components/template/FormEditorTab";
import { AnalyticsTab } from "@/components/template/AnalyticsTab";
import { SettingsTab } from "@/components/template/SettingsTab";
import { GuideTab } from "@/components/template/GuideTab";
import { Loader2, School } from "lucide-react";

const TAB_TITLES: Record<string, string> = {
  "so-bao-giang": "Sổ Báo Giảng Tự Động",
  ppct: "Phân Phối Chương Trình (PPCT)",
  tkb: "Thời Khóa Biểu Tuần (TKB)",
  students: "Danh Sách Học Sinh & Lớp Học",
  attendance: "Sổ Điểm Danh Học Sinh",
  "bonus-points": "Thi Đua & Điểm Thưởng",
  tasks: "Kế Hoạch & Công Việc Giáo Viên",
  dashboard: "Tổng Quan Bảng Điều Khiển",
  "data-table": "Quản Lý Dữ Liệu",
  "form-editor": "Biên Tập & Tạo Mới",
  analytics: "Thống Kê & Báo Cáo",
  settings: "Cài Đặt & Gemini Key",
  guide: "Tài Liệu Hướng Dẫn",
};

export default function Home() {
  const { user, token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("so-bao-giang");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Initial Loading State
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
          <School className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Đang khởi tạo phiên làm việc...</span>
        </div>
      </div>
    );
  }

  // 2. Initial Mandatory Google Login Screen
  if (!user || !token) {
    return <GoogleAuthScreen />;
  }

  // 3. Authenticated Full Workspace
  const title = TAB_TITLES[activeTab] || "Hệ Thống Quản Lý";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          title={title}
          activeTab={activeTab}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          onNavigateTab={setActiveTab}
          onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
        />

        {/* Gemini API Key Alert Banner (if key missing) */}
        <ApiKeyBanner
          onOpenModal={() => setApiKeyModalOpen(true)}
          refreshTrigger={refreshTrigger}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-4">
            <ErrorBoundary>
              {activeTab === "so-bao-giang" && <SoBaoGiangTab />}
              {activeTab === "ppct" && <PPCTTab />}
              {activeTab === "tkb" && <TKBTab />}
              {activeTab === "students" && <StudentsTab />}
              {activeTab === "attendance" && <AttendanceTab />}
              {activeTab === "bonus-points" && <BonusPointsTab />}
              {activeTab === "tasks" && <TasksTab />}
              {activeTab === "dashboard" && (
                <DashboardOverview onNavigateTab={setActiveTab} />
              )}
              {activeTab === "data-table" && <DataTableTab />}
              {activeTab === "form-editor" && <FormEditorTab />}
              {activeTab === "analytics" && <AnalyticsTab />}
              {activeTab === "settings" && <SettingsTab />}
              {activeTab === "guide" && <GuideTab />}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Gemini API Key Configuration Modal */}
      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={setApiKeyModalOpen}
        onKeySaved={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}

