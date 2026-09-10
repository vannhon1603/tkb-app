# 🚀 Hướng Dẫn Deploy Hệ Thống TKB Lên Vercel & Render (Miễn Phí 100%)

Tài liệu này hướng dẫn chi tiết từng bước để đưa hệ thống Thời Khóa Biểu & Sổ Báo Giảng lên môi trường Production:
- **Frontend (Next.js 16)**: Deploy lên **Vercel** (Nhanh, tối ưu CDN toàn cầu, SSL miễn phí).
- **Backend (FastAPI Python)**: Deploy lên **Render.com** (hoặc Railway / Fly.io / VPS) để phục vụ API và SQLite.

---

## 📋 Mục Lục
1. [Bước 1: Chuẩn bị Repository trên GitHub](#-bước-1-chuẩn-bị-repository-trên-github)
2. [Bước 2: Deploy Backend FastAPI lên Render.com (Miễn phí)](#-bước-2-deploy-backend-fastapi-lên-rendercom-miễn-phí)
3. [Bước 3: Deploy Frontend Next.js lên Vercel](#-bước-3-deploy-frontend-nextjs-lên-vercel)
4. [Bước 4: Cấu hình Google OAuth cho Tên miền Vercel](#-bước-4-cấu-hình-google-oauth-cho-tên-miền-vercel)
5. [Tổng kết các Biến Môi Trường (Environment Variables)](#-tổng-kết-các-biến-môi-trường)

---

## 🐙 Bước 1: Chuẩn bị Repository trên GitHub

1. Tạo một repository mới trên GitHub (ví dụ: `tkb-app`).
2. Đẩy toàn bộ mã nguồn lên GitHub:
```bash
git init
git add .
git commit -m "feat: setup project ready for vercel & render deployment"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/tkb-app.git
git push -u origin main
```

---

## 🐍 Bước 2: Deploy Backend FastAPI lên Render.com (Miễn phí)

Vì backend sử dụng Python FastAPI và SQLite, Render.com là nền tảng miễn phí và dễ dùng nhất:

1. Truy cập [https://render.com](https://render.com) và đăng nhập (bằng GitHub).
2. Nhấn nút **New +** -> Chọn **Web Service**.
3. Chọn Repository GitHub `tkb-app` của bạn.
4. Điền các thông số cấu hình:
   - **Name**: `tkb-backend` (hoặc tên tùy thích)
   - **Region**: `Singapore` (để tốc độ về Việt Nam nhanh nhất)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Thêm các biến môi trường tại mục **Environment Variables**:
   - `ENVIRONMENT` = `production`
   - `SECRET_KEY` = `mot-chuoi-bi-mat-ngau-nhien-32-ky-tu`
   - `GOOGLE_CLIENT_ID` = `359719086023-56nmtffqumnu4n0gkqqiq2r97com31ou.apps.googleusercontent.com`
   - `GEMINI_API_KEY` = *(Khóa API Gemini của bạn)*
6. Nhấn **Create Web Service**. Đợi 1-2 phút Render build xong, bạn sẽ nhận được đường dẫn API có dạng:
   👉 **`https://tkb-backend-xxxx.onrender.com`**

*(Kiểm tra nhanh: truy cập `https://tkb-backend-xxxx.onrender.com/docs` nếu thấy Swagger UI là thành công!)*

---

## ⚡ Bước 3: Deploy Frontend Next.js lên Vercel

1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Nhấn **Add New...** -> Chọn **Project**.
3. Tìm và chọn repository `tkb-app` -> Nhấn **Import**.
4. Cấu hình Project trên Vercel:
   - **Framework Preset**: Chọn `Next.js`
   - **Root Directory**: Nhấn **Edit** -> Chọn thư mục `frontend` -> Nhấn **Continue**.
5. Mở rộng mục **Environment Variables** và thêm các biến:
   | Tên Biến | Giá Trị | Ghi Chú |
   |---|---|---|
   | `NEXT_PUBLIC_BACKEND_URL` | `https://tkb-backend-xxxx.onrender.com` | URL Backend nhận được từ Bước 2 |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `359719086023-56nmtffqumnu4n0gkqqiq2r97com31ou.apps.googleusercontent.com` | Client ID Google OAuth |
   | `NEXT_PUBLIC_GEMINI_API_KEY` | *(Tùy chọn)* | Gemini API Key mặc định (nếu có) |

6. Nhấn **Deploy**.
7. Vercel sẽ tự động build và cấp phát tên miền miễn phí dạng:
   👉 **`https://tkb-app.vercel.app`** 🎉

---

## 🔐 Bước 4: Cấu hình Google OAuth cho Tên miền Vercel

Để tính năng **Đăng nhập Google** hoạt động được trên tên miền Vercel của bạn:

1. Truy cập [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Tìm đến **OAuth 2.0 Client IDs** bạn đang sử dụng.
3. Trong mục **Authorized JavaScript origins (Nguồn gốc JavaScript được ủy quyền)**:
   - Thêm URL Vercel của bạn: `https://tkb-app.vercel.app`
   - (Nếu dùng Custom Domain): thêm `https://your-custom-domain.com`
4. Trong mục **Authorized redirect URIs (URI chuyển hướng được ủy quyền)**:
   - Thêm: `https://tkb-app.vercel.app`
5. Nhấn **Save** (Lưu).

---

## ⚙️ Tổng Kết Các File Đã Được Tối Ưu Sẵn Cho Vercel

- **[frontend/vercel.json](file:///d:/duancty/tkb/frontend/vercel.json)**: Tối ưu routing Next.js trên Vercel.
- **[vercel.json](file:///d:/duancty/tkb/vercel.json)**: Hỗ trợ import trực tiếp từ thư mục gốc của monorepo.
- **[frontend/next.config.ts](file:///d:/duancty/tkb/frontend/next.config.ts)**: Cấu hình cho phép load avatar Google (`lh3.googleusercontent.com`).
- **[backend/Dockerfile](file:///d:/duancty/tkb/backend/Dockerfile)**: Đóng gói Docker container tiêu chuẩn cho backend.
- **[render.yaml](file:///d:/duancty/tkb/render.yaml)**: File cấu hình Blueprint 1-click deploy Render.
- **[backend/Procfile](file:///d:/duancty/tkb/backend/Procfile)**: Hỗ trợ chạy trên các nền tảng PaaS như Render/Railway.
