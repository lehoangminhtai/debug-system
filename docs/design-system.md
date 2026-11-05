# Design system

Ý định thiết kế (một câu): **giao diện vận hành dày thông tin, hiện đại và đáng tin cậy — xanh dương là màu nhận diện, xám lạnh làm nền trung tính, màu semantic chỉ dùng để truyền tải trạng thái.**

Nguồn token: `src/index.css` (CSS variables + `@theme inline` của Tailwind v4, tương thích shadcn/ui). Typography, spacing, radius, motion vẫn theo `doc/DESIGN.md`.

## 1. Color system — Blue & Cool Gray (chính thức)

Phong cách: Modern · Professional · Enterprise · Clean · Minimal · Trustworthy. Áp dụng từ 05/11/2026, thay palette trung tính đen/xám trước đó.

### 1.1 Palette chính thức (tầng 1)

| Token chính thức | Giá trị | CSS variable | Vai trò |
|---|---|---|---|
| `--primary` | `#2563EB` | `--primary` | Hành động chính, trạng thái đang chọn, tiến trình |
| `--primary-hover` | `#1D4ED8` | `--primary-hover` | Hover/active của nút chính; chữ trên nền xanh nhạt |
| `--primary-light` | `#DBEAFE` | `--primary-light` | Nền mục đang chọn (sidebar, tab), radio đang chọn, vùng thả |
| `--accent` | `#3B82F6` | `--brand-accent` ¹ | Focus ring, thanh tiến trình tải trang |
| `--background` | `#F1F5F9` | `--background` | Nền trang |
| `--surface` | `#FFFFFF` | `--surface` | Card, bảng, dialog, popover, sidebar, header, ô nhập |
| `--foreground` | `#1E293B` | `--foreground` | Chữ chính (không dùng đen thuần) |
| `--muted` | `#64748B` | `--placeholder` ² | Placeholder trên nền trắng |
| `--border` | `#E2E8F0` | `--border` | Viền card, đường kẻ bảng, divider |
| `--success` | `#16A34A` | `--success` | Icon, viền, fill trạng thái thành công |
| `--warning` | `#D97706` | `--warning` | Icon, viền, fill cảnh báo |
| `--destructive` | `#DC2626` | `--destructive` | Nút phá hủy, viền trường lỗi |
| `--info` | `#0284C7` | `--info` | Icon, viền thông tin |

¹ Tên `--accent` trong shadcn/ui là **nền hover/chọn trung tính** của menu, ghost button, select item. Nếu gán #3B82F6 cho nó thì mọi menu hover thành xanh đậm, vi phạm quy tắc "không lạm dụng xanh". Vì vậy màu accent chính thức đặt tên `--brand-accent` (class `ring`, `bg-brand-accent`).

² Tên `--muted` trong shadcn/ui là **màu nền** (`bg-muted`). #64748B là màu chữ phụ nhưng chỉ đạt **4.34:1** trên `--background` (< 4.5:1 AA), nên chữ phụ dùng `--muted-foreground` #475569 (bậc đậm hơn cùng dải Slate). #64748B dùng cho placeholder trên nền trắng (4.76:1).

### 1.2 Màu chữ trên nền nhạt (đạt WCAG AA)

Màu semantic chính thức là màu "fill/icon". Khi làm **chữ** chúng không đạt 4.5:1, nên mỗi màu có một bậc đậm hơn cùng dải:

| Semantic | Fill / icon / viền | Chữ (`-text`) | Nền nhạt (`-bg`) | Tương phản chữ/nền |
|---|---|---|---|---|
| destructive | `#DC2626` | `#B91C1C` | `#FEF2F2` | 5.9:1 |
| success | `#16A34A` | `#15803D` | `#F0FDF4` | 4.8:1 |
| warning | `#D97706` | `#B45309` | `#FFFBEB` | 4.9:1 |
| info | `#0284C7` | `#0369A1` | `#F0F9FF` | 5.6:1 |
| primary | `#2563EB` | `#1D4ED8` | `#DBEAFE` | 5.5:1 |
| neutral | — | `#475569` (`muted-foreground`) | `#F1F5F9` (`muted`) | 6.9:1 |

