# Hướng dẫn Deploy ứng dụng Linh AI từ GitHub

Ứng dụng của bạn là một ứng dụng Full-stack (Vite + Express). Dưới đây là các bước để bạn đưa ứng dụng lên các nền tảng phổ biến sau khi export sang GitHub.

## 1. Export từ AI Studio sang GitHub
1. Mở menu trong AI Studio (góc trên bên trái).
2. Chọn **Settings** -> **Export to GitHub**.
3. Kết nối tài khoản GitHub và chọn kho lưu trữ (Repository) bạn muốn tạo.

## 2. Cấu hình Biến môi trường (Environment Variables)
Dù bạn deploy ở đâu, bạn cần cài đặt các biến sau trong phần **Settings > Secrets / Environment Variables** của nền tảng đó:

- `GEMINI_API_KEY`: Lấy từ [Google AI Studio](https://aistudio.google.com/app/apikey).
- `APP_URL`: URL chính thức của ứng dụng sau khi deploy (vídụ: `https://linh-ai.vercel.app`).
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Nếu bạn sử dụng tính năng Google Calendar/Gmail.

## 3. Các nền tảng triển khai (Deployment)

### Lựa chọn A: Render.com (Dễ nhất cho Full-stack)
1. Đăng nhập Render và chọn **New > Web Service**.
2. Kết nối với GitHub và chọn Repository của bạn.
3. Cấu hình:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Thêm các Biến môi trường trong tab **EnvVars**.

### Lựa chọn B: Railway.app
1. Tạo dự án mới và chọn **Deploy from GitHub**.
2. Railway sẽ tự động nhận diện tệp `package.json` và chạy lệnh build/start.
3. Thêm các Biến môi trường trong phần **Variables**.

### Lựa chọn C: Vercel (Yêu cầu cấu hình thêm)
Vercel chủ yếu dành cho frontend. Để chạy backend Express trên Vercel, bạn cần tạo tệp `vercel.json` (Linh khuyên bạn nên dùng Render hoặc Railway cho các ứng dụng có server riêng như thế này).

## 4. Lưu ý cho Telegram Web App
- Sau khi có URL chính thức, bạn phải cập nhật URL đó trong **BotFather** (phần `Set Web App URL`).
- Đảm bảo `APP_URL` trong biến môi trường khớp với URL thực tế để các tính năng OAuth hoạt động chính xác.

Chúc bạn thành công với Linh AI trên GitHub nhé! 🚀
