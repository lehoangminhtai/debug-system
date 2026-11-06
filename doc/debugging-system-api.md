# Debugging System — Tích hợp API cho Frontend

> Tài liệu nối bản frontend hiện tại (đang chạy bằng dữ liệu giả trong trình duyệt) vào backend thật, có đăng nhập qua IAM.
> Đi kèm: [debugging-system-spec.md](debugging-system-spec.md) (nghiệp vụ) · [backend/API.md](backend/API.md) (tham chiếu API rút gọn).
> Cập nhật: 06/11/2026.

---

## 0. Tóm tắt

| | Hiện tại (bản build) | Sau khi tích hợp |
|---|---|---|
| Dữ liệu | `localStorage["debugs.db.v1"]`, mỗi trình duyệt một bản | MariaDB `dts` trên 192.168.110.2, dùng chung |
| Người dùng | Ô chọn "Tôi là" với 6 tên cố định | Đăng nhập tài khoản IAM, tên lấy từ token |
| Danh sách người báo / người sửa | Mảng cố định `Lan, Minh, Hùng, Trang, An, Quân` | Danh bạ IAM qua `User@index` |
| Ảnh minh chứng | Data URL lưu trong `localStorage` | Gửi data URL lên, backend lưu file, trả về URL |
| Lịch sử "ai làm gì" | FE tự ghi bằng tên đang chọn | Backend tự ghi theo người đăng nhập, FE không gửi |
| Phân quyền | Không có | **Một quyền duy nhất: được vào DTS**, cấp trên IAM. Ai vào được thì dùng mọi chức năng (giống App VCM) |

Việc FE cần làm:

1. Thêm màn hình **Đăng nhập** và route guard (mục 2).
2. Thay lớp mock `YS.*` bằng lời gọi API, giữ nguyên chữ ký hàm, chỉ bỏ tham số `who` (mục 5, mẫu code ở mục 7).
3. Gắn `Authorization: Bearer <token>` vào mọi request, gặp 401 thì đưa về trang đăng nhập (mục 3).
4. Thay ô "Tôi là" bằng menu người dùng (tên + Đăng xuất), bỏ dòng thông báo `nav.localData`.
5. Thêm các khoá i18n mới (mục 8).
6. Thêm hộp thoại nhập **OTP** cho thao tác lưu/xoá (mục 12).

---

## 1. Kết nối

| | Giá trị |
|---|---|
| Base URL (cùng máy chủ với FE) | `/web_develop/dts/backend/` |
| Base URL (chạy Vite ở máy dev) | `http://192.168.110.2/web_develop/dts/backend/` |
| Máy chủ thứ hai (FE build bằng `npm run build:deploy`) | `http://192.168.110.7/dts/backend/` (xem README, mục Deploy) |
| Kiểu định tuyến | C&M: controller và method nằm trên query string `?c=<Controller>&m=<method>` |
| Định dạng | JSON, UTF-8 |
| CORS | Cho phép `http://192.168.110.2`, `http://localhost`, `http://localhost:3000`, `http://localhost:5173`. Origin khác nhận `403 CORS not allowed` |

```
GET  /web_develop/dts/backend/?c=Bug&m=index
POST /web_develop/dts/backend/?c=Bug&m=store
```

**Quy tắc method:** đọc dùng `GET`, mọi thao tác ghi dùng `POST`. Gọi endpoint ghi bằng `GET` sẽ nhận `405 method_not_allowed`.

Header cho mọi request (trừ đăng nhập không cần `Authorization`):

```http
Authorization: Bearer <accessToken>
Accept: application/json
Content-Type: application/json
```

Không truyền token qua query string `?t=`. Cách này còn được hỗ trợ cho tương thích ngược nhưng làm lộ token trong log và lịch sử trình duyệt.

---

## 2. Đăng nhập với IAM

### 2.1. Cơ chế

```
FE ──POST ?c=Auth&m=login──► Backend DTS ──► IAM (AuthController@login)
                                  ◄── accessToken (JWT HS256, hạn 60 ngày)
FE lưu token, gắn vào mọi request ──► Backend tự kiểm chữ ký + hạn, không gọi lại IAM
```

- FE **chỉ gọi backend DTS**, không gọi thẳng IAM.
- Đăng nhập bằng **username hoặc mã nhân viên** cùng mật khẩu IAM.
- Tài khoản đã bật 2FA thì phải nhập thêm **OTP 6 số**.
- Token chứa danh tính (`sub` = UUID, `username`, `fullname`, `employee_id`, `role`). Backend lấy người thao tác từ token, nên mọi tham số kiểu "người làm" do FE gửi đều bị bỏ qua.
- **Quyền vào DTS:** chỉ có một quyền, cấp trên IAM (cách setup ở mục 11). Người chưa được cấp quyền thì đăng nhập bị từ chối với mã `no_access` và không nhận token. Người đang dùng mà bị gỡ quyền thì mọi request sau đó (chậm nhất 60 giây) trả `403 no_access`. Không có phân quyền theo chức năng: đã vào được thì dùng mọi chức năng.
- Trạng thái backend: `IAM_AUTH_ENABLED=true`. Quyền vào DTS bật bằng `IAM_PERMISSION_ENABLED=true` sau khi đã khai báo bên IAM (mục 11). Khi cờ này tắt, ai đăng nhập IAM được cũng vào được.

### 2.2. `POST ?c=Auth&m=login`

Công khai, không cần token.

**Request**

```http
POST /web_develop/dts/backend/?c=Auth&m=login
Content-Type: application/json
Accept: application/json

{
  "username": "minh.nguyen",
  "password": "********",
  "otp": "123456"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:-:|---|
| `username` | string | ✔ | Username hoặc mã nhân viên |
| `password` | string | ✔ | |
| `otp` | string \| null | | Chỉ cần khi tài khoản bật 2FA |

**Response 200: thành công**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI…",
  "expires_in": 5184000
}
```

`expires_in` tính bằng giây (60 ngày). Riêng endpoint này trả token ở cấp ngoài cùng, không bọc trong `data`.

**Response lỗi**

Mọi lỗi đăng nhập (trừ 422) đều có `code` cố định. FE rẽ nhánh theo `code`, không theo `message`.

```json
{ "success": false, "error": "Unauthenticated", "code": "otp_required", "message": "OTP error!" }
```

| HTTP | `code` | Ý nghĩa | FE xử lý |
|---|---|---|---|
| 401 | `invalid_credentials` | Sai tài khoản hoặc mật khẩu | `error.invalid_credentials`, xoá ô mật khẩu |
| 401 | `otp_required` | Tài khoản bật 2FA, chưa gửi `otp` | Hiện ô OTP, giữ username/mật khẩu |
| 401 | `otp_invalid` | Đã gửi `otp` nhưng sai | `error.otp_invalid`, xoá ô OTP |
| 403 | `no_access` | Đăng nhập IAM đúng, nhưng tài khoản chưa được cấp quyền vào DTS | `error.no_access`, xoá ô mật khẩu |
| 403 | `login_forbidden` | IAM chặn tài khoản này | `error.login_forbidden` |
| 502 | `iam_unavailable` | IAM không phản hồi, hoặc trả dữ liệu không hợp lệ | `error.iam_unavailable` |
| 4xx khác | `login_failed` | Lỗi khác từ IAM | `error.generic` |
| 422 | (không có `code`; `errors.username`, `errors.password`) | Thiếu trường | Báo lỗi tại ô tương ứng |

`message` là câu gốc của IAM, chỉ dùng để ghi log.

### 2.3. Luồng màn hình đăng nhập

```
[Nhập username + mật khẩu] ──Đăng nhập──►
    200                    → lưu token → gọi Auth@me → về trang trước đó (?next=) hoặc /all
    otp_required           → hiện ô OTP, giữ nguyên username/mật khẩu, gửi lại kèm otp
    otp_invalid            → báo "Mã OTP không đúng", xoá ô OTP
    invalid_credentials    → báo sai tài khoản hoặc mật khẩu, xoá ô mật khẩu
    no_access              → báo tài khoản chưa được cấp quyền vào DTS (liên hệ quản trị IAM)
    login_forbidden        → báo tài khoản không được phép vào hệ thống
    iam_unavailable        → báo không kết nối được IAM
```

- Route mới: `/login`, nằm ngoài layout chính (không sidebar).
- Mọi route khác cần token. Chưa có token thì chuyển về `/login?next=<đường dẫn hiện tại>`.
- Lưu token ở `localStorage`:

| Khoá | Giá trị |
|---|---|
| `debugs.token` | `accessToken` |
| `debugs.tokenExp` | `Date.now() + expires_in * 1000` |

- Khi mở app: token còn hạn thì gọi `Auth@me`. Gọi thành công thì vào app. Bị 401 hoặc `403 no_access` thì xoá token và về `/login` (kèm thông báo tương ứng). Bị `502 iam_unavailable` thì **giữ token**, hiện lỗi và nút thử lại.
- **Đăng xuất:** xoá `debugs.token`, `debugs.tokenExp`, xoá cache React Query, về `/login`. Backend không có endpoint đăng xuất. Token đã cấp vẫn hợp lệ tới khi hết hạn, vì vậy phải xoá hẳn khỏi trình duyệt.
- Bỏ các khoá cũ: `debugs.db.v1`, `debugs.currentUser`.

### 2.4. `GET ?c=Auth&m=me`: người đang đăng nhập

Dùng cho menu người dùng ở header (thay ô "Tôi là") và làm giá trị mặc định ô "Người báo".

**Request**

```http
GET /web_develop/dts/backend/?c=Auth&m=me
Authorization: Bearer <accessToken>
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "id": "a2b4c320-6a8a-43a2-bdd2-eb2b8b6cfe05",
    "username": "minh.nguyen",
    "employee_id": "ACM00100",
    "name": "Nguyễn Minh",
    "role": "admin",
    "department": null
  }
}
```

| Trường | Ghi chú |
|---|---|
| `id` | UUID IAM |
| `name` | `fullname`, IAM để trống thì dùng `username`. Backend ghi đúng chuỗi này vào lịch sử và vào `assignee` khi "Nhận sửa" |
| `role` | Role đầu tiên. FE không cần dùng: quyền vào DTS do backend kiểm |

### 2.5. `GET ?c=User&m=access`: còn quyền vào DTS không

Đây chính là endpoint được khai báo làm quyền bên IAM (mục 11). FE thường không cần gọi riêng, vì `Auth@me` và mọi endpoint khác đều qua cùng một bước kiểm. Dùng khi chỉ muốn hỏi "tôi còn quyền không" mà không cần dữ liệu.

```http
GET /web_develop/dts/backend/?c=User&m=access
Authorization: Bearer <accessToken>
```

| HTTP | Body |
|---|---|
| 200 | `{ "success": true }` |
| 403 | `{ "success": false, "error": "Forbidden", "code": "no_access", "message": "Tài khoản chưa được cấp quyền vào hệ thống DTS." }` |
| 502 | `{ "success": false, "error": "iam_unavailable", "code": "iam_unavailable", "message": "Không kiểm tra được quyền truy cập với IAM." }` |

---

## 3. Quy ước chung

### 3.1. Response thành công

```json
{ "data": { … }, "success": true }
{ "data": [ … ], "success": true }
```

FE đọc `json.data`. Riêng `Auth@login` không bọc `data` (mục 2.2), và `Bug@destroy` chỉ trả `{"success": true}`.

### 3.2. Response lỗi

| HTTP | Body | Khi nào | FE xử lý |
|---|---|---|---|
| 401 | `{"success":false,"error":"Unauthenticated","message":"Token is required. Pass via Authorization: Bearer <token>"}` | Thiếu token | Xoá token, chuyển `/login?next=…`, toast `error.session_expired` |
| 401 | `{"success":false,"error":"Unauthenticated","message":"Invalid or expired token: Token expired"}` | Token hết hạn hoặc sai chữ ký | Như trên |
| 403 | `{"success":false,"error":"Forbidden","code":"no_access","message":"…"}` | Tài khoản bị gỡ quyền vào DTS (ở **mọi** endpoint) | Xoá token, chuyển `/login`, toast `error.no_access` |
| 404 | `{"success":false,"error":"not_found","code":"not_found","message":"Không tìm thấy bug FF-999."}` | Không có bug hoặc dự án | `error.bugNotFound` / `error.projectNotFound` / `error.not_found` |
| 405 | `{… "code":"method_not_allowed" …}` | Gọi endpoint ghi bằng GET | Lỗi lập trình, hiện `error.generic` |
| 409 | `{… "code":"duplicate_key" …}` | Mã dự án đã tồn tại | `error.duplicate_key` tại ô Mã |
| 422 | `{… "code":"confirm_mismatch" …}` | Xoá mà gõ lại sai mã (mục 6.12) | Báo `error.confirm_mismatch` tại ô xác nhận |
| 413 | `{"message":"…"}` | Body vượt giới hạn của PHP (đã thử 41 MB vẫn qua) | `error.generic` |
| 422 | `{… "code":"invalid_key" …}` | Mã dự án sai định dạng | `error.invalid_key` tại ô Mã |
| 422 | `{… "code":"otp_required" …}` | Thao tác lưu/xoá chưa gửi `otp` (mục 12) | Mở hộp thoại OTP, gửi lại |
| 422 | `{… "code":"otp_invalid" …}` | Mã OTP sai hoặc hết hạn | Báo `error.otp_invalid`, xoá ô OTP, giữ hộp thoại |
| 422 | `{… "code":"invalid_image" …}` | Ảnh không phải PNG/JPEG/WebP/GIF, hoặc URL ảnh không thuộc bug này | `error.invalid_image` |
| 422 | `{… "code":"image_too_large" …}` | Ảnh lớn hơn 5 MB sau khi giải mã | `error.image_too_large` |
| 422 | `{"success":false,"error":"Validation Error","errors":{"<trường>":["…"]}}` | Lỗi validate từng trường | Gắn lỗi vào ô theo tên trường |
| 500 | `{… "code":"upload_failed" …}` | Không ghi được ảnh lên đĩa | `error.upload_failed` |
| 500 | `{"success":false,"error":"Internal Server Error","message":"…"}` | Lỗi không lường trước | `error.generic` |
| 502 | `{… "code":"iam_unavailable" …}` | IAM không trả lời (danh bạ, hoặc bước kiểm quyền vào DTS ở mọi endpoint) | `error.iam_unavailable`, **không** đăng xuất |

Lỗi nghiệp vụ luôn có dạng:

```json
{ "success": false, "error": "<code>", "code": "<code>", "message": "<câu tiếng Việt cho log>" }
```

FE dịch theo `code` qua khoá `error.<code>`, **không hiển thị `message`**. Đây đúng là cơ chế `BS(code)` + `tC()` đang có.

**Lỗi validate (422 không có `code`):** `errors` dùng đúng tên trường FE gửi (`title`, `isCore`, `projectId`, `steps`, `images.0.url`…). Câu thông báo là tiếng Anh mặc định của Laravel, trừ lỗi `steps` là tiếng Việt. FE đã validate cùng giới hạn bằng zod, nên lỗi này hiếm khi xảy ra. Khi gặp, chỉ cần đánh dấu ô lỗi và dùng câu i18n của FE.

### 3.3. Kiểu dữ liệu chung

- Thời gian: ISO 8601 có múi giờ, ví dụ `2026-11-05T16:30:00+07:00`. FE format theo ngôn ngữ đang chọn như hiện nay.
- Ngoài các trường của mock, backend trả thêm `mustFix` (bug) và `mustFixOpen` (dự án).

---

## 4. Kiểu dữ liệu

Giữ nguyên kiểu FE đang dùng. Chênh lệch so với mock được ghi rõ.

```ts
type Platform = 'backend' | 'frontend' | 'mobile';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status   = 'new' | 'fixing' | 'fixed' | 'closed';
type Action   = 'create' | 'claim' | 'assign' | 'unassign' | 'status' | 'edit';

interface Project {
  id: number;
  key: string;            // 'FF' — 2–4 chữ in hoa
  name: string;
  description: string;    // tính năng cốt lõi
  nextSeq: number;        // số của bug kế tiếp, dùng để xem trước mã trên form
  mustFixOpen: number;    // MỚI — số bug bắt buộc sửa chưa đóng (sidebar)
}

interface BugImage {
  id: number;
  url: string;            // '/web_develop/dts/upload/bugs/FF/FF-001/<ngẫu nhiên>.webp' — dùng thẳng làm <img src>
  caption: string;        // '' nếu không có
}

interface HistoryEntry {
  id: number;
  status: Status;         // trạng thái SAU thao tác
  who: string;            // tên người thao tác, lấy từ token
  action: Action;
  target: string | null;  // assign: người được giao · status: trạng thái TRƯỚC đó · còn lại: null
  createdAt: string;
}

interface Bug {
  id: number;
  projectId: number;
  seq: number;
  code: string;           // 'FF-001'
  title: string;
  platform: Platform;
  isCore: boolean;
  severity: Severity;
  mustFix: boolean;       // MỚI — isCore || severity === 'critical'
  steps: string;          // mỗi dòng một bước, nối bằng '\n'
  expected: string;
  actual: string;
  note: string;           // '' nếu không có
  reporter: string;
  assignee: string | null;
  status: Status;
  createdAt: string;
  images: BugImage[];     // sắp theo thứ tự thêm
  history: HistoryEntry[];// cũ → mới
}

interface Me {
  id: string; username: string; employee_id: string; name: string;
  role: string | null; department: null;
}

interface Person { uuid: string; username: string; employeeId: string | null; name: string; }

interface ReleaseStatus {
  project: string | null; // null = tính gộp mọi dự án
  ready: boolean;
  blocking: Array<Pick<Bug, 'code' | 'title' | 'platform' | 'isCore' | 'severity' | 'status' | 'assignee'>>;
}
```

