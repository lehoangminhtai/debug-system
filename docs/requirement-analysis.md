# Phân tích yêu cầu — Debugging System

Nguồn: `doc/debugging-system-spec.md` (nghiệp vụ), `doc/DESIGN.md` + `doc/SKILL.md` (design token, quy tắc UI).

## 1. Product overview

Một nơi duy nhất để ghi lại bug của các dự án (Backend / Frontend / Mobile), kèm bước tái tạo và ảnh minh chứng; tự động xác định bug nào **bắt buộc sửa trước release** và trả lời câu hỏi: *"Dự án X đã được release chưa?"*.

## 2. Business goals

| # | Mục tiêu | Đo bằng |
|---|---|---|
| G1 | Không release khi còn lỗi ảnh hưởng tính năng cốt lõi | Ô trạng thái release theo từng dự án |
| G2 | Bug được mô tả đủ để dev tái tạo ngay | Bước tái tạo, mong đợi/thực tế, ảnh là trường bắt buộc / khuyến nghị |
| G3 | Biết ai đang sửa gì, đến đâu | Kanban, người sửa, lịch sử ai·làm gì·lúc nào |
| G4 | Dùng được cho team đa ngôn ngữ | 4 ngôn ngữ giao diện |

## 3. Target users

| Vai trò | Việc chính |
|---|---|
| Người báo (QA/tester/PM) | Báo bug, phân loại, kiểm tra lại và đóng bug |
| Người sửa (dev BE/FE/Mobile) | Nhận bug, đổi trạng thái, đánh dấu đã sửa |
| Trưởng nhóm / Release manager | Xem trạng thái release, theo dõi bug bắt buộc sửa |

Spec không định nghĩa phân quyền ("Phân quyền chi tiết" thuộc mục để dành) → mọi người dùng có cùng quyền.

## 4. User problems

- Bug ghi rải rác (chat, sheet) → thiếu bước tái tạo, thiếu ảnh.
- Không phân biệt bug chặn release với bug có thể để sau.
- Không biết bug đang ở bước nào, ai nhận.

## 5. Core features (theo spec §1)

1. Chia theo dự án + mục "Tất cả dự án".
2. Ghi bug (tiêu đề, nền tảng, mô tả).
3. Mã bug tự sinh theo dự án (`FF-001`), không tái sử dụng số khi xóa.
4. Bước tái tạo + kết quả mong đợi / thực tế.
5. Ảnh minh chứng.
6. Phân loại: ảnh hưởng cốt lõi + mức độ.
7. Theo dõi trạng thái + người sửa + lịch sử.
8. Kiểm tra release theo từng dự án.
9. Đa ngôn ngữ: vi (mặc định), en, zh-Hant, zh-Hans; nhớ lựa chọn.

## 6. Functional requirements

| ID | Yêu cầu |
|---|---|
| FR-01 | Sidebar liệt kê dự án, số bug **bắt buộc sửa chưa Đóng** của từng dự án, mục "Tất cả dự án" |
| FR-02 | Tạo dự án với mã 2–4 chữ in hoa, duy nhất, tên, mô tả tính năng cốt lõi (suy ra từ quy tắc §2.1 "mã ngắn khi tạo") |
| FR-03 | Danh sách bug: ô trạng thái release ở trên cùng, bảng bug, lọc nền tảng / cốt lõi / trạng thái, tìm theo mã hoặc tiêu đề |
| FR-04 | Kanban 4 cột Mới / Đang sửa / Đã sửa / Đóng, kéo thả đổi trạng thái, thẻ hiện người sửa |
| FR-05 | Chi tiết bug: thanh tiến trình 4 bước (ai, ngày nào), chọn người sửa, lịch sử, bước tái tạo, mong đợi/thực tế, ảnh |
| FR-06 | Form báo bug mới với đầy đủ trường §2 và validation bắt buộc |
| FR-07 | Mã bug = key + "-" + seq 3 chữ số; seq đếm riêng từng dự án, không dùng lại sau khi xóa |
| FR-08 | Mỗi lần đổi trạng thái hoặc giao người sửa → ghi 1 dòng lịch sử (ai · làm gì · lúc nào) |
| FR-09 | Bắt buộc sửa = `is_core` **hoặc** `severity = critical` |
| FR-10 | Release: không còn bug bắt buộc sửa nào chưa Đóng → Sẵn sàng; ngược lại → Chưa được release |
| FR-11 | Xóa bug (spec §2.1 nhắc tới thao tác xóa) |
| FR-12 | Chọn ngôn ngữ ở góc trên phải, lưu lại; dịch toàn bộ chữ giao diện kể cả lịch sử; ngày theo locale; nội dung người dùng nhập giữ nguyên |

