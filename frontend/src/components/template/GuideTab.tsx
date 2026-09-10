"use client";

import {
  BookOpen,
  Code2,
  Server,
  Layers,
  Palette,
  CheckCircle2,
  FileCode2,
  FolderTree,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GuideTab() {
  return (
    <div className="space-y-6 max-w-4xl text-xs">
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-5 rounded-lg shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-[#24292f] dark:text-[#c9d1d9]">
            Hướng Dẫn & Tài Liệu Kỹ Thuật Template
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          Template này được tái cấu trúc từ dự án mẫu, giữ nguyên 100% phong cách thiết kế UI/UX (GitHub Theme, Dark Mode, 19+ Shadcn UI components, dynamic responsive layout) và loại bỏ hoàn toàn các logic nghiệp vụ cũ để bạn phát triển tính năng mới.
        </p>
      </div>

      {/* 1. How to add a new Tab in Frontend */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-3 shadow-2xs">
        <h3 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-600" />
          1. Cách thêm một Màn hình / Tab mới trong Frontend
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Chỉ cần 3 bước đơn giản:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-700 dark:text-slate-300">
          <li>
            Tạo component giao diện mới trong thư mục <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-emerald-600">src/components/</code> (hoặc <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-emerald-600">src/components/my-feature/MyTab.tsx</code>).
          </li>
          <li>
            Mở <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-emerald-600">src/components/Sidebar.tsx</code> và thêm định nghĩa tab vào mảng <code className="px-1 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono">tabGroups</code>.
          </li>
          <li>
            Mở <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-emerald-600">src/app/page.tsx</code> và thêm trường hợp render tab trong hàm switch/case hoặc TabsContent.
          </li>
        </ol>
      </div>

      {/* 2. How to add a new Router in Backend */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-3 shadow-2xs">
        <h3 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-600" />
          2. Cách thêm API Router mới trong Backend FastAPI
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-700 dark:text-slate-300">
          <li>
            Tạo file router mới trong <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-blue-600">backend/routers/my_router.py</code> với <code className="px-1 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono">router = APIRouter(prefix="/api/my-feature", tags=["My Feature"])</code>.
          </li>
          <li>
            Khai báo Pydantic schemas trong <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-blue-600">backend/schemas/</code> để validate dữ liệu request & response.
          </li>
          <li>
            Mở <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-blue-600">backend/main.py</code> và include router: <code className="px-1 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono">app.include_router(my_router.router)</code>.
          </li>
          <li>
            Mở tài liệu Swagger tại <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#21262d] rounded font-mono text-blue-600">http://localhost:8000/docs</code> để test trực tiếp API.
          </li>
        </ol>
      </div>

      {/* 3. Included UI Component library */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-3 shadow-2xs">
        <h3 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          3. Thư Viện UI Components Sẵn Có
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {[
            "Button (Nút bấm)",
            "Card (Thẻ chứa)",
            "Dialog (Hộp thoại)",
            "Table (Bảng dữ liệu)",
            "Tabs (Thẻ chuyển trang)",
            "Select & MultiSelect",
            "Input & Checkbox",
            "DropdownMenu",
            "Popover & Tooltip",
            "Badge & Alert",
            "Skeleton & Spinner",
            "ScrollArea",
          ].map((c, i) => (
            <div
              key={i}
              className="p-2 border border-[#d0d7de] dark:border-[#30363d] rounded bg-slate-50/50 dark:bg-[#0d1117]/50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Gemini API Key Guide */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 space-y-3 shadow-2xs">
        <h3 className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          4. Hướng Dẫn Lấy & Cấu Hình Google Gemini API Key Miễn Phí
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Hệ thống sử dụng mô hình Google Gemini để nhận diện ma trận bảng trong file PDF / Text và tự động đối chiếu PPCT để sinh Sổ Báo Giảng:
        </p>
        <ol className="list-decimal list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
          <li>
            Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold underline">Google AI Studio (https://aistudio.google.com/app/apikey)</a>.
          </li>
          <li>
            Đăng nhập bằng tài khoản Google (Gmail) cá nhân của bạn.
          </li>
          <li>
            Nhấn nút <strong>"Create API key"</strong> (hoặc <strong>"Get API key"</strong>).
          </li>
          <li>
            Chọn <strong>"Create key in new project"</strong> rồi bấm <strong>"Create key"</strong>.
          </li>
          <li>
            Sao chép mã khóa (bắt đầu bằng <code className="font-mono text-emerald-600 font-bold">AIzaSy...</code>) và bấm nút <strong>"Gemini Key"</strong> trên thanh Navbar để dán và lưu lại.
          </li>
        </ol>
      </div>
    </div>
  );
}
