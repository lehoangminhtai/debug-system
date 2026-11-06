# DebugS — Debugging System

Ghi lại bug theo dự án (Backend / Frontend / Mobile) kèm bước tái tạo và ảnh minh chứng, tự đánh dấu bug **bắt buộc sửa trước release** và cho biết từng dự án đã được release chưa. Giao diện 4 ngôn ngữ: Tiếng Việt, English, 繁體中文, 简体中文.

> **Bản frontend dùng dữ liệu mẫu.** Dữ liệu lưu trong `localStorage` của trình duyệt, chưa kết nối máy chủ. Xóa dữ liệu trang để khôi phục dữ liệu mẫu.

## Chạy

```bash
npm install
npm run dev          # http://localhost:5173/web_develop/dts/#/all
```

| Lệnh | Việc |
|---|---|
| `npm run build` | Typecheck + build vào `dist/` cho máy chủ **192.168.110.2/web_develop/dts** |
| `npm run build:deploy` | Typecheck + build vào `dist-deploy/` cho máy chủ **192.168.110.7/dts** |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Test quy tắc nghiệp vụ (bắt buộc sửa, mã bug, release) |
| `npm run e2e` | E2E Playwright trên bản build (cần `npm run build` trước; dùng Chrome đã cài, hoặc `PW_CHANNEL=chromium` sau `npx playwright install chromium`). Ảnh chụp lưu ở `e2e-results/` |
| `npm run audit` | Audit UI/UX trên bản build: 8 viewport × 8 route — tràn ngang, vùng chạm (WCAG 2.5.8), heading, axe-core WCAG 2.2 AA, lỗi console. Kết quả + ảnh ở `audit-results/` |
| `npm run format` | Prettier |

## Deploy

Có 2 máy chủ, mỗi máy một lệnh build, ra 2 thư mục riêng nên không ghi đè nhau.

| Máy chủ | Lệnh | Địa chỉ mở app | Chép thư mục build vào | Backend FE gọi tới | File cấu hình |
|---|---|---|---|---|---|
| 192.168.110.2 | `npm run build` | `http://192.168.110.2/web_develop/dts/` | `dist/` → thư mục `web_develop/dts/` | `http://192.168.110.2/web_develop/dts/backend/` | `.env` |
| 192.168.110.7 | `npm run build:deploy` | `http://192.168.110.7/dts/` | `dist-deploy/` → thư mục `dts/` | `http://192.168.110.7/dts/backend/` | `.env.deploy` |

- Chép **nội dung** của thư mục build (gồm `index.html` và thư mục `assets/`) vào thư mục tương ứng; backend nằm sẵn ở thư mục con `backend/` bên cạnh.
- Route dùng hash (`/dts/#/FF/board`) nên không cần cấu hình rewrite trên web server.
- Mỗi file `.env*` có 2 biến:

  | Biến | Ý nghĩa | `.env` | `.env.deploy` |
  |---|---|---|---|
  | `VITE_ORIGIN` | Host của máy chủ (backend, ảnh/video upload) | `http://192.168.110.2` | `http://192.168.110.7` |
  | `VITE_BASE` | Thư mục chứa app trên host (`base` của Vite). Backend = `VITE_ORIGIN` + `VITE_BASE` + `backend/` | `/web_develop/dts/` | `/dts/` |

- Thêm máy chủ khác: tạo `.env.<tên>` với 2 biến trên, thêm script `"build:<tên>": "tsc -b && vite build --mode <tên> --outDir dist-<tên>"` vào `package.json` (và `dist-<tên>` vào `.gitignore`).
- `npm run dev` luôn gọi backend ở `http://localhost/dts/backend/`; ảnh lấy từ `VITE_ORIGIN` trong `.env`.
- `npm run e2e` / `npm run audit` chạy trên bản `npm run build` (đường dẫn `/web_develop/dts/`), không chạy trên bản `build:deploy`.

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
