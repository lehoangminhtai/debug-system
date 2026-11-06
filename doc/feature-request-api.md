# Tính năng mong muốn — API cho Frontend

> API của phần **Tính năng mong muốn** (feature request), theo đặc tả [feature-request-spec.md](feature-request-spec.md).
> Quy ước chung (base URL, đăng nhập IAM, token, quyền vào DTS, OTP, định dạng lỗi) giống hệt phần bug: xem [debugging-system-api.md](debugging-system-api.md) mục 1, 2, 3, 11, 12. Tài liệu này chỉ ghi phần riêng.
> Cập nhật: 06/11/2026.

---

## 0. Tóm tắt

| | |
|---|---|
| Base URL | `/web_develop/dts/backend/` (cùng máy chủ) · `http://192.168.110.2/web_develop/dts/backend/` (Vite ở máy dev) · `http://192.168.110.7/dts/backend/` (máy chủ thứ hai, FE build bằng `npm run build:deploy`) |
| Controller | `?c=Feature&m=<method>` |
| Xác định đề xuất | `?code=FF-F001` (không phân biệt hoa thường) |
| Mọi request | `Authorization: Bearer <accessToken>` |
| Đọc / ghi | `GET` / `POST` (ghi bằng `GET` → `405 method_not_allowed`) |
| Cần OTP | `store`, `update`, `destroy` — trường `otp` trong body (mục 12 của tài liệu bug) |
| Không cần OTP | `index`, `show`, `changeStatus`, `assign` |
| Gửi file | `store` / `update` dùng **`multipart/form-data`**; khi không có file mới thì JSON cũng được |

| Endpoint | Việc | OTP |
|---|---|:-:|
| `GET ?c=Feature&m=index` | Danh sách, có lọc | |
| `GET ?c=Feature&m=show&code=` | Chi tiết | |
| `POST ?c=Feature&m=store` | Tạo đề xuất | ✔ |
| `POST ?c=Feature&m=update&code=` | Sửa nội dung và file minh hoạ | ✔ |
| `POST ?c=Feature&m=changeStatus&code=` | Đổi trạng thái (từ chối phải có lý do) | |
| `POST ?c=Feature&m=assign&code=` | Giao / bỏ giao người phụ trách | |
| `POST ?c=Feature&m=destroy&code=` | Xoá hẳn | ✔ |

`Project@index` trả thêm `nextFeatureSeq` và `newFeatureCount` (mục 9).

---

## 1. Kiểu dữ liệu

```ts
type Platform = 'backend' | 'frontend' | 'mobile';
type Priority = 'high' | 'medium' | 'low';                 // Cần gấp / Nên có / Có thì tốt
type FeatureStatus = 'new' | 'accepted' | 'in_progress' | 'done' | 'rejected';
type Action = 'create' | 'claim' | 'assign' | 'unassign' | 'status' | 'edit';

interface FeatureMedia {
  id: number;
  type: 'image' | 'video';
  url: string;          // '/web_develop/dts/upload/features/FF/FF-F003/<ngẫu nhiên>.webp' — dùng thẳng cho <img>/<video>
  caption: string;      // '' nếu không có
  size: number;         // byte
}

interface FeatureHistory {
  id: number;
  status: FeatureStatus;   // trạng thái SAU thao tác
  who: string;             // người thao tác, lấy từ token
  action: Action;
  target: string | null;   // assign: người được giao · status: trạng thái TRƯỚC đó · còn lại: null
  createdAt: string;
}

interface Feature {
  id: number;
  projectId: number;
  seq: number;
  code: string;            // 'FF-F003'
  title: string;
  platform: Platform;
  current: string;         // Hiện tại thế nào
  desired: string;         // Mong muốn thế nào
  benefit: string;         // '' nếu không có
  priority: Priority;
  status: FeatureStatus;
  rejectReason: string | null;  // chỉ có khi status = 'rejected'
  requester: string;
  assignee: string | null;
  createdAt: string;       // ISO 8601, ví dụ '2026-11-06T10:15:00+07:00'
  media: FeatureMedia[];   // theo thứ tự thêm
  history: FeatureHistory[]; // cũ → mới
}
```

---

## 2. Danh sách — `GET ?c=Feature&m=index`

**Request**

