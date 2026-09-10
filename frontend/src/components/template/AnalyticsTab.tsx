"use client";

import { BarChart3, TrendingUp, PieChart, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnalyticsTab() {
  const weeklyData = [
    { day: "Thứ 2", slots: 42, rate: 95 },
    { day: "Thứ 3", slots: 45, rate: 98 },
    { day: "Thứ 4", slots: 40, rate: 92 },
    { day: "Thứ 5", slots: 44, rate: 96 },
    { day: "Thứ 6", slots: 38, rate: 89 },
    { day: "Thứ 7", slots: 20, rate: 85 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-4 rounded-lg shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">
            Phân Tích Hiệu Suất & Thống Kê
          </h2>
          <p className="text-[11px] text-slate-500">
            Biểu đồ trực quan hóa dữ liệu và tỷ lệ tải hoạt động trong tuần
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5 border-[#d0d7de] dark:border-[#30363d]"
        >
          <Download className="w-3.5 h-3.5" />
          Xuất báo cáo
        </Button>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weekly Slot Distribution */}
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Phân bổ số tiết theo ngày
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600">229 tiết/tuần</span>
          </div>

          <div className="space-y-3 pt-2">
            {weeklyData.map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{d.day}</span>
                  <span className="font-mono text-slate-500">{d.slots} tiết ({d.rate}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(d.slots / 50) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health / Performance */}
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              Chỉ số tối ưu hóa & Tải hệ thống
            </h3>
            <span className="text-[11px] font-semibold text-blue-600">Tuyệt vời</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-[#d0d7de] dark:border-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50 space-y-1">
              <p className="text-[11px] text-slate-500">Tỷ lệ kín phòng</p>
              <p className="text-xl font-bold text-[#24292f] dark:text-[#c9d1d9]">91.4%</p>
              <p className="text-[10px] text-emerald-600 font-medium">+3.2% so với kỳ trước</p>
            </div>

            <div className="p-3 rounded-lg border border-[#d0d7de] dark:border-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50 space-y-1">
              <p className="text-[11px] text-slate-500">Độ lệch giáo viên</p>
              <p className="text-xl font-bold text-[#24292f] dark:text-[#c9d1d9]">±1.2</p>
              <p className="text-[10px] text-emerald-600 font-medium">Phân bổ rất đều</p>
            </div>

            <div className="p-3 rounded-lg border border-[#d0d7de] dark:border-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50 space-y-1">
              <p className="text-[11px] text-slate-500">Xung đột lịch</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">0</p>
              <p className="text-[10px] text-slate-400">Không có lỗi trùng giờ</p>
            </div>

            <div className="p-3 rounded-lg border border-[#d0d7de] dark:border-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50 space-y-1">
              <p className="text-[11px] text-slate-500">Thời gian chạy tối ưu</p>
              <p className="text-xl font-bold text-[#24292f] dark:text-[#c9d1d9]">0.42s</p>
              <p className="text-[10px] text-slate-400">Rất nhanh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
