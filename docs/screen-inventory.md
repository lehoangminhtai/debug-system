# Screen inventory

Không có phân quyền → mọi màn hình đều cho mọi người dùng. `:scope` = `all` hoặc key dự án.

| # | Screen | Route | Mục đích |
|---|---|---|---|
| S1 | App shell (sidebar + header) | mọi route | Điều hướng dự án, ngôn ngữ, người dùng hiện tại |
| S2 | Danh sách bug | `/:scope` | Ô release + bảng bug + lọc/tìm |
| S3 | Kanban | `/:scope/board` | Theo dõi và đổi trạng thái bằng kéo thả |
| S4 | Chi tiết bug | `/bugs/:code` | Toàn bộ thông tin, tiến trình, lịch sử, thao tác |
| S5 | Báo bug mới | `/bugs/new?project=KEY` | Form tạo bug |
| S6 | Sửa bug | `/bugs/:code/edit` | Form sửa bug (tái sử dụng S5) |
| S7 | Không tìm thấy | `*`, key/mã lạ | 404 |
| D1 | Dialog tạo dự án | (dialog) | Tạo dự án |
| D2 | AlertDialog xóa bug | (dialog) | Xác nhận xóa |
| D3 | Dialog xem ảnh | (dialog) | Ảnh kích thước lớn + chú thích |

## S1 — App shell

- Sections: Sidebar (logo, "Tất cả dự án", danh sách dự án + badge số bắt buộc sửa, "+ Dự án mới", ghi chú lưu cục bộ), Header (nút mở sidebar trên mobile, breadcrumb/tiêu đề, "Tôi là", ngôn ngữ).
- Components: `Sidebar`, `ProjectNav`, `NewProjectDialog`, `UserSwitcher`, `LanguageSwitcher`, `Sheet` (mobile).
- Loading: skeleton 3 dòng dự án. Empty: "Chưa có dự án" + nút tạo. Error: dòng lỗi + thử lại.

## S2 — Danh sách bug

- Sections: Page header (tên dự án, mô tả cốt lõi, tab Danh sách/Kanban, nút Báo bug) → Release status → Toolbar lọc → Bảng → Phân trang.
- Components: `ReleaseStatus`, `BugFilters`, `BugTable` (TanStack Table), badge trạng thái/mức độ/nền tảng/cốt lõi/bắt buộc sửa.
- Thao tác: tìm, lọc 3 loại, xóa lọc, sắp xếp cột, phân trang, bấm dòng/mã.
- Loading: skeleton release + 6 dòng. Empty: "Chưa có bug nào" + Báo bug. Empty filter: "Không có bug khớp bộ lọc" + Xóa bộ lọc. Error: khối lỗi + Thử lại. Success: dữ liệu.

## S3 — Kanban

- Sections: Page header (chung S2) → Release status → thanh tìm/lọc nền tảng & cốt lõi → 4 cột.
- Components: `KanbanBoard`, `KanbanColumn`, `KanbanCard` (menu Chuyển sang…).
- Loading: skeleton 4 cột. Empty cột: "Không có bug". Error: khối lỗi. Success: toast sau khi chuyển trạng thái.

## S4 — Chi tiết bug

- Sections: breadcrumb + mã + tiêu đề + badge + nút Sửa/Xóa → Tiến trình 4 bước + nút hành động kế tiếp → (cột chính) Bước tái tạo, Mong đợi / Thực tế, Ảnh minh chứng, Ghi chú → (cột phụ) Thông tin (dự án, nền tảng, cốt lõi, mức độ, bắt buộc sửa, người báo, ngày tạo), Người sửa (select), Trạng thái (select), Lịch sử.
- Loading: skeleton. Not found: S7 nội tuyến. Error: khối lỗi. Pending: control disabled.

## S5/S6 — Form bug

- Sections: Dự án, Tiêu đề, Nền tảng (radio), Phân loại (cốt lõi + mức độ + xem trước bắt buộc sửa), Tái tạo (bước động, mong đợi, thực tế), Ảnh minh chứng (upload + chú thích), Khác (ghi chú, người báo, người sửa) → Hủy / Lưu.
- Loading (S6): skeleton. Error: lỗi tại trường, toast khi lưu lỗi. Success: toast + chi tiết.

## S7 — 404

Biểu tượng, tiêu đề, mô tả, nút "Về danh sách bug".
