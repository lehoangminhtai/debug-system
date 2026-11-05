// Audit UI/UX trên bản build: npm run build && npm run audit
// 8 viewport × mọi route: tràn ngang, vùng chạm < 24px (WCAG 2.5.8), heading, axe-core WCAG 2.2 AA, lỗi console.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { startPreview } from './preview-server.mjs'

const OUT = 'audit-results'
mkdirSync(OUT, { recursive: true })
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
]
const ROUTES = [
  ['all', '/all'],
  ['project', '/FF'],
  ['board', '/FF/board'],
  ['ready', '/HR'],
  ['detail', '/bugs/FF-002'],
  ['new', '/bugs/new?project=FF'],
  ['edit', '/bugs/FF-001/edit'],
  ['notfound', '/ZZ'],
]
const AXE_VIEWPORTS = new Set(['375', '1280'])

const { base, browser, stop } = await startPreview(4318)
const report = { overflow: [], smallTargets: [], headings: [], axe: [], console: [] }

// Hash URL: page.goto sang hash khác không tải lại trang → đi qua about:blank để mỗi lần đo là một lần tải mới
async function go(page, url) {
  await page.goto('about:blank')
  await page.goto(url)
}

async function settle(page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600) // độ trễ mock API 250ms + animation
}

async function runAxe(page, where) {
  await page.addScriptTag({ content: AXE })
  const result = await page.evaluate(() =>
    window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }),
  )
  for (const v of result.violations)
    report.axe.push({
      where,
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' — ' + n.failureSummary?.split('\n')[1]?.trim()),
    })
}

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && report.console.push(`${vp.name}: ${m.text()}`))
  page.on('pageerror', (e) => report.console.push(`${vp.name}: ${e.message}`))
  await go(page, base)
  await page.evaluate(() => localStorage.clear())

  for (const [name, path] of ROUTES) {
    await go(page, `${base}/#${path}`)
    await settle(page)
    const where = `${name}@${vp.name}`

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) report.overflow.push({ where, overflow })

    // WCAG 2.5.8: target < 24px chỉ vi phạm khi vòng tròn Ø24px quanh tâm chạm vào target khác (ngoại lệ khoảng cách)
    const small = await page.evaluate(() => {
      const sel =
        'a[href], button, input:not([type=hidden]), select, textarea, [role=combobox], [role=button], [tabindex="0"]'
      const items = [...document.querySelectorAll(sel)]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(
          ({ el, r }) =>
            r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden' && !el.matches('.sr-only'),
        )
      const touches = (a, b) => {
        const cx = a.left + a.width / 2
        const cy = a.top + a.height / 2
        const dx = Math.max(b.left - cx, 0, cx - b.right)
        const dy = Math.max(b.top - cy, 0, cy - b.bottom)
        return dx * dx + dy * dy < 12 * 12
      }
      return items
        .filter(({ r }) => r.width < 24 || r.height < 24)
        .filter((a) => items.some((b) => b !== a && !a.el.contains(b.el) && !b.el.contains(a.el) && touches(a.r, b.r)))
        .map(({ el, r }) => {
          const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)
          return `${el.tagName.toLowerCase()} "${label}" ${Math.round(r.width)}×${Math.round(r.height)}`
        })
    })
    if (small.length) report.smallTargets.push({ where, small: [...new Set(small)] })

    if (vp.name === '1280') {
      const hs = await page.evaluate(() =>
        [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
          .filter((h) => h.getClientRects().length)
          .map((h) => `${h.tagName}:${h.textContent.trim().slice(0, 30)}`),
      )
      const levels = hs.map((h) => Number(h[1]))
      const problems = []
      if (levels.filter((l) => l === 1).length !== 1)
        problems.push(`h1 count = ${levels.filter((l) => l === 1).length}`)
      levels.forEach((l, i) => i && l > levels[i - 1] + 1 && problems.push(`skip ${hs[i - 1]} → ${hs[i]}`))
      report.headings.push({ where, outline: hs, problems })
    }

    if (AXE_VIEWPORTS.has(vp.name)) await runAxe(page, where)
    await page.screenshot({ path: `${OUT}/${name}-${vp.name}.png`, fullPage: true })
  }

  // Trạng thái tương tác (chỉ ở 1280 và 375)
  if (AXE_VIEWPORTS.has(vp.name)) {
    const states = [
      ['form-errors', '/bugs/new?project=FF', () => page.getByRole('button', { name: 'Báo bug', exact: true }).click()],
      [
        'project-dialog',
        '/FF',
        async () => {
          if (vp.width < 1024) await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
          await page.getByRole('button', { name: 'Dự án mới' }).click()
        },
      ],
      ['delete-dialog', '/bugs/FF-001', () => page.getByRole('button', { name: 'Xóa', exact: true }).click()],
      ['image-dialog', '/bugs/FF-001', () => page.getByRole('button', { name: /Xem ảnh lớn/ }).click()],
      ['select-open', '/FF', () => page.getByRole('combobox', { name: 'Nền tảng' }).click()],
    ]
    for (const [name, path, act] of states) {
      await go(page, `${base}/#${path}`)
      await settle(page)
      await act()
      await page.waitForTimeout(400)
      await runAxe(page, `${name}@${vp.name}`)
      await page.screenshot({ path: `${OUT}/state-${name}-${vp.name}.png` })
    }
  }
  await context.close()
}

await stop()
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))

// Tóm tắt
const axeById = {}
for (const v of report.axe) (axeById[`${v.impact} ${v.id}: ${v.help}`] ??= []).push(v.where)
console.log(`Overflow: ${report.overflow.length}`)
report.overflow.forEach((o) => console.log(`  ${o.where} +${o.overflow}px`))
console.log(`Small targets (<24px): ${report.smallTargets.length} page-views`)
const smallAll = {}
report.smallTargets.forEach((s) => s.small.forEach((x) => (smallAll[x] ??= []).push(s.where)))
Object.entries(smallAll).forEach(([k, v]) => console.log(`  ${k}  [${v.length}× e.g. ${v[0]}]`))
console.log('Heading problems:')
report.headings.filter((h) => h.problems.length).forEach((h) => console.log(`  ${h.where}: ${h.problems.join('; ')}`))
console.log(`axe violations: ${Object.keys(axeById).length} rule(s)`)
Object.entries(axeById).forEach(([k, v]) => console.log(`  ${k}  [${v.join(', ')}]`))
console.log(`Console errors: ${report.console.length}`)
report.console.slice(0, 10).forEach((c) => console.log(`  ${c}`))
