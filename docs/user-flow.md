# User flow

## Entry point

`/` → chuyển đến `/all` (Danh sách bug, tất cả dự án). Ngôn ngữ và người dùng hiện tại khôi phục từ lần trước.

## 1. Báo bug (người báo)

```mermaid
flowchart LR
  A[Danh sách / Kanban] -->|Báo bug| B[Form báo bug]
  B --> C{Validation}
  C -->|Lỗi| B
  C -->|OK| D[Lưu, sinh mã FF-008]
  D -->|Lưu thất bại| E[Toast lỗi, giữ form] --> B
  D -->|Thành công| F[Toast + Chi tiết bug]
```

- Alternative: Hủy → quay lại trang trước.
- Dự án mặc định = dự án đang xem ở sidebar (nếu ở "Tất cả" thì bắt buộc chọn).

## 2. Nhận và sửa bug (người sửa)

```mermaid
flowchart LR
  A[Kanban] -->|Kéo thẻ Mới → Đang sửa| B[Gán người sửa = tôi nếu trống]
  B --> C[Ghi lịch sử, toast]
  A -->|Bấm thẻ| D[Chi tiết bug]
  D -->|Nhận sửa| B
  D -->|Đánh dấu đã sửa| E[Đã sửa, lịch sử]
```

## 3. Kiểm tra lại và đóng (người báo)

```mermaid
flowchart LR
  A[Chi tiết bug - Đã sửa] --> B{Còn lỗi?}
  B -->|Hết lỗi| C[Đóng bug] --> D[Ô release cập nhật]
  B -->|Còn lỗi| E[Chuyển về Đang sửa] --> F[Lịch sử: Mở lại]
```

## 4. Kiểm tra release

```mermaid
flowchart TD
  A[Sidebar: chọn dự án] --> B[Ô trạng thái release]
  B -->|Sẵn sàng| C[Không còn bug chặn]
  B -->|Chưa được release| D[Danh sách mã bug chặn] -->|bấm mã| E[Chi tiết bug]
```

## 5. Tạo dự án

Sidebar "+ Dự án mới" → Dialog → nhập key/tên/tính năng cốt lõi → Lưu → điều hướng `/KEY`. Lỗi trùng key hiện tại trường.

## 6. Xóa bug

Chi tiết → Xóa → AlertDialog xác nhận → xóa → toast → về danh sách dự án. Số thứ tự không được tái sử dụng.

## Navigation map

```mermaid
flowchart TD
  Root["/"] --> All["/all (List)"]
  All <--> Board["/:scope/board"]
  All --> P["/:key (List theo dự án)"]
  P <--> PB["/:key/board"]
  All & P & Board & PB --> New["/bugs/new?project=KEY"]
  All & P & Board & PB --> Detail["/bugs/:code"]
  Detail --> Edit["/bugs/:code/edit"]
  New --> Detail
  Edit --> Detail
  Any["URL lạ"] --> NF[404]
```

## Error flows chung

| Tình huống | Xử lý |
|---|---|
| Mã bug / key dự án không tồn tại | Trang "Không tìm thấy" + link về danh sách |
| Lưu thất bại (localStorage đầy, lỗi) | Toast lỗi, dữ liệu giữ nguyên |
| Tải dữ liệu lỗi | Khối lỗi + nút "Thử lại" |