Lý do (đo trên trắng): success #16A34A = 3.30, warning #D97706 = 3.19, info #0284C7 = 4.10. Tất cả các cặp được kiểm tự động bằng `scripts/contrast.test.ts` (chạy trong `npm test`).

### 1.3 Token ngữ nghĩa shadcn/ui (tầng 2)

| shadcn token | Trỏ về | Ghi chú |
|---|---|---|
| `background` / `foreground` | `#F1F5F9` / `#1E293B` | |
| `card`, `popover`, `sidebar` | `--surface` | Mặt trắng |
| `primary` / `primary-foreground` | `#2563EB` / `#FFFFFF` | 5.2:1 |
| `secondary` / `secondary-foreground` | `--background` / `--foreground` | Nền phụ trung tính |
| `muted` / `muted-foreground` | `#F1F5F9` / `#475569` | |
| `accent` / `accent-foreground` | `#F1F5F9` / `--foreground` | Hover menu/ghost — trung tính |
| `destructive` / `destructive-foreground` | `#DC2626` / `#FFFFFF` | 4.8:1; hover `#B91C1C` |
| `border` | `#E2E8F0` | Bố cục |
| `input` | `#CBD5E1` | Viền control, đậm hơn `border` một bậc (cùng dải Slate) để nhận ra ô nhập |
| `ring` | `--brand-accent` #3B82F6 | 3.7:1 trên trắng, 3.4:1 trên nền |

Bóng (`shadow-xs/md/lg`) dùng màu `#1E293B` với độ mờ thấp; lớp phủ dialog `bg-foreground/40` — không dùng đen thuần.

### 1.4 Quy tắc sử dụng

| Quy tắc | Áp dụng |
|---|---|
| Xanh chỉ cho: hành động chính, trạng thái đang chọn, focus, tiến trình, trạng thái "Đã sửa" | Nút `default`, mục sidebar/tab đang chọn, radio đang chọn, stepper, ring |
| Không dùng xanh cho hover chung | Hover = `accent` (xám lạnh) |
| Primary / Secondary / Destructive phân biệt rõ | `default` xanh đặc · `outline` trắng viền `input` · `destructive` đỏ đặc. Dialog xác nhận phá hủy **phải** dùng `variant="destructive"` |
| Mặt trắng trên nền xám | Card, bảng, danh sách mobile, ô nhập, select, dialog |
| Vùng phụ trong card | `bg-muted` (dropzone, thông tin tóm tắt, header bảng) |
| Cột Kanban | `bg-card/50` trên nền xám, thẻ trắng |
| Pill trạng thái | Nền `-bg` + chữ `-text` + viền `ring-current/15` để rõ hình trên mọi nền |
| Component không dùng hex | Chỉ class token; ánh xạ trạng thái → màu duy nhất ở `src/lib/meta.ts` |

### 1.5 Ánh xạ nghiệp vụ → màu

| | Mới | Đang sửa | Đã sửa | Đóng |
|---|---|---|---|---|
| Trạng thái | neutral | warning | primary | success |

| | Nghiêm trọng | Cao | Trung bình | Thấp |
|---|---|---|---|---|
| Mức độ | destructive | warning | info | neutral |

Release: Sẵn sàng → success · Chưa được release / bắt buộc sửa → destructive. Toast: icon success/info/warning/destructive.

## 2. Typography

Font: **Inter** (Google Fonts), fallback `system-ui`. Weight base 500 theo DESIGN.md cho label/nút; nội dung đọc dài dùng 400.

| Token | Size / line-height | Dùng cho |
|---|---|---|
| `text-xs` | 12 / 16 | Badge, metadata, chú thích |
| `text-sm` | 13 / 18 | Bảng, menu, label |
| `text-base` | 14 / 20 | Body mặc định của ứng dụng |
| `text-lg` | 16 / 22 | Tiêu đề section |
| `text-xl` | 20 / 28 | Tiêu đề trang |

`font.size.3xl/4xl` (40/56) thuộc marketing site → không dùng trong ứng dụng. Không thêm cỡ chữ khác.

## 3. Spacing

