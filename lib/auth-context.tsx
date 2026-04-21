'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from './supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  userProfile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
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

        console.log('[v0] Initializing auth, userId:', userId, 'email:', email)

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
          console.log('[v0] User authenticated:', fullName)
        } else {
          console.log('[v0] No user session found')
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

  const logout = async () => {
    try {
      // Clear session storage
      sessionStorage.removeItem('user_id')
      sessionStorage.removeItem('email')
      sessionStorage.removeItem('organization_id')
      sessionStorage.removeItem('role')
      sessionStorage.removeItem('full_name')

      // Clear cookie
      document.cookie = 'user_id=; path=/; max-age=0'

      setUserProfile(null)
      console.log('[v0] User logged out')
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
