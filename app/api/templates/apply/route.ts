import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { addDays, format } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, projectId, templateDates } = body

    if (!templateId || !projectId) {
      return NextResponse.json(
        { error: 'Template ID and Project ID required' },
        { status: 400 }
      )
    }

    // Fetch template with tasks
    const { data: template, error: templateError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) throw templateError

    // Fetch template tasks
    const { data: templateTasks } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('phase_sequence', { ascending: true })

    // Create phases from template config
    const projectStart = templateDates?.startDate ? new Date(templateDates.startDate) : new Date()
    const createdPhases = []

    if (template.phases_config && Array.isArray(template.phases_config)) {
      for (const phaseConfig of template.phases_config) {
        const phaseStart = addDays(projectStart, phaseConfig.startDay || 0)
        const phaseEnd = addDays(projectStart, phaseConfig.endDay || 0)

        const { data: phase } = await supabase
          .from('phases')
          .insert([
            {
              project_id: projectId,
              name: phaseConfig.name,
              start_date: format(phaseStart, 'yyyy-MM-dd'),
              end_date: format(phaseEnd, 'yyyy-MM-dd'),
              status: 'not_started',
            },
          ])
          .select()

        if (phase?.[0]) createdPhases.push(phase[0])
      }
    }

    // Create tasks from template tasks
    if (templateTasks && templateTasks.length > 0) {
      const tasksToCreate = templateTasks.map((tTask) => {
        const taskStart = addDays(projectStart, tTask.relative_start_days || 0)
        const taskEnd = tTask.relative_end_days
          ? addDays(projectStart, tTask.relative_end_days)
          : taskStart

        const phase = createdPhases[tTask.phase_sequence] || createdPhases[0]

        return {
          project_id: projectId,
          phase_id: phase?.id,
          title: tTask.task_name,
          description: tTask.task_description,
          status: 'not_started',
          start_date: format(taskStart, 'yyyy-MM-dd'),
          end_date: format(taskEnd, 'yyyy-MM-dd'),
          estimated_hours: tTask.estimated_hours,
          is_billable: tTask.is_billable,
          priority: tTask.priority || 2,
        }
      })

      const { data: createdTasks } = await supabase.from('tasks').insert(tasksToCreate).select()

      return NextResponse.json({
        message: 'Template applied successfully',
        phasesCreated: createdPhases.length,
        tasksCreated: createdTasks?.length || 0,
      })
    }

    return NextResponse.json({ message: 'Template applied successfully', phasesCreated: createdPhases.length })
  } catch (error) {
    console.error('[v0] Error applying template:', error)
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
  }
}
