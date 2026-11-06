# Tính năng mong muốn — Đặc tả (bản đơn giản)

> Mục đích: ghi lại các **tính năng người dùng mong muốn** của từng dự án, kèm ảnh hoặc video minh hoạ và mức độ mong muốn, để chọn làm ở các bản sau.
> Đây **không phải bug**: không ảnh hưởng kiểm tra release, không bắt buộc làm.
> Đi kèm: [debugging-system-spec.md](debugging-system-spec.md) (bug) · [debugging-system-api.md](debugging-system-api.md) (API bug, đăng nhập, OTP) · [feature-request-api.md](feature-request-api.md) (API của phần này, chi tiết request/response).

---

## 1. Hệ thống làm gì

| # | Chức năng | Mô tả |
|---|---|---|
| 1 | Chia theo dự án | Mỗi đề xuất thuộc 1 dự án, dùng chung danh sách dự án với bug |
| 2 | Ghi đề xuất | Tiêu đề, nền tảng, hiện tại thế nào, mong muốn thế nào |
| 3 | Mã đề xuất | Theo mã dự án, thêm chữ `F`, đánh số riêng: `FF-F001`, `FF-F002`, `SM-F001`… |
| 4 | Minh hoạ | Đính kèm ảnh hoặc video (quay màn hình, bản phác) |
| 5 | Mức độ mong muốn | Cần gấp / Nên có / Có thì tốt |
| 6 | Theo dõi | Trạng thái và người phụ trách |

**Khác với bug:** không có "bước tái tạo", không có "ảnh hưởng cốt lõi", **không tính vào kiểm tra release**.

---

## 2. Thông tin của một đề xuất

| Trường | Bắt buộc | Ví dụ |
|---|:-:|---|
| Dự án | ✔ | FoodFast |
| Mã | Tự sinh | `FF-F003` |
| Tiêu đề | ✔ | Lưu món yêu thích để đặt lại nhanh |
| Nền tảng | ✔ | Backend / Frontend / Mobile (chọn một) |
| Hiện tại | ✔ | Muốn đặt lại món cũ phải tìm lại từ đầu |
| Mong muốn | ✔ | Có nút ♥ trên món, xem lại ở tab "Yêu thích" |
| Lợi ích | | Khách quen đặt nhanh hơn, tăng đơn lặp lại |
| Mức độ mong muốn | ✔ | Cần gấp / Nên có / Có thì tốt |
| Minh hoạ | Nên có | Ảnh phác giao diện, video quay màn hình app tương tự |
| Người đề xuất | ✔ | Lan (mặc định là người đang đăng nhập) |
| Người phụ trách | | Minh |
| Trạng thái | ✔ | Mới / Đã duyệt / Đang làm / Hoàn thành / Từ chối |
| Lý do từ chối | Khi từ chối | Trùng với FF-F001 |
| Ngày tạo | Tự sinh | 06/11/2026 |

Giới hạn độ dài:

| Trường | Tối đa |
|---|---|
| Tiêu đề | 200 ký tự |
| Hiện tại, Mong muốn | 2000 ký tự mỗi trường |
| Lợi ích, Lý do từ chối | 1000 ký tự |

---

## 2.1. Quy tắc mã

| Quy tắc | Ví dụ |
|---|---|
| Mã = mã dự án + `-F` + số thứ tự 3 chữ số | `FF-F001`, `SM-F001` |
| Đếm riêng trong từng dự án, **tách khỏi số của bug** | FoodFast có `FF-007` (bug) và `FF-F001` (đề xuất) cùng lúc |
| Không dùng lại số khi xoá | Xoá `FF-F002` thì đề xuất mới vẫn là `FF-F004` |

---

## 3. Mức độ mong muốn