```http
GET /web_develop/dts/backend/?c=Feature&m=index&project=FF
Authorization: Bearer <accessToken>
```

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| `project` | Mã dự án | Không có → mọi dự án. Mã không tồn tại → mảng rỗng |
| `platform` | `backend` / `frontend` / `mobile` | |
| `priority` | `high` / `medium` / `low` | |
| `status` | `new` / `accepted` / `in_progress` / `done` / `rejected` | |
| `q` | Chuỗi | Tìm trong mã và tiêu đề; `%`, `_` là ký tự thường |
| `sort_by` | `code` / `title` / `priority` / `status` / `created_at` | Mặc định mới nhất trước |
| `sort_dir` | `asc` / `desc` | |

Giá trị lọc sai bị bỏ qua. Không phân trang.

**Response 200**

```json
{
  "data": [
    {
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
        { "id": 5, "type": "image", "url": "/web_develop/dts/upload/features/FF/FF-F003/Ab3kQ9…webp", "caption": "Phác thảo nút ♥", "size": 182044 },
        { "id": 6, "type": "video", "url": "/web_develop/dts/upload/features/FF/FF-F003/Kq9vT2…mp4", "caption": "App X đang làm thế này", "size": 8421337 }
      ],
      "history": [
        { "id": 11, "status": "new", "who": "Lan", "action": "create", "target": null, "createdAt": "2026-11-06T10:15:00+07:00" }
      ]
    }
  ],
  "success": true
}
```

**Gợi ý FE:** như danh sách bug, tải một lần không lọc rồi lọc ở client. Mặc định ẩn `done` và `rejected`, có nút "Hiện tất cả" (đặc tả mục 6).

---

## 3. Chi tiết — `GET ?c=Feature&m=show&code=FF-F003`

```http
GET /web_develop/dts/backend/?c=Feature&m=show&code=FF-F003
Authorization: Bearer <accessToken>
```

**Response 200:** `{ "data": Feature, "success": true }`. **404** `not_found` nếu không có.

---

## 4. Tạo — `POST ?c=Feature&m=store` 🔐

**Request (`multipart/form-data`)**

```http
POST /web_develop/dts/backend/?c=Feature&m=store
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data; boundary=…

projectId          = 1
title              = Lưu món yêu thích để đặt lại nhanh
platform           = mobile
current            = Muốn đặt lại món cũ phải tìm lại từ đầu
desired            = Có nút ♥ trên món, xem lại ở tab "Yêu thích"
benefit            = Khách quen đặt nhanh hơn
priority           = medium
requester          = Lan
assignee           =
media[0][file]     = <phac-thao.webp>
media[0][caption]  = Phác thảo nút ♥
media[1][file]     = <quay-man-hinh.mp4>
media[1][caption]  = App X đang làm thế này
otp                = 123456
```

| Trường | Bắt buộc | Ràng buộc |
|---|:-:|---|
| `projectId` | ✔ | Dự án phải tồn tại |
| `title` | ✔ | Tối đa 200 ký tự |
| `platform` | ✔ | `backend` / `frontend` / `mobile` |
| `current` | ✔ | Tối đa 2000 ký tự |
| `desired` | ✔ | Tối đa 2000 ký tự |
| `benefit` | | Tối đa 1000 ký tự |
| `priority` | ✔ | `high` / `medium` / `low` |
| `requester` | | Tối đa 100 ký tự. Để trống → người đang đăng nhập |
| `assignee` | | Tối đa 100 ký tự. Để trống → chưa giao |
| `media[i][file]` | | File ảnh hoặc video (mục 7) |
| `media[i][caption]` | | Tối đa 200 ký tự |
| `otp` | ✔ khi bật OTP | 6 chữ số |

Không có file thì gửi JSON cũng được (cùng tên trường, `media` bỏ trống).

**Response 201**

```json
{ "data": { /* Feature — "code": "FF-F003", "status": "new", history: [create] */ }, "success": true }
```

- Mã do backend cấp: `<mã dự án>-F<3 số>`, đếm **riêng** với bug, không dùng lại số đã xoá. Mã xem trước trên form dựng từ `project.nextFeatureSeq`, chỉ để tham khảo.
- Có `assignee` thì lịch sử ghi `create` rồi `assign`.
- Sau khi tạo: invalidate `["features"]` và `["projects"]` (vì `newFeatureCount`, `nextFeatureSeq` đổi).
- OTP sai hoặc file hỏng: không ghi gì, không tốn số thứ tự.

---

## 5. Sửa — `POST ?c=Feature&m=update&code=FF-F003` 🔐

Cùng trường với `store`, khác ở:

| | |
|---|---|
| `projectId` | Không gửi (gửi cũng bị bỏ qua) |
| `requester` | **Bắt buộc** |
| `status` | Không đổi qua đây, dùng `changeStatus` |
| `assignee` | Gửi giá trị hiện tại của ô. Khác giá trị cũ thì lịch sử ghi `assign`/`unassign`; để trống = bỏ giao |

**File minh hoạ khi sửa:** `media` là **danh sách đầy đủ sau khi sửa**.

| Phần tử | Ý nghĩa |
|---|---|
| `media[i][id]` (+ `caption`) | Giữ file cũ có `id` này, cập nhật chú thích |
| `media[i][file]` (+ `caption`) | Thêm file mới |
| File cũ không có trong danh sách | Bị xoá (cả file trên đĩa) |
| `id` không thuộc đề xuất này, hoặc phần tử có cả `id` lẫn `file` | `422 invalid_media`, không thay đổi gì |
| Không gửi trường `media` nào | Giữ nguyên toàn bộ file |
| Gửi `media` rỗng (`media=` trong form, hoặc `"media": []` trong JSON) | Xoá hết file |

```http
POST /web_develop/dts/backend/?c=Feature&m=update&code=FF-F003
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data; boundary=…

title              = Lưu món yêu thích (đồng bộ nhiều thiết bị)
platform           = mobile
current            = …
desired            = …
benefit            = …
priority           = high
requester          = Lan
assignee           = Minh
media[0][id]       = 5
media[0][caption]  = Phác thảo nút ♥ (bản 2)
media[1][file]     = <phac-thao-moi.webp>
media[1][caption]  = Màn hình tab Yêu thích
otp                = 123456
```

→ Giữ file 5 (đổi chú thích), xoá file 6 (video), thêm một ảnh mới.

**Response 200:** `{ "data": Feature, "success": true }`. Lịch sử thêm `edit`, và `assign`/`unassign` nếu đổi người.

Khi lỗi, đề xuất giữ nguyên như trước khi sửa, kể cả file.

---

## 6. Đổi trạng thái — `POST ?c=Feature&m=changeStatus&code=FF-F003`

```http
POST /web_develop/dts/backend/?c=Feature&m=changeStatus&code=FF-F003
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "status": "rejected", "rejectReason": "Trùng với FF-F001" }
```

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| `status` | ✔ | `new` / `accepted` / `in_progress` / `done` / `rejected` |
| `rejectReason` | Khi `rejected` | Tối đa 1000 ký tự. Thiếu → `422 reject_reason_required` |

| Tình huống | Kết quả | Lịch sử |
|---|---|---|
| Giống trạng thái hiện tại | Không đổi (từ chối lại với lý do mới thì chỉ cập nhật lý do) | Không ghi |
| Sang `in_progress` khi chưa có người phụ trách | Người thao tác tự nhận | `claim` |
| Rời `rejected` (mở lại) | `rejectReason` bị xoá | `status`, `target` = `rejected` |
| Các trường hợp khác (mọi hướng) | Đổi trạng thái | `status`, `target` = trạng thái cũ |

**Response 200:** `{ "data": Feature, "success": true }`. **Lỗi:** `404 not_found`, `422` (status sai), `422 reject_reason_required`.

---

## 7. Giao người — `POST ?c=Feature&m=assign&code=FF-F003`

```json
{ "assignee": "Minh" }
```

`assignee` bắt buộc có mặt; `null` = bỏ giao. Lấy tên từ `GET ?c=User&m=index` (danh bạ IAM). Giao lại đúng người cũ thì không ghi lịch sử.

**Response 200:** `{ "data": Feature, "success": true }`.

---

## 8. Xoá — `POST ?c=Feature&m=destroy&code=FF-F003` 🔐

```http
POST /web_develop/dts/backend/?c=Feature&m=destroy&code=FF-F003
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "otp": "123456" }
```

**Response 200:** `{ "success": true }`. Xoá hẳn đề xuất, lịch sử và file. Mã đã cấp không được dùng lại.

---

## 9. Bổ sung ở `Project@index`

```json
{ "id": 1, "key": "FF", "name": "FoodFast", "description": "…",
  "nextSeq": 8, "mustFixOpen": 3,
  "nextFeatureSeq": 4, "newFeatureCount": 2 }
```

| Trường | Dùng cho |
|---|---|
| `nextFeatureSeq` | Xem trước mã trên form: `FF-F004` |
| `newFeatureCount` | Số đề xuất `Mới` trên sidebar |

