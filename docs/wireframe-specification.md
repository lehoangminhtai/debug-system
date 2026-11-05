# Wireframe specification

## App shell (≥ 1024px)

```text
┌──────────────┬───────────────────────────────────────────────────────────┐
│ ◆ DebugS     │ FoodFast                         Tôi là [Lan ▾]  [VI ▾]  │ header 56px
│              ├───────────────────────────────────────────────────────────┤
│ ▣ Tất cả  4  │                                                           │
│ DỰ ÁN        │                    main (max-w 1280, p-6)                 │
│ FF FoodFast 3│                                                           │
│ SM ShopMini 1│                                                           │
│ HR HR Portal │                                                           │
│ + Dự án mới  │                                                           │
│              │                                                           │
│ Lưu cục bộ ⓘ │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
  248px
```

< 1024px: sidebar ẩn, header có nút ☰ mở Sheet trái. Header: các selector thu gọn thành icon + mã ngắn.

## Danh sách bug `/:scope`

```text
FoodFast  FF                                    [Danh sách|Kanban] [+ Báo bug]
Tính năng cốt lõi: đăng nhập, đặt món, thanh toán
┌───────────────────────────────────────────────────────────────────────────┐
│ ⛔ Chưa được release · 3 bug bắt buộc sửa chưa đóng   FF-001 FF-002 FF-003 │
└───────────────────────────────────────────────────────────────────────────┘
[🔍 Tìm mã hoặc tiêu đề ] [Nền tảng ▾] [Cốt lõi ▾] [Trạng thái ▾] [Xóa lọc]
┌──────┬──────────────────────────────┬────────┬──────┬────────┬────────┬──────┬───────┐
│ Mã ↕ │ Tiêu đề                      │Nền tảng│Cốt lõi│Mức độ ↕│Trạng thái│Người sửa│Ngày ↕│
├──────┼──────────────────────────────┼────────┼──────┼────────┼────────┼──────┼───────┤
│FF-001⛨│ Crash khi bấm Thanh toán…   │ Mobile │  ✔   │Nghiêm… │Đang sửa│ Minh │05/11  │
└──────┴──────────────────────────────┴────────┴──────┴────────┴────────┴──────┴───────┘
1–7 / 7                                                         [‹ Trước] [Sau ›]
```

Ở `/all`: không thêm cột "Dự án" — mã bug đã mang tiền tố dự án (`FF-`, `SM-`) và ô release liệt kê ánh xạ mã → tên; nhờ vậy cột Tiêu đề đủ rộng. Ô release là danh sách: `2/3 dự án chưa được release` + mỗi dự án 1 thẻ.

Chỉ báo "bắt buộc sửa" trong bảng là icon khiên đỏ cạnh mã (có `aria-label`), không dùng badge chữ để không chiếm chỗ tiêu đề.

< 768px: bảng chuyển thành danh sách thẻ (mã + ngày, tiêu đề 2 dòng, trạng thái/mức độ/nền tảng/người sửa), dùng chung row model nên phân trang giữ nguyên.

## Kanban `/:scope/board`

```text
(page header + release giống trên)
[🔍 Tìm] [Nền tảng ▾] [Cốt lõi ▾]
┌ Mới  3 ─────┐┌ Đang sửa 2 ─┐┌ Đã sửa 1 ───┐┌ Đóng 1 ─────┐
│┌───────────┐││┌───────────┐││             ││             │
││FF-003  Cao│││FF-001 Ngh.│││             ││             │
││Không gửi..│││Crash khi..│││             ││             │
││▣FE ●Cốt lõi│││▣Mobile (M)│││             ││             │
│└───────────┘││└───────────┘││             ││             │
└─────────────┘└─────────────┘└─────────────┘└─────────────┘
```

Cột rộng 288px; < 1024px cuộn ngang với snap. Nút "Đổi trạng thái" trên thẻ có tooltip.

## Chi tiết bug `/bugs/:code`

```text
FoodFast / FF-001                                          [✎ Sửa] [🗑 Xóa]
Crash khi bấm Thanh toán bằng ví
[Mobile] [Cốt lõi] [Nghiêm trọng] [Bắt buộc sửa]
┌───────────────────────────────────────────────────────────────────────────┐
│ ① Mới ──────── ② Đang sửa ──── ③ Đã sửa ──── ④ Đóng   [Đánh dấu đã sửa]  │
│ Lan · 01/11     Minh · 02/11     —               —                         │
└───────────────────────────────────────────────────────────────────────────┘
┌──────────── main 1fr ─────────────────┐ ┌──── aside 320px ──────────────┐
│ Bước tái tạo                          │ │ Trạng thái   [Đang sửa ▾]     │
│ 1. Mở giỏ hàng 2. …                   │ │ Người sửa    [Minh ▾]         │
│ ┌ Mong đợi ─────┐┌ Thực tế ──────┐    │ │ Dự án / Nền tảng / Mức độ…    │
│ └───────────────┘└───────────────┘    │ │ Người báo · Ngày tạo          │
│ Hình minh chứng  [img][img]           │ ├───────────────────────────────┤
│ Ghi chú                               │ │ Lịch sử                       │
└───────────────────────────────────────┘ │ ● Minh nhận sửa · 2 giờ trước │
                                          └───────────────────────────────┘
```

< 1024px: aside xuống dưới main; stepper chuyển dọc < 640px.

## Form `/bugs/new`

```text
Báo bug mới
┌ Thông tin chung ─────────────────────────────────────────────┐
│ Dự án [FoodFast ▾]                                           │
│ Tiêu đề [_____________________________________]              │
│ Nền tảng (◉ Backend) (○ Frontend) (○ Mobile)                 │
├ Phân loại ───────────────────────────────────────────────────┤
│ Tính năng cốt lõi của FoodFast: đăng nhập, đặt món, …        │
│ Ảnh hưởng cốt lõi? (○ Có) (○ Không)                          │
│ Mức độ [Nghiêm trọng][Cao][Trung bình][Thấp] (thẻ có ví dụ)  │
│ → ⛔ Bắt buộc sửa trước release                              │
├ Tái tạo ─────────────────────────────────────────────────────┤
│ 1 [____________________] ✕                                   │
│ + Thêm bước                                                  │
│ Mong đợi [_______]   Thực tế [_______]   (md: 2 cột)         │
├ Hình minh chứng ─────────────────────────────────────────────┤
│ [ Kéo thả hoặc chọn ảnh ]  [img + caption ✕]                 │
├ Khác ────────────────────────────────────────────────────────┤
│ Người báo [Lan ▾]  Người sửa [— ▾]   Ghi chú [_____]         │
└──────────────────────────────────────────────────────────────┘
                                             [Hủy] [Báo bug]
```

Max-width 768px, căn trái theo cột nội dung.
