'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

type UserSkill = Database['public']['Tables']['user_skills']['Row']
type User = Database['public']['Tables']['users']['Row']

interface SkillRow {
  userId: string
  userName: string
  skill: string
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-blue-100 text-blue-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-green-100 text-green-800' },
  { value: 'expert', label: 'Expert', color: 'bg-purple-100 text-purple-800' },
]

export function SkillsMatrix() {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [skillRows, setSkillRows] = useState<SkillRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [newSkill, setNewSkill] = useState({
    userId: '',
    skill: '',
    proficiency: 'intermediate' as const,
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .order('full_name', { ascending: true })

        const { data: skillsData } = await supabase
          .from('user_skills')
          .select('*')
          .eq('organization_id', userProfile.organization_id)

        setUsers(usersData || [])

        const skillRows: SkillRow[] = (skillsData || []).map((skill) => {
          const user = usersData?.find((u) => u.id === skill.user_id)
          return {
            userId: skill.user_id,
            userName: user?.full_name || 'Unknown',
            skill: skill.skill,
            proficiency: skill.proficiency,
          }
        })

        setSkillRows(skillRows)
      } catch (error) {
        console.error('[v0] Error fetching skills:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userProfile])

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (!userProfile || !newSkill.userId || !newSkill.skill) {
        alert('Please fill all fields')
        return
      }

      const { error } = await supabase.from('user_skills').insert([
        {
          user_id: newSkill.userId,
          organization_id: userProfile.organization_id,
          skill: newSkill.skill,
          proficiency: newSkill.proficiency,
        },
      ])

      if (error) throw error

      const user = users.find((u) => u.id === newSkill.userId)
      const skillRow: SkillRow = {
        userId: newSkill.userId,
        userName: user?.full_name || 'Unknown',
        skill: newSkill.skill,
        proficiency: newSkill.proficiency,
      }

      setSkillRows((prev) => [...prev, skillRow])
      setNewSkill({ userId: '', skill: '', proficiency: 'intermediate' })
      setIsOpen(false)
    } catch (error) {
      console.error('[v0] Error adding skill:', error)
      alert('Failed to add skill')
    }
  }

  const handleRemoveSkill = async (userId: string, skill: string) => {
    try {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)
        .eq('skill', skill)

      if (error) throw error

      setSkillRows((prev) => prev.filter((s) => !(s.userId === userId && s.skill === skill)))
    } catch (error) {
      console.error('[v0] Error removing skill:', error)
      alert('Failed to remove skill')
    }
  }

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

  const userSkillMap = new Map<string, SkillRow[]>()
  skillRows.forEach((row) => {
    if (!userSkillMap.has(row.userId)) {
      userSkillMap.set(row.userId, [])
    }
    userSkillMap.get(row.userId)?.push(row)
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Skills Matrix</CardTitle>
          <CardDescription>Team member expertise and proficiency levels</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Skill</DialogTitle>
              <DialogDescription>Add a new skill to a team member</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <FieldGroup>
                <FieldLabel htmlFor="user">Team Member *</FieldLabel>
                <Select value={newSkill.userId} onValueChange={(val) => setNewSkill((p) => ({ ...p, userId: val }))}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="skill">Skill *</FieldLabel>
                <Input
                  id="skill"
                  placeholder="e.g., React, Project Management, AWS"
                  value={newSkill.skill}
                  onChange={(e) => setNewSkill((p) => ({ ...p, skill: e.target.value }))}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="proficiency">Proficiency Level</FieldLabel>
                <Select
                  value={newSkill.proficiency}
                  onValueChange={(val) =>
                    setNewSkill((p) => ({ ...p, proficiency: val as typeof newSkill.proficiency }))
                  }
                >
                  <SelectTrigger id="proficiency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Skill</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {skillRows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No skills recorded yet. Add one to get started.</p>
        ) : (
          <div className="space-y-6">
            {users.map((user) => {
              const userSkills = userSkillMap.get(user.id) || []
              if (userSkills.length === 0) return null

              return (
                <div key={user.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">{user.full_name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {userSkills.map((skill, idx) => {
                      const level = PROFICIENCY_LEVELS.find((l) => l.value === skill.proficiency)
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                        >
                          <span>{skill.skill}</span>
                          <Badge variant="secondary" className={`${level?.color || ''} text-xs`}>
                            {level?.label}
                          </Badge>
                          <button
                            onClick={() => handleRemoveSkill(skill.userId, skill.skill)}
                            className="ml-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
