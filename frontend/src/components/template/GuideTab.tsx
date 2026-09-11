"use client";

import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Calendar,
  Layers,
  Users,
  ClipboardCheck,
  Award,
  ListTodo,
  BarChart3,
  Settings,
  FileSpreadsheet,
  FileText,
  Zap,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Key,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TabGuideItem {
  id: string;
  title: string;
  tabName: string;
  icon: any;
  color: string;
  summary: string;
  steps: string[];
  features: string[];
  tips?: string;
}

const GUIDES_DATA: TabGuideItem[] = [
  {
    id: "so-bao-giang",
    title: "1. Sổ Báo Giảng Tự Động (AI Lên Lịch & Khớp Bài Dạy)",
    tabName: "Sổ Báo Giảng",
    icon: Sparkles,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    summary: "Tính năng trọng tâm giúp giáo viên tự động ghép nối Thời khóa biểu và Phân phối chương trình thành Sổ Báo Giảng hoàn chỉnh cho cả năm học (35 tuần) chỉ với 1 cú nhấp chuột.",
    steps: [
      "Bước 1: Đảm bảo bạn đã nạp Phân phối chương trình (PPCT) và Thời khóa biểu (TKB) của mình vào hệ thống.",
      "Bước 2: Chọn tuần cần xem hoặc nhấn 'Sinh tự động 35 Tuần' để hệ thống tự động đẩy số tiết tịnh tiến cho cả năm.",
      "Bước 3: Nhập ngày bắt đầu học kỳ (mặc định vào Thứ Hai của tuần đầu tiên).",
      "Bước 4: Kiểm tra bảng báo giảng, bấm vào nút tick 'Đã dạy' khi hoàn thành tiết dạy trên lớp.",
      "Bước 5: Nhấn 'Xuất Excel (.xlsx)' hoặc 'Xuất Word (.docx)' để tải file hoàn chỉnh gửi Tổ chuyên môn / Ban Giám Hiệu ký duyệt."
    ],
    features: [
      "Tự động tính thứ, ngày tháng chuẩn xác theo từng tuần học.",
      "Phân biệt chính xác giữa tiết Chính khóa (1..105) và Chuyên đề học tập (1..35).",
      "Tự động nhảy bài khi lớp có 2-3 tiết/tuần mà không bị trùng lặp tên bài.",
      "Cho phép chỉnh sửa trực tiếp tên bài, tiết dạy hoặc thêm/bớt tiết bù/dạy thay.",
      "Theo dõi tiến độ dạy học thực tế (tỷ lệ % hoàn thành) theo từng môn và khối lớp."
    ],
    tips: "Nếu có tuần nghỉ lễ hoặc đổi lịch, bạn có thể nhấp vào biểu tượng bút chỉnh sửa trên từng dòng để sửa trực tiếp bài dạy mà không làm ảnh hưởng các tuần khác."
  },
  {
    id: "ppct",
    title: "2. Phân Phối Chương Trình (PPCT)",
    tabName: "Phân Phối CT",
    icon: BookOpen,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    summary: "Quản lý toàn bộ danh mục bài dạy theo tuần và theo tiết của từng khối lớp (Khối 10, 11, 12) theo chuẩn chương trình GDPT 2018.",
    steps: [
      "Bước 1: Chọn Khối lớp (10, 11, 12) và Môn học.",
      "Bước 2: Nhấn nút 'Nạp PPCT' trên góc phải màn hình.",
      "Bước 3: Chọn 1 trong 3 cách nạp dữ liệu: Tải file Excel/Word/PDF, Dán văn bản trực tiếp (Ctrl+V), hoặc Dán ảnh chụp bảng PPCT.",
      "Bước 4: Trí tuệ nhân tạo Gemini AI sẽ tự động phân tích và số hóa bảng bài dạy thành danh sách tiết chuẩn.",
      "Bước 5: Bạn có thể tìm kiếm, sửa tên bài, thêm bài học mới hoặc xuất lại file Excel dự phòng."
    ],
    features: [
      "Hỗ trợ đa định dạng đầu vào: `.xlsx`, `.xls`, `.docx`, `.pdf` và ảnh chụp màn hình.",
      "AI Vision nhận diện thông minh các bảng PPCT song song (Cột Chính khóa + Cột Chuyên đề).",
      "Tự động loại bỏ các dòng tiêu đề chương tổng quát không phải tiết học.",
      "Hỗ trợ nạp dữ liệu mẫu (Template có sẵn Khối 10, 11, 12 Toán) nếu chưa có file."
    ],
    tips: "Bạn có thể chụp ảnh màn hình file PDF PPCT (nhấn Windows + Shift + S) rồi quay lại trang web nhấn Ctrl+V để AI Vision trích xuất ngay lập tức!"
  },
  {
    id: "tkb",
    title: "3. Thời Khóa Biểu Tuần (TKB)",
    tabName: "Thời Khóa Biểu",
    icon: Calendar,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    summary: "Quản lý lịch dạy hàng tuần của giáo viên, phân chia rõ ràng các buổi Sáng (tiết 1-5), Chiều (tiết 6-10), Thứ trong tuần và Lớp phụ trách.",
    steps: [
      "Bước 1: Nhấn 'Nạp Thời Khóa Biểu' ở góc trên bên phải.",
      "Bước 2: Nhập Tên giáo viên và tải lên file TKB trường (Excel, PDF) hoặc dán ảnh chụp TKB.",
      "Bước 3: Hệ thống tự động bóc tách và tạo Ma trận Thời khóa biểu các ngày trong tuần (Thứ 2 -> Thứ 7).",
      "Bước 4: Xem TKB theo dạng Ma trận lưới trực quan hoặc xem dạng Danh sách chi tiết.",
      "Bước 5: Thêm, sửa, chuyển đổi tiết dạy hoặc xuất Excel TKB cá nhân khi cần."
    ],
    features: [
      "Nhận diện chính xác tên lớp (10A1, 11A2, 12C3...) và môn học tương ứng.",
      "Giao diện hiển thị trực quan, phân màu riêng biệt giữa buổi Sáng và buổi Chiều.",
      "Hỗ trợ lọc theo từng Giáo viên hoặc theo từng Lớp học trong toàn trường."
    ],
    tips: "Khi nhà trường đổi TKB giữa kỳ, chỉ cần nạp lại file TKB mới và chọn 'Ghi đè' để hệ thống cập nhật tự động."
  },
  {
    id: "students",
    title: "4. Quản Lý Danh Sách Học Sinh",
    tabName: "Danh Sách Học Sinh",
    icon: Users,
    color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
    summary: "Quản lý hồ sơ học sinh theo từng lớp phụ trách hoặc lớp chủ nhiệm (Họ tên, ngày sinh, giới tính, số điện thoại phụ huynh, ghi chú).",
    steps: [
      "Bước 1: Chọn lớp học ở bộ lọc trên cùng (ví dụ: Lớp 10A1, 11A2...).",
      "Bước 2: Nhấn 'Thêm học sinh' để nhập thủ công hoặc nhấn 'Nạp dữ liệu mẫu / Excel' để import cả lớp.",
      "Bước 3: Xem thống kê tổng sĩ số, số nam, số nữ của lớp.",
      "Bước 4: Bấm vào từng học sinh để xem lịch sử điểm danh và điểm thưởng thi đua."
    ],
    features: [
      "Tra cứu nhanh học sinh theo tên hoặc mã số định danh.",
      "Liên kết trực tiếp với Sổ Điểm Danh và Sổ Điểm Thưởng.",
      "Ghi chú thông tin phụ huynh và các lưu ý cá nhân của từng học sinh."
    ]
  },
  {
    id: "attendance",
    title: "5. Sổ Điểm Danh Lớp Theo Ngày & Tiết Học",
    tabName: "Sổ Điểm Danh",
    icon: ClipboardCheck,
    color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800",
    summary: "Theo dõi sĩ số và chuyên cần của học sinh trong từng tiết học hoặc theo ngày một cách nhanh chóng, tiện lợi ngay trên điện thoại hoặc máy tính.",
    steps: [
      "Bước 1: Chọn Lớp học và Ngày điểm danh.",
      "Bước 2: Nhấn nhanh vào trạng thái của từng học sinh: Có mặt (Xanh), Vắng có phép (Vàng), Vắng không phép (Đỏ), Đi muộn (Tím).",
      "Bước 3: Nhấn 'Điểm danh tất cả Có mặt' để tiết kiệm thời gian, sau đó chỉ cần sửa những em vắng mặt.",
      "Bước 4: Nhấn 'Lưu điểm danh' để hệ thống ghi nhận vào cơ sở dữ liệu."
    ],
    features: [
      "Thống kê tỷ lệ chuyên cần % của lớp theo tuần và theo tháng.",
      "Cảnh báo học sinh nghỉ học nhiều buổi vượt quá quy định.",
      "Lưu lại lịch sử điểm danh chi tiết phục vụ báo cáo định kỳ."
    ]
  },
  {
    id: "bonus-points",
    title: "6. Sổ Thi Đua & Chấm Điểm Thưởng Học Sinh",
    tabName: "Thi Đua & Điểm Thưởng",
    icon: Award,
    color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    summary: "Khuyến khích học sinh hăng hái phát biểu, đạt điểm tốt và ghi nhận các vi phạm nề nếp trong giờ học một cách minh bạch.",
    steps: [
      "Bước 1: Chọn lớp học cần đánh giá thi đua.",
      "Bước 2: Tìm học sinh và bấm nút '+ Điểm Thưởng' (ví dụ: +1 phát biểu xuất sắc, +2 làm bài tập khó) hoặc '- Điểm Phạt' (ví dụ: không thuộc bài, mất trật tự).",
      "Bước 3: Chọn lý do có sẵn hoặc nhập ghi chú cụ thể.",
      "Bước 4: Xem bảng xếp hạng Top học sinh tích cực nhất tuần/tháng."
    ],
    features: [
      "Tự động tính toán tổng điểm thi đua tích lũy của từng học sinh.",
      "Bảng vinh danh Top 3 học sinh xuất sắc nhất tạo động lực học tập.",
      "Lịch sử cộng/trừ điểm chi tiết theo ngày giờ cụ thể."
    ]
  },
  {
    id: "tasks",
    title: "7. Kế Hoạch Công Việc & Soạn Giáo Án",
    tabName: "Công Việc & Giáo Án",
    icon: ListTodo,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    summary: "Quản lý công việc cá nhân của giáo viên: lịch soạn giáo án, chấm bài kiểm tra, nộp sổ điểm, họp tổ chuyên môn và các sự kiện nhà trường.",
    steps: [
      "Bước 1: Nhấn 'Thêm công việc mới'.",
      "Bước 2: Nhập tiêu đề công việc, danh mục (Soạn bài, Chấm bài, Hồ sơ, Họp...), mức độ ưu tiên và Hạn chót (Deadline).",
      "Bước 3: Khi hoàn thành, nhấn vào ô vuông để đánh dấu hoàn thành.",
      "Bước 4: Lọc công việc theo trạng thái 'Cần làm', 'Đang thực hiện' hoặc 'Đã xong'."
    ],
    features: [
      "Cảnh báo trực quan các công việc sắp đến hạn hoặc đã quá hạn.",
      "Gắn nhãn mức độ ưu tiên (Cao, Trung bình, Thấp) để phân bổ thời gian hợp lý.",
      "Lưu trữ danh sách các công việc đã hoàn thành trong học kỳ."
    ]
  },
  {
    id: "settings",
    title: "8. Cài Đặt Hệ Thống & Cấu Hình Gemini AI",
    tabName: "Cài Đặt",
    icon: Settings,
    color: "text-slate-600 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    summary: "Trung tâm quản lý cấu hình: Khóa Gemini API Key, chọn Mô hình AI, Sao lưu cơ sở dữ liệu SQLite (.db) và tuỳ biến giao diện Sáng / Tối.",
    steps: [
      "Bước 1: Nhập mã Google Gemini API Key vào ô mật khẩu và nhấn 'Lưu & Test Key'.",
      "Bước 2: Chọn mô hình AI mong muốn (Khuyến nghị: ⚡ 2.0 Flash Lite hoặc 🚀 2.0 Flash để có tốc độ phản hồi nhanh nhất).",
      "Bước 3: Tải file sao lưu CSDL `app.db` về máy tính định kỳ để đảm bảo dữ liệu luôn an toàn 100%.",
      "Bước 4: Tùy chọn giao diện Giao diện Sáng (Light) hoặc Giao diện Tối (Dark)."
    ],
    features: [
      "Kiểm tra tính hợp lệ và kết nối tới Google AI Studio tức thì.",
      "Nút tải file sao lưu `.db` chỉ với 1 click chuột.",
      "Nút Tối ưu hóa SQLite (VACUUM) giúp tăng tốc độ truy vấn cơ sở dữ liệu."
    ]
  }
];

