# Hoàn thiện Ứng dụng Fitness Tracker

Ứng dụng Fitness Tracker bằng Next.js dựa trên báo cáo đồ án của bạn đã được xây dựng thành công! Dưới đây là tóm tắt các chức năng đã triển khai:

## 1. Kiến trúc cốt lõi (Mock Backend & API)
* Xây dựng công cụ `mockDb.ts` giả lập Supabase, đọc/ghi dữ liệu qua file JSON.
* Thiết lập toàn bộ các API RESTful (`/api/users`, `/api/tasks`, `/api/metrics`, `/api/comments`, `/api/suggestions`) để tương tác với cơ sở dữ liệu.
* Nạp dữ liệu giả lập (seed data) tiếng Việt phong phú.

## 2. Hệ thống Thiết kế (Design System)
* Sử dụng `tailwind.css` hiện đại với phong cách thiết kế *Glassmorphism* (hiệu ứng kính mờ).
* Xây dựng các components giao diện tái sử dụng: `Sidebar`, `Button`, `DashboardLayout`, `Card`, `StatusBadge`, và `Modal`.
* Thêm các hiệu ứng mượt mà (vd. chuyển động mượt, thanh cuộn ẩn) và hệ thống biểu tượng từ `lucide-react`.

## 3. Phân quyền Hệ thống (RBAC)

### Bảng điều khiển Admin
* **Tổng quan (`/admin`)**: Thống kê số liệu toàn hệ thống, theo dõi hiệu suất của huấn luyện viên.
* **Quản lý người dùng (`/admin/users`)**: Thêm/Sửa thông tin người dùng, phân công học viên cho huấn luyện viên.
* **Tổng quan AI (`/admin/ai`)**: Giám sát các gợi ý AI trên toàn hệ thống, chủ động tạo báo cáo phân tích mới cho từng học viên.

### Bảng điều khiển Huấn luyện viên (Coach)
* **Tổng quan (`/coach`)**: Danh sách ưu tiên hiển thị các bài tập `Đang chờ duyệt` (Pending Review) và `Chấn thương` (Blocked).
* **Quản lý học viên (`/coach/students`)**: Phân tích chi tiết độ hoàn thành bài tập của học viên, theo dõi chỉ số sức khỏe.
* **Quản lý bài tập (`/coach/tasks`)**: Giao bài tập mới, phản hồi báo cáo của học viên, duyệt bài tập hoặc điều chỉnh lộ trình khi có chấn thương.

### Bảng điều khiển Học viên (User)
* **Tổng quan (`/user`)**: Lịch trình tập luyện trong ngày, tóm tắt chỉ số sức khỏe nhanh, dải ngày tập luyện liên tục (streak).
* **Lộ trình tập luyện (`/user/tasks`)**: Quản lý trạng thái bài tập (`Việc cần làm` -> `Đang tiến hành` -> `Chờ kiểm duyệt`), báo cáo chấn thương hệ thống, và phần bình luận phản hồi trực tiếp với huấn luyện viên.
* **Chỉ số Sức khỏe (`/user/metrics`)**: Form nhập liệu hàng ngày cùng biểu đồ sparklines (SVG) hiển thị xu hướng tuần thay đổi.
* **Gợi ý AI (`/user/insights`)**: Tự động sinh phân tích và lời khuyên (Cảnh báo, Khuyến nghị, Điều chỉnh) dựa trên dữ liệu sức khỏe định kỳ.

## Hình ảnh Trực quan

Các hình ảnh dưới đây được hệ thống chụp lại trong quá trình tự động kiểm tra giao diện của cả 3 quyền:

````carousel
![Admin - Quản lý người dùng](/home/hieu/.gemini/antigravity/brain/818805d2-0633-47ec-86a2-19174f38f2c5/admin_users_page_1779370348282.png)
<!-- slide -->
![Coach - Tổng quan học viên](/home/hieu/.gemini/antigravity/brain/818805d2-0633-47ec-86a2-19174f38f2c5/coach_students_page_1779370413435.png)
<!-- slide -->
![User - Khuyến nghị AI](/home/hieu/.gemini/antigravity/brain/818805d2-0633-47ec-86a2-19174f38f2c5/user_insights_page_1779370504344.png)
<!-- slide -->
![User - Bài tập hiện tại](/home/hieu/.gemini/antigravity/brain/818805d2-0633-47ec-86a2-19174f38f2c5/user_active_tasks_1779370524168.png)
````

Để chạy thử ứng dụng cục bộ, sử dụng lệnh server:
```bash
npm run dev
```

Đăng nhập bằng các tài khoản mẫu từ CSDL (`/src/mockDb/users.json`):
* `admin@fitness.com`
* `coach1@fitness.com` 
* `user1@fitness.com`