Đề xuất **không** tính vào `mustFixOpen` và không ảnh hưởng kiểm tra release.

---

## 10. File minh hoạ

| | Ảnh | Video |
|---|---|---|
| Nhận | PNG, JPEG, WebP, GIF | MP4, WebM |
| Dung lượng tối đa | 5 MB | 30 MB |
| Số lượng | Tổng tối đa 6 file / đề xuất (tính cả file giữ lại khi sửa), trong đó tối đa 2 video | |

- Server xác định loại bằng **nội dung file**, không theo đuôi hay Content-Type. SVG, HTML, PHP, video QuickTime `.mov` (iPhone) đều bị từ chối với `invalid_media`.
- **Ảnh:** nén ở trình duyệt như form bug (WebP, cạnh dài 1600px, chất lượng 0,85), rồi gửi dạng `Blob` có tên file, ví dụ `anh-1.webp`.
- **Video:** gửi file gốc. Gợi ý người dùng quay ngắn. Video iPhone `.mov` cần chuyển sang MP4 trước.
- **Một lần lưu nên dưới khoảng 60 MB.** Đã đo trên server: request 61 MB qua được, request 81 MB bị lỗi 500. Nếu tổng file mới vượt quá, lưu bớt rồi thêm phần còn lại ở lần sửa sau: file cũ chỉ gửi `id`, không gửi lại nội dung.

---

## 11. Lỗi riêng của phần này

Ngoài các mã chung (`401`, `403 no_access`, `404 not_found`, `405`, `422` validate, `otp_required`, `otp_invalid`, `iam_unavailable`, `upload_failed`):

| HTTP | `code` | Khi nào |
|---|---|---|
| 422 | `invalid_media` | File không phải ảnh/video được nhận, `id` không thuộc đề xuất này, hoặc phần tử có cả `id` lẫn `file` |
| 422 | `media_too_large` | Ảnh > 5 MB, video > 30 MB, hoặc vượt giới hạn upload của PHP trên server |
| 422 | `too_many_media` | Hơn 6 file |
| 422 | `too_many_videos` | Hơn 2 video |
| 422 | `reject_reason_required` | Từ chối mà không có lý do |
| 413 / 500 | (không có) | Tổng request quá lớn (mục 10) |

---

## 12. Mẫu client

Hàm `api()` trong tài liệu bug luôn đặt `Content-Type: application/json`. Với FormData thì **không được** tự đặt `Content-Type` (trình duyệt tự thêm `boundary`), nên dùng một hàm riêng:

```ts
type MediaInput = { id: number; caption?: string } | { file: Blob; name: string; caption?: string };

interface FeatureInput {
  projectId?: number;              // chỉ khi tạo
  title: string; platform: Platform; current: string; desired: string; benefit?: string;
  priority: Priority; requester?: string; assignee?: string | null;
  media?: MediaInput[];            // undefined = giữ nguyên (khi sửa); [] = xoá hết
}

function toFormData(input: FeatureInput, otp: string): FormData {
  const fd = new FormData();
  const { media, ...fields } = input;
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, v === null ? '' : String(v));

  if (media) {
    if (media.length === 0) fd.append('media', '');
    media.forEach((m, i) => {
      if ('id' in m) fd.append(`media[${i}][id]`, String(m.id));
      else fd.append(`media[${i}][file]`, m.file, m.name);
      fd.append(`media[${i}][caption]`, m.caption ?? '');
    });
  }
  fd.append('otp', otp);
  return fd;
}

async function sendForm<T>(m: 'store' | 'update', fd: FormData, code?: string): Promise<T> {
  const q = new URLSearchParams({ c: 'Feature', m, ...(code ? { code } : {}) });
  const res = await fetch(`${API_BASE}?${q}`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${auth.token}` }, // KHÔNG đặt Content-Type
    body: fd,
  }).catch(() => { throw new BS('network'); });
  const json = await res.json().catch(() => null);
  if (res.status === 401 || json?.code === 'no_access') { auth.clear(); onUnauthenticated(json?.code ?? 'session_expired'); throw new BS(json?.code ?? 'session_expired'); }
  if (!res.ok || json?.success === false) throw new BS(json?.code ?? (res.status === 413 ? 'payload_too_large' : 'generic'));
  return json.data as T;
}