| Mức độ | Mã | Khi nào | Ví dụ |
|---|---|---|---|
| **Cần gấp** | `high` | Nhiều người hỏi, đang mất khách hoặc tốn nhiều công làm tay | Xuất hoá đơn điện tử |
| **Nên có** | `medium` | Giúp dùng tiện hơn rõ rệt, chưa gấp | Lưu món yêu thích |
| **Có thì tốt** | `low` | Ý tưởng hay, làm khi rảnh | Giao diện tối (dark mode) |

Mức độ chỉ để sắp thứ tự ưu tiên. Không có mức nào chặn release.

---

## 4. Trạng thái

```
Mới → Đã duyệt → Đang làm → Hoàn thành
  └──────────→ Từ chối
```

| Trạng thái | Mã | Ý nghĩa | Ai thường làm |
|---|---|---|---|
| Mới | `new` | Vừa đề xuất, chưa xem xét | Người đề xuất |
| Đã duyệt | `accepted` | Đồng ý sẽ làm, chờ xếp lịch | Trưởng dự án |
| Đang làm | `in_progress` | Đã có người nhận và đang làm | Người phụ trách |
| Hoàn thành | `done` | Đã làm xong, đã có trong bản phát hành | Người phụ trách |
| Từ chối | `rejected` | Không làm. **Bắt buộc ghi lý do** | Trưởng dự án |

- Chuyển được theo mọi hướng, kể cả mở lại đề xuất đã từ chối (về `new`). Giống Kanban của bug.
- Chuyển sang **Đang làm** khi chưa có người phụ trách thì người thao tác tự nhận.
- Mỗi lần đổi trạng thái hoặc người phụ trách, hệ thống ghi 1 dòng lịch sử: **ai · làm gì · lúc nào**, giống bug.

---

## 5. Minh hoạ: ảnh và video

| | Ảnh | Video |
|---|---|---|
| Định dạng | PNG, JPEG, WebP, GIF | MP4 (H.264), WebM |
| Dung lượng tối đa | 5 MB / ảnh (FE tự nén trước khi gửi, như bug) | 30 MB / video |
| Số lượng | Tổng cộng tối đa **6 file** mỗi đề xuất, trong đó tối đa **2 video** | |
| Hiển thị | Lưới ảnh thu nhỏ, bấm để xem lớn | Trình phát video có sẵn của trình duyệt |
| Chú thích | Mỗi file một dòng chú thích, tối đa 200 ký tự | |

- Server kiểm tra **nội dung thật** của file, không tin đuôi file hay khai báo của trình duyệt. SVG, HTML, file chạy được đều bị từ chối.
- File lưu ở `dts/upload/features/<mã dự án>/<mã đề xuất>/`, tên ngẫu nhiên. DB chỉ lưu đường dẫn.
- Video không nén ở trình duyệt được. Gợi ý người dùng quay ngắn (dưới 1 phút) hoặc giảm độ phân giải.
- ⚠️ Trước khi làm: kiểm tra `upload_max_filesize` và `post_max_size` của PHP trên server NAS phải **≥ 35 MB**. Server đã nhận được request 41 MB, nhưng giới hạn riêng cho file upload (multipart) chưa được kiểm.

---

## 6. Màn hình

| Màn hình | Nội dung |
|---|---|
| Sidebar | Mỗi dự án có thêm mục **Tính năng mong muốn**, cạnh **Bug**. Hiện số đề xuất `Mới` |
| Danh sách đề xuất | Bảng: mã, tiêu đề, nền tảng, mức độ, trạng thái, người phụ trách, ngày tạo. Lọc theo nền tảng / mức độ / trạng thái, tìm theo mã hoặc tiêu đề. Mặc định ẩn `Hoàn thành` và `Từ chối` (có nút "Hiện tất cả") |
| Chi tiết đề xuất | Hiện tại → Mong muốn → Lợi ích, ảnh và video minh hoạ, trạng thái, người phụ trách, lịch sử, lý do từ chối (nếu có) |
| Đề xuất mới / Sửa | Form điền các trường ở mục 2, kéo thả ảnh hoặc video |