---

## 5. Đối chiếu lớp mock → API

| Hàm mock hiện tại | API | Thay đổi |
|---|---|---|
| `YS.listProjects()` | `GET ?c=Project&m=index` | Thêm `mustFixOpen` |
| `YS.createProject(data)` | `POST ?c=Project&m=store` | — |
| `YS.listBugs()` | `GET ?c=Bug&m=index` | — |
| `YS.getBug(code)` | `GET ?c=Bug&m=show&code=` | — |
| `YS.createBug(data, who)` | `POST ?c=Bug&m=store` | Bỏ `who` |
| `YS.updateBug(code, data, who)` | `POST ?c=Bug&m=update&code=` | Bỏ `who` |
| `YS.changeStatus(code, status, who)` | `POST ?c=Bug&m=changeStatus&code=` | Bỏ `who` |
| `YS.assign(code, assignee, who)` | `POST ?c=Bug&m=assign&code=` | Bỏ `who` |
| `YS.deleteBug(code)` | `POST ?c=Bug&m=destroy&code=` | Thêm `confirm` (mã gõ lại) và `otp` |
| (mới) | `POST ?c=Project&m=destroy&key=` | Xoá dự án, cần `confirm` và `otp` |
| Mảng tên cố định `MS` | `GET ?c=User&m=index` | Danh bạ IAM, dùng `name` |
| `debugs.currentUser` (`$S()`) | `GET ?c=Auth&m=me` | Dùng `data.name` |
| Kiểm tra release `kS()` ở client | Giữ nguyên, hoặc `GET ?c=Project&m=releaseStatus` | Cùng một quy tắc |
| `BS("storage_full")` | Không còn | Xoá khoá `error.storage_full` |

Các query key React Query (`["projects"]`, `["bugs"]`, `["bugs", code]`) và các bước optimistic update giữ nguyên. Riêng `onMutate` của "đổi trạng thái": khi kéo bug chưa có người sang `fixing`, gán tạm `assignee = me.name` thay vì `$S()`. Backend làm đúng như vậy.

---

## 6. API theo tính năng

### 6.1. Sidebar: danh sách dự án

Màn hình: sidebar (`nav.projects`, số `nav.mustFixCount`), ô chọn dự án trong form báo bug, xem trước mã bug kế tiếp.

**Request**

```http
GET /web_develop/dts/backend/?c=Project&m=index
Authorization: Bearer <accessToken>
```

**Response 200**

```json
{
  "data": [
    {
      "id": 1,
      "key": "FF",
      "name": "FoodFast",
      "description": "Ứng dụng đặt đồ ăn. Tính năng cốt lõi: đăng nhập, đặt món, thanh toán.",
      "nextSeq": 8,
      "mustFixOpen": 3
    },
    {
      "id": 2,
      "key": "SM",
      "name": "ShopMini",
      "description": "Sàn bán lẻ nhỏ. Tính năng cốt lõi: tìm sản phẩm, giỏ hàng, đặt hàng, theo dõi đơn.",
      "nextSeq": 4,
      "mustFixOpen": 1
    }
  ],
  "success": true
}
```

Sắp theo `id` tăng dần. `mustFixOpen` dùng thẳng cho số trên sidebar. Mục "Tất cả dự án" là tổng các số này.

---

### 6.2. Tạo dự án

Màn hình: hộp thoại `new-project-dialog` (`project.title`).

> 🔐 **Cần OTP** khi `OTP_ENABLED=true`: thêm `"otp": "123456"` vào body (mục 12).

**Request**

