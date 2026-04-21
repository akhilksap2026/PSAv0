'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

type Allocation = Database['public']['Tables']['allocations']['Row']
type User = Database['public']['Tables']['users']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface AllocationRow {
  user: User
  allocations: {
    project: Project
    allocationPercentage: number
    role: string
  }[]
  totalAllocation: number
}

export function AllocationGrid() {
  const { userProfile } = useAuth()
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return

      setIsLoading(true)
      setError(null)

      try {
        // Fetch all users
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .order('full_name', { ascending: true })

        // Fetch allocations with project details
        const { data: allocData } = await supabase
          .from('allocations')
          .select('*, project:projects(id, name, status)')
          .eq('organization_id', userProfile.organization_id)

        if (!usersData) {
          setAllocationRows([])
          return
        }

        // Group allocations by user
        const allocationMap = new Map<string, AllocationRow>()

        usersData.forEach((user) => {
          allocationMap.set(user.id, {
            user,
            allocations: [],
            totalAllocation: 0,
          })
        })

        // Populate allocations
        if (allocData) {
          allocData.forEach((alloc) => {
            const row = allocationMap.get(alloc.user_id)
            if (row && alloc.project) {
              row.allocations.push({
                project: alloc.project as unknown as Project,
                allocationPercentage: alloc.allocation_percentage || 0,
                role: alloc.role,
              })
              row.totalAllocation += alloc.allocation_percentage || 0
            }
          })
        }

        setAllocationRows(Array.from(allocationMap.values()).filter((r) => r.allocations.length > 0))
      } catch (err) {
        console.error('[v0] Error fetching allocations:', err)
        setError('Failed to load allocations')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userProfile])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Allocation Grid</CardTitle>
        <CardDescription>Project allocation by team member</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {allocationRows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No resource allocations found</p>
        ) : (
          <div className="space-y-4">
            {allocationRows.map((row) => (
              <div key={row.user.id} className="border rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{row.user.full_name}</h3>
                    <Badge variant={row.totalAllocation > 100 ? 'destructive' : 'secondary'}>
                      {row.totalAllocation}% Allocated
                    </Badge>
                  </div>

                  {row.totalAllocation > 100 && (
                    <div className="text-xs text-destructive mb-2">
                      Warning: Over-allocated by {row.totalAllocation - 100}%
                    </div>
                  )}

                  {row.totalAllocation < 100 && row.totalAllocation > 0 && (
                    <div className="text-xs text-amber-600 mb-2">
                      Available: {100 - row.totalAllocation}%
                    </div>
                  )}
                </div>

                {/* Allocation bar chart */}
                <div className="mb-4">
                  <div className="flex gap-1 h-6 bg-muted rounded-sm overflow-hidden">
                    {row.allocations.map((alloc, idx) => {
                      const colors = [
                        'bg-blue-500',
                        'bg-green-500',
                        'bg-purple-500',
                        'bg-orange-500',
                        'bg-pink-500',
                        'bg-yellow-500',
                      ]
                      const color = colors[idx % colors.length]

                      return (
                        <div
                          key={alloc.project.id}
                          className={`${color} flex items-center justify-center`}
                          style={{
                            width: `${(alloc.allocationPercentage / 100) * 100}%`,
                            minWidth: alloc.allocationPercentage > 5 ? 'auto' : '2px',
                          }}
                          title={`${alloc.project.name}: ${alloc.allocationPercentage}%`}
                        >
                          {alloc.allocationPercentage > 10 && (
                            <span className="text-xs font-semibold text-white truncate px-1">
                              {alloc.allocationPercentage}%
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {row.totalAllocation < 100 && (
                      <div
                        className="bg-gray-300"
                        style={{ width: `${((100 - row.totalAllocation) / 100) * 100}%` }}
                      ></div>
                    )}
                  </div>
                </div>

                {/* Detailed allocation list */}
                <div className="space-y-2">
                  {row.allocations.map((alloc) => (
                    <div key={alloc.project.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{alloc.project.name}</p>
                        <p className="text-xs text-muted-foreground">{alloc.role}</p>
                      </div>
                      <Badge variant="outline">{alloc.allocationPercentage}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
