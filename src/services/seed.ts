// Dữ liệu mẫu (spec §8). Nội dung bug là dữ liệu người dùng nhập nên giữ nguyên tiếng Việt.
import type { Bug, BugHistory, HistoryAction, Project, Status } from '../types/index.ts'
import { formatBugCode } from '../lib/rules.ts'

export const MEMBERS = ['Lan', 'Minh', 'Hùng', 'Trang', 'An', 'Quân'] as const

const svg = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640" font-family="Inter,Arial,sans-serif">${body}</svg>`,
  )}`

const phone = (content: string) =>
  `<rect width="360" height="640" fill="#f4f5f7"/><rect x="0" y="0" width="360" height="56" fill="#ffffff"/><text x="20" y="35" font-size="17" font-weight="600" fill="#1a1c1f">FoodFast</text><text x="300" y="35" font-size="13" fill="#545b66">9:41</text>${content}`

const IMG_CRASH = svg(
  phone(
    `<text x="20" y="96" font-size="15" font-weight="600" fill="#1a1c1f">Giỏ hàng (2)</text>
     <rect x="20" y="112" width="320" height="72" rx="10" fill="#fff"/><text x="36" y="144" font-size="14" fill="#1a1c1f">Cơm gà xối mỡ</text><text x="36" y="166" font-size="13" fill="#545b66">55.000đ</text>
     <rect x="20" y="194" width="320" height="72" rx="10" fill="#fff"/><text x="36" y="226" font-size="14" fill="#1a1c1f">Trà đào cam sả</text><text x="36" y="248" font-size="13" fill="#545b66">35.000đ</text>
     <rect width="360" height="640" fill="#000" opacity=".45"/>
     <rect x="40" y="250" width="280" height="150" rx="12" fill="#fff"/>
     <text x="60" y="290" font-size="16" font-weight="600" fill="#1a1c1f">FoodFast đã dừng</text>
     <text x="60" y="318" font-size="13" fill="#545b66">Ứng dụng gặp sự cố và phải đóng.</text>
     <text x="216" y="376" font-size="14" font-weight="600" fill="#175cd3">Đóng ứng dụng</text>`,
  ),
)

const IMG_DOUBLE_CHARGE = svg(
  phone(
    `<text x="20" y="96" font-size="15" font-weight="600" fill="#1a1c1f">Lịch sử giao dịch ví</text>
     <rect x="20" y="112" width="320" height="64" rx="10" fill="#fff" stroke="#b42318"/><text x="36" y="140" font-size="14" fill="#1a1c1f">Thanh toán #FF20931</text><text x="36" y="160" font-size="12" fill="#545b66">14:02:11</text><text x="246" y="148" font-size="14" font-weight="600" fill="#b42318">-90.000đ</text>
     <rect x="20" y="186" width="320" height="64" rx="10" fill="#fff" stroke="#b42318"/><text x="36" y="214" font-size="14" fill="#1a1c1f">Thanh toán #FF20931</text><text x="36" y="234" font-size="12" fill="#545b66">14:02:13</text><text x="246" y="222" font-size="14" font-weight="600" fill="#b42318">-90.000đ</text>
     <rect x="20" y="260" width="320" height="64" rx="10" fill="#fff"/><text x="36" y="288" font-size="14" fill="#1a1c1f">Nạp tiền</text><text x="36" y="308" font-size="12" fill="#545b66">Hôm qua</text><text x="236" y="296" font-size="14" font-weight="600" fill="#067647">+500.000đ</text>`,
  ),
)

const IMG_TYPO = svg(
  phone(
    `<text x="20" y="96" font-size="15" font-weight="600" fill="#1a1c1f">Xác nhận đơn hàng</text>
     <text x="20" y="130" font-size="13" fill="#545b66">Tổng cộng</text><text x="250" y="130" font-size="15" font-weight="600" fill="#1a1c1f">90.000đ</text>
     <rect x="20" y="560" width="320" height="52" rx="10" fill="#1e1f22"/>
     <text x="180" y="592" font-size="16" font-weight="600" fill="#fff" text-anchor="middle">Thah toán</text>
     <ellipse cx="180" cy="586" rx="70" ry="22" fill="none" stroke="#b42318" stroke-width="3"/>`,
  ),
)

const daysAgo = (d: number, h = 0) => new Date(Date.now() - (d * 24 + h) * 3600_000).toISOString()

type Step = [action: HistoryAction, who: string, status: Status, ago: number, target?: string]

export function createSeed() {
  const projects: Project[] = [
    {
      id: 1,
      key: 'FF',
      name: 'FoodFast',
      description: 'Ứng dụng đặt đồ ăn. Tính năng cốt lõi: đăng nhập, đặt món, thanh toán.',
      nextSeq: 8,
    },
    {
      id: 2,
      key: 'SM',
      name: 'ShopMini',
      description: 'Sàn bán lẻ nhỏ. Tính năng cốt lõi: tìm sản phẩm, giỏ hàng, đặt hàng, theo dõi đơn.',
      nextSeq: 5, // SM-004 đã bị xóa — bug mới vẫn là SM-005
    },
    {
      id: 3,
      key: 'HR',
      name: 'HR Portal',
      description: 'Cổng nhân sự nội bộ. Tính năng cốt lõi: chấm công, đơn nghỉ phép, phiếu lương.',
      nextSeq: 4,
    },
  ]

  let bugId = 0
  let historyId = 0
  let imageId = 0
  const bugs: Bug[] = []

  const add = (
    project: Project,
    seq: number,
    b: Omit<Bug, 'id' | 'projectId' | 'seq' | 'code' | 'createdAt' | 'history' | 'images' | 'status'> & {
      images?: [url: string, caption: string][]
    },
    steps: Step[],
  ) => {
    const history: BugHistory[] = steps.map(([action, who, status, ago, target]) => ({
      id: ++historyId,
      action,
      who,
      status,
      target,
      createdAt: daysAgo(ago, action === 'create' ? 0 : -2), // bước sau cùng ngày diễn ra sau 2 giờ
    }))
    bugs.push({
      ...b,
      id: ++bugId,
      projectId: project.id,
      seq,
      code: formatBugCode(project.key, seq),
      status: history[history.length - 1].status,
      createdAt: history[0].createdAt,
      images: (b.images ?? []).map(([url, caption]) => ({ id: ++imageId, url, caption })),
      history,
    })
  }

  const [ff, sm, hr] = projects

  add(
    ff,
    1,
    {
      title: 'Crash khi bấm Thanh toán bằng ví',
      platform: 'mobile',
      isCore: true,
      severity: 'critical',
      steps:
        'Đăng nhập tài khoản có số dư ví\nThêm 2 món vào giỏ hàng\nMở giỏ hàng\nChọn phương thức "Ví FoodFast"\nBấm Thanh toán',
      expected: 'Chuyển sang màn hình xác nhận đơn hàng.',
      actual: 'Ứng dụng bị đóng ngay lập tức, không có thông báo lỗi.',
      note: 'iPhone 13, iOS 17.4, app 2.3.0 (build 412). Không xảy ra khi thanh toán bằng thẻ.',
      reporter: 'Lan',
      assignee: 'Minh',
      images: [[IMG_CRASH, 'Hộp thoại sự cố sau khi bấm Thanh toán']],
    },
    [
      ['create', 'Lan', 'new', 6],
      ['claim', 'Minh', 'fixing', 5],
    ],
  )
  add(
    ff,
    2,
    {
      title: 'Trừ tiền 2 lần khi mạng chậm',
      platform: 'backend',
      isCore: true,
      severity: 'critical',
      steps:
        'Bật giới hạn mạng 3G chậm\nĐặt món, chọn thanh toán bằng ví\nBấm Thanh toán, chờ quá 10 giây\nKiểm tra lịch sử giao dịch ví',
      expected: 'Chỉ trừ tiền một lần cho mỗi đơn hàng.',
      actual: 'Ví bị trừ 2 lần cùng mã đơn, cách nhau 2 giây.',
      note: 'API /payments/charge thiếu idempotency key; client tự gửi lại sau timeout 10s.',
      reporter: 'Lan',
      assignee: 'Hùng',
      images: [[IMG_DOUBLE_CHARGE, 'Hai giao dịch trùng mã đơn #FF20931']],
    },
    [
      ['create', 'Lan', 'new', 9],
      ['claim', 'Hùng', 'fixing', 8],
      ['status', 'Hùng', 'fixed', 1, 'fixing'],
    ],
  )
  add(
    ff,
    3,
    {
      title: 'Không gửi lại được OTP',
      platform: 'frontend',
      isCore: true,
      severity: 'high',
      steps: 'Mở trang đăng nhập\nNhập số điện thoại, bấm Gửi OTP\nChờ hết 60 giây\nBấm "Gửi lại mã"',
      expected: 'Nhận được mã OTP mới, bộ đếm chạy lại 60 giây.',
      actual: 'Nút "Gửi lại mã" không phản hồi, không có request nào được gửi.',
      note: 'Chrome 129, Windows 11.',
      reporter: 'Trang',
      assignee: null,
    },
    [['create', 'Trang', 'new', 2]],
  )
  add(
    ff,
    4,
    {
      title: 'Sai tổng tiền khi áp 2 voucher',
      platform: 'backend',
      isCore: true,
      severity: 'high',
      steps: 'Thêm món tổng 200.000đ\nÁp voucher GIAM20K\nÁp tiếp voucher FREESHIP',
      expected: 'Tổng tiền = 200.000đ - 20.000đ, miễn phí giao hàng.',
      actual: 'Voucher GIAM20K bị trừ 2 lần, tổng còn 160.000đ.',
      note: '',
      reporter: 'Lan',
      assignee: 'Hùng',
    },
    [
      ['create', 'Lan', 'new', 14],
      ['claim', 'Hùng', 'fixing', 13],
      ['status', 'Hùng', 'fixed', 11, 'fixing'],
      ['status', 'Lan', 'closed', 10, 'fixed'],
    ],
  )
  add(
    ff,
    5,
    {
      title: 'Bộ lọc giá không chạy',
      platform: 'mobile',
      isCore: false,
      severity: 'medium',
      steps: 'Mở danh sách quán\nChọn bộ lọc giá "Dưới 50.000đ"',
      expected: 'Chỉ hiện món có giá dưới 50.000đ.',
      actual: 'Danh sách không thay đổi. Vẫn tìm được món bằng cách sắp xếp theo giá.',
      note: 'Android 14, Samsung A54.',
      reporter: 'Trang',
      assignee: null,
    },
    [['create', 'Trang', 'new', 4]],
  )
  add(
    ff,
    6,
    {
      title: 'Ảnh món ăn tải chậm',
      platform: 'frontend',
      isCore: false,
      severity: 'low',
      steps: 'Mở trang chủ\nCuộn danh sách món phổ biến',
      expected: 'Ảnh hiển thị trong dưới 1 giây.',
      actual: 'Ảnh mất 3–5 giây mới hiện, ảnh gốc ~2MB chưa nén.',
      note: '',
      reporter: 'Lan',
      assignee: 'An',
    },
    [
      ['create', 'Lan', 'new', 5],
      ['assign', 'Quân', 'new', 4, 'An'],
      ['status', 'An', 'fixing', 3, 'new'],
    ],
  )
  add(
    ff,
    7,
    {
      title: 'Sai chính tả "Thah toán"',
      platform: 'mobile',
      isCore: false,
      severity: 'low',
      steps: 'Thêm món vào giỏ\nMở màn hình Xác nhận đơn hàng',
      expected: 'Nút hiển thị "Thanh toán".',
      actual: 'Nút hiển thị "Thah toán".',
      note: '',
      reporter: 'Lan',
      assignee: null,
      images: [[IMG_TYPO, 'Nút thanh toán bị sai chính tả']],
    },
    [['create', 'Lan', 'new', 1]],
  )

  add(
    sm,
    1,
    {
      title: 'Giỏ hàng mất sản phẩm sau khi đăng nhập lại',
      platform: 'backend',
      isCore: true,
      severity: 'high',
      steps: 'Thêm 3 sản phẩm vào giỏ khi chưa đăng nhập\nĐăng nhập\nMở giỏ hàng',
      expected: 'Giỏ hàng giữ nguyên 3 sản phẩm đã thêm.',
      actual: 'Giỏ hàng trống.',
      note: 'Có thể do merge cart khi tạo session mới.',
      reporter: 'Trang',
      assignee: 'Minh',
    },
    [
      ['create', 'Trang', 'new', 3],
      ['assign', 'Quân', 'new', 3, 'Minh'],
      ['status', 'Minh', 'fixing', 2, 'new'],
    ],
  )
  add(
    sm,
    2,
    {
      title: 'Nút "Mua ngay" bị che trên màn hình nhỏ',
      platform: 'mobile',
      isCore: false,
      severity: 'medium',
      steps: 'Mở chi tiết sản phẩm trên iPhone SE\nCuộn xuống cuối trang',
      expected: 'Nút "Mua ngay" hiển thị đầy đủ.',
      actual: 'Thanh điều hướng dưới che một nửa nút. Vẫn mua được qua "Thêm vào giỏ".',
      note: 'iPhone SE (2nd gen), iOS 16.',
      reporter: 'Lan',
      assignee: 'An',
    },
    [
      ['create', 'Lan', 'new', 7],
      ['claim', 'An', 'fixing', 6],
      ['status', 'An', 'fixed', 2, 'fixing'],
    ],
  )
  add(
    sm,
    3,
    {
      title: 'Sai màu trạng thái đơn "Đang giao"',
      platform: 'frontend',
      isCore: false,
      severity: 'low',
      steps: 'Mở Đơn hàng của tôi\nXem đơn ở trạng thái Đang giao',
      expected: 'Nhãn màu xanh dương như thiết kế.',
      actual: 'Nhãn màu đỏ, dễ hiểu nhầm là đơn bị hủy.',
      note: '',
      reporter: 'Trang',
      assignee: 'An',
    },
    [
      ['create', 'Trang', 'new', 12],
      ['claim', 'An', 'fixing', 11],
      ['status', 'An', 'fixed', 10, 'fixing'],
      ['status', 'Trang', 'closed', 9, 'fixed'],
    ],
  )

  add(
    hr,
    1,
    {
      title: 'Phiếu lương hiển thị sai tháng khi đổi múi giờ',
      platform: 'backend',
      isCore: true,
      severity: 'critical',
      steps: 'Đặt múi giờ máy sang UTC-5\nMở Phiếu lương tháng 10',
      expected: 'Hiển thị phiếu lương tháng 10.',
      actual: 'Hiển thị phiếu lương tháng 9.',
      note: '',
      reporter: 'Lan',
      assignee: 'Hùng',
    },
    [
      ['create', 'Lan', 'new', 20],
      ['claim', 'Hùng', 'fixing', 19],
      ['status', 'Hùng', 'fixed', 17, 'fixing'],
      ['status', 'Lan', 'closed', 16, 'fixed'],
    ],
  )
  add(
    hr,
    2,
    {
      title: 'Xuất Excel bảng chấm công thiếu cột Ghi chú',
      platform: 'frontend',
      isCore: false,
      severity: 'medium',
      steps: 'Mở Chấm công > Tháng này\nBấm Xuất Excel',
      expected: 'File có đủ cột như bảng trên web, gồm cột Ghi chú.',
      actual: 'File thiếu cột Ghi chú. Vẫn xem được ghi chú trên web.',
      note: '',
      reporter: 'Trang',
      assignee: null,
    },
    [['create', 'Trang', 'new', 6]],
  )
  add(
    hr,
    3,
    {
      title: 'Ảnh đại diện bị méo trên Android 12',
      platform: 'mobile',
      isCore: false,
      severity: 'low',
      steps: 'Đăng nhập trên Android 12\nMở trang Hồ sơ',
      expected: 'Ảnh đại diện tròn, đúng tỉ lệ.',
      actual: 'Ảnh bị kéo giãn theo chiều ngang.',
      note: 'Pixel 4a, Android 12.',
      reporter: 'Lan',
      assignee: 'Quân',
    },
    [
      ['create', 'Lan', 'new', 4],
      ['claim', 'Quân', 'fixing', 2],
    ],
  )

  return { projects, bugs, ids: { project: projects.length, bug: bugId, history: historyId, image: imageId } }
}