```http
POST /web_develop/dts/backend/?c=Project&m=store
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "key": "HR",
  "name": "HR Portal",
  "description": "Cổng nhân sự nội bộ. Tính năng cốt lõi: chấm công, đơn nghỉ phép, phiếu lương."
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|:-:|---|
| `key` | string | ✔ | 2–4 chữ cái A–Z. Backend tự trim và đổi sang in hoa |
| `name` | string | ✔ | Tối đa 60 ký tự |
| `description` | string | ✔ | Tối đa 500 ký tự |

**Response 201**

```json
{
  "data": { "id": 3, "key": "HR", "name": "HR Portal", "description": "Cổng nhân sự nội bộ. …", "nextSeq": 1, "mustFixOpen": 0 },
  "success": true
}
```

**Lỗi**

| HTTP | `code` | FE xử lý (giữ như hiện tại) |
|---|---|---|
| 409 | `duplicate_key` | `setError("key", "error.duplicate_key")` |
| 422 | `invalid_key` | `setError("key", "error.invalid_key")` |
| 422 | (`errors.name`, `errors.description`) | Lỗi tại ô tương ứng |

Sau khi tạo: invalidate `["projects"]` rồi điều hướng tới `/<key>`, như hiện tại.

---

### 6.3. Danh sách bug và Kanban

Màn hình: `/:scope` (danh sách) và `/:scope/board` (Kanban), với `scope` là `all` hoặc mã dự án. Gồm ô trạng thái release, bảng, bộ lọc nền tảng / cốt lõi / trạng thái / mức độ, ô tìm kiếm, 4 cột Kanban.

**Request**

```http
GET /web_develop/dts/backend/?c=Bug&m=index
Authorization: Bearer <accessToken>
```

Tham số lọc (đều tuỳ chọn):

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| `project` | Mã dự án, ví dụ `FF` | Không phân biệt hoa thường. Mã không tồn tại → mảng rỗng |
| `platform` | `backend` / `frontend` / `mobile` | |
| `is_core` | `1` / `0` | |
| `status` | `new` / `fixing` / `fixed` / `closed` | |
| `severity` | `critical` / `high` / `medium` / `low` | |
| `q` | Chuỗi bất kỳ | Tìm trong mã và tiêu đề. `%` và `_` là ký tự thường |
| `sort_by` | `code` / `title` / `severity` / `status` / `created_at` | Mặc định: mới nhất trước |
| `sort_dir` | `asc` / `desc` | |

Giá trị lọc không hợp lệ bị bỏ qua, không báo lỗi.

**Response 200**

```json
{
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "seq": 1,
      "code": "FF-001",
      "title": "Crash khi bấm Thanh toán bằng ví",
      "platform": "mobile",
      "isCore": true,
      "severity": "critical",
      "mustFix": true,
      "steps": "Đăng nhập tài khoản có số dư ví\nThêm 2 món vào giỏ hàng\nMở giỏ hàng\nChọn phương thức \"Ví FoodFast\"\nBấm Thanh toán",
      "expected": "Chuyển sang màn hình xác nhận đơn hàng.",
      "actual": "Ứng dụng bị đóng ngay lập tức, không có thông báo lỗi.",
      "note": "iPhone 13, iOS 17.4, app 2.3.0 (build 412).",
      "reporter": "Lan",
      "assignee": "Minh",
      "status": "fixing",
      "createdAt": "2026-10-30T16:30:00+07:00",
      "images": [
        { "id": 1, "url": "/web_develop/dts/upload/bugs/FF/FF-001/Xr8Qk2vTn5mW0pLs7dYc3uHa9eGbJf1z.webp", "caption": "Hộp thoại sự cố sau khi bấm Thanh toán" }
      ],
      "history": [
        { "id": 1, "status": "new",    "who": "Lan",  "action": "create", "target": null, "createdAt": "2026-10-30T16:30:00+07:00" },
        { "id": 2, "status": "fixing", "who": "Minh", "action": "claim",  "target": null, "createdAt": "2026-10-31T18:30:00+07:00" }
      ]
    }
  ],
  "success": true
}
```

**Khuyến nghị:** giữ cách FE đang làm, tải một lần không lọc (`queryKey ["bugs"]`) rồi lọc, đếm và tính release ở client. Bộ lọc trên URL của FE (`q`, `platform`, `core`, `status`, `severity`, `project`) không cần gửi lên server. API không phân trang.

---

### 6.4. Ô trạng thái release

FE đang tự tính bằng `kS()`: bắt buộc sửa = `isCore || severity === 'critical'`, chặn release khi còn bug bắt buộc sửa có `status !== 'closed'`. Backend dùng **cùng quy tắc**, nên có thể giữ cách tính ở client. Endpoint dưới đây dành cho nơi khác cần kiểm tra mà không tải cả danh sách.

**Request**

```http
GET /web_develop/dts/backend/?c=Project&m=releaseStatus&key=FF
Authorization: Bearer <accessToken>
```

Bỏ `key` để tính gộp mọi dự án.

**Response 200**

```json
{
  "success": true,
  "data": {
    "project": "FF",
    "ready": false,
    "blocking": [
      { "code": "FF-001", "title": "Crash khi bấm Thanh toán bằng ví", "platform": "mobile",   "isCore": true, "severity": "critical", "status": "fixing", "assignee": "Minh" },
      { "code": "FF-002", "title": "Trừ tiền 2 lần khi mạng chậm",     "platform": "backend",  "isCore": true, "severity": "critical", "status": "fixed",  "assignee": "Hùng" },
      { "code": "FF-003", "title": "Không gửi lại được OTP",           "platform": "frontend", "isCore": true, "severity": "high",     "status": "new",    "assignee": null }
    ]
  }
}
```

**Lỗi:** `404 not_found` khi mã dự án không tồn tại.

---

### 6.5. Chi tiết bug

Màn hình: `/bugs/:code`, gồm thanh tiến trình 4 bước, thông tin, bước tái tạo, mong đợi và thực tế, hình minh chứng, lịch sử.

**Request**

```http
GET /web_develop/dts/backend/?c=Bug&m=show&code=FF-001
Authorization: Bearer <accessToken>
```

`code` không phân biệt hoa thường.

**Response 200**

```json
{ "data": { /* Bug — cùng dạng mục 6.3 */ }, "success": true }
```

**Lỗi:** `404 not_found` → `error.bugNotFound` với `{code}`. Giữ điều kiện `retry` hiện tại: không thử lại khi `not_found`.

Thanh tiến trình và lịch sử dựng từ `history`, như hiện nay:

| `action` | Câu hiển thị (khoá i18n có sẵn) | Dữ liệu |
|---|---|---|
| `create` | `history.create`: đã báo bug | |
| `claim` | `history.claim`: đã nhận sửa | `who` là người nhận |
| `assign` | `history.assign`: đã giao cho {target} | `target` = người được giao |
| `unassign` | `history.unassign`: đã bỏ người sửa | |
| `status` | `history.status`: đã chuyển {from} → {to} | `from` = `target`, `to` = `status` |
| `edit` | `history.edit`: đã cập nhật thông tin | |

---

### 6.6. Báo bug mới

Màn hình: `/bugs/new` (form `BugFormPage`). Giữ nguyên hàm chuyển dữ liệu form `Ce()` đang có; dữ liệu sau `Ce()` gửi thẳng lên được.

> 🔐 **Cần OTP** khi `OTP_ENABLED=true`: thêm `"otp": "123456"` vào body (mục 12). OTP sai thì không tốn số thứ tự bug và không ghi ảnh.

**Request**

```http
POST /web_develop/dts/backend/?c=Bug&m=store
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "projectId": 1,
  "title": "App bị đóng khi bấm Thanh toán",
  "platform": "mobile",
  "isCore": true,
  "severity": "critical",
  "steps": "Mở giỏ hàng\nBấm Thanh toán",
  "expected": "Chuyển sang màn hình xác nhận",
  "actual": "App bị đóng",
  "note": "iPhone 13, iOS 17.4",
  "reporter": "Lan",
  "assignee": null,
  "images": [
    { "url": "data:image/webp;base64,UklGRlIAAABXRUJQVlA4…", "caption": "Màn hình lúc bị đóng" }
  ]
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|:-:|---|
| `projectId` | number | ✔ | Dự án phải tồn tại |
| `title` | string | ✔ | Tối đa 200 ký tự |
| `platform` | string | ✔ | `backend` / `frontend` / `mobile` |
| `isCore` | boolean | ✔ | |
| `severity` | string | ✔ | `critical` / `high` / `medium` / `low` |
| `steps` | string | ✔ | Mỗi dòng một bước, 1–30 bước, mỗi bước tối đa 500 ký tự. Dòng trống bị bỏ |
| `expected` | string | ✔ | Tối đa 1000 ký tự |
| `actual` | string | ✔ | Tối đa 1000 ký tự |
| `note` | string \| null | | Tối đa 2000 ký tự |
| `reporter` | string \| null | | Tối đa 100 ký tự. Để trống thì lấy người đang đăng nhập |
| `assignee` | string \| null | | Tối đa 100 ký tự. `null` = chưa giao |
| `images` | array | | Tối đa 6 ảnh |
| `images[].url` | string | ✔ | Data URL `data:image/...;base64,...` |
| `images[].caption` | string | | Tối đa 200 ký tự |

Về ảnh:

- Giữ nguyên bước nén ở FE (WebP, cạnh dài 1600 px, chất lượng 0,85). Backend nhận PNG, JPEG, WebP, GIF, mỗi ảnh tối đa **5 MB sau khi giải mã**, và kiểm tra nội dung thật của file. SVG bị từ chối.
- Ngưỡng 10 MB ở FE (`toast.imageTooLarge`) áp cho file gốc trước khi nén, vẫn giữ được.

**Response 201**

```json
{
  "data": {
    "id": 8,
    "projectId": 1,
    "seq": 8,
    "code": "FF-008",
    "title": "App bị đóng khi bấm Thanh toán",
    "platform": "mobile",
    "isCore": true,
    "severity": "critical",
    "mustFix": true,
    "steps": "Mở giỏ hàng\nBấm Thanh toán",
    "expected": "Chuyển sang màn hình xác nhận",
    "actual": "App bị đóng",
    "note": "iPhone 13, iOS 17.4",
    "reporter": "Lan",
    "assignee": null,
    "status": "new",
    "createdAt": "2026-11-06T09:15:42+07:00",
    "images": [
      { "id": 12, "url": "/web_develop/dts/upload/bugs/FF/FF-008/Kq3VbT0wZx9LmN2rS8yUe5JhC7aPd4Fg.webp", "caption": "Màn hình lúc bị đóng" }
    ],
    "history": [
      { "id": 31, "status": "new", "who": "Nguyễn Minh", "action": "create", "target": null, "createdAt": "2026-11-06T09:15:42+07:00" }
    ]
  },
  "success": true
}
```

- Mã bug do backend cấp, đánh số riêng từng dự án, không dùng lại số đã xoá. Mã xem trước trên form (`nextSeq`) chỉ để tham khảo: hai người báo cùng lúc thì người sau nhận số kế tiếp. Luôn dùng `data.code` trong response để hiện toast `toast.bugCreated` và điều hướng `/bugs/<code>`.
- Có `assignee` thì lịch sử ghi `create` rồi `assign`.
- Sau khi tạo: invalidate `["projects"]` (vì `nextSeq`, `mustFixOpen` đổi) và `["bugs"]`.

**Lỗi:** `404 not_found` (dự án đã bị xoá), `422 invalid_image`, `422 image_too_large`, `422` lỗi validate, `500 upload_failed`.

---

### 6.7. Sửa bug

Màn hình: `/bugs/:code/edit`. Form khoá ô dự án (`form.projectLocked`). Hàm `te()` của form đã tách `projectId` ra trước khi gửi, giữ nguyên.

> 🔐 **Cần OTP** khi `OTP_ENABLED=true`: thêm `"otp": "123456"` vào body (mục 12).

**Request**

