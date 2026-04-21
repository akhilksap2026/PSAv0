'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export function ResetDataButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleReset = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        // Show success message
        alert('Data reset successfully! Please refresh the page.')
        // Refresh the page after 1 second
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        alert('Failed to reset data. Please try again.')
      }
    } catch (error) {
      console.error('[v0] Reset error:', error)
      alert('Error resetting data: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Reset all data to initial rich demo state"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Demo Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset the entire system to the initial rich demo data state with 250 employees,
            35 projects, and all associated data. All changes made will be lost. This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={isLoading} className="bg-red-600">
            {isLoading ? 'Resetting...' : 'Reset Data'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
