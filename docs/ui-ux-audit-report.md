# UI/UX Audit Report — DebugS

Ngày: 05/11/2026 · Phạm vi: toàn bộ frontend (8 route, 5 dialog/trạng thái overlay) · Chuẩn: `doc/DESIGN.md`, `doc/SKILL.md`, WCAG 2.2 AA

## Phương pháp

| Công cụ | Phạm vi |
|---|---|
| `npm run audit` (Playwright + axe-core 4.14) | 8 viewport (375, 390, 430, 768, 1024, 1280, 1440, 1920) × 8 route = 64 lần xem trang + 10 trạng thái overlay. Đo: tràn ngang, vùng chạm < 24px theo WCAG 2.5.8 (có tính ngoại lệ khoảng cách), thứ tự heading, axe (wcag2a/aa, 21aa, 22aa, best-practice), lỗi console. Ảnh chụp ở `audit-results/` |
| Rà soát ảnh chụp thủ công | Phân cấp thị giác, khoảng cách, căn lề, mật độ thông tin ở từng breakpoint |
| Đo computed style | Focus ring thực tế (độ dày, màu) trên control thường và trường lỗi |
| Đọc lại source | Toàn bộ `src/`, cấu hình shadcn, token, routing |
| `npm run e2e` | 27 luồng chức năng, chạy lại sau mỗi đợt sửa |

## 1. Overall Assessment

**Trước audit:** chức năng đầy đủ, đúng nghiệp vụ, phong cách nhất quán. Không có lỗi P0 (mọi luồng chính chạy được, E2E 22/22). Tuy vậy còn 8 vấn đề P1:

- 2 vấn đề responsive: bảng bị cắt cột ở 768–1279px, input bị iOS tự phóng to.
- 1 vấn đề có thể **mất dữ liệu**: rời form không được hỏi xác nhận.
- 3 vấn đề điều hướng SPA: không reset cuộn, không chuyển focus, không có màn hình lỗi route.
- 2 lỗi a11y do axe phát hiện: trang 404 thiếu h1, input file thiếu nhãn.

Ngoài ra có nhiều vấn đề về tính nhất quán (P2/P3). Đánh giá: **7/10**.

**Sau audit:**

- 23 vấn đề đã sửa.
- 0 tràn ngang và 0 vùng chạm vi phạm trên 64 lần xem trang.
- 0 vi phạm axe ở mọi trang tĩnh. Còn 3 vi phạm chỉ xuất hiện khi Select đang mở, do hành vi có chủ đích của Radix (xem mục 9).
- 0 lỗi console; E2E 27/27.

Đánh giá: **9/10**.

## 2. Issues Found

