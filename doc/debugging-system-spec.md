# Debugging System — Đặc tả (bản đơn giản)

> Mục đích: một nơi ghi lại bug của dự án (Backend / Frontend / Mobile), kèm hình minh chứng và các bước tái tạo, đánh dấu bug nào ảnh hưởng tính năng cốt lõi để **fix trước khi release**.

---

## 1. Hệ thống làm gì

| # | Chức năng | Mô tả |
|---|---|---|
| 1 | Chia theo dự án | Mỗi bug thuộc 1 dự án; sidebar chọn dự án hoặc xem tất cả |
| 2 | Ghi bug | Tạo bug với tiêu đề, nền tảng, mô tả |
| 3 | Mã bug | Theo mã dự án, đánh số riêng từng dự án: `FF-001`, `FF-002`, `SM-001`… |
| 4 | Bước tái tạo | Liệt kê các bước để làm lại lỗi, kết quả mong đợi và thực tế |
| 5 | Hình minh chứng | Đính kèm ảnh chụp màn hình |
| 6 | Phân loại | Có ảnh hưởng tính năng cốt lõi không + mức độ |
| 7 | Theo dõi | Trạng thái bug và người sửa |
| 8 | Kiểm tra release | Tính riêng từng dự án: còn bug cốt lõi chưa sửa → dự án đó chưa được release |

---

## 2. Thông tin của một bug

| Trường | Bắt buộc | Ví dụ |
|---|:-:|---|
| Dự án | ✔ | FoodFast |
| Mã bug | Tự sinh | `FF-007` |
| Tiêu đề | ✔ | App bị đóng khi bấm Thanh toán |
| Nền tảng | ✔ | Backend / Frontend / Mobile |
| Ảnh hưởng cốt lõi | ✔ | Có / Không |
| Mức độ | ✔ | Nghiêm trọng / Cao / Trung bình / Thấp |
| Bước tái tạo | ✔ | 1. Mở giỏ hàng 2. Bấm Thanh toán |
| Kết quả mong đợi | ✔ | Chuyển sang màn hình xác nhận |
| Kết quả thực tế | ✔ | App bị đóng |
| Hình minh chứng | Nên có | Ảnh chụp màn hình |
| Ghi chú | | Thiết bị, trình duyệt, phiên bản… |
| Người báo | ✔ | Lan |
| Người sửa | | Minh |
| Trạng thái | ✔ | Mới / Đang sửa / Đã sửa / Đóng |
| Ngày tạo | Tự sinh | 05/11/2026 |

---

## 2.1. Quy tắc mã bug

| Quy tắc | Ví dụ |
|---|---|
| Mỗi dự án có 1 mã ngắn khi tạo | FoodFast → `FF`, ShopMini → `SM`, HR Portal → `HR` |
| Mã bug = mã dự án + số thứ tự 3 chữ số | `FF-001`, `FF-002`, `SM-001` |
| Số thứ tự đếm riêng trong từng dự án, không dùng lại khi xóa bug | Xóa `FF-003` thì bug mới vẫn là `FF-008` |

---

## 2.2. Ngôn ngữ giao diện

| Mã | Ngôn ngữ |
|---|---|
| `vi` | Tiếng Việt (mặc định) |
| `en` | English |
| `zh-Hant` | 繁體中文 (Phồn thể) |
| `zh-Hans` | 简体中文 (Giản thể) |

- Chọn ở góc trên bên phải, hệ thống nhớ lựa chọn cho lần sau.
- Dịch toàn bộ chữ giao diện: menu, nhãn, trạng thái, mức độ, thông báo, lịch sử.
- Ngày tháng hiển thị theo định dạng của ngôn ngữ đã chọn.
- Nội dung người dùng nhập (tiêu đề, bước tái tạo, ghi chú) giữ nguyên như khi nhập.

---

## 3. Đánh giá bug

### 3.1. Có ảnh hưởng tính năng cốt lõi không?

Tính năng cốt lõi là những thứ làm nên mục đích chính của sản phẩm. Ví dụ app đặt đồ ăn: **đăng nhập, đặt món, thanh toán**.

Đánh dấu **Có** nếu bug làm người dùng **không dùng được** một tính năng cốt lõi, hoặc làm **sai tiền / mất dữ liệu**.

### 3.2. Mức độ

| Mức độ | Khi nào | Ví dụ |
|---|---|---|
| **Nghiêm trọng** | App sập, không dùng được, mất tiền hoặc dữ liệu | Crash khi thanh toán |
| **Cao** | Tính năng hỏng, không có cách khác | Không gửi lại được OTP |
| **Trung bình** | Tính năng hỏng nhưng có cách khác | Bộ lọc giá không chạy |
| **Thấp** | Lỗi nhỏ, giao diện, chính tả | Sai chữ "Thah toán" |

