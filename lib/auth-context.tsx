'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from './supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  userProfile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: { id: string; email: string; organization_id: string; role: string; full_name: string }) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user info is in session storage (demo mode)
        const userId = sessionStorage.getItem('user_id')
        const email = sessionStorage.getItem('email')
        const organizationId = sessionStorage.getItem('organization_id')
        const role = sessionStorage.getItem('role')
        const fullName = sessionStorage.getItem('full_name')

        if (userId && email && organizationId && role && fullName) {
          setUserProfile({
            id: userId,
            auth_id: null,
            organization_id: organizationId,
            email,
            full_name: fullName,
            avatar_url: null,
            role: role as any,
            is_active: true,
            hourly_cost: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } else {
          setUserProfile(null)
        }
      } catch (error) {
        console.error('[v0] Auth initialization error:', error)
        setUserProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = (user: { id: string; email: string; organization_id: string; role: string; full_name: string }) => {
    // Store in session storage
    sessionStorage.setItem('user_id', user.id)
    sessionStorage.setItem('email', user.email)
    sessionStorage.setItem('organization_id', user.organization_id)
    sessionStorage.setItem('role', user.role)
    sessionStorage.setItem('full_name', user.full_name)

    // Update state immediately
    setUserProfile({
      id: user.id,
      auth_id: null,
      organization_id: user.organization_id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: null,
      role: user.role as any,
      is_active: true,
      hourly_cost: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const logout = async () => {
    try {
      // Clear session storage
      sessionStorage.removeItem('user_id')
      sessionStorage.removeItem('email')
      sessionStorage.removeItem('organization_id')
      sessionStorage.removeItem('role')
      sessionStorage.removeItem('full_name')

      setUserProfile(null)
      router.push('/login')
    } catch (error) {
      console.error('[v0] Logout error:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        isLoading,
        isAuthenticated: !!userProfile,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