| # | Vấn đề | Màn hình / viewport | Phát hiện bằng |
|---|---|---|---|
| 1 | Bảng bug rộng tối thiểu 880px nhưng khung chỉ còn 720–983px. Cột Ngày tạo/Người sửa bị đẩy ra ngoài, Tiêu đề chỉ còn ~116px | Danh sách, 768–1279px | Ảnh chụp 768/1024 |
| 2 | Rời form báo/sửa bug (Hủy, Back, bấm sidebar, tải lại, đóng tab) làm mất dữ liệu mà không hỏi | Form | Rà soát luồng |
| 3 | Chuyển trang giữ nguyên vị trí cuộn của trang trước (thiếu `ScrollRestoration`) | Mọi trang | Rà soát + E2E |
| 4 | Sau khi chuyển trang, focus nằm lại trên link cũ, nên screen reader không biết trang đã đổi | Mọi trang | Rà soát a11y |
| 5 | Input/Textarea 14px trên mobile khiến iOS Safari tự phóng to khi focus | Form, bộ lọc, < 768px | Đọc class + DESIGN.md |
| 6 | Không có `errorElement`: lỗi render hoặc tải chunk lazy thất bại (sau deploy) hiện màn hình lỗi mặc định của React Router (tiếng Anh, dạng dev) | Toàn app | Rà soát routing |
| 7 | Trang 404 không có `h1` | 404, mã bug/dự án không tồn tại | axe `page-has-heading-one`, kiểm tra heading |
| 8 | Input file ẩn không có nhãn (axe **critical**) | Form, 6 lần xem | axe `label` |
| 9 | Trường đang lỗi khi focus chỉ có ring đỏ **độ mờ 20%**, không đạt 3:1 (WCAG 1.4.11). Nút `destructive` cũng vậy | Mọi form | Đọc class + đo computed style |
| 10 | Tiêu đề section 13px **nhỏ hơn** chữ thân 14px, làm ngược phân cấp | Chi tiết, form, Kanban | Ảnh chụp |
| 11 | Icon mức độ Trung bình/Thấp (`SignalMedium/Low`) hiển thị như dấu chấm câu "., ." | Bảng, Kanban, form | Ảnh chụp |
| 12 | Nội dung giới hạn 1280px căn giữa, để lại khoảng trống ~220px giữa sidebar và nội dung; header lệch khỏi nội dung | ≥ 1440px | Ảnh chụp 1920 |
| 13 | Ở trang chi tiết/form bug, sidebar không đánh dấu dự án nào nên người dùng mất ngữ cảnh | Chi tiết, form | Ảnh chụp |
| 14 | Đổi trạng thái/người sửa ở trang chi tiết: Select hiện giá trị cũ ~250ms, kèm nhãn "Đang tải…" sai ngữ cảnh | Chi tiết | Thao tác thực tế |
| 15 | Nút không có trạng thái nhấn (active); `transition-all` animate cả thuộc tính layout | Mọi nút | Đọc class |
| 16 | Không tôn trọng `prefers-reduced-motion` | Toàn app | Đọc CSS |
| 17 | Nút chỉ có icon (đổi trạng thái thẻ, xóa bước, xóa ảnh) không có tooltip, nên người dùng sáng mắt không biết chức năng | Kanban, form | Rà soát |
| 18 | Form không có breadcrumb, căn trái trong vùng rộng, tạo khoảng trống bên phải vô chủ đích | Form, ≥ 1280px | Ảnh chụp 1440 |
| 19 | Lần đầu mở form (chunk lazy) không có phản hồi đang tải | Điều hướng tới form | Rà soát |
| 20 | Toast trên mobile đè lên thanh hành động cố định của form | Form, < 640px | Ảnh chụp |
| 21 | Số đếm ở sidebar dùng `aria-label` trên `<span>` không có role, nên screen reader không đọc ổn định | Sidebar | Rà soát ARIA |
| 22 | Mục điều hướng cao 32px trên màn hình cảm ứng (đạt AA nhưng dưới mức thoải mái 40px+) | Sheet mobile | Đo |
| 23 | `/ff` (gõ thường) báo "không tìm thấy dự án", `/bugs` báo "không tìm thấy dự án bugs" | URL | Thử thủ công |
| 24 | Placeholder "FF" ở ô mã dự án trông như giá trị đã nhập | Dialog tạo dự án | Ảnh chụp |
| 25 | Token `--subtle-foreground` không dùng ở đâu (nguy cơ dùng nhầm cho chữ, không đạt tương phản) | Design system | Rà soát token |
| 26 | Breadcrumb viết inline riêng ở trang chi tiết (trùng lặp khi thêm cho form) | Code | Rà soát |
| 27 | shadcn CLI lại tự thêm package npm `cn` khi thêm tooltip | Dependency | Kiểm tra `package.json` |

## 3. Priority Classification

| Mức | Vấn đề |
|---|---|
| **P0** — Critical | Không có. Mọi luồng nghiệp vụ hoạt động trước audit |
| **P1** — High | #1 bảng bị cắt cột · #2 mất dữ liệu form · #3 không reset cuộn · #4 focus khi đổi trang · #5 iOS zoom · #6 không có error boundary · #7 404 thiếu h1 · #8 input thiếu nhãn · #9 focus ring trường lỗi không đạt tương phản |
| **P2** — Medium | #10 phân cấp heading · #11 icon mức độ · #12 khoảng trống màn hình lớn · #13 mất ngữ cảnh sidebar · #14 phản hồi trễ khi đổi trạng thái · #15 trạng thái nhấn · #16 reduced motion · #17 tooltip · #18 form thiếu breadcrumb · #21 ARIA số đếm · #27 dependency lạ |
| **P3** — Low | #19 tiến trình tải trang · #20 toast đè thanh hành động · #22 vùng chạm sidebar · #23 URL thân thiện · #24 placeholder · #25 token thừa · #26 breadcrumb trùng lặp |

## 4. Improvements Implemented

Toàn bộ 27 vấn đề đã được sửa trong source.

