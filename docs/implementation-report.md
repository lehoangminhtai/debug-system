# Implementation report

Ngày: 05/11/2026 · Nguồn yêu cầu: `doc/debugging-system-spec.md`, `doc/DESIGN.md`, `doc/SKILL.md`

## 1. Chức năng đã triển khai

| Spec | Chức năng | Trạng thái |
|---|---|---|
| §1.1 | Sidebar dự án + "Tất cả dự án", đếm bug bắt buộc sửa chưa đóng | Xong |
| §1.2, §2 | Báo bug với đủ trường; validation bắt buộc; ảnh "nên có" | Xong |
| §1.3, §2.1 | Mã `KEY-NNN` tự sinh theo dự án, không tái sử dụng sau khi xóa | Xong (có test) |
| §1.4 | Bước tái tạo (danh sách động, Enter thêm bước), mong đợi / thực tế | Xong |
| §1.5 | Ảnh minh chứng: kéo thả / chọn file, chú thích, xem ảnh lớn | Xong |
| §1.6, §3 | Ảnh hưởng cốt lõi + mức độ, hiển thị gợi ý từ spec và cách xử lý theo bảng §3.3 | Xong |
| §1.7, §4 | Trạng thái, người sửa, lịch sử ai · làm gì · lúc nào | Xong |
| §1.8, §5 | Kiểm tra release theo từng dự án + tổng hợp tất cả dự án | Xong (có test) |
| §2.2 | 4 ngôn ngữ, nhớ lựa chọn, ngày theo locale, nội dung người dùng giữ nguyên | Xong |
| §6 | Danh sách (lọc nền tảng/cốt lõi/trạng thái, tìm mã/tiêu đề), Kanban kéo thả, Chi tiết, Form | Xong |
| §2.1 (suy ra) | Tạo dự án (mã 2–4 chữ in hoa, duy nhất) | Xong |
| — | Sửa bug, xóa bug có xác nhận | Xong |

## 2. Màn hình

| Route | Màn hình |
|---|---|
| `/` → `/all` | Danh sách bug — tất cả dự án |
| `/:key` | Danh sách bug theo dự án |
| `/:scope/board` | Kanban |
| `/bugs/new?project=KEY` | Báo bug mới |
| `/bugs/:code` | Chi tiết bug |
| `/bugs/:code/edit` | Sửa bug |
| `*`, mã/key không tồn tại | Không tìm thấy |
| Dialog | Tạo dự án · Xác nhận xóa · Xem ảnh lớn · Sheet điều hướng (mobile) |

## 3. Component chính

`ReleaseStatus`, `BugTable` (bảng desktop + danh sách thẻ mobile), `BugFilters`, `KanbanBoard`, `StatusStepper`, `HistoryList`, `ImageGallery`, `ImageField`, `BugForm`, `ProjectNav`, `NewProjectDialog`; dùng chung: `Pill`/badges, `Field`/`FieldSet`, `Section`, `EmptyState`/`ErrorState`, `UserAvatar`.

## 4. Công nghệ

Xem `docs/architecture.md`. Dependency runtime: react, react-dom, react-router-dom, @tanstack/react-query, @tanstack/react-table, react-hook-form, @hookform/resolvers, zod, radix-ui, lucide-react, sonner, class-variance-authority, clsx, tailwind-merge.

## 5. Kết quả kiểm thử

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| TypeScript | `npm run typecheck` | 0 lỗi |
| ESLint | `npm run lint` | 0 lỗi, 0 cảnh báo |
| Quy tắc nghiệp vụ | `npm test` | Pass — must-fix §3.3, mã bug, dữ liệu mẫu §8 (FF chặn bởi FF-001/002/003), xóa → FF-008, tự nhận bug, trùng mã dự án |
| Production build | `npm run build` | Pass — chunk đầu 211KB gzip, form lazy ~44KB gzip |
| E2E (Playwright, Chrome) | `npm run e2e` | 27/27 bước pass, 0 lỗi console (sau UI/UX audit) |
| Audit UI/UX + a11y | `npm run audit` | Xem `docs/ui-ux-audit-report.md` |

Các bước E2E: chuyển hướng `/` → `/all`; tổng hợp release 2/3; đếm sidebar; FoodFast chưa release với đúng 3 mã; tìm theo tiêu đề/mã + xóa lọc; lọc nền tảng/cốt lõi/trạng thái + empty state; sắp xếp `aria-sort`; HR sẵn sàng; **kéo thả** Kanban + tự nhận bug; đổi trạng thái qua menu; lịch sử + người sửa; Đóng bug cập nhật release; giao người sửa; validation form + focus trường lỗi; tạo bug kèm ảnh; xóa rồi tạo → mã tiếp theo; sửa bug ghi lịch sử; tạo dự án (chặn trùng mã, tự viết hoa); đổi 4 ngôn ngữ + nhớ sau reload + `html lang`; 404 bug/dự án/route; skip link; mobile 375px không tràn ngang trên 4 trang + menu Sheet.

Lỗi phát hiện và đã sửa trong QA:

1. Bấm sắp xếp "Mức độ" lần đầu đưa bug Thấp lên trước (TanStack mặc định giảm dần với cột số) → `sortDescFirst: false`.
2. Lỗi "Nhập ít nhất một bước" không mất sau khi nhập → kiểm tra lại cấp mảng khi gõ.
3. Ô release có thể báo "Sẵn sàng" khi tải bug thất bại → ẩn ô release khi lỗi.
4. Cột Tiêu đề quá hẹp ở "Tất cả dự án" và trên mobile → bỏ cột Dự án (mã đã có tiền tố), icon bắt buộc sửa thay badge, danh sách thẻ < 768px.
5. shadcn CLI tự cài package `cn` (không liên quan) và `next-themes` → gỡ bỏ, tự tạo `lib/utils.ts`.

## 6. Giả định

Xem `docs/requirement-analysis.md` §12. Tóm tắt: có tạo dự án; danh sách thành viên cố định; "Tôi là" chọn ở header thay đăng nhập; lịch sử lưu mã hành động để dịch; cho phép sửa bug; cho phép chuyển trạng thái ngược (mở lại); chuyển sang "Đang sửa" khi chưa có người sửa thì người thao tác tự nhận; không dark mode.

## 7. Giới hạn hiện tại

- **Mock data**: toàn bộ dữ liệu lưu `localStorage` của trình duyệt (`debugs.db.v1`), không chia sẻ giữa người dùng/máy. UI ghi rõ điều này ở sidebar. Xóa dữ liệu site để khôi phục dữ liệu mẫu.
- Ảnh lưu dạng data URL WebP đã thu nhỏ (≤ 1600px); localStorage ~5MB nên khoảng vài chục ảnh. Hết chỗ → toast lỗi, không mất dữ liệu đã lưu.
- Kéo thả HTML5 không chạy trên thiết bị cảm ứng — dùng nút "Đổi trạng thái" trên thẻ. Không sắp xếp thứ tự trong cột (spec không yêu cầu).
- Lọc/tìm thực hiện phía client (phù hợp mock); với dữ liệu lớn cần chuyển xuống API.
- Không phân quyền, không thông báo (spec §9 để dành).

## 8. Việc cần làm tiếp

1. Backend theo `docs/architecture.md` (4 bảng spec §7), sinh `seq` trong transaction.
2. Xác thực người dùng thay cho "Tôi là"; danh sách thành viên từ API.
3. Upload ảnh lên object storage.
4. Mục để dành của spec §9: kế hoạch/nhật ký phát triển, đề xuất tính năng, thông báo, phân quyền.
