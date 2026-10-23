import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Container } from '@/components/ui/container'
import { ResetPasswordForm } from '@/components/admin/reset-password-form'

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Container width="prose" className="py-16">
      <h1 className="text-h1 mb-6 font-bold">Set a new password</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </Container>
  )
}
