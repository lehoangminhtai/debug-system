// Kiểm thử E2E trên bản build: npm run build && npm run e2e
// Dùng Chrome cài trên máy (PW_CHANNEL=chromium nếu đã `npx playwright install chromium`).
import { mkdirSync } from 'node:fs'
import { startPreview } from './preview-server.mjs'

const SHOTS = 'e2e-results'
mkdirSync(SHOTS, { recursive: true })

const { base, browser, stop } = await startPreview(4317)
const BASE = `${base}/#` // hash router: http://localhost:4317/#/FF
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } })
const page = await context.newPage()
// Đổi hash = điều hướng trong cùng tài liệu (không tải lại). Mỗi bước cần trang mới như người dùng mở link → tải lại thật.
const go = async (url) => {
  await page.goto('about:blank')
  await page.goto(url)
}
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(e.message))

let failures = 0
async function step(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${e.message.split('\n').slice(0, 3).join('\n      ')}`)
    await page.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/\W+/g, '_')}.png` }).catch(() => {})
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const text = (t) => page.getByText(t, { exact: false }).first()
const visible = async (t) => text(t).waitFor({ state: 'visible', timeout: 5000 })
const rows = () => page.locator('tbody tr')
const selectOption = async (triggerLabel, option) => {
  await page.getByRole('combobox', { name: triggerLabel }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

console.log('E2E — DebugS')

await step('Trang chủ chuyển tới /all và tổng hợp release', async () => {
  await go(BASE)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForURL(`${BASE}/all`)
  await visible('2/3 dự án chưa được release')
  await page.screenshot({ path: `${SHOTS}/01-all-projects.png`, fullPage: true })
})

await step('Sidebar đếm bug bắt buộc sửa theo dự án', async () => {
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' }).first()
  await nav.getByRole('link', { name: /FoodFast.*3 bug bắt buộc sửa chưa đóng/ }).waitFor()
  await nav.getByRole('link', { name: /ShopMini.*1 bug bắt buộc sửa chưa đóng/ }).waitFor()
})

await step('FoodFast: chưa được release, 3 bug chặn (spec §8)', async () => {
  await page
    .getByRole('link', { name: /FoodFast/ })
    .first()
    .click()
  await page.waitForURL(`${BASE}/FF`)
  await visible('Chưa được release')
  await visible('Còn 3 bug bắt buộc sửa chưa đóng')
  for (const code of ['FF-001', 'FF-002', 'FF-003']) await page.getByRole('link', { name: code, exact: true }).waitFor()
  expect((await rows().count()) === 7, `expected 7 rows, got ${await rows().count()}`)
  await page.screenshot({ path: `${SHOTS}/02-project-list.png`, fullPage: true })
})

await step('Tìm theo tiêu đề và mã, xóa bộ lọc', async () => {
  await page.getByRole('searchbox').fill('OTP')
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
  expect(page.url().includes('q=OTP'), 'filter not in URL')
  await page.getByRole('searchbox').fill('ff-007')
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
  await page.getByRole('searchbox').fill('')
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 7)
})

await step('Lọc nền tảng / cốt lõi / trạng thái', async () => {
  // filter ngay tại header cột
  const columnFilter = async (col, option) => {
    await page.getByRole('button', { name: new RegExp(`^Lọc theo ${col}`) }).click()
    await page.getByRole('menuitemradio', { name: option, exact: true }).click()
  }
  await columnFilter('Nền tảng', 'Backend')
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 2)
  const names = await page.locator('thead button[aria-label^="Lọc theo"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(names.includes('Lọc theo Nền tảng: Backend'), `header filter labels: ${names.join(' | ')}`)
  await columnFilter('Mức độ', 'Cao')
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
  await page.getByRole('button', { name: 'Bỏ lọc Mức độ' }).click() // chip
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 2)
  await columnFilter('Cốt lõi', 'Không cốt lõi')
  await visible('Không có bug khớp bộ lọc')
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click()
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 7)
  await go(`${BASE}/FF?status=closed`)
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
  await page.locator('table').getByText('Sai tổng tiền khi áp 2 voucher').waitFor()
})

await step('Sắp xếp theo mức độ (aria-sort)', async () => {
  await go(`${BASE}/FF`)
  await page.getByRole('button', { name: 'Mức độ', exact: true }).click()
  const sort = await page.getByRole('columnheader', { name: 'Mức độ' }).getAttribute('aria-sort')
  expect(sort === 'ascending', `aria-sort=${sort}`)
  const first = await rows().first().innerText()
  expect(first.includes('Nghiêm trọng'), 'first row should be critical')
})