Không cần Kanban riêng: số đề xuất ít, danh sách có lọc là đủ. Để dành cho sau nếu cần.

Toàn bộ chữ giao diện dịch sang 4 ngôn ngữ như phần bug (mục 2.2 của spec bug). Nội dung người dùng nhập giữ nguyên.

---

## 7. Dữ liệu (3 bảng mới + 1 cột)

**projects** (thêm cột)

| Cột | Kiểu |
|---|---|
| next_feature_seq | số, mặc định 1 — số thứ tự đề xuất kế tiếp |

**feature_requests**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| project_id | liên kết projects |
| seq | số thứ tự trong dự án |
| code | text = key + "-F" + seq 3 chữ số (`FF-F001`), duy nhất |
| title | text |
| platform | `backend` / `frontend` / `mobile` |
| current | text — hiện tại thế nào |
| desired | text — mong muốn thế nào |
| benefit | text, có thể rỗng |
| priority | `high` / `medium` / `low` |
| status | `new` / `accepted` / `in_progress` / `done` / `rejected` |
| reject_reason | text, có thể rỗng |
| requester | text — tên người đề xuất |
| assignee | text, có thể rỗng |
| created_by, updated_by | UUID IAM |
| created_at, updated_at | datetime |

**feature_request_history**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| feature_request_id | liên kết feature_requests |
| status | trạng thái sau thao tác |
| who | text — tên người thao tác (lấy từ token) |
| who_id | UUID IAM |
| action | `create` / `claim` / `assign` / `unassign` / `status` / `edit` |
| target | text — người được giao, hoặc trạng thái trước đó |
| created_at | datetime |

**feature_request_media**

| Cột | Kiểu |
|---|---|
| id | số tự tăng |
| feature_request_id | liên kết feature_requests |
| type | `image` / `video` |
| url | text — đường dẫn tương đối trong thư mục upload |
| caption | text |
| size | số byte |
| created_at | datetime |

Xoá đề xuất thì xoá luôn lịch sử, file minh hoạ và dòng media.

---

## 8. API (định tuyến C&M, cùng quy ước với bug)

Mọi endpoint cần `Authorization: Bearer <token>` và quyền vào DTS (mục 11 của [debugging-system-api.md](debugging-system-api.md)). Đọc dùng `GET`, ghi dùng `POST`.

`store`, `update`, `destroy` cần **OTP** như bug (thêm `Feature@store`, `Feature@update`, `Feature@destroy` vào `api.otp_routes`; gửi trường `otp` trong form). Đổi trạng thái và giao người không cần OTP.

| Endpoint | Việc |
|---|---|
| `GET ?c=Feature&m=index` | Danh sách. Lọc: `project`, `platform`, `priority`, `status`, `q` |
| `GET ?c=Feature&m=show&code=FF-F001` | Chi tiết, kèm `media` và `history` |
| `POST ?c=Feature&m=store` | Tạo mới. Gửi `multipart/form-data` (xem dưới) |
| `POST ?c=Feature&m=update&code=FF-F001` | Sửa nội dung và minh hoạ |
| `POST ?c=Feature&m=changeStatus&code=FF-F001` | `{ "status": "rejected", "rejectReason": "Trùng FF-F001" }` |
| `POST ?c=Feature&m=assign&code=FF-F001` | `{ "assignee": "Minh" }`, `null` để bỏ giao |
| `POST ?c=Feature&m=destroy&code=FF-F001` | Xoá hẳn |

**Vì sao `store`/`update` dùng `multipart/form-data`, khác với bug:** video tới 30 MB, gửi dạng base64 trong JSON sẽ phình thêm 1/3 và tốn bộ nhớ trình duyệt. Multipart gửi file nguyên gốc.

