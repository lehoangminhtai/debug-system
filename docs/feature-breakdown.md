# Feature breakdown

## M1. Projects

| Mục | Nội dung |
|---|---|
| Mục tiêu | Chia bug theo dự án, cho biết dự án nào đang bị chặn release |
| Chức năng | Liệt kê dự án; đếm bug bắt buộc sửa chưa Đóng; mục "Tất cả dự án"; tạo dự án |
| Thao tác | Bấm dự án → lọc toàn bộ màn hình theo dự án; "+ Dự án mới" → dialog |
| Input | key (2–4 chữ in hoa, duy nhất), name (bắt buộc, ≤ 60 ký tự), description (tính năng cốt lõi, bắt buộc) |
| Output | Project `{ id, key, name, description, nextSeq }` |
| Trạng thái dữ liệu | loading (skeleton trong sidebar), empty (chưa có dự án → CTA tạo), error (thông báo + thử lại) |
| Lỗi | Trùng key → lỗi tại trường; key sai định dạng; lỗi lưu trữ → toast |
| Đặc biệt | Key tự viết hoa khi gõ; URL dự án dùng key (`/FF`) |

## M2. Bug list

| Mục | Nội dung |
|---|---|
| Mục tiêu | Tìm và rà soát bug nhanh |
| Chức năng | Ô release; bảng; lọc nền tảng / cốt lõi / trạng thái; tìm mã hoặc tiêu đề; sắp xếp; phân trang |
| Thao tác | Gõ tìm, chọn lọc, bấm tiêu đề cột để sắp xếp, bấm dòng → chi tiết, xóa bộ lọc |
| Input | Query params `q`, `platform`, `core`, `status`, `page` |
| Output | Bảng bug đã lọc + tổng số |
| Trạng thái | loading (skeleton rows), empty (chưa có bug → CTA báo bug), empty-filter (không khớp → xóa bộ lọc), error |
| Đặc biệt | Bộ lọc nằm trên URL nên Back/Forward và chia sẻ link hoạt động; tiêu đề dài bị cắt `truncate` có `title` |

## M3. Release check

| Mục | Nội dung |
|---|---|
| Mục tiêu | Trả lời "được release chưa" |
| Dự án đơn | Sẵn sàng / Chưa được release + số bug chặn + danh sách mã bug chặn (link) |
| Tất cả dự án | Số dự án sẵn sàng / bị chặn + từng dự án một dòng |
| Quy tắc | BR-1, BR-2 |

## M4. Kanban

| Mục | Nội dung |
|---|---|
| Mục tiêu | Theo dõi tiến độ, đổi trạng thái nhanh |
| Chức năng | 4 cột; kéo thả thẻ; menu "Chuyển sang…" cho bàn phím/touch; thẻ hiện mã, tiêu đề, mức độ, cốt lõi, người sửa |
| Thao tác | Kéo thẻ sang cột khác; hoặc mở menu thẻ → chọn trạng thái |
| Output | Trạng thái mới + 1 dòng lịch sử; toast xác nhận |
| Trạng thái | loading (skeleton cột), cột trống (ô "Không có bug"), error |
| Đặc biệt | BR-6: kéo sang Đang sửa khi chưa có người sửa → tự gán người dùng hiện tại; dùng chung bộ lọc tìm kiếm với danh sách |

## M5. Bug detail

| Mục | Nội dung |
|---|---|
| Chức năng | Tiến trình 4 bước (ai, ngày nào), nút chuyển bước kế tiếp, chọn trạng thái bất kỳ, chọn người sửa, lịch sử, bước tái tạo, mong đợi/thực tế, ảnh, ghi chú, metadata, sửa, xóa |
| Thao tác | Đổi trạng thái, đổi người sửa, mở ảnh lớn, sửa, xóa (xác nhận) |
| Trạng thái | loading (skeleton), not found (mã không tồn tại), error, mutation pending (nút disabled + spinner) |
| Lỗi | Lưu thất bại → toast lỗi, giữ giá trị cũ |

## M6. Bug form (tạo / sửa)

| Mục | Nội dung |
|---|---|
| Input | project, title (≤ 200), platform, isCore, severity, steps[] (≥ 1 bước không rỗng), expected, actual, images[] (≤ 6 ảnh, ≤ 10MB/ảnh, chỉ ảnh), note, reporter, assignee |
| Output | Bug mới với mã tự sinh, history "Báo bug"; điều hướng đến chi tiết |
| Đặc biệt | Hiện mô tả tính năng cốt lõi của dự án cạnh câu hỏi "Ảnh hưởng cốt lõi?"; hướng dẫn chọn mức độ; xem trước "Bắt buộc sửa trước release"; khi sửa bug không đổi được dự án (mã gắn với dự án) |
| Lỗi | Validation tại trường + focus trường lỗi đầu tiên; ảnh sai định dạng/quá lớn → toast; hết dung lượng → toast |

## M7. Preferences (ngôn ngữ, người dùng hiện tại)

| Mục | Nội dung |
|---|---|
| Chức năng | Chọn ngôn ngữ (vi/en/zh-Hant/zh-Hans), chọn "Tôi là" |
| Lưu | localStorage, khôi phục khi tải lại |
| Đặc biệt | `<html lang>` cập nhật; ngày định dạng theo `Intl` của locale |