await step('Chi tiết: nút Quay lại về đúng danh sách (lịch sử / mặc định)', async () => {
  await go(`${BASE}/FF?platform=mobile`)
  await page.locator('table').getByRole('link', { name: 'Bộ lọc giá không chạy' }).click()
  await page.waitForURL(`${BASE}/bugs/FF-005`)
  await page.getByRole('button', { name: 'Quay lại' }).click()
  await page.waitForURL(`${BASE}/FF?platform=mobile`)
  await go(`${BASE}/bugs/SM-001`) // mở thẳng link → về danh sách dự án
  await page.getByRole('button', { name: 'Quay lại' }).click()
  await page.waitForURL(`${BASE}/SM`)
})

await step('Sidebar thu gọn / mở rộng, lưu sau khi tải lại', async () => {
  await go(`${BASE}/FF`)
  await page.getByRole('button', { name: 'Thu gọn thanh bên' }).click()
  await page.waitForTimeout(350)
  const w = await page.locator('#app-sidebar').evaluate((el) => el.getBoundingClientRect().width)
  expect(w === 64, `collapsed width ${w}`)
  const ff = page.getByRole('navigation', { name: 'Điều hướng chính' }).first().getByRole('link', { name: /FoodFast/ })
  expect((await ff.getAttribute('class')).includes('bg-primary-light'), 'active project lost when collapsed')
  await ff.hover()
  await page.getByRole('tooltip').filter({ hasText: 'FoodFast' }).first().waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Mở rộng thanh bên' }).click()
  await page.waitForTimeout(350)
  expect((await page.locator('#app-sidebar').evaluate((el) => el.getBoundingClientRect().width)) === 248, 'not expanded')
})

await step('HR Portal sẵn sàng release', async () => {
  await go(`${BASE}/HR`)
  await visible('Sẵn sàng release')
  await visible('Không còn bug bắt buộc sửa nào chưa đóng.')
})

await step('Kanban: kéo thả FF-003 sang Đang sửa → tự nhận bug', async () => {
  await go(`${BASE}/FF/board`)
  const card = page.locator('article[aria-label^="FF-003"]')
  await card.dragTo(page.locator('section[aria-labelledby="col-fixing"]'))
  await visible('FF-003 chuyển sang Đang sửa')
  await page.locator('section[aria-labelledby="col-fixing"] article[aria-label^="FF-003"]').waitFor()
  await page.screenshot({ path: `${SHOTS}/03-board.png`, fullPage: true })
})

await step('Kanban: đổi trạng thái bằng menu (bàn phím/touch)', async () => {
  await page.getByRole('button', { name: 'Đổi trạng thái FF-005' }).click()
  await page.getByRole('menuitemradio', { name: 'Đã sửa' }).click()
  await page.locator('section[aria-labelledby="col-fixed"] article[aria-label^="FF-005"]').waitFor()
})

await step('Chi tiết FF-003: lịch sử ghi "Lan đã nhận sửa", người sửa = Lan', async () => {
  await go(`${BASE}/bugs/FF-003`)
  await visible('đã nhận sửa')
  expect((await page.getByRole('combobox', { name: 'Người sửa' }).innerText()).includes('Lan'), 'assignee != Lan')
  await page
    .getByRole('list')
    .filter({ has: page.locator('[aria-current="step"]') })
    .waitFor()
})

await step('Chi tiết FF-002: Đóng bug → release còn 2 bug chặn', async () => {
  await go(`${BASE}/bugs/FF-002`)
  await page.getByRole('heading', { name: 'Trừ tiền 2 lần khi mạng chậm' }).waitFor()
  await page.screenshot({ path: `${SHOTS}/04-detail.png`, fullPage: true })
  await page.getByRole('button', { name: 'Đóng bug' }).click()
  await visible('FF-002 chuyển sang Đóng')
  await go(`${BASE}/FF`)
  await visible('Còn 2 bug bắt buộc sửa chưa đóng')
})

await step('Giao người sửa ghi lịch sử', async () => {
  await go(`${BASE}/bugs/FF-007`)
  await selectOption('Người sửa', 'Trang')
  await visible('FF-007: đã giao cho Trang')
  await visible('đã giao cho Trang')
})

await step('Form báo bug: validation bắt buộc', async () => {
  await go(`${BASE}/bugs/new?project=FF`)
  await visible('FF-008')
  await page.getByRole('button', { name: 'Báo bug', exact: true }).click()
  await page.locator('#bug-title[aria-invalid="true"]').waitFor()
  const focused = await page.evaluate(() => document.activeElement?.id)
  expect(focused === 'bug-title', `focus on ${focused}`)
  expect((await page.locator('text=Trường này là bắt buộc.').count()) >= 5, 'missing required errors')
  await visible('Nhập ít nhất một bước.')
  await page.screenshot({ path: `${SHOTS}/05-form-errors.png`, fullPage: true })
})