```http
POST /web_develop/dts/backend/?c=Bug&m=update&code=FF-008
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "App bị đóng khi bấm Thanh toán bằng ví",
  "platform": "mobile",
  "isCore": true,
  "severity": "critical",
  "steps": "Mở giỏ hàng\nChọn Ví FoodFast\nBấm Thanh toán",
  "expected": "Chuyển sang màn hình xác nhận",
  "actual": "App bị đóng",
  "note": "iPhone 13, iOS 17.4. Không xảy ra khi trả bằng thẻ.",
  "reporter": "Lan",
  "assignee": "Hùng",
  "images": [
    { "url": "/web_develop/dts/upload/bugs/FF/FF-008/Kq3VbT0wZx9LmN2rS8yUe5JhC7aPd4Fg.webp", "caption": "Màn hình lúc bị đóng (sửa chú thích)" },
    { "url": "data:image/webp;base64,UklGRlIAAABXRUJQVlA4…", "caption": "Ảnh mới" }
  ]
}
```

Các trường giống mục 6.6, với ba khác biệt:

| | |
|---|---|
| `projectId` | Không gửi (gửi cũng bị bỏ qua). Bug không đổi được dự án |
| `reporter` | **Bắt buộc** |
| `status`, `code` | Không đổi được qua endpoint này (gửi cũng bị bỏ qua). Đổi trạng thái dùng mục 6.8 |

`images` là **danh sách đầy đủ sau khi sửa**:

| Phần tử gửi lên | Kết quả |
|---|---|
| `url` là URL ảnh cũ của **chính bug này** (nguyên văn từ response) | Giữ ảnh, giữ `id`, cập nhật `caption` |
| `url` là data URL | Thêm ảnh mới |
| Ảnh cũ không có trong danh sách | Xoá ảnh và file |
| `url` khác (ảnh của bug khác, link ngoài) | `422 invalid_image`, không thay đổi gì |
| Bỏ hẳn trường `images` | Giữ nguyên toàn bộ ảnh |

Form hiện tại đã gửi lại `url` của ảnh cũ nguyên văn, nên không phải sửa.

`assignee`: gửi giá trị thì đổi người sửa (lịch sử ghi `assign` / `unassign` nếu khác giá trị cũ). Bỏ hẳn trường thì giữ nguyên.

**Response 200**

```json
{ "data": { /* Bug sau khi sửa — lịch sử thêm "edit", và "assign" nếu đổi người */ }, "success": true }
```

**Lỗi:** `404 not_found`, `422 invalid_image`, `422 image_too_large`, `422` lỗi validate, `500 upload_failed`. Khi lỗi, bug giữ nguyên trạng thái trước khi sửa, kể cả ảnh.

---

### 6.8. Đổi trạng thái

Màn hình:
- **Kanban:** kéo thả thẻ giữa 4 cột, hoặc menu thẻ `action.moveTo`.
- **Chi tiết bug:** các nút `detail.claim` (Nhận sửa), `detail.markFixed` (Đánh dấu đã sửa), `detail.close` (Đóng bug), `detail.reopen` (Mở lại).

**Request**

```http
POST /web_develop/dts/backend/?c=Bug&m=changeStatus&code=FF-003
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "status": "fixing" }
```

| Nút / thao tác | `status` gửi lên |
|---|---|
| Nhận sửa | `fixing` |
| Đánh dấu đã sửa | `fixed` |
| Đóng bug | `closed` |
| Mở lại | `new` (hoặc `fixing`) |
| Kéo sang cột | Trạng thái của cột |

Quy tắc của backend (giống mock):

| Tình huống | Kết quả | Lịch sử |
|---|---|---|
| Trạng thái mới giống trạng thái cũ | Không đổi gì | Không ghi |
| Sang `fixing` khi **chưa có người sửa** | `status = fixing`, `assignee = ` tên người đang đăng nhập | `claim` |
| Các trường hợp khác (mọi hướng, kể cả mở lại bug đã đóng) | Đổi `status`, giữ `assignee` | `status`, `target` = trạng thái cũ |

**Response 200**

```json
{
  "data": {
    "code": "FF-003",
    "status": "fixing",
    "assignee": "Nguyễn Minh",
    "history": [
      { "id": 9,  "status": "new",    "who": "Trang",       "action": "create", "target": null, "createdAt": "2026-11-03T10:02:11+07:00" },
      { "id": 32, "status": "fixing", "who": "Nguyễn Minh", "action": "claim",  "target": null, "createdAt": "2026-11-06T09:20:05+07:00" }
    ]
    /* …các trường khác của Bug… */
  },
  "success": true
}
```

**Lỗi:** `404 not_found`, `422` (`errors.status`) khi giá trị không hợp lệ. Lỗi thì rollback optimistic update như hiện tại. Thành công thì toast `toast.statusChanged`.

---

### 6.9. Giao người sửa

Màn hình: ô chọn người sửa trong chi tiết bug.

**Request**