```
POST ?c=Feature&m=store
Content-Type: multipart/form-data

projectId      = 1
title          = Lưu món yêu thích để đặt lại nhanh
platform       = mobile
current        = Muốn đặt lại món cũ phải tìm lại từ đầu
desired        = Có nút ♥ trên món, xem lại ở tab "Yêu thích"
benefit        = Khách quen đặt nhanh hơn
priority       = medium
requester      = Lan
assignee       = (bỏ trống)
media[0][file]    = <phac-thao.png>
media[0][caption] = Phác thảo nút ♥
media[1][file]    = <quay-man-hinh.mp4>
media[1][caption] = App X đang làm thế này
```

`update` gửi danh sách minh hoạ **đầy đủ sau khi sửa**, giống bug: file cũ gửi lại bằng `media[i][id]` (kèm `caption` mới), file mới gửi bằng `media[i][file]`, file không có trong danh sách sẽ bị xoá.

Response trả đề xuất ở dạng camelCase, giống bug:

```json
{
  "data": {
    "id": 3,
    "projectId": 1,
    "seq": 3,
    "code": "FF-F003",
    "title": "Lưu món yêu thích để đặt lại nhanh",
    "platform": "mobile",
    "current": "Muốn đặt lại món cũ phải tìm lại từ đầu",
    "desired": "Có nút ♥ trên món, xem lại ở tab \"Yêu thích\"",
    "benefit": "Khách quen đặt nhanh hơn",
    "priority": "medium",
    "status": "new",
    "rejectReason": null,
    "requester": "Lan",
    "assignee": null,
    "createdAt": "2026-11-06T10:15:00+07:00",
    "media": [
      { "id": 5, "type": "image", "url": "/web_develop/dts/upload/features/FF/FF-F003/Ab3….webp", "caption": "Phác thảo nút ♥", "size": 182044 },
      { "id": 6, "type": "video", "url": "/web_develop/dts/upload/features/FF/FF-F003/Kq9….mp4",  "caption": "App X đang làm thế này", "size": 8421337 }
    ],
    "history": [
      { "id": 11, "status": "new", "who": "Lan", "action": "create", "target": null, "createdAt": "2026-11-06T10:15:00+07:00" }
    ]
  },
  "success": true
}
```

Mã lỗi mới, ngoài các mã đã có của bug:

| HTTP | `code` | Khi nào |
|---|---|---|
| 422 | `invalid_media` | File không phải ảnh hoặc video hợp lệ |
| 422 | `media_too_large` | Ảnh > 5 MB hoặc video > 30 MB |
| 422 | `too_many_media` | Quá 6 file |
| 422 | `too_many_videos` | Quá 2 video |
| 422 | `reject_reason_required` | Chuyển sang `rejected` mà không có lý do |

`Project@index` trả thêm `newFeatureCount` (số đề xuất `Mới`) cho sidebar.

---

## 9. Ví dụ dữ liệu

| Mã | Tiêu đề | Nền tảng | Mức độ | Trạng thái | Minh hoạ |
|---|---|---|---|---|---|
| FF-F001 | Xuất hoá đơn điện tử cho đơn hàng | Backend | Cần gấp | Đang làm | 1 ảnh mẫu hoá đơn |
| FF-F002 | Đặt món theo nhóm, chia tiền | Mobile | Nên có | Đã duyệt | 1 video quay app tương tự |
| FF-F003 | Lưu món yêu thích để đặt lại nhanh | Mobile | Nên có | Mới | 1 ảnh phác thảo, 1 video |
| FF-F004 | Giao diện tối (dark mode) | Frontend | Có thì tốt | Mới | 2 ảnh phác thảo |
| FF-F005 | Cho đổi màu chủ đề tuỳ ý | Frontend | Có thì tốt | Từ chối | — (lý do: trùng FF-F004) |

---

## 10. Để dành cho sau (chưa làm)

Bình chọn (+1) cho đề xuất · Bình luận · Chuyển đề xuất thành bug hoặc ngược lại · Gắn đề xuất vào phiên bản phát hành · Kanban cho đề xuất · Thông báo khi đề xuất đổi trạng thái.