await step('Form báo bug: tạo FF-008 kèm ảnh', async () => {
  await page.locator('#bug-title').fill('Không hiện phí giao hàng ở bước xác nhận')
  // input radio là sr-only → bấm vào thẻ label như người dùng
  const pick = (re) => page.locator('label').filter({ hasText: re }).click()
  await pick(/^Mobile$/)
  await pick(/^Không/)
  await pick(/^Thấp/)
  await visible('Để bản sau')
  await pick(/^Có/)
  await visible('Bắt buộc sửa trước release')
  await page.getByLabel('Bước 1', { exact: true }).fill('Mở giỏ hàng')
  await page.getByLabel('Bước 1', { exact: true }).press('Enter')
  await page.getByLabel('Bước 2', { exact: true }).fill('Bấm Đặt món')
  await page.getByText('Nhập ít nhất một bước.').waitFor({ state: 'detached' })
  await page.locator('#bug-expected').fill('Hiện phí giao hàng 15.000đ')
  await page.locator('#bug-actual').fill('Không hiện dòng phí giao hàng')
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 320, height: 200 } })
  await page.locator('#bug-images').setInputFiles({ name: 'shot.png', mimeType: 'image/png', buffer: png })
  await page.getByLabel('Chú thích ảnh 1').fill('Màn hình xác nhận')
  await page.getByRole('button', { name: 'Báo bug', exact: true }).click()
  await page.waitForURL(`${BASE}/bugs/FF-008`)
  await visible('Đã báo bug FF-008')
  await visible('Màn hình xác nhận')
  await visible('Bắt buộc sửa trước release')
})

await step('Xóa FF-008 → bug mới vẫn là FF-009 (không tái sử dụng mã)', async () => {
  await page.getByRole('button', { name: 'Xóa', exact: true }).click()
  // thao tác phá hủy phải là màu destructive (#dc2626), không phải primary
  const bg = await page.getByRole('button', { name: 'Xóa bug' }).evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg === 'rgb(220, 38, 38)', `delete confirm button color = ${bg}`)
  await page.getByRole('button', { name: 'Xóa bug' }).click()
  await page.waitForURL(`${BASE}/FF`)
  await visible('Đã xóa FF-008')
  await go(`${BASE}/bugs/new?project=FF`)
  await visible('FF-009')
})

await step('Sửa bug: đổi tiêu đề, ghi lịch sử', async () => {
  await go(`${BASE}/bugs/FF-006/edit`)
  await page.locator('#bug-title').fill('Ảnh món ăn tải chậm trên trang chủ')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await page.waitForURL(`${BASE}/bugs/FF-006`)
  await page.getByRole('heading', { name: 'Ảnh món ăn tải chậm trên trang chủ' }).waitFor()
  await visible('đã cập nhật thông tin')
})