```http
POST /web_develop/dts/backend/?c=Bug&m=assign&code=FF-005
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "assignee": "Hùng" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:-:|---|
| `assignee` | string \| null | ✔ (phải có mặt) | Lấy `name` từ `User@index`, tối đa 100 ký tự. `null` = bỏ giao |

**Response 200**

```json
{ "data": { /* Bug — "assignee": "Hùng", lịch sử thêm { "action": "assign", "target": "Hùng" } */ }, "success": true }
```

Giao lại đúng người đang giữ bug thì không ghi lịch sử. Bỏ giao ghi `unassign`. Không đổi trạng thái.

**Lỗi:** `404 not_found`, `422` (`errors.assignee`). Toast `toast.assigned` / `toast.unassigned`.

---

### 6.10. Xoá bug

Màn hình: chi tiết bug → `action.deleteBug` → hộp thoại xoá (mục 6.12).

🔐 **Cần OTP và gõ lại mã bug.**

**Request**

```http
POST /web_develop/dts/backend/?c=Bug&m=destroy&code=FF-007
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "confirm": "FF-007", "otp": "123456" }
```

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| `confirm` | ✔ | Người dùng **tự gõ lại** mã bug. Phải trùng `code` trên URL (không phân biệt hoa thường) |
| `otp` | ✔ khi bật OTP | 6 chữ số |

**Response 200**

```json
{ "success": true }
```

Xoá hẳn bug, lịch sử và file ảnh. Mã `FF-007` không được cấp lại. Sau khi xoá: `removeQueries(["bugs", code])` và invalidate `["bugs"]`, cộng thêm invalidate `["projects"]` (vì `mustFixOpen` có thể đổi).

**Lỗi:** `422 confirm_mismatch` (gõ sai mã), `422 otp_required` / `otp_invalid`, `404 not_found`. Lỗi nào cũng không xoá gì.

---

### 6.11. Xoá dự án

Màn hình: menu của dự án trên sidebar → **Xoá dự án** → hộp thoại xoá (mục 6.12).

🔐 **Cần OTP và gõ lại mã dự án.** Xoá **toàn bộ** bug, đề xuất tính năng, lịch sử, ảnh và video của dự án.

**Request**

```http
POST /web_develop/dts/backend/?c=Project&m=destroy&key=FF
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "confirm": "FF", "otp": "123456" }
```

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| `key` (URL) | ✔ | Mã dự án |
| `confirm` | ✔ | Người dùng tự gõ lại **mã dự án** (`FF`, không phải tên dự án). Không phân biệt hoa thường |
| `otp` | ✔ khi bật OTP | 6 chữ số |

**Response 200**

```json
{ "success": true, "data": { "project": "FF", "deletedBugs": 7, "deletedFeatures": 3 } }
```

- Sau khi xoá: invalidate `["projects"]`, `["bugs"]`, `["features"]`, rồi chuyển về `/all` nếu đang đứng trong dự án vừa xoá.
- Mã dự án được giải phóng: tạo lại dự án `FF` thì bug bắt đầu lại từ `FF-001`.

**Lỗi:** `422 confirm_mismatch`, `422 otp_required` / `otp_invalid`, `404 not_found`. Lỗi nào cũng không xoá gì.

---

### 6.12. Hộp thoại xoá (dùng chung cho bug, đề xuất, dự án)

```
┌ Xoá bug FF-007? ───────────────────────────────┐
│ ⚠ Xoá hẳn, không khôi phục được.               │
│   (Xoá dự án: "Sẽ xoá 7 bug và 3 đề xuất.")    │
│                                                │
│ Gõ FF-007 để xác nhận: [ FF-007          ]     │
│ Mã OTP:                [ 1 2 3 4 5 6 ]         │
│                                                │
│                     [ Huỷ ]  [ Xoá ]           │
└────────────────────────────────────────────────┘
```

- Nút **Xoá** chỉ bật khi ô xác nhận khớp mã (so không phân biệt hoa thường, bỏ khoảng trắng) **và** OTP đủ 6 số. Server vẫn kiểm lại cả hai.
- Ô xác nhận **không** tự điền sẵn mã, không cho dán sẵn từ nút "sao chép". Mục đích là người dùng đọc và gõ lại.
- Với dự án: số bug và đề xuất đếm từ danh sách FE đã tải (lọc theo `projectId`).
- `confirm_mismatch` → báo lỗi ở ô xác nhận. `otp_invalid` → xoá ô OTP, giữ hộp thoại.

---

### 6.13. Danh bạ người dùng (người báo, người sửa)

Màn hình: ô `field.reporter` và `field.assignee` trong form, ô chọn người sửa ở chi tiết bug. Thay mảng tên cố định `MS`.

**Request**

```http
GET /web_develop/dts/backend/?c=User&m=index&q=minh&limit=200
Authorization: Bearer <accessToken>
```

| Tham số | Ghi chú |
|---|---|
| `q` | Tuỳ chọn. Tìm gần đúng theo username, họ tên, email, mã nhân viên |
| `limit` | 1–200, mặc định 200 |

**Response 200**

```json
{
  "success": true,
  "data": [
    { "uuid": "a2b4c320-6a8a-43a2-bdd2-eb2b8b6cfe05", "username": "minh.nguyen", "employeeId": "ACM00100", "name": "Nguyễn Minh" },
    { "uuid": "7f1e9b02-3c55-4d8e-9a61-0b2f4c7d8e90", "username": "hung.tran",   "employeeId": "ACM00142", "name": "Trần Hùng" }
  ]
}
```

- Giá trị lưu vào `reporter` / `assignee` là `name`.
- Gợi ý: `queryKey ["users"]`, `staleTime` dài (vài phút). Danh bạ đông thì chuyển sang ô chọn có tìm kiếm, gọi `q` sau khi người dùng ngừng gõ (debounce).
- Bug cũ có thể chứa tên không còn trong danh bạ: ô chọn vẫn phải hiển thị được giá trị hiện tại.

**Lỗi:** `502 iam_unavailable` → toast `error.iam_unavailable`. Form vẫn mở được; ô "Người báo" mặc định là `me.name`.

---

## 7. Mẫu client

Giữ lớp lỗi `BS` hiện có (thuộc tính `code`), để `tC()` và các chỗ kiểm `e.code === 'not_found'` không phải sửa.

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? '/web_develop/dts/backend/';
const TOKEN_KEY = 'debugs.token';
const TOKEN_EXP_KEY = 'debugs.tokenExp';

export const auth = {
  get token() {
    const exp = Number(localStorage.getItem(TOKEN_EXP_KEY) ?? 0);
    return exp > Date.now() ? localStorage.getItem(TOKEN_KEY) : null;
  },
  save(token: string, expiresIn: number) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
  },
};

/** Lỗi validate từng trường (422 không có `code`). */
export class ValidationError extends BS {
  constructor(public fields: Record<string, string[]>) { super('validation'); }
}

type Options = { method?: 'GET' | 'POST'; query?: Record<string, string | number | undefined>; body?: unknown };

export async function api<T>(c: string, m: string, { method = 'GET', query = {}, body }: Options = {}): Promise<T> {
  const params = new URLSearchParams({ c, m });
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v));

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}?${params}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new BS('network');
  }

  const json = await res.json().catch(() => null);

  // Đăng nhập đi qua login() riêng, nên 401 ở đây là mất phiên, 403 no_access là bị gỡ quyền vào DTS.
  // 502 iam_unavailable KHÔNG đăng xuất: IAM chết tạm thời, giữ token để thử lại.
  if (res.status === 401 || json?.code === 'no_access') {
    const code = res.status === 401 ? 'session_expired' : 'no_access';
    auth.clear();
    onUnauthenticated(code);           // xoá cache, chuyển /login?next=…, toast error.<code>
    throw new BS(code);
  }
  if (!res.ok || json?.success === false) {
    if (json?.code) throw new BS(json.code);
    if (res.status === 422 && json?.errors) throw new ValidationError(json.errors);
    throw new BS('generic');
  }
  return json as T;
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

/** Thay cho YS — cùng tên hàm, bỏ tham số `who`. */
export const YS = {
  listProjects: () => data<Project[]>(api('Project', 'index')),
  createProject: (body: { key: string; name: string; description: string }) =>
    data<Project>(api('Project', 'store', { method: 'POST', body })),
  listBugs: () => data<Bug[]>(api('Bug', 'index')),
  getBug: (code: string) => data<Bug>(api('Bug', 'show', { query: { code } })),
  createBug: (body: BugInput) => data<Bug>(api('Bug', 'store', { method: 'POST', body })),
  updateBug: (code: string, body: Omit<BugInput, 'projectId'>) =>
    data<Bug>(api('Bug', 'update', { method: 'POST', query: { code }, body })),
  changeStatus: (code: string, status: Status) =>
    data<Bug>(api('Bug', 'changeStatus', { method: 'POST', query: { code }, body: { status } })),
  assign: (code: string, assignee: string | null) =>
    data<Bug>(api('Bug', 'assign', { method: 'POST', query: { code }, body: { assignee } })),
  deleteBug: (code: string, confirm: string, otp: string) =>
    api<{ success: true }>('Bug', 'destroy', { method: 'POST', query: { code }, body: { confirm, otp } }).then(() => undefined),
  deleteProject: (key: string, confirm: string, otp: string) =>
    data<{ project: string; deletedBugs: number; deletedFeatures: number }>(
      api('Project', 'destroy', { method: 'POST', query: { key }, body: { confirm, otp } })),
  listUsers: (q?: string) => data<Person[]>(api('User', 'index', { query: { q } })),
  me: () => data<Me>(api('Auth', 'me')),
};

export async function login(username: string, password: string, otp?: string) {
  const res = await fetch(`${API_BASE}?c=Auth&m=login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, otp: otp || null }),
  }).catch(() => null);

  if (!res) throw new BS('network');
  const json = await res.json().catch(() => null);

  if (res.ok && json?.accessToken) {
    auth.save(json.accessToken, json.expires_in);
    return;
  }
  if (res.status === 422 && json?.errors) throw new ValidationError(json.errors);
  // invalid_credentials | otp_required | otp_invalid | no_access | login_forbidden | iam_unavailable | login_failed
  throw new BS(json?.code ?? 'generic');
}
```

`BugInput` là đúng kiểu dữ liệu hàm `Ce()` của form đang trả ra.

---

## 8. Khoá i18n mới

Thêm vào cả 4 ngôn ngữ. Khoá `error.storage_full` không còn dùng, xoá đi. Khoá `nav.localData`, `header.me` bỏ khỏi giao diện.

| Khoá | vi | en | zh-Hant | zh-Hans |
|---|---|---|---|---|
| `login.title` | Đăng nhập | Sign in | 登入 | 登录 |
| `login.username` | Tên đăng nhập hoặc mã nhân viên | Username or employee ID | 帳號或員工編號 | 账号或员工编号 |
| `login.password` | Mật khẩu | Password | 密碼 | 密码 |
| `login.otp` | Mã OTP | OTP code | OTP 驗證碼 | OTP 验证码 |
| `login.otpHint` | Tài khoản đã bật xác thực 2 lớp. Nhập mã 6 số trong ứng dụng xác thực. | This account uses two-factor authentication. Enter the 6-digit code from your authenticator app. | 此帳號已啟用兩步驟驗證，請輸入驗證器 App 中的 6 位數代碼。 | 此账号已启用两步验证，请输入验证器 App 中的 6 位数代码。 |
| `login.submit` | Đăng nhập | Sign in | 登入 | 登录 |
| `login.logout` | Đăng xuất | Sign out | 登出 | 退出登录 |
| `error.invalid_credentials` | Sai tên đăng nhập hoặc mật khẩu. | Incorrect username or password. | 帳號或密碼錯誤。 | 账号或密码错误。 |
| `error.otp_required` | Vui lòng nhập mã OTP. | Please enter your OTP code. | 請輸入 OTP 驗證碼。 | 请输入 OTP 验证码。 |
| `error.otp_invalid` | Mã OTP không đúng. | Incorrect OTP code. | OTP 驗證碼錯誤。 | OTP 验证码错误。 |
| `otp.title` | Xác nhận bằng mã OTP | Confirm with OTP | 以 OTP 驗證碼確認 | 使用 OTP 验证码确认 |
| `otp.desc` | Nhập mã 6 số đang hiện trên OTP Portal của bạn. Mã đổi sau mỗi 30 giây. | Enter the 6-digit code shown in your OTP Portal. The code changes every 30 seconds. | 請輸入 OTP Portal 上顯示的 6 位數代碼，代碼每 30 秒更新一次。 | 请输入 OTP Portal 上显示的 6 位数代码，代码每 30 秒更新一次。 |
| `otp.confirm` | Xác nhận | Confirm | 確認 | 确认 |
| `error.no_access` | Tài khoản chưa được cấp quyền vào DTS. Vui lòng liên hệ quản trị viên. | Your account does not have access to DTS. Please contact your administrator. | 您的帳號尚未獲得 DTS 的存取權限，請聯絡管理員。 | 您的账号尚未获得 DTS 的访问权限，请联系管理员。 |
| `error.confirm_mismatch` | Mã xác nhận không khớp. Hãy gõ lại đúng mã. | The confirmation code does not match. Please type it exactly. | 確認代碼不符，請正確輸入。 | 确认代码不符，请正确输入。 |
| `delete.irreversible` | Xoá hẳn, không khôi phục được. | This permanently deletes it and cannot be undone. | 將永久刪除，無法復原。 | 将永久删除，无法恢复。 |
| `delete.typeToConfirm` | Gõ {code} để xác nhận | Type {code} to confirm | 輸入 {code} 以確認 | 输入 {code} 以确认 |
| `delete.projectTitle` | Xoá dự án {name}? | Delete project {name}? | 刪除專案 {name}？ | 删除项目 {name}？ |
| `delete.projectImpact` | Sẽ xoá {bugs} bug và {features} đề xuất tính năng. | This will delete {bugs} bugs and {features} feature requests. | 將刪除 {bugs} 個錯誤與 {features} 個功能需求。 | 将删除 {bugs} 个缺陷和 {features} 个功能需求。 |
| `delete.featureTitle` | Xoá đề xuất {code}? | Delete feature request {code}? | 刪除功能需求 {code}？ | 删除功能需求 {code}？ |
| `toast.projectDeleted` | Đã xoá dự án {key} | Project {key} deleted | 已刪除專案 {key} | 已删除项目 {key} |
| `error.login_forbidden` | Tài khoản này không được phép đăng nhập vào hệ thống. | This account is not allowed to sign in to this system. | 此帳號不允許登入本系統。 | 此账号不允许登录本系统。 |
| `error.session_expired` | Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. | Your session has expired. Please sign in again. | 登入已逾時，請重新登入。 | 登录已过期，请重新登录。 |
| `error.iam_unavailable` | Không kết nối được hệ thống đăng nhập (IAM). Vui lòng thử lại sau. | Cannot reach the sign-in service (IAM). Please try again later. | 無法連線至登入系統（IAM），請稍後再試。 | 无法连接登录系统（IAM），请稍后再试。 |
| `error.network` | Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại. | Cannot reach the server. Check your connection and try again. | 無法連線至伺服器，請檢查網路後再試。 | 无法连接服务器，请检查网络后重试。 |
| `error.invalid_image` | Ảnh không hợp lệ. Chỉ nhận PNG, JPEG, WebP hoặc GIF. | Invalid image. Only PNG, JPEG, WebP or GIF is accepted. | 圖片無效，僅接受 PNG、JPEG、WebP 或 GIF。 | 图片无效，仅接受 PNG、JPEG、WebP 或 GIF。 |
| `error.image_too_large` | Ảnh vượt quá 5 MB sau khi nén. | The image exceeds 5 MB after compression. | 圖片壓縮後超過 5 MB。 | 图片压缩后超过 5 MB。 |
| `error.upload_failed` | Không lưu được ảnh lên máy chủ. | Could not save the image on the server. | 無法將圖片儲存至伺服器。 | 无法将图片保存到服务器。 |

`method_not_allowed`, `validation` và `login_failed` dùng `error.generic`; hai mã đầu chỉ xảy ra khi FE gọi sai.

---

## 9. Kiểm tra nhanh bằng PowerShell

```powershell
$B = 'http://192.168.110.2/web_develop/dts/backend/'
$login = @{ username = 'TAI_KHOAN'; password = 'MAT_KHAU' } | ConvertTo-Json
$t = (Invoke-RestMethod -Method Post -Uri "${B}?c=Auth&m=login" -ContentType 'application/json' -Body $login).accessToken
$h = @{ Authorization = "Bearer $t" }

