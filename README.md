# DebugS — Debugging System

Ghi lại bug theo dự án (Backend / Frontend / Mobile) kèm bước tái tạo và ảnh minh chứng, tự đánh dấu bug **bắt buộc sửa trước release** và cho biết từng dự án đã được release chưa. Giao diện 4 ngôn ngữ: Tiếng Việt, English, 繁體中文, 简体中文.

> **Bản frontend dùng dữ liệu mẫu.** Dữ liệu lưu trong `localStorage` của trình duyệt, chưa kết nối máy chủ. Xóa dữ liệu trang để khôi phục dữ liệu mẫu.

## Chạy

```bash
npm install
npm run dev          # http://localhost:5173/dts/#/all  (backend XAMPP local)
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | **Local**: Vite dev server, gọi backend XAMPP `http://localhost/dts/backend/` (`.env.development`) |
| `npm run build:stg` | **Staging**: typecheck + build vào `dist-staging/` cho **192.168.110.2/web_develop/dts** (`.env.staging`) |
| `npm run build` / `build:prod` | **Production**: typecheck + build vào `dist/` cho **192.168.110.7/dts** (`.env.production`) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Test quy tắc nghiệp vụ (bắt buộc sửa, mã bug, release) |
| `npm run e2e` | E2E Playwright trên bản build staging (cần `npm run build:stg` trước; dùng Chrome đã cài, hoặc `PW_CHANNEL=chromium` sau `npx playwright install chromium`). Ảnh chụp lưu ở `e2e-results/` |
| `npm run audit` | Audit UI/UX trên bản build: 8 viewport × 8 route — tràn ngang, vùng chạm (WCAG 2.5.8), heading, axe-core WCAG 2.2 AA, lỗi console. Kết quả + ảnh ở `audit-results/` |
| `npm run format` | Prettier |

## Môi trường

3 môi trường, giống App VCM. Mỗi môi trường một file `.env.<mode>`; file `.env` trơn cố ý để trống (Vite nạp nó ở mọi mode).

| Môi trường | Lệnh | File cấu hình | Địa chỉ mở app | Chép build vào | API (`VITE_API_BASE_URL`) |
|---|---|---|---|---|---|
| **Local** | `npm run dev` | `.env.development` | `http://localhost:5173/dts/` | (không build) | `http://localhost/dts/backend/` (XAMPP) |
| **Staging** | `npm run build:stg` | `.env.staging` | `http(s)://192.168.110.2/web_develop/dts/` | `dist-staging/` → `Z:\web\dts` | `/web_develop/dts/backend/` |
| **Production** | `npm run build` | `.env.production` | `http(s)://192.168.110.7/dts/` | `dist/` → `dts/` trên 192.168.110.7 | `/dts/backend/` |

- **Http và https:** staging/production gọi API bằng đường dẫn **tương đối**, nên tự cùng giao thức với trang. URL tuyệt đối (local) bị ép theo `window.location.protocol` (`src/services/api.ts`). Không viết cứng `http://` ở đâu cả: xem `FRONTEND-AGENT-HTTPS.md`.
- **Link ảnh/video:** backend trả đường dẫn tương đối theo môi trường (`/dts/upload/…` ở production, `/web_develop/dts/upload/…` ở staging). FE ghép origin của backend (`FILE_ORIGIN`) để hiển thị, và cắt đi khi gửi lại lúc sửa bug.
- Chép **nội dung** của thư mục build (`index.html` + `assets/`); backend nằm sẵn ở thư mục con `backend/` bên cạnh, file upload ở `upload/`.
- Route dùng hash (`/dts/#/FF/board`) nên không cần cấu hình rewrite trên web server.
- **Dev với backend staging thay cho XAMPP:** bật 3 dòng comment trong `.env.development` (`VITE_PROXY_TARGET`). Phải đi qua proxy của Vite vì nginx trên NAS chặn preflight `OPTIONS` (405).
- `npm run e2e` / `npm run audit` chạy trên bản `npm run build:stg` (đường dẫn `/web_develop/dts/`).

## Quy tắc nghiệp vụ

- **Bắt buộc sửa** = ảnh hưởng tính năng cốt lõi, **hoặc** mức độ Nghiêm trọng.
- Dự án **chưa được release** khi còn ít nhất 1 bug bắt buộc sửa chưa Đóng.
- Mã bug = mã dự án + số thứ tự 3 chữ số (`FF-001`), đếm riêng từng dự án, không dùng lại khi xóa.
- Luồng: Mới → Đang sửa → Đã sửa → Đóng. Chuyển sang Đang sửa khi chưa có người sửa → người thao tác tự nhận bug. Mỗi lần đổi trạng thái / giao người sửa ghi 1 dòng lịch sử.

Cài đặt trong `src/lib/rules.ts`.

## Tài liệu

| File | Nội dung |
|---|---|
| `doc/` | Đặc tả gốc và design token |
| `docs/requirement-analysis.md` | Phân tích yêu cầu, ưu tiên, giả định |
| `docs/feature-breakdown.md` | Phân rã module |
| `docs/user-flow.md` | Luồng người dùng (Mermaid) |
| `docs/screen-inventory.md`, `docs/information-architecture.md` | Màn hình, điều hướng |
| `docs/design-system.md`, `docs/ui-ux-specification.md` | Token, quy chuẩn component, a11y |
| `docs/wireframe-specification.md` | Bố cục từng màn hình |
| `docs/architecture.md` | Kiến trúc, luồng dữ liệu, hướng dẫn tích hợp backend |
| `docs/implementation-report.md` | Kết quả, kiểm thử, giới hạn, việc tiếp theo |
| `docs/ui-ux-audit-report.md` | Audit UI/UX: vấn đề, mức ưu tiên, cải thiện đã làm |

## Mock data & tích hợp backend

`src/services/api.ts` là lớp mock duy nhất — thay thân hàm bằng `fetch` tới API thật, UI không cần sửa. Bảng endpoint gợi ý trong `docs/architecture.md`.
