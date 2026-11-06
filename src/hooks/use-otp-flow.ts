import { useState } from 'react'
import { ApiError } from '@/services/api'
import { errorMessage } from '@/services/queries'

/**
 * Nhập mã OTP 6 số và gọi `run(otp)`.
 * Sai/thiếu OTP → báo lỗi tại ô, xoá mã để nhập lại; lỗi khác → `onDone` (lỗi đã được xử lý/toast ở nơi gọi).
 */
export function useOtpFlow(run: (otp: string) => Promise<unknown>, onDone: () => void, ready = true) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (code = otp) => {
    if (code.length !== 6 || busy || !ready) return
    setBusy(true)
    setError('')
    try {
      await run(code)
      onDone()
    } catch (e) {
      if (e instanceof ApiError && (e.code.startsWith('otp_') || e.code === 'confirm_mismatch')) {
        setError(errorMessage(e))
        setOtp('')
      } else onDone()
    } finally {
      setBusy(false)
    }
  }
  const change = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6)
    setOtp(digits)
    setError('')
    if (digits.length === 6 && ready) void submit(digits) // đủ 6 số (và đã gõ mã xác nhận nếu cần) thì tự gửi
  }
  return { otp, error, busy, change, submit }
}
