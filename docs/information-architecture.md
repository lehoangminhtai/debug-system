# Information architecture

Mọi route nằm sau `#` (hash router), ví dụ `/#/FF`, `/#/bugs/FF-001`.

```text
Debugging System
├── Sidebar
│   ├── Tất cả dự án            /all            [tổng bug bắt buộc sửa đang mở]
│   ├── Dự án
│   │   ├── FoodFast (FF)       /FF             [3]
│   │   ├── ShopMini (SM)       /SM             [1]
│   │   └── HR Portal (HR)      /HR             [0]
│   └── + Dự án mới             (dialog)
├── Header
│   ├── Tiêu đề trang / breadcrumb
│   ├── Tôi là: [Lan ▾]
│   └── Ngôn ngữ: [Tiếng Việt ▾]
└── Main
    ├── /:scope              Danh sách  ─┐ tab chuyển đổi
    ├── /:scope/board        Kanban     ─┘
    ├── /bugs/new            Báo bug
    ├── /bugs/:code          Chi tiết bug
    └── /bugs/:code/edit     Sửa bug
```

## Phân cấp nội dung (trang dự án)

1. **Trạng thái release** — quan trọng nhất, luôn ở trên cùng (spec §6).
2. Hành động chính: Báo bug.
3. Công cụ tìm/lọc.
4. Dữ liệu (bảng hoặc kanban).

## Phân cấp nội dung (chi tiết bug)

1. Mã + tiêu đề + "Bắt buộc sửa".
2. Tiến trình + hành động kế tiếp (Nhận sửa / Đánh dấu đã sửa / Đóng bug).
3. Nội dung tái tạo (cột chính) — thứ dev cần đọc.
4. Metadata + người sửa + lịch sử (cột phụ).

## Navigation rules

- Sidebar luôn hiện ở ≥ 1024px; < 1024px thu vào `Sheet` mở bằng nút menu.
- Mục đang chọn có `aria-current="page"`.
- Tab Danh sách / Kanban giữ nguyên query lọc chung (`q`, `platform`, `core`).
- Từ chi tiết bug, breadcrumb về dự án của bug.