export const FS = {
  list:         () => data<Feature[]>(api('Feature', 'index')),
  get:          (code: string) => data<Feature>(api('Feature', 'show', { query: { code } })),
  create:       (input: FeatureInput, otp: string) => sendForm<Feature>('store', toFormData(input, otp)),
  update:       (code: string, input: FeatureInput, otp: string) => sendForm<Feature>('update', toFormData(input, otp), code),
  changeStatus: (code: string, status: FeatureStatus, rejectReason?: string) =>
    data<Feature>(api('Feature', 'changeStatus', { method: 'POST', query: { code }, body: { status, rejectReason } })),
  assign:       (code: string, assignee: string | null) =>
    data<Feature>(api('Feature', 'assign', { method: 'POST', query: { code }, body: { assignee } })),
  remove:       (code: string, otp: string) =>
    api('Feature', 'destroy', { method: 'POST', query: { code }, body: { otp } }).then(() => undefined),
};
```

`data`, `api`, `auth`, `BS`, `onUnauthenticated`, `API_BASE` là các hàm có sẵn ở mục 7 của tài liệu bug. URL file trong `media[].url` là đường dẫn tương đối: ghép host như ảnh bug.

---

## 13. Khoá i18n mới

| Khoá | vi | en | zh-Hant | zh-Hans |
|---|---|---|---|---|
| `nav.features` | Tính năng mong muốn | Feature requests | 功能需求 | 功能需求 |
| `feature.new` | Đề xuất tính năng | Request a feature | 提出功能需求 | 提出功能需求 |
| `field.current` | Hiện tại | Currently | 目前狀況 | 目前状况 |
| `field.desired` | Mong muốn | Desired | 期望 | 期望 |
| `field.benefit` | Lợi ích | Benefit | 效益 | 效益 |
| `field.priority` | Mức độ mong muốn | Priority | 期望程度 | 期望程度 |
| `field.requester` | Người đề xuất | Requested by | 提出人 | 提出人 |
| `field.rejectReason` | Lý do từ chối | Reason for rejection | 拒絕原因 | 拒绝原因 |
| `field.media` | Minh hoạ | Illustrations | 示意圖片/影片 | 示意图片/视频 |
| `priority.high` | Cần gấp | Urgent | 急需 | 急需 |
| `priority.medium` | Nên có | Should have | 應該有 | 应该有 |
| `priority.low` | Có thì tốt | Nice to have | 有更好 | 有更好 |
| `featureStatus.new` | Mới | New | 新建 | 新建 |
| `featureStatus.accepted` | Đã duyệt | Accepted | 已核准 | 已批准 |
| `featureStatus.in_progress` | Đang làm | In progress | 進行中 | 进行中 |
| `featureStatus.done` | Hoàn thành | Done | 已完成 | 已完成 |
| `featureStatus.rejected` | Từ chối | Rejected | 已拒絕 | 已拒绝 |
| `error.invalid_media` | File không hợp lệ. Chỉ nhận ảnh PNG/JPEG/WebP/GIF hoặc video MP4/WebM. | Invalid file. Only PNG/JPEG/WebP/GIF images or MP4/WebM videos are accepted. | 檔案無效，僅接受 PNG/JPEG/WebP/GIF 圖片或 MP4/WebM 影片。 | 文件无效，仅接受 PNG/JPEG/WebP/GIF 图片或 MP4/WebM 视频。 |
| `error.media_too_large` | File quá lớn: ảnh tối đa 5 MB, video tối đa 30 MB. | File too large: images up to 5 MB, videos up to 30 MB. | 檔案過大：圖片上限 5 MB，影片上限 30 MB。 | 文件过大：图片上限 5 MB，视频上限 30 MB。 |
| `error.too_many_media` | Tối đa 6 file minh hoạ. | Up to 6 files. | 最多 6 個檔案。 | 最多 6 个文件。 |
| `error.too_many_videos` | Tối đa 2 video. | Up to 2 videos. | 最多 2 部影片。 | 最多 2 个视频。 |
| `error.reject_reason_required` | Vui lòng ghi lý do từ chối. | Please enter a reason for rejection. | 請填寫拒絕原因。 | 请填写拒绝原因。 |
| `error.payload_too_large` | Tổng dung lượng file quá lớn. Hãy lưu bớt rồi thêm phần còn lại sau. | The files are too large in total. Save fewer now and add the rest later. | 檔案總大小過大，請先儲存部分，其餘稍後再加入。 | 文件总大小过大，请先保存部分，其余稍后再添加。 |