await step('Form có thay đổi chưa lưu: hỏi trước khi rời, Ở lại / Rời trang', async () => {
  await go(`${BASE}/bugs/FF-005/edit`)
  await page.locator('#bug-title').fill('Bộ lọc giá không chạy trên Android')
  await page.getByRole('button', { name: 'Hủy' }).click()
  await page.getByRole('alertdialog', { name: 'Rời trang khi chưa lưu?' }).waitFor()
  await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click()
  expect(page.url().endsWith('/bugs/FF-005/edit'), 'should stay on form')
  expect((await page.locator('#bug-title').inputValue()) === 'Bộ lọc giá không chạy trên Android', 'input lost')
  await page
    .getByRole('link', { name: /HR Portal/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Rời trang' }).click()
  await page.waitForURL(`${BASE}/HR`)
})

await step('Form chưa sửa gì: Hủy rời trang ngay, không hỏi', async () => {
  await go(`${BASE}/bugs/FF-005`)
  await page.getByRole('link', { name: 'Sửa', exact: true }).click()
  await page.waitForURL(`${BASE}/bugs/FF-005/edit`)
  await page.getByRole('button', { name: 'Hủy' }).click()
  await page.waitForURL(`${BASE}/bugs/FF-005`)
})

await step('Chi tiết: đổi trạng thái qua Select cập nhật ngay, sidebar đánh dấu dự án', async () => {
  await go(`${BASE}/bugs/HR-002`)
  await selectOption('Trạng thái', 'Đã sửa')
  expect(
    (await page.getByRole('combobox', { name: 'Trạng thái' }).innerText()).includes('Đã sửa'),
    'select not updated',
  )
  await visible('HR-002 chuyển sang Đã sửa')
  const hr = page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .first()
    .getByRole('link', { name: /HR Portal/ })
  expect((await hr.getAttribute('class')).includes('bg-primary-light'), 'project not highlighted on detail page')
})

await step('Chuyển trang: cuộn về đầu và focus vào nội dung chính', async () => {
  await page.setViewportSize({ width: 1280, height: 500 })
  await go(`${BASE}/all`)
  await page.mouse.wheel(0, 2000)
  await page.waitForTimeout(200)
  await page.locator('table').getByRole('link').last().click()
  await page.waitForURL(/\/bugs\//)
  await page.waitForTimeout(200)
  expect((await page.evaluate(() => window.scrollY)) === 0, 'scroll not reset')
  expect((await page.evaluate(() => document.activeElement?.id)) === 'main', 'focus not moved to main')
  await page.setViewportSize({ width: 1280, height: 860 })
})

await step('URL thân thiện: /ff → /FF, /bugs → /all', async () => {
  await go(`${BASE}/ff/board`)
  await page.waitForURL(`${BASE}/FF/board`)
  await go(`${BASE}/bugs`)
  await page.waitForURL(`${BASE}/all`)
})

await step('Tạo dự án: trùng mã bị chặn, tạo QA thành công', async () => {
  await page.getByRole('button', { name: 'Dự án mới' }).click()
  await page.locator('#project-key').fill('ff')
  expect((await page.locator('#project-key').inputValue()) === 'FF', 'key not uppercased')
  await page.locator('#project-name').fill('QA Tool')
  await page.locator('#project-description').fill('Đăng nhập, chạy test')
  await page.getByRole('button', { name: 'Tạo dự án' }).click()
  await visible('Mã dự án đã tồn tại.')
  await page.locator('#project-key').fill('QA')
  await page.getByRole('button', { name: 'Tạo dự án' }).click()
  await page.waitForURL(`${BASE}/QA`)
  await visible('Sẵn sàng release')
  await visible('Chưa có bug nào')
})

await step('Ngôn ngữ: English, nhớ sau khi tải lại, html lang', async () => {
  await go(`${BASE}/FF`)
  await selectOption('Ngôn ngữ', 'English')
  await visible('Not ready to release')
  await page.reload()
  await visible('Not ready to release')
  expect((await page.evaluate(() => document.documentElement.lang)) === 'en', 'html lang')
  await page.screenshot({ path: `${SHOTS}/06-english.png`, fullPage: true })
  await selectOption('Language', '繁體中文')
  await visible('尚不可發布')
  await selectOption('語言', '简体中文')
  await visible('暂不可发布')
  await go(`${BASE}/bugs/FF-003`)
  await visible('接手修复')
  await selectOption('语言', 'Tiếng Việt')
  await visible('Tiến trình')
})

await step('Không tìm thấy bug / dự án / trang', async () => {
  await go(`${BASE}/bugs/XX-999`)
  await visible('Không tìm thấy bug XX-999')
  await go(`${BASE}/ZZ`)
  await visible('Không tìm thấy dự án ZZ')
  await go(`${BASE}/a/b/c`)
  await visible('Không tìm thấy trang')
})

await step('Bàn phím: link bỏ qua đến nội dung', async () => {
  await go(`${BASE}/FF`)
  await page.keyboard.press('Tab')
  const label = await page.evaluate(() => document.activeElement?.textContent)
  expect(label === 'Bỏ qua đến nội dung', `first tab = ${label}`)
  await page.keyboard.press('Enter')
  expect(page.url() === `${BASE}/FF`, `skip link changed URL to ${page.url()}`)
  expect((await page.evaluate(() => document.activeElement?.id)) === 'main', 'skip link did not focus main')
})

await step('Mobile 375px: không tràn ngang, menu sidebar hoạt động', async () => {
  await page.setViewportSize({ width: 375, height: 812 })
  for (const path of ['/FF', '/FF/board', '/bugs/FF-001', '/bugs/new?project=FF']) {
    await go(BASE + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow <= 0, `${path} overflows by ${overflow}px`)
  }
  await go(`${BASE}/FF`)
  await page.waitForTimeout(400)
  await page.getByRole('list', { name: 'Danh sách bug' }).getByRole('link').first().waitFor()
  await page.screenshot({ path: `${SHOTS}/07-mobile-list.png`, fullPage: true })
  await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
  await page.screenshot({ path: `${SHOTS}/08-mobile-menu.png` })
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /ShopMini/ })
    .click()
  await page.waitForURL(`${BASE}/SM`)
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await go(`${BASE}/bugs/FF-001`)
  await page.getByRole('heading', { name: 'Crash khi bấm Thanh toán bằng ví' }).waitFor()
  await page.screenshot({ path: `${SHOTS}/09-mobile-detail.png`, fullPage: true })
})

await step('Không có lỗi console', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join('\n'))
})

await stop()
console.log(failures ? `\n${failures} step(s) failed` : '\nAll E2E steps passed')
process.exit(failures ? 1 : 0)