export function GuideTab() {
  const [expandedTab, setExpandedTab] = useState<string | null>("so-bao-giang");

  const toggleExpand = (id: string) => {
    setExpandedTab(expandedTab === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-4xl text-xs">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 rounded-xl shadow-sm space-y-3 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-xs">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              Cẩm Nang & Sách Hướng Dẫn Sử Dụng Hệ Thống
            </h1>
            <p className="text-xs text-emerald-100">
              Hướng dẫn chi tiết quy trình thao tác và tính năng của từng Tab trong ứng dụng
            </p>
          </div>
        </div>
        <p className="text-emerald-50 text-[11.5px] leading-relaxed max-w-2xl">
          Hệ thống được thiết kế đặc biệt dành riêng cho giáo viên THPT / THCS nhằm tự động hóa tối đa khâu soạn sổ báo giảng, quản lý chuyên cần, thi đua học sinh và kế hoạch giảng dạy theo đúng chuẩn chương trình GDPT 2018.
        </p>
      </div>

      {/* 3-Step Quick Start Workflow */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 space-y-4 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Quy Trình 3 Bước Chuẩn Để Tạo Sổ Báo Giảng Cả Năm
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Bước 1
              </span>
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Nạp Phân Phối CT
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Tải file Excel, Word, PDF hoặc dán ảnh chụp PPCT vào <strong>Tab Phân Phối CT</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Bước 2
              </span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Nạp Thời Khóa Biểu
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Nạp file TKB hoặc dán ảnh chụp TKB tuần của bạn vào <strong>Tab Thời Khóa Biểu</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Bước 3
              </span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Sinh & Xuất Sổ Báo Giảng
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Vào <strong>Tab Sổ Báo Giảng</strong>, bấm 'Sinh tự động 35 tuần' và xuất file Word / Excel hoàn chỉnh.
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Handbook for each Tab */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 px-1">
          <Layers className="w-4 h-4 text-emerald-600" />
          Hướng Dẫn Chi Tiết Từng Chức Năng Theo Từng Tab
        </h2>

        {GUIDES_DATA.map((item) => {
          const isExpanded = expandedTab === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-2xs transition-all"
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-[#21262d]/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg border shrink-0 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.summary}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-slate-400 pl-2">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-[#30363d] text-slate-700 dark:text-slate-300">
                  {/* Summary Callout */}
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0d1117] p-3 rounded-lg border border-[#d0d7de] dark:border-[#30363d]">
                    {item.summary}
                  </p>

                  {/* Step by Step */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Các bước thao tác thực hiện:
                    </h4>
                    <ul className="space-y-1.5 pl-2 text-[11.5px]">
                      {item.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="flex-1 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Highlights / Features */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Tính năng nổi bật & Điểm mạnh:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {item.features.map((feat, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-md bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 flex items-start gap-2"
                        >
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tip */}
                  {item.tips && (
                    <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <span className="font-bold shrink-0">💡 Mẹo hay:</span>
                      <span className="leading-relaxed">{item.tips}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helpful Notes & FAQs */}
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 space-y-3 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          Các Câu Hỏi Thường Gặp (FAQ)
        </h3>

        <div className="space-y-2.5 text-[11.5px] text-slate-700 dark:text-slate-300">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0d1117]/60 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Q: Dữ liệu của tôi được lưu ở đâu? Có bị mất khi tắt trình duyệt không?
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Dữ liệu của bạn được lưu an toàn vĩnh viễn trong cơ sở dữ liệu SQLite (`app.db`) trên máy chủ Backend và tài khoản Google cá nhân. Bạn có thể vào <strong>Tab Cài Đặt</strong> và bấm <strong>"Tải Sao Lưu CSDL SQLite (.db)"</strong> bất kỳ lúc nào để lưu về máy tính của mình.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0d1117]/60 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Q: Tôi có cần trả phí để dùng Google Gemini AI không?
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Hoàn toàn <strong>miễn phí 100%</strong>. Bạn chỉ cần vào trang <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-semibold">Google AI Studio</a> đăng nhập bằng tài khoản Gmail cá nhân để lấy khóa API Key miễn phí và dán vào <strong>Tab Cài Đặt</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
