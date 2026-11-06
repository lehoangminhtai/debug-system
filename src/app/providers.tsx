import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ApiError } from '@/services/api'
import { errorMessage } from '@/services/queries'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  // Một chỗ duy nhất báo lỗi lưu dữ liệu; mutation có meta.silent tự hiển thị lỗi tại form
  mutationCache: new MutationCache({
    onError: (error, _v, _c, mutation) => {
      // lỗi OTP hiển thị ngay trong hộp thoại OTP nên không toast
      const otpError = error instanceof ApiError && error.code.startsWith('otp_')
      if (!mutation.meta?.silent && !otpError) toast.error(errorMessage(error))
    },
  }),
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        {children}
        {/* mobile: đẩy toast lên trên thanh hành động cố định của form */}
        <Toaster visibleToasts={3} mobileOffset={{ bottom: 76 }} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