Invoke-RestMethod -Uri "${B}?c=Auth&m=me" -Headers $h
Invoke-RestMethod -Uri "${B}?c=Project&m=index" -Headers $h

$p = @{ key = 'TS'; name = 'Thử nghiệm'; description = 'Tính năng cốt lõi: đăng nhập' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "${B}?c=Project&m=store" -Headers $h -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($p))
```

Tài khoản bật 2FA thì thêm `otp = '123456'` vào `$login`. Body có tiếng Việt phải gửi dạng byte UTF-8 như dòng cuối, nếu không PowerShell 5.1 sẽ làm hỏng dấu.

---

## 10. Dữ liệu mẫu

DB hiện chưa có dữ liệu. Muốn thử giao diện với dữ liệu giống mock (3 dự án FF, SM, HR, 13 bug, FF khớp ví dụ ở mục 8 của spec), chạy trong thư mục `backend`:

```bash
php artisan db:seed --class=DemoDataSeeder
```

- Không tự chạy khi migrate.
- Bảng `projects` đã có dữ liệu thì bỏ qua, không ghi gì.
- Dữ liệu mẫu không có ảnh. Người trong lịch sử là tên giả (Lan, Minh…), không phải tài khoản IAM.

---

## 11. Setup quyền vào DTS trên IAM

DTS chỉ có **một quyền: được vào hệ thống**, làm giống hệt App VCM. Bên IAM chỉ khai báo **một** API, không khai từng endpoint. Ai có role chứa quyền này thì đăng nhập được và dùng mọi chức năng; ai không có thì bị từ chối ngay ở bước đăng nhập.

### 11.1. Cơ chế

```
Đăng nhập / mỗi request ──► Backend DTS ──POST getApiByUsername {username}──► IAM
                                     ◄── danh sách endpoint của mọi role của user
Có "/dts/backend/?c=User&m=access" trong danh sách? ── có  → cho qua (nhớ 60 giây)
                                                   └─ không → 403 no_access
```

- Tra theo **username**, không theo role ghi trong token. Nhờ vậy cấp quyền thì vào được **ngay**, gỡ quyền thì có hiệu lực **chậm nhất sau 60 giây** (`IAM_ACCESS_CACHE_SECONDS`), dù token còn hạn 60 ngày.
- IAM không trả lời thì trả `502 iam_unavailable`, không chặn nhầm thành `no_access`.
- Các endpoint công khai (`Auth@login`, `Auth@verifyUserOTP`, dev tool) không qua bước này.

Bảng so sánh với App VCM (đã có sẵn trong IAM):

| | App VCM (đang chạy) | DTS (cần tạo) |
|---|---|---|
| Subsystem `code` | `app_vcm` | `dts` |
| API `endpoint` | `/app_vcm/backend/?c=User&m=access` | `/dts/backend/?c=User&m=access` |
| Permission | `app_vcm.access` | `dts.access` |
| Role | `admin` (đang có 2 user) | `dts_user` (mới), hoặc gắn vào role sẵn có |

### 11.2. Các bước trên cổng IAM

Đăng nhập cổng IAM `http://192.168.110.2/web_develop/iam/` bằng tài khoản quản trị IAM.

**Bước 1: Tạo subsystem.** Vào **Manage Subsystems** → **Add New Subsystem**.

| Ô | Giá trị |
|---|---|
| Code | `dts` |
| Name | `Debugging System` |

**Bước 2: Tạo API.** Vào **API Management** → **Add API**.

| Ô | Giá trị |
|---|---|
| Endpoint | `/dts/backend/?c=User&m=access` |
| Subsystem | `dts` |

> ⚠️ Endpoint phải **đúng từng ký tự**: bắt đầu bằng `/`, không có `http://`, không có `web_develop`, có dấu `/` trước `?`, đúng hoa thường `User`, `access`. Sai một ký tự là không ai vào được.

**Bước 3: Tạo permission và gắn API.** Vào **Manage Permissions** → **Add Permission**.

| Ô | Giá trị |
|---|---|
| Subsystem | `dts` |
| Name | `dts.access` |
| Description | `Được vào Debugging System` |

Lưu xong, mở permission `dts.access` → **Select APIs** → chọn `/dts/backend/?c=User&m=access` → lưu. Cột **Associated APIs** phải hiện đúng endpoint này.