| # | Cách sửa | File |
|---|---|---|
| 1 | Ẩn cột Nền tảng + Ngày tạo ở 768–1279px (`hidden xl:table-cell`, `col` tương ứng); bỏ `min-width` cố định dưới xl | `features/bugs/components/bug-table.tsx` |
| 2 | Hook `useUnsavedChangesGuard`: `useBlocker` cho điều hướng trong app + `beforeunload` cho tải lại/đóng tab; AlertDialog "Tiếp tục chỉnh sửa / Rời trang". Không chặn khi đang gửi, nên điều hướng sau khi lưu vẫn chạy; lưu lỗi thì giữ nguyên dữ liệu và vẫn bảo vệ. Form dùng `isSubmitting` của RHF (onSubmit trả promise) | `hooks/use-unsaved-changes.tsx`, `bug-form.tsx`, `bug-form-page.tsx` |
| 3 | `<ScrollRestoration />` | `app/layouts/app-layout.tsx` |
| 4 | Khi `pathname` đổi: focus `<main tabIndex=-1>` (title trang đã được cập nhật) | `app-layout.tsx` |
| 5 | Input/Textarea `text-lg md:text-sm` (16px mobile, 13px desktop) | `components/ui/input.tsx`, `textarea.tsx` |
| 6 | `errorElement` = `RouteError` (i18n, có nút "Tải lại trang" và "Về trang chính") | `app/route-error.tsx`, `router.tsx` |
| 7 | `EmptyState`/`ErrorState` nhận `titleAs="h1"` khi là toàn bộ nội dung trang (404, lỗi tải trang) | `components/common/states.tsx` + 4 trang |
| 8 | `aria-label` cho input file | `image-field.tsx` |
| 9 | `aria-invalid:ring-destructive` (đặc), `focus-visible:ring-destructive` cho nút destructive. Đo lại: ring 2px `rgb(180,35,24)` | `components/ui/*` |
| 10 | Tiêu đề Section và cột Kanban 14px semibold | `section.tsx`, `kanban-board.tsx` |
| 11 | Bộ icon mức độ `OctagonAlert` / `ChevronsUp` / `Equal` / `ChevronDown` | `lib/meta.ts` |
| 12 | Nội dung max-width 1600px, padding ngang 32px từ xl | `app-layout.tsx` |
| 13 | Sidebar đánh dấu dự án theo mã bug (`/bugs/FF-001`) hoặc `?project=` | `project-nav.tsx` |
| 14 | `useOptimisticBug`: cập nhật lạc quan cả cache danh sách và chi tiết, tự hoàn tác khi lỗi; nhãn "Đang lưu…" | `services/queries.ts`, `bug-detail-page.tsx` |
| 15 | Button: `transition-[color,background-color,border-color,box-shadow] duration-150`; active `primary/80`, `destructive/80`, outline/ghost `border/60` | `components/ui/button.tsx` |
| 16 | `@media (prefers-reduced-motion: reduce)` tắt animation/transition toàn cục | `index.css` |
| 17 | Component `Hint` (Radix Tooltip, hiện cả khi focus bằng bàn phím) cho các nút chỉ có icon | `components/common/hint.tsx` + 3 nơi |
| 18 | Breadcrumb "Dự án › Báo bug mới" / "Dự án › FF-001 › Sửa"; form căn giữa | `bug-form-page.tsx` |
| 19 | Thanh tiến trình 2px ở đỉnh trang khi `useNavigation().state !== 'idle'` | `app-layout.tsx` |
| 20 | Sonner `mobileOffset={{ bottom: 76 }}` | `app/providers.tsx` |
| 21 | Số hiển thị `aria-hidden` + nhãn `sr-only` | `project-nav.tsx` |
| 22 | Mục điều hướng `h-9` (36px) dưới lg, `h-8` từ lg | `project-nav.tsx` |
| 23 | `/ff/...` chuyển sang `/FF/...` (giữ query); `/bugs` chuyển sang `/all`; có chặn trường hợp dự án mã `ALL` | `scope-layout.tsx`, `router.tsx` |
| 24 | Bỏ placeholder; hint "2–4 chữ cái in hoa, VD: FF" đã có | `new-project-dialog.tsx` |
| 25 | Xóa token `--subtle-foreground` | `index.css`, `docs/design-system.md` |
| 26 | Component `Breadcrumb` dùng chung (`ol`, `aria-current="page"`) | `components/common/breadcrumb.tsx` |
| 27 | Gỡ `cn` khỏi dependency | `package.json` |

Không thay đổi nghiệp vụ: `lib/rules.ts` và `services/api.ts` giữ nguyên; `npm test` vẫn pass.

## 5. Design System Changes