## 7. Non-functional requirements

- WCAG 2.2 AA: keyboard-first, focus-visible rõ ràng, đủ tương phản (DESIGN.md).
- Responsive desktop → mobile.
- Mọi component có state default / hover / focus-visible / active / disabled / loading / error.
- Dùng semantic token, không dùng màu/spacing tùy tiện.
- Kiến trúc tách service layer để thay mock bằng API thật.

## 8. Business rules

| Mã | Quy tắc |
|---|---|
| BR-1 | `mustFix = is_core || severity === 'critical'` (bảng §3.3) |
| BR-2 | Dự án bị chặn release nếu ∃ bug `mustFix && status !== 'closed'` |
| BR-3 | Mã dự án: `^[A-Z]{2,4}$`, duy nhất |
| BR-4 | Seq tăng đơn điệu theo dự án (lưu `nextSeq` trên dự án) |
| BR-5 | Luồng chuẩn Mới → Đang sửa → Đã sửa → Đóng; cho phép chuyển ngược (mở lại khi kiểm tra lại thất bại) — mọi thay đổi đều ghi lịch sử |
| BR-6 | "Đang sửa" nghĩa là đã có người nhận → chuyển sang Đang sửa khi chưa có người sửa thì tự gán người dùng hiện tại ("Nhận sửa") |

Kiểm chứng với dữ liệu mẫu §8: FF-001, FF-002, FF-003 là bug bắt buộc sửa chưa đóng → FoodFast **Chưa được release**. FF-004 bắt buộc sửa nhưng đã Đóng → không chặn.

## 9. User roles & permissions

Không phân quyền (để dành cho sau). Người dùng hiện tại được chọn ở header (chỉ dùng để ghi "ai" trong lịch sử và mặc định người báo).

## 10. Constraints & dependencies

- Chưa có backend → mock service, lưu `localStorage` trên trình duyệt (dữ liệu **không** lên server, ghi rõ trong UI và README).
- Ảnh lưu dạng data URL đã thu nhỏ (giới hạn dung lượng localStorage ~5MB).
- Ngoài phạm vi (§9): kế hoạch/nhật ký phát triển, đề xuất tính năng, thông báo, phân quyền chi tiết.

## 11. Ưu tiên

| Must have | Should have | Nice to have |
|---|---|---|
| Sidebar dự án + đếm bắt buộc sửa | Tạo dự án mới | Sửa thông tin bug |
| Danh sách bug + lọc + tìm | Sắp xếp + phân trang bảng | Xem ảnh phóng to |
| Ô trạng thái release | Kanban: thao tác bàn phím/touch thay cho kéo thả | Chỉ báo "bắt buộc sửa" xem trước trong form |
| Kanban kéo thả | Xóa bug có xác nhận | Bộ lọc lưu trên URL |
| Chi tiết bug + tiến trình + lịch sử + người sửa | Responsive mobile | |
| Form báo bug + validation | | |
| Mã bug tự sinh, không tái sử dụng | | |
| Ảnh minh chứng | | |
| 4 ngôn ngữ, nhớ lựa chọn | | |

## 12. Giả định

| # | Giả định | Lý do |
|---|---|---|
| A1 | Có màn hình/dialog tạo dự án | Spec §2.1 "mã ngắn khi tạo" |
| A2 | Danh sách thành viên cố định trong mock (Lan, Minh, Hùng, Trang, An, Quân) | Spec để reporter/assignee là text; chọn từ danh sách tránh sai chính tả |
| A3 | Người dùng hiện tại chọn ở header | Cần "ai" cho lịch sử, không có đăng nhập |
| A4 | Lịch sử lưu `action` dạng mã (`assign`, `status`, `create`…) + tham số, dịch khi hiển thị | Spec yêu cầu dịch lịch sử |
| A5 | Cho phép sửa bug | Phân loại có thể cần đánh giá lại |
| A6 | Không có dark mode | Không có trong yêu cầu |