**Bước 4: Tạo role và gắn permission.** Vào **Manage Roles** → **Add New Role**.

| Ô | Giá trị |
|---|---|
| Name | `dts_user` |
| Description | `Người dùng Debugging System` |
| Permissions | Tick `dts.access` |

Muốn một role sẵn có (ví dụ `admin`) cũng vào được DTS thì sửa role đó và tick thêm `dts.access`, như App VCM đang làm với `admin`.

**Bước 5: Cấp quyền cho người dùng.** Vào **User Management** → **Edit User** từng người → thêm role `dts_user` → lưu.

**Bước 6: Bật kiểm quyền ở backend DTS.** Sửa `backend/.env`:

```env
IAM_ENDPOINT_PREFIX=/dts/backend/      # đã đặt sẵn
IAM_PERMISSION_ENABLED=true            # đổi từ false
# IAM_ACCESS_CACHE_SECONDS=60          # tuỳ chọn: gỡ quyền có hiệu lực sau tối đa bấy nhiêu giây
```

Không cần khởi động lại, request kế tiếp đọc cấu hình mới. Phải làm bước này **sau** bước 1–5: bật trước khi IAM có quyền `dts.access` thì mọi người đều nhận `no_access`.

### 11.3. Kiểm tra sau khi setup

1. Đăng nhập DTS bằng một tài khoản **có** role `dts_user` → nhận token (mục 9).
2. Đăng nhập bằng tài khoản **không có** role đó → `403` với `"code": "no_access"`, không có `accessToken`.
3. Gỡ role khỏi tài khoản ở bước 1 → trong vòng 60 giây, request kế tiếp của người đó trả `403 no_access`.

Gặp sự cố:

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Ai cũng `no_access`, kể cả người đã cấp role | Endpoint bước 2 gõ sai, hoặc `IAM_ENDPOINT_PREFIX` không phải `/dts/backend/`, hoặc permission chưa gắn API (bước 3) |
| Một người cụ thể bị `no_access` | Chưa gán role cho người đó, hoặc role chưa tick `dts.access` |
| Mọi request `502 iam_unavailable` | Backend không gọi được IAM: kiểm tra `API_BASE_URL` |
| Cần mở lại cho mọi người ngay (IAM có sự cố) | Đặt `IAM_PERMISSION_ENABLED=false`: ai đăng nhập IAM được là vào được |

### 11.4. Thu hồi quyền

- Gỡ role `dts_user` khỏi người dùng, hoặc bỏ tick `dts.access` khỏi role. IAM xoá hẳn liên kết nên có hiệu lực ngay ở lần kiểm kế tiếp.
- **Đừng** thu hồi bằng cách chỉ đổi trạng thái của role: hàm `getApiByUsername` của IAM không xét cột trạng thái của role, nên người có role đó vẫn vào được.
- Xoá API `/dts/backend/?c=User&m=access` bên IAM là **khoá DTS với tất cả mọi người**.
- Đặt `IAM_ACCESS_CACHE_SECONDS=0` nếu cần thu hồi có hiệu lực tức thì (đổi lại mỗi request phải hỏi IAM một lần).

---

## 12. OTP xác nhận thao tác lưu/xoá

### 12.1. Thao tác nào cần OTP

| Endpoint | Thao tác |
|---|---|
| `POST ?c=Project&m=store` | Tạo dự án |
| `POST ?c=Bug&m=store` | Báo bug mới |
| `POST ?c=Bug&m=update` | Sửa bug (kể cả thêm/xoá ảnh) |
| `POST ?c=Bug&m=destroy` | Xoá bug (kèm gõ lại mã, mục 6.10) |
| `POST ?c=Project&m=destroy` | Xoá dự án (kèm gõ lại mã dự án, mục 6.11) |
| `POST ?c=Feature&m=store` / `update` / `destroy` | Đề xuất tính năng (xem feature-request-api.md) |

**Không** cần OTP: mọi thao tác đọc, đổi trạng thái (`changeStatus`) và giao người (`assign`). Kéo thả Kanban liên tục mà lần nào cũng hỏi mã thì không dùng nổi. Danh sách nằm ở `api.otp_routes` trong `backend/config/api.php`; muốn bắt thêm thì thêm dòng `'Bug@changeStatus'`, `'Bug@assign'`, không phải sửa code.

Bật tắt bằng `OTP_ENABLED` trong `backend/.env`. Khi tắt, mọi thứ chạy như chưa có OTP.

### 12.2. Người dùng lấy mã ở đâu

Mã 6 số, đổi mỗi 30 giây, xem trên **OTP Portal** của công ty (`?c=Otp&m=index`). Đây là mã TOTP gắn với tài khoản IAM, giống mã dùng khi đăng nhập 2FA. IAM chấp nhận mã của nhịp hiện tại và một nhịp trước/sau, nên người dùng có khoảng 60–90 giây để nhập.

### 12.3. Request

Gửi mã trong body cùng dữ liệu, trường `otp`:

```http
POST /web_develop/dts/backend/?c=Bug&m=store
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "projectId": 1, "title": "…", …, "otp": "123456" }
```

Backend kiểm OTP **trước khi** làm bất cứ việc gì: OTP sai thì không ghi DB, không ghi file ảnh, không tốn số thứ tự bug. Trường `otp` không bị lưu lại.

### 12.4. Response lỗi

| HTTP | `code` | Ý nghĩa | FE xử lý |
|---|---|---|---|
| 422 | `otp_required` | Chưa gửi `otp` | Mở hộp thoại OTP, giữ nguyên dữ liệu form |
| 422 | `otp_invalid` | Mã sai, hết hạn, hoặc không đủ 6 chữ số | Báo `error.otp_invalid`, xoá ô mã, giữ hộp thoại để nhập lại |
| 502 | `iam_unavailable` | IAM không kiểm được mã | Báo `error.iam_unavailable`, giữ dữ liệu form để thử lại |

```json
{ "success": false, "error": "otp_required", "code": "otp_required", "message": "Thao tác này cần mã OTP." }
```

### 12.5. Luồng trên giao diện

```
Bấm Lưu / Báo bug / Tạo dự án / Xoá
  → mở hộp thoại OTP (otp.title, otp.desc, 6 ô số, nút otp.confirm)
  → gửi request kèm "otp"
      200/201          → đóng hộp thoại, làm tiếp như hiện tại
      otp_invalid      → báo lỗi trong hộp thoại, xoá ô mã, cho nhập lại
      iam_unavailable  → đóng hộp thoại, toast lỗi, giữ nguyên form
      lỗi khác (422 validate, 404…) → đóng hộp thoại, xử lý như hiện tại
```

- Hỏi mã **ngay khi bấm**, không cần đợi server trả `otp_required`, để người dùng chỉ phải bấm một lần. Vẫn xử lý `otp_required` cho trường hợp backend vừa bật OTP mà FE chưa biết.
- Với **Xoá bug**: gộp ô OTP vào hộp thoại xác nhận xoá có sẵn.
- Ô nhập: `inputmode="numeric"`, `autocomplete="one-time-code"`, tự gửi khi đủ 6 số.
- Hàm `api()` ở mục 7 không cần sửa: `otp_required` và `otp_invalid` đã đi ra thành `BS(code)` như mọi lỗi nghiệp vụ khác.

### 12.6. ⚠️ Giới hạn bảo mật hiện tại

OTP hiện chỉ có tác dụng **xác nhận thao tác** (tránh lưu hay xoá nhầm), **chưa phải hàng rào chống người cố tình làm giả**:

- IAM `?c=OtpController&m=getUserOTP&user_uuid=…` trả mã OTP hiện tại của **bất kỳ ai** mà **không cần đăng nhập**. Đã thử với một UUID ngẫu nhiên: IAM vẫn trả mã.
- UUID của mọi người dùng lấy được công khai qua `?c=UserController&m=getAllUsers`, endpoint này cũng không cần đăng nhập.
- Theo README của OTP Portal, khoá sinh mã chính là UUID của người dùng, không có bí mật riêng.

Muốn OTP thực sự bảo vệ được, phải sửa phía IAM: bắt đăng nhập (và chỉ trả mã của chính mình) ở `getUserOTP` và `getAllUsers`, và sinh khoá OTP ngẫu nhiên riêng cho từng người thay vì dùng UUID. Việc này cũng ảnh hưởng đến 2FA lúc đăng nhập của mọi hệ dùng IAM.
