# UI/UX specification

## 1. Context & goals

Ứng dụng nội bộ dùng hằng ngày bởi QA và dev. Ưu tiên: đọc nhanh trạng thái release, mô tả bug đủ để tái tạo, thao tác ít bước. Phong cách: structured, content-first — Color System **Blue & Cool Gray** (`design-system.md` §1): nền xám lạnh, mặt trắng, xanh cho hành động chính. Token xem `design-system.md`.

## 2. Quy tắc chung (bắt buộc)

- Mọi control tương tác **must** có state: default, hover, focus-visible (ring 2px `--ring`, offset 2px), active, disabled (opacity 50%, `cursor-not-allowed`), loading (spinner + disabled), error (viền `danger` + thông báo dưới trường, `aria-invalid`).
- Màu **must** đi kèm chữ hoặc icon (không truyền tải chỉ bằng màu).
- Nhãn hành động **must** là động từ cụ thể: "Báo bug", "Nhận sửa", "Đóng bug" — không dùng "OK", "Submit".
- Nội dung người dùng nhập **must** hiển thị nguyên văn, giữ xuống dòng (`whitespace-pre-wrap`), từ dài được ngắt (`break-words`).

## 3. Component specification

| Component | Anatomy / variants | Keyboard / pointer / touch | Edge cases |
|---|---|---|---|
| **Button** | variants: `default` (primary xanh #2563EB), `outline`, `ghost`, `destructive`, `link`; sizes `sm` 32px, `default` 36px, `icon` 36×36 | Enter/Space; vùng chạm ≥ 32px (≥ 40px trên mobile cho nút icon chính) | Loading: thay icon bằng `Loader2` quay, `aria-busy` |
| **Input / Textarea** | label trên, hint dưới, lỗi dưới (thay hint) | label `htmlFor`; lỗi liên kết `aria-describedby` | Textarea tự giãn tối thiểu 3 dòng; giới hạn ký tự hiển thị đếm khi gần chạm |
| **Select** | Radix Select, trigger cao 36px | Mũi tên/Enter/Esc, typeahead | Danh sách dài cuộn trong popover |
| **Dropdown menu** | Radix, item 32px, có icon trái | Mũi tên, Enter, Esc trả focus về trigger | — |
| **Radio cards** | Nền tảng, mức độ, cốt lõi: nhóm `radiogroup` dạng thẻ có mô tả | Mũi tên di chuyển trong nhóm | Mức độ hiện ví dụ từ spec §3.2 |
| **Dialog / AlertDialog** | radius-lg, shadow-overlay, max-w 480px, mobile full width trừ gutter 16px | Focus trap, Esc đóng, focus về trigger | Xóa dùng AlertDialog, nút hủy được focus mặc định |
| **Card / Section** | viền 1px, radius-md, padding 16px, tiêu đề `text-lg` | — | Không lồng card trong card |
| **Table** | header nền sidebar, dòng 44px, hover `accent`, cột mã font mono | Dòng là link (Tab tới mã), header sắp xếp là button có `aria-sort` | Tiêu đề `truncate` + `title`; 768–1279px ẩn cột Nền tảng/Ngày tạo; < 768px chuyển thành danh sách thẻ |
| **Tabs (List/Kanban)** | segmented control, là `nav` với link | Tab/Enter | Giữ query lọc |
| **Badge** | `status`, `severity`, `platform`, `core`, `mustFix`; cao 20px, text-xs, icon 12–14px | Không tương tác | Không xuống dòng |
| **Tooltip** | Chỉ cho nút icon | Hiện khi focus | Không chứa thông tin duy nhất |
| **Navigation (sidebar)** | item 32px, badge đếm bên phải | `aria-current` | Tên dài truncate |
| **Pagination** | "1–10 / 37" + Trước/Sau | Nút disabled ở biên | Ẩn khi ≤ 1 trang |
| **Form** | Section tiêu đề + mô tả ngắn; nút hành động cuối (sticky trên mobile) | Submit lỗi → focus trường lỗi đầu | Rời trang không cảnh báo (giả định) |
| **Toast (Sonner)** | góc dưới phải, success/error | `aria-live` (Sonner) | Tối đa 3 |
| **Kanban card** | mã + mức độ, tiêu đề (2 dòng), nền tảng, cốt lõi, avatar người sửa | Kéo thả bằng chuột; menu "Chuyển sang" cho bàn phím và touch | Đang kéo: opacity 50%; cột đích highlight viền `ring` |
| **Progress stepper** | 4 bước, hoàn thành: icon check đậm; hiện tại: viền ring; tương lai: xám. Dưới mỗi bước: người · ngày | Danh sách `ol`, bước hiện tại `aria-current="step"` | Mobile: dọc |

## 4. Content & tone

Ngắn gọn, tự tin, hướng hành động.

| Đúng | Sai |
|---|---|
| "Chưa được release — còn 3 bug bắt buộc sửa" | "Có vẻ có vấn đề với release" |
| "Không có bug khớp bộ lọc" | "Oops! Không có gì ở đây" |
| "Không lưu được. Bộ nhớ trình duyệt đã đầy." | "Error 500" |

## 5. Accessibility acceptance criteria (pass/fail)

1. Tab qua toàn bộ trang theo thứ tự đọc, mọi phần tử nhận focus có ring nhìn thấy.
2. Có link "Bỏ qua đến nội dung" ở đầu trang.
3. Mọi input có label liên kết; lỗi được đọc bởi screen reader (`aria-invalid` + `aria-describedby`).
4. Đổi trạng thái kanban làm được **không cần chuột** (menu Chuyển sang).
5. Chữ thường ≥ 4.5:1, ring focus ≥ 3:1.
6. `<html lang>` khớp ngôn ngữ đã chọn.
7. Header bảng sắp xếp có `aria-sort`.
8. Dialog bẫy focus, Esc đóng, trả focus.

## 6. Anti-patterns (cấm)

- Shadow trên card tĩnh, gradient, animation trang trí.
- Màu nền đậm cho cả dòng bảng.
- Nút không có chức năng.
- Ẩn outline focus.
- Cỡ chữ ngoài thang typography.

## 7. QA checklist

- [ ] Ô release đúng với dữ liệu mẫu (FoodFast: Chưa được release, 3 bug).
- [ ] Mã bug mới tiếp nối sau khi xóa.
- [ ] Đổi trạng thái/người sửa ghi lịch sử.
- [ ] 4 ngôn ngữ dịch hết chữ giao diện, ngày theo locale.
- [ ] Responsive 375 / 768 / 1280.
- [ ] Không lỗi console.
