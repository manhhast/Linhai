# Hướng dẫn Deploy ứng dụng Linh AI từ GitHub

Ứng dụng của bạn là một ứng dụng Full-stack (Vite + Express). Dưới đây là các bước để bạn đưa ứng dụng lên các nền tảng phổ biến sau khi export sang GitHub.

## 1. Export từ AI Studio sang GitHub
1. Mở menu trong AI Studio (góc trên bên trái).
2. Chọn **Settings** -> **Export to GitHub**.
3. Kết nối tài khoản GitHub và chọn kho lưu trữ (Repository) bạn muốn tạo.

## 2. Cấu hình Biến môi trường (Environment Variables) - CHI TIẾT

Đây là bước quan trọng nhất để AI của Linh có thể hoạt động được. Bạn tuyệt đối **KHÔNG** được dán trực tiếp mã khóa vào code rồi đẩy lên GitHub (vì sẽ bị lộ và bị khóa). Thay vào đó, hãy làm như sau:

### Bước 2.1: Lấy mã GEMINI_API_KEY từ AI Studio
1. Trong giao diện AI Studio này, nhìn lên thanh công cụ phía trên hoặc menu cài đặt.
2. Tìm mục **Secrets** (biểu tượng chiếc chìa khóa).
3. Tại đây bạn sẽ thấy biến `GEMINI_API_KEY`. Hãy nhấn vào nút **Copy** (sao chép) giá trị của nó.
   - *Lưu ý:* Nếu không thấy, bạn có thể truy cập [Google AI Studio API Keys](https://aistudio.google.com/app/apikey) để tạo một mã mới.

### Bước 2.2: Dán vào nền tảng Deploy (Ví dụ: Render.com)
1. Truy cập vào Dashboard của dự án bạn vừa tạo trên **Render**.
2. Chọn mục **Environment** ở menu bên trái.
3. Nhấn **Add Environment Variable**.
4. Ô **Key**: Nhập chính xác `GEMINI_API_KEY`.
5. Ô **Value**: Dán mã bạn vừa copy ở Bước 2.1 vào.
6. Nhấn **Save Changes**. Render sẽ tự động khởi động lại ứng dụng với mã khóa mới.

### Bước 2.3: Cấu hình APP_URL
Tương tự như trên, bạn cần thêm biến `APP_URL`:
- **Key**: `APP_URL`
- **Value**: Địa chỉ web mà Render cấp cho bạn (ví dụ: `https://linh-ai-assistant.onrender.com`). Linh cần cái này để xử lý các kết nối với Telegram.

## 3. Các nền tảng triển khai (Deployment)

### Lựa chọn A: Render.com (Khuyên dùng cho Full-stack)

Render là nền tảng rất mạnh mẽ và dễ dùng để chạy cả Frontend và Backend cùng lúc. Dưới đây là quy trình 5 bước để đưa Linh lên Render:

#### Bước 1: Tạo tài khoản và kết nối GitHub
1. Truy cập [Render.com](https://render.com/) và đăng ký bằng tài khoản GitHub của bạn.
2. Nhấn nút **New +** (màu xanh góc trên bên phải) và chọn **Web Service**.

#### Bước 2: Kết nối Repository
1. Bạn sẽ thấy danh sách các kho lưu trữ GitHub của mình. 
2. Tìm và nhấn nút **Connect** bên cạnh dự án Linh AI mà bạn vừa export từ AI Studio.

#### Bước 3: Cấu hình thông số kỹ thuật
Tại màn hình cấu hình, hãy điền các thông tin sau:
- **Name**: Đặt tên cho ứng dụng của bạn (ví dụ: `linh-ai-assistant`).
- **Region**: Chọn khu vực gần bạn nhất (ví dụ: `Singapore` để có tốc độ tốt nhất tại Việt Nam).
- **Branch**: `main` (hoặc nhánh chính của bạn).
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Chọn gói **Free** (Miễn phí).

#### Bước 4: Cài đặt Biến môi trường (QUAN TRỌNG)
1. Nhấn vào nút **Advanced** hoặc tìm tab **Environment**.
2. Nhấn **Add Environment Variable** và thêm 2 biến bắt buộc:
   - `GEMINI_API_KEY`: (Lấy từ Secrets của AI Studio như hướng dẫn trên).
   - `APP_URL`: (Sau khi nhấn Create, Render sẽ cho bạn một URL, hãy quay lại đây dán vào sau).

#### Bước 5: Triển khai và Kiểm tra
1. Nhấn **Create Web Service**.
2. Đợi khoảng 2-3 phút để Render chạy lệnh build. Khi thấy dòng chữ **"Your service is live"** màu xanh là thành công!
3. Copy URL mà Render cấp (dạng `https://ten-cua-ban.onrender.com`) và:
   - Dán vào biến `APP_URL` trong phần Environment của Render.
   - Dán vào **BotFather** trên Telegram để kích hoạt Web App.

*Lưu ý:* Với gói Free của Render, nếu không có ai truy cập trong 15 phút, server sẽ "ngủ". Lần truy cập tiếp theo sẽ mất khoảng 30 giây để server khởi động lại. Đây là điều bình thường của gói miễn phí nha!

### Lựa chọn B: Railway.app
1. Tạo dự án mới và chọn **Deploy from GitHub**.
2. Railway sẽ tự động nhận diện tệp `package.json` và chạy lệnh build/start.
3. Thêm các Biến môi trường trong phần **Variables**.

### Lựa chọn C: Vercel (Yêu cầu cấu hình thêm)
Vercel chủ yếu dành cho frontend. Để chạy backend Express trên Vercel, bạn cần tạo tệp `vercel.json` (Linh khuyên bạn nên dùng Render hoặc Railway cho các ứng dụng có server riêng như thế này).

## 4. Lưu ý cho Telegram Web App
- Sau khi có URL chính thức, bạn phải cập nhật URL đó trong **BotFather** (phần `Set Web App URL`).
- Đảm bảo `APP_URL` trong biến môi trường khớp với URL thực tế để các tính năng hoạt động chính xác.

Chúc bạn thành công với Linh AI trên GitHub nhé! 🚀
