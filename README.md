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
| `npm run build` | Typecheck + build production vào `dist/` |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Test quy tắc nghiệp vụ (bắt buộc sửa, mã bug, release) |
| `npm run e2e` | E2E Playwright trên bản build (cần `npm run build` trước; dùng Chrome đã cài, hoặc `PW_CHANNEL=chromium` sau `npx playwright install chromium`). Ảnh chụp lưu ở `e2e-results/` |
| `npm run audit` | Audit UI/UX trên bản build: 8 viewport × 8 route — tràn ngang, vùng chạm (WCAG 2.5.8), heading, axe-core WCAG 2.2 AA, lỗi console. Kết quả + ảnh ở `audit-results/` |
| `npm run format` | Prettier |

## Deploy

Base URL: **`/web_develop/dts/`** (`base` trong `vite.config.ts`). Chép nội dung `dist/` vào thư mục `web_develop/dts/` trên host tĩnh; route dùng hash (`/web_develop/dts/#/FF/board`) nên không cần cấu hình rewrite.

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
