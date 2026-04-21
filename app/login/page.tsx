'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Check if user exists in database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, organization_id, role, email, full_name')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        setError('User not found. Try a demo account below.')
        setIsLoading(false)
        return
      }

      // Use auth context login
      login({
        id: userData.id,
        email: userData.email,
        organization_id: userData.organization_id,
        role: userData.role,
        full_name: userData.full_name,
      })

      router.push('/dashboard')
    } catch (err) {
      console.error('[v0] Login error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const handleTestLogin = async (testEmail: string) => {
    setError(null)
    setIsLoading(true)

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, organization_id, role, email, full_name')
        .eq('email', testEmail)
        .single()

      if (userError || !userData) {
        setError('Test user not found')
        setIsLoading(false)
        return
      }

      // Use auth context login
      login({
        id: userData.id,
        email: userData.email,
        organization_id: userData.organization_id,
        role: userData.role,
        full_name: userData.full_name,
      })

      router.push('/dashboard')
    } catch (err) {
      console.error('[v0] Test login error:', err)
      setError('Failed to login')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">PSA RocketLine</CardTitle>
          <CardDescription>Professional Services Automation Platform</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !email}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Quick login:</p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between text-left"
              onClick={() => handleTestLogin('admin@acme.com')}
              disabled={isLoading}
            >
              <span className="font-medium">John Admin</span>
              <span className="text-xs text-muted-foreground">admin@acme.com</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between text-left"
              onClick={() => handleTestLogin('mike@acme.com')}
              disabled={isLoading}
            >
              <span className="font-medium">Mike Manager</span>
              <span className="text-xs text-muted-foreground">mike@acme.com</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between text-left"
              onClick={() => handleTestLogin('sarah@acme.com')}
              disabled={isLoading}
            >
              <span className="font-medium">Sarah Developer</span>
              <span className="text-xs text-muted-foreground">sarah@acme.com</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between text-left"
              onClick={() => handleTestLogin('lisa@acme.com')}
              disabled={isLoading}
            >
              <span className="font-medium">Lisa Designer</span>
              <span className="text-xs text-muted-foreground">lisa@acme.com</span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            For internal demonstration use only
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
