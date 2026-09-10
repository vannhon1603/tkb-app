# 🚀 Khung Dự Án TKB (Frontend & Backend Template)

Template dự án đã được clone và tái cấu trúc hoàn chỉnh từ thiết kế UI/UX hiện đại (GitHub Modern Style, Dark Mode, Shadcn UI) và Backend FastAPI modular. Tất cả các tính năng nghiệp vụ cũ đã được lược bỏ sạch sẽ, sẵn sàng để bạn xây dựng hệ thống mới (Thời khóa biểu, Quản trị phân quyền, Xử lý dữ liệu).

---

## 📁 1. Cấu Trúc Dự Án

```
tkb/
├── frontend/                     # Next.js 16 + React 19 + Tailwind CSS v4 + Shadcn UI
│   ├── public/                   # Static assets (Favicon, Logo...)
│   └── src/
│       ├── app/                  # Next.js App Router (layout.tsx, page.tsx, globals.css, fonts)
│       ├── components/           # UI Component Library
│       │   ├── ui/               # 19+ Shadcn UI Primitives (Button, Dialog, Table, Tabs...)
│       │   ├── template/         # Các màn hình mẫu (Dashboard, Table, Form, Settings, Analytics)
│       │   ├── Navbar.tsx        # Top navigation với Dark/Light switcher, Breadcrumb, Clock
│       │   ├── Sidebar.tsx       # Menu bên trái hỗ trợ Collapse, Phân nhóm, Mobile Drawer
│       │   ├── ThemeProvider.tsx # Next-themes Provider
│       │   └── AuthProvider.tsx  # Quản lý phiên đăng nhập
│       ├── hooks/                # Custom React Hooks (useDebounce, useMediaQuery)
│       ├── lib/                  # Utilities (cn, api client kết nối FastAPI)
│       ├── styles/               # CSS Animations
│       └── types/                # TypeScript Interfaces
│
├── backend/                      # FastAPI REST API + SQLAlchemy + SQLite
│   ├── db/                       # Database Session, Base Model, SQLite connection
│   ├── routers/                  # Modular API Routers (health, items, stats, settings, auth)
│   ├── schemas/                  # Pydantic Schemas validate dữ liệu
│   ├── services/                 # Business logic layer
│   ├── config.py                 # Configuration & Environment
│   ├── logger.py                 # Formatted console logger
│   └── main.py                   # FastAPI Application Core + CORS + Lifespan
│
├── start.bat                     # Script 1-click khởi động cả FE và BE
└── README.md
```

---

## ⚡ 2. Hướng Dẫn Khởi Chạy

### Cách 1: Chạy nhanh bằng `start.bat`
Nhấp đúp chuột vào file `start.bat` tại thư mục gốc của dự án.

### Cách 2: Chạy thủ công từng phần

#### 🔹 Backend (FastAPI):
```bash
cd backend
# Cài đặt thư viện (nếu cần)
pip install -r requirements.txt

# Khởi chạy server
python -m uvicorn main:app --reload --port 8000
```
- API Docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
- API Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

#### 🔹 Frontend (Next.js):
```bash
cd frontend
# Cài đặt packages (nếu cần)
npm install

# Khởi chạy Next.js
npm run dev
```
- Truy cập giao diện: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ 3. Cách Mở Rộng & Thêm Tính Năng

### Thêm một Màn hình / Tab mới:
1. Tạo component mới trong `frontend/src/components/` (ví dụ `src/components/schedule/ScheduleMatrix.tsx`).
2. Khai báo tab vào mảng `tabGroups` trong [Sidebar.tsx](file:///D:/duancty/tkb/frontend/src/components/Sidebar.tsx).
3. Thêm render điều kiện trong [page.tsx](file:///D:/duancty/tkb/frontend/src/app/page.tsx).

### Thêm một API Router mới trong Backend:
1. Tạo file router trong `backend/routers/` (ví dụ `routers/schedules.py`).
2. Định nghĩa router: `router = APIRouter(prefix="/schedules", tags=["Schedules"])`.
3. Include router vào [backend/main.py](file:///D:/duancty/tkb/backend/main.py): `app.include_router(schedules.router, prefix=settings.API_V1_STR)`.
4. Gọi API từ Frontend thông qua hàm `apiClient("/api/schedules")` trong `frontend/src/lib/api.ts`.

---

## 🌐 4. Hướng Dẫn Deploy Lên Vercel (Production)

Chi tiết từng bước đã được chuẩn bị đầy đủ trong tài liệu: **[DEPLOY_VERCEL.md](file:///D:/duancty/tkb/DEPLOY_VERCEL.md)**.

### Tóm tắt nhanh:
1. **Frontend**: Import repository vào [Vercel](https://vercel.com), đặt **Root Directory** là `frontend`, cấu hình biến `NEXT_PUBLIC_BACKEND_URL`.
2. **Backend**: Tạo Web Service trên [Render.com](https://render.com) (hoặc Railway / VPS) từ thư mục `backend`, chạy lệnh `pip install -r requirements.txt` và `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. **Google OAuth**: Thêm tên miền `https://your-app.vercel.app` vào danh sách **Authorized JavaScript origins** trên Google Cloud Console.

