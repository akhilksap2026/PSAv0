'use client'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function DashboardHeader() {
  const { userProfile, logout } = useAuth()

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl font-bold">PSA RocketLine</h1>
          <p className="text-sm text-muted-foreground">{userProfile?.full_name}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
