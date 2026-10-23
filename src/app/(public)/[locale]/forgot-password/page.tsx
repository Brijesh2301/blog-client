import type { Metadata } from 'next'

import { Container } from '@/components/ui/container'
import { ForgotPasswordForm } from '@/components/admin/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <Container width="prose" className="py-16">
      <h1 className="text-h1 mb-6 font-bold">Forgot password</h1>
      <ForgotPasswordForm />
    </Container>
  )
}
