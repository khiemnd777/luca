# 🧩 Modular Management System – Vite + React + TypeScript

Hệ thống quản lý sản xuất hiện đại, phát triển trên nền **Vite + React + TypeScript**, với kiến trúc **Modular độc lập** – mỗi module có thể đăng ký route, slot UI, và event handler một cách linh hoạt.

---

## ⚙️ Tech Stack

- **Vite** – build nhanh, HMR mạnh mẽ  
- **React 18** – UI component-based, hỗ trợ Suspense và concurrent rendering  
- **TypeScript** – đảm bảo type-safety toàn hệ thống  
- **Zustand / Context / Suspense** – state management và lazy load  
- **RBAC (Role-Based Access Control)** – kiểm soát truy cập theo vai trò  
- **Slot-based UI Architecture** – mô hình `ModuleSlot` cho phép plug & play các module  

---

## 🧱 Kiến trúc Modular

Mỗi module độc lập và tự đăng ký vào hệ thống thông qua hàm `registerModule()`:

```tsx
registerModule({
  id: "example",
  routes: [
    {
      path: "/example",
      element: (
        <IfRole roles={["user"]}>
          <Page />
        </IfRole>
      ),
    },
  ],
  slots: [
    {
      id: "notif-bell",
      name: "app:topbar:right",
      priority: 10,
      render: () => (
        <React.Suspense fallback={null}>
          <IfRole roles={["user", "admin"]}>
            <NotificationBell />
          </IfRole>
        </React.Suspense>
      ),
    },
  ],
  onEvents: {
    // sync handler
    "example:pure": (n: number) => n + 1,

    // async handler
    "example:load": async (q: string) => {
      const res = await fetch(`/search?q=${encodeURIComponent(q)}`).then((r) => r.json());
      return res;
    },
  },
  emitEvents: ["example:refresh", "example:request-data"], // metadata mô tả các event phát ra
});
```

✅ **Ưu điểm kiến trúc:**
- Module hoàn toàn độc lập, có thể plug/unplug mà không ảnh hưởng hệ thống.  
- Hỗ trợ lazy load component (Suspense).  
- Cho phép đăng ký UI slot vào các vùng như `app:topbar:right`, `dashboard:body:center`, v.v.  
- Giao tiếp giữa các module qua event bus (`onEvents`, `emitEvents`).  

---

## 📦 Các Tính Năng Chính

### 1. Quản lý nhân viên
Theo dõi thông tin, hiệu suất và thống kê công việc của từng nhân viên.  
Người quản lý có thể xem danh sách đơn hàng, tổng thời gian gia công và hiệu quả làm việc.

---

### 2. Quản lý phân quyền / vai trò (RBAC)
Xây dựng hệ thống quyền truy cập theo vai trò: **Admin**, **Staff**, **Technician**, …  
Mỗi nhóm quyền được cấu hình chi tiết để đảm bảo **phân tách trách nhiệm rõ ràng** và **an toàn dữ liệu**.

---

### 3. Quản lý nguyên liệu
Theo dõi toàn bộ nguyên vật liệu sử dụng trong quy trình sản xuất.  
Hỗ trợ:
- Nhập – xuất kho  
- Cập nhật tồn kho theo thời gian thực  
- Xuất báo cáo chi tiết theo loại nguyên liệu, công đoạn, hoặc nhân viên  

---

### 4. Quản lý sản phẩm
Theo dõi danh mục và chi tiết sản phẩm, gắn liền với **quy trình gia công** cụ thể.

#### 4.1. Đồng bộ sản phẩm & giá bán
Tự động đồng bộ thông tin và giá bán từ **Lab Mẹ → Lab Con**, đảm bảo thống nhất dữ liệu giữa các chi nhánh.

---

### 5. Quản lý đơn hàng
Quản lý **toàn bộ vòng đời đơn hàng**:

```
Tạo đơn → Gia công → Gửi thử → Nhận về → Tiếp tục gia công → Hoàn thành
```

- Theo dõi tiến độ, trạng thái, người phụ trách  
- Lưu lịch sử thao tác  
- Xuất báo cáo tổng hợp cho kế toán hoặc quản lý  

---

### 6. Quản lý doanh số bán hàng
Xem báo cáo doanh số và doanh thu theo **ngày / tuần / tháng / năm**, có thể lọc theo sản phẩm hoặc nhân viên phụ trách.

---

### 7. Quản lý cơ chế khuyến mãi
Thiết lập và thống kê chương trình khuyến mãi:
- Theo đơn hàng hoặc nhóm khách hàng  
- Báo cáo riêng biệt cho **khuyến mãi**, **hàng lỗi**, **hàng làm lại**  
- Thống kê theo **giá trị tiền** hoặc **tỷ lệ phần trăm** trên doanh thu  

---

### 8. Hệ thống quét barcode check-in / check-out
Hỗ trợ quét mã vạch cho từng công đoạn của đơn hàng.

Quy trình:
1. Nhân viên đăng nhập  
2. Quét mã đơn hàng  
3. Chọn công đoạn → Check-in / Check-out  

Dữ liệu quét được lưu để thống kê **hiệu suất**, **thời gian thao tác**, và **truy xuất lịch sử quy trình**.

---

### 9. Dashboard theo dõi tiến độ
Hiển thị tiến độ **theo thời gian thực**, bao gồm:
- Trạng thái đơn hàng  
- Nhân viên phụ trách  
- Công đoạn hiện tại  
- Thống kê năng suất theo ngày / giờ / phòng ban / sản phẩm  

Giúp ban quản lý nắm rõ tình hình sản xuất tại mọi thời điểm.

---

### 10. Xuất Excel & Import vào MISA
Hỗ trợ xuất file Excel tương thích phần mềm kế toán **MISA**, bao gồm:
- Danh sách nhân viên và công đoạn  
- Dữ liệu nguyên liệu  
- Sản phẩm  
- Đơn hàng  

---

## 📜 Giấy phép

MIT License © 2025 – Luca / HonVang Systems