| Hạng mục | Trước | Sau |
|---|---|---|
| Focus ring | Ring xanh 2px; trường lỗi + nút destructive: ring đỏ 20% | Ring 2px đặc: `--ring` (#2563eb) hoặc `--destructive` (#b42318), đều ≥ 3:1 |
| Button states | Hover; `transition-all` | Hover + active cho 4 variant; transition chỉ màu/viền/bóng |
| Cỡ chữ control | 14px mọi kích thước | 16px < 768px, 13px ≥ 768px (khớp Select/Button) |
| Phân cấp chữ | Section 13px < body 14px | Section 14px semibold; `h1` 20px tracking −0.011em |
| Icon mức độ | Signal (khó đọc) | Chevron/Equal/Octagon; ánh xạ duy nhất ở `lib/meta.ts` |
| Token màu | Có `--subtle-foreground` không dùng | Đã xóa |
| Motion | Không xử lý reduced motion | Tắt toàn cục khi người dùng yêu cầu |
| Component mới dùng chung | — | `Hint` (tooltip nút icon), `Breadcrumb`, `EmptyState.titleAs` |
| Layout | max-width 1280 | max-width 1600, padding xl 32px; form 768 căn giữa |

Chi tiết token: `docs/design-system.md` §7–8.

## 6. Responsive Improvements

| Viewport | Trước | Sau |
|---|---|---|
| 375 / 390 / 430 | Không tràn; input 14px gây iOS zoom; toast đè thanh hành động | Input 16px; toast đặt trên thanh hành động; mục sidebar 36px |
| 768 | Bảng cắt mất cột Ngày tạo, một phần cột Người sửa | Bảng vừa khung với 6 cột chính, Tiêu đề ~200px |
| 1024 | Bảng cắt cột (khung 728px < 880px) | Vừa khung, Tiêu đề ~208px, không cuộn ngang |
| 1280 / 1440 | Tốt | Đủ 8 cột; padding 32px |
| 1920 | Khoảng trống ~220px bên trái nội dung; Kanban cột hẹp | Nội dung 1600px; cột Kanban ~380px |

Kết quả đo: **0 trang tràn ngang / 64 lần xem trang** cả trước và sau audit (bảng chỉ cuộn bên trong khung), và **0 bảng phải cuộn ngang** ở mọi breakpoint sau khi sửa.

## 7. Accessibility Improvements

| Tiêu chí WCAG | Cải thiện |
|---|---|
| 1.3.1 Info & Relationships | 404/lỗi trang có `h1`; breadcrumb dùng `ol` + `aria-current` |
| 1.4.11 Non-text Contrast | Focus ring trường lỗi và nút destructive đặc (≥ 3:1) |
| 2.3.3 Animation (AAA, khuyến nghị) | `prefers-reduced-motion` |
| 2.4.3 Focus Order | Focus chuyển về `<main>` khi đổi trang |
| 2.4.7 / 2.4.11 Focus Visible / Not Obscured | Đo thực tế ring 2px trên Select, Input, trường lỗi |
| 2.5.8 Target Size | 0 vi phạm (đo có tính ngoại lệ khoảng cách); mục điều hướng mobile 36px |
| 3.3.4 Error Prevention | Xác nhận trước khi rời form có thay đổi chưa lưu (bổ sung cho xác nhận xóa đã có) |
| 4.1.2 Name, Role, Value | Input file có nhãn; số đếm sidebar đọc qua text `sr-only`; nút icon có `aria-label` + tooltip |

axe-core: trước có 2 rule ở trang tĩnh (`label` critical × 6, `page-has-heading-one` × 2); sau còn **0**.

## 8. Testing Results

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | 0 lỗi |
| `npm run lint` | 0 lỗi, 0 cảnh báo |
| Prettier | Mọi file đúng định dạng |
| `npm test` (quy tắc nghiệp vụ) | Pass |
| `npm run build` | Pass — chunk chính 215.6KB gzip, form lazy |
| `npm run e2e` | **27/27** pass, 0 lỗi console. 5 bước mới: chặn rời form (Ở lại / Rời trang), form chưa sửa thì Hủy ngay, Select chi tiết cập nhật ngay + sidebar đánh dấu dự án, reset cuộn + focus `main`, `/ff` → `/FF` và `/bugs` → `/all` |
| `npm run audit` | Tràn ngang 0/64 · vùng chạm vi phạm 0/64 · heading 0 lỗi · axe 0 vi phạm trang tĩnh · console 0 |
| Kiểm tra trực quan | Ảnh chụp 8 viewport × 8 route + 10 trạng thái overlay đã được xem lại |

## 9. Remaining Issues

| Vấn đề | Lý do chưa giải quyết |
|---|---|
| axe báo `aria-hidden-focus`, `region`, `page-has-heading-one` **khi Select đang mở** | Radix Select khi mở sẽ `aria-hidden` phần còn lại của trang và khóa focus trong popup. Người dùng không thể Tab ra phần bị ẩn, nên axe báo dương tính giả trong trạng thái tạm thời này. Muốn hết hoàn toàn thì phải thay Radix Select bằng `<select>` gốc, đổi lại mất tính nhất quán thị giác |
| Kéo thả Kanban không chạy trên cảm ứng | HTML5 DnD không hỗ trợ touch; đã có menu "Đổi trạng thái" thay thế (có tooltip). Kéo thả trên touch cần `@dnd-kit` |
| Ở 768–1279px không thấy cột Nền tảng/Ngày tạo | Đánh đổi có chủ đích để Tiêu đề đọc được. Nền tảng vẫn lọc được và hiện ở Kanban/chi tiết |
| Dialog tạo dự án không hỏi khi đóng lúc đã nhập | Chỉ có 3 trường ngắn, rủi ro thấp; form bug (nhiều dữ liệu) đã được bảo vệ |
| Không có dark mode | Ngoài phạm vi yêu cầu |
| `localStorage` hỏng (JSON lỗi) thì "Thử lại" vẫn lỗi | Tự reset sẽ âm thầm xóa dữ liệu người dùng. Cần quyết định sản phẩm; khi có backend thì không còn vấn đề này |
| `npm audit`: 1 lỗ hổng mức trung bình (`minimatch`, dev) | Chỉ ở tooling, không vào bundle; bản sửa yêu cầu nâng major của tooling |

## 10. Final Assessment

Sản phẩm đạt mức **sẵn sàng sử dụng thực tế** ở phạm vi frontend:

- Mọi breakpoint từ 375 đến 1920px có bố cục riêng phù hợp, không tràn và không cắt dữ liệu.
- Không còn đường nào có thể mất dữ liệu mà không được cảnh báo.
- Điều hướng SPA có hành vi chuẩn (cuộn, focus, lỗi route, URL thân thiện).
- Đạt các tiêu chí WCAG 2.2 AA đo được; vi phạm còn lại chỉ thuộc trạng thái tạm thời của thư viện và đã được giải thích.
- Design system được chuẩn hóa thêm (trạng thái tương tác, cỡ chữ control, phân cấp heading, icon, motion) và ghi trong `docs/design-system.md`.

Hai script `npm run e2e` và `npm run audit` giữ lại để phát hiện hồi quy giao diện, a11y và chức năng cho các thay đổi sau này.

---

## Phụ lục — Chuyển sang Color System Blue & Cool Gray (05/11/2026)

Palette chính thức được áp dụng toàn cục qua token (`src/index.css`, `docs/design-system.md` §1). Giá trị focus ring trong bảng ở mục 5 ở trên nay là #3B82F6 (`--brand-accent`).

| Hạng mục | Kết quả |
|---|---|
| Kiến trúc | 2 tầng: palette chính thức → token shadcn. Component không chứa hex (đã quét toàn bộ `src/`, chỉ còn ảnh minh họa SVG trong dữ liệu mẫu) |
| Token cũ (`danger`, `caution`, `violet`, `neutral`, `subtle-foreground`) | Đã xóa, 0 tham chiếu còn lại |
| Tương phản | 23 cặp token kiểm tự động (`npm test`); axe `color-contrast`: 0 vi phạm trên 64 lần xem trang |
| Lỗi phát hiện khi đổi màu | Nút xác nhận "Xóa bug" và "Rời trang" hiển thị **màu primary** do Slot của `AlertDialogAction` nối class thay vì merge (trước đây bị che vì primary là màu đen). Đã chuyển sang `variant="destructive"`; E2E kiểm màu thực tế `rgb(220, 38, 38)` |
| Lệch màu đã sửa | Ô tìm kiếm/Select bộ lọc trong suốt (lấy màu nền xám) → mặt trắng; skeleton `bg-accent` vô hình trên nền xám → `bg-border`; pill neutral mất hình trên nền xám → viền `ring-current/15` |
| Kiểm thử | typecheck · lint · build · `npm test` · E2E 27/27 · audit 8 viewport: pass |