Dùng thang Tailwind (4px) trùng với `space.*`: 1px (`px`), 4 (`1`), 6 (`1.5`), 8 (`2`), 10 (`2.5`), 12 (`3`), 16 (`4`); bổ sung 24 (`6`) và 32 (`8`) cho khoảng cách layout. `space.7=15px` không dùng (lệch lưới).

## 4. Radius / Shadow / Motion

| Token (class Tailwind) | Giá trị | Dùng cho |
|---|---|---|
| `radius-xs` (`rounded-sm`) | 4px | Badge, checkbox |
| `radius-sm` (`rounded-md`) | 8px | Button, input, menu item |
| `radius-md` (`rounded-lg`) | 10px | Card, thẻ kanban |
| `radius-lg` (`rounded-xl`) | 12px | Dialog, popover |
| `radius-xl` (`rounded-full`) | 50px | Avatar, pill đếm |
| `shadow.1` (`shadow-md`/`shadow-lg`) | xem DESIGN.md | Chỉ popover, dropdown, dialog, thẻ đang kéo |
| `duration-instant` | 150ms | Hover, màu |
| `duration-normal` | 250ms | Mở/đóng overlay |

Card trong trang dùng viền, **không** dùng shadow.

## 5. Icon

Lucide React, stroke mặc định 2, size 16 (inline) / 14 (trong badge). Nền tảng: `Server` (Backend), `Monitor` (Frontend), `Smartphone` (Mobile). Mức độ: `OctagonAlert` (Nghiêm trọng), `ChevronsUp` (Cao), `Equal` (Trung bình), `ChevronDown` (Thấp). Trạng thái: `CircleDashed`, `CircleDot`, `CircleCheck`, `CheckCheck`. Ánh xạ màu + icon nằm duy nhất ở `src/lib/meta.ts`. Nút chỉ có icon luôn có `aria-label` + tooltip (`components/common/hint.tsx`). Không dùng emoji.

## 6. Layout grid & breakpoints

| Breakpoint | Width | Hành vi |
|---|---|---|
| base | < 640 | 1 cột; danh sách bug dạng thẻ; kanban cuộn ngang theo cột (snap) |
| `sm` | ≥ 640 | Toolbar lọc 1 hàng xuống dòng |
| `md` | ≥ 768 | Form 2 cột cho cặp trường |
| `lg` | ≥ 1024 | Sidebar cố định 248px; chi tiết bug 2 cột (1fr / 320px) |
| `md`–`xl` | 768–1279 | Bảng ẩn cột Nền tảng + Ngày tạo để Tiêu đề đủ rộng, không cuộn ngang |
| `xl` | ≥ 1280 | Bảng đầy đủ cột; padding ngang 32px |
| — | ≥ 1664 | Nội dung max-width 1600px, căn giữa; form max-width 768px, căn giữa |

## 7. Trạng thái tương tác (chuẩn hóa sau UI/UX audit)

| Trạng thái | Quy tắc |
|---|---|
| Hover | Nút chính `primary-hover` #1D4ED8 · destructive #B91C1C · outline/ghost/menu `accent` (xám lạnh); `duration-150`; không đổi kích thước |
| Active (nhấn) | Nút đặc `brightness-95` trên màu hover · outline/ghost `border/60` |
| Focus-visible | Ring 2px đặc `--ring` (#3B82F6, ≥ 3:1 trên trắng, nền và `primary-light`); trường lỗi: ring 2px đặc `--destructive` |
| Selected | Nền `primary-light` + chữ `primary-hover` (sidebar, tab Danh sách/Kanban); radio: viền `primary` + nền `primary-light/40` |
| Disabled | `opacity-50`, `pointer-events-none` |
| Loading | Spinner `Loader2` + `aria-busy`; thao tác trạng thái dùng optimistic update |
| Reduced motion | `prefers-reduced-motion: reduce` → tắt animation/transition toàn cục |

## 8. Cỡ chữ của control

Input/Textarea: 16px dưới 768px (tránh iOS tự phóng to khi focus), 13px từ 768px — khớp Select/Button (13px). Tiêu đề section 14px semibold (không nhỏ hơn chữ thân). `h1` 20px, `letter-spacing: -0.011em`.