### 3.3. Quy tắc xử lý

| Ảnh hưởng cốt lõi | Mức độ | Xử lý |
|---|---|---|
| Có | Bất kỳ | **Bắt buộc sửa trước release** |
| Không | Nghiêm trọng | **Bắt buộc sửa trước release** |
| Không | Cao / Trung bình | Sửa khi có thời gian, có thể để bản sau |
| Không | Thấp | Để bản sau |

---

## 4. Trạng thái

```
Mới → Đang sửa → Đã sửa → Đóng
```

| Trạng thái | Ý nghĩa |
|---|---|
| Mới | Vừa báo, chưa ai nhận |
| Đang sửa | Đã có người nhận và đang sửa |
| Đã sửa | Dev đã sửa xong, chờ người báo kiểm tra lại |
| Đóng | Đã kiểm tra, hết lỗi |

Mỗi lần đổi trạng thái hoặc giao người sửa, hệ thống ghi 1 dòng lịch sử: **ai · làm gì · lúc nào**.

| Bước | Ai thường làm |
|---|---|
| Mới | Người báo |
| Đang sửa | Người sửa nhận bug |
| Đã sửa | Người sửa |
| Đóng | Người báo kiểm tra lại |

---

## 5. Kiểm tra release

| Điều kiện | Kết quả |
|---|---|
| Không còn bug "bắt buộc sửa" nào chưa Đóng | ✅ Sẵn sàng release |
| Còn ít nhất 1 bug "bắt buộc sửa" chưa Đóng | ⛔ Chưa được release |

---

## 6. Màn hình

| Màn hình | Nội dung |
|---|---|
| Sidebar | Danh sách dự án, số bug bắt buộc sửa của từng dự án, mục "Tất cả dự án" |
| Danh sách bug | Ô trạng thái release ở trên cùng, bảng bug, lọc theo nền tảng / cốt lõi / trạng thái, tìm theo mã hoặc tiêu đề |
| Kanban | 4 cột Mới / Đang sửa / Đã sửa / Đóng; kéo thả thẻ để đổi trạng thái; thẻ hiện người sửa |
| Chi tiết bug | Thanh tiến trình 4 bước (ai làm, ngày nào), chọn người sửa, lịch sử, bước tái tạo, mong đợi/thực tế, hình minh chứng |
| Báo bug mới | Form điền các trường ở mục 2 |

---

## 7. Dữ liệu (4 bảng)

**projects**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| key | text, 2–4 chữ in hoa, duy nhất (`FF`) |
| name | text |
| description | text (ghi rõ tính năng cốt lõi của dự án) |

**bugs**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| project_id | liên kết projects |
| seq | số thứ tự trong dự án |
| code | text = key + "-" + seq 3 chữ số (`FF-001`) |
| title | text |
| platform | `backend` / `frontend` / `mobile` |
| is_core | boolean |
| severity | `critical` / `high` / `medium` / `low` |
| steps | text (mỗi dòng 1 bước) |
| expected | text |
| actual | text |
| note | text |
| reporter | text |
| assignee | text |
| status | `new` / `fixing` / `fixed` / `closed` |
| created_at | datetime |

**bug_history**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| bug_id | liên kết bugs |
| status | trạng thái sau khi đổi |
| who | text |
| action | text (Nhận sửa, Giao cho Minh…) |
| created_at | datetime |

**bug_images**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| bug_id | liên kết bugs |
| url | text |
| caption | text |

---

## 8. Ví dụ dữ liệu

| Mã | Tiêu đề | Nền tảng | Cốt lõi | Mức độ | Trạng thái | Bắt buộc sửa |
|---|---|---|:-:|---|---|:-:|
| FF-001 | Crash khi bấm Thanh toán bằng ví | Mobile | ✔ | Nghiêm trọng | Đang sửa | ✔ |
| FF-002 | Trừ tiền 2 lần khi mạng chậm | Backend | ✔ | Nghiêm trọng | Đã sửa | ✔ |
| FF-003 | Không gửi lại được OTP | Frontend | ✔ | Cao | Mới | ✔ |
| FF-004 | Sai tổng tiền khi áp 2 voucher | Backend | ✔ | Cao | Đóng | — |
| FF-005 | Bộ lọc giá không chạy | Mobile | | Trung bình | Mới | |
| FF-006 | Ảnh món ăn tải chậm | Frontend | | Thấp | Đang sửa | |
| FF-007 | Sai chính tả "Thah toán" | Mobile | | Thấp | Mới | |

→ Còn 3 bug bắt buộc sửa chưa đóng (FF-001, FF-002, FF-003) → **Chưa được release**.

---

## 9. Để dành cho sau (chưa làm)

Kế hoạch phát triển · Nhật ký phát triển · Đề xuất tính năng tương lai · Thông báo · Phân quyền chi tiết.
