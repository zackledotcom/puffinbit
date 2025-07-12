import { join } from 'path'
import { promises as fs } from 'fs'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { telemetry } from './telemetry'
import {
  Workflow,
  WorkflowExecution,
  WorkflowStep,
  WorkflowTrigger,
  validateWorkflow,
  validateWorkflowExecution
} from './workflowSchema'

interface WorkflowExecutionContext {
  workflow: Workflow
  execution: WorkflowExecution
  variables: Record<string, any>
  stepResults: Record<string, any>
  input?: any
}

interface ToolExecutor {
  execute(config: any, context: WorkflowExecutionContext): Promise<any>
}

export class WorkflowEngine {
  private workflows = new Map<string, Workflow>()
  private executions = new Map<string, WorkflowExecution>()
  private eventListeners = new Map<string, Set<string>>() // event -> workflow IDs
  private scheduledJobs = new Map<string, NodeJS.Timeout>() // workflow ID -> timer
  private toolExecutors = new Map<string, ToolExecutor>()
  private workflowsDir: string
  private executionsDir: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.workflowsDir = join(userDataPath, 'workflows')
    this.executionsDir = join(userDataPath, 'workflow-executions')
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(this.workflowsDir, { recursive: true })
    await fs.mkdir(this.executionsDir, { recursive: true })

    // Load existing workflows
    await this.loadWorkflows()

    // Setup triggers for enabled workflows
    for (const workflow of this.workflows.values()) {
      if (workflow.enabled) {
        this.setupWorkflowTriggers(workflow)
      }
    }

    console.log('🔄 Workflow engine initialized')
  }

  private async loadWorkflows(): Promise<void> {
    try {
      const files = await fs.readdir(this.workflowsDir)
      const workflowFiles = files.filter((f) => f.endsWith('.json'))

      for (const file of workflowFiles) {
        try {
          const content = await fs.readFile(join(this.workflowsDir, file), 'utf8')
          const workflow = validateWorkflow(JSON.parse(content))
          this.workflows.set(workflow.id, workflow)
        } catch (error) {
          console.error(`Failed to load workflow ${file}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to load workflows:', error)
    }
  }

  async createWorkflow(
    workflow: Omit<Workflow, 'id' | 'metadata'> & { metadata?: Partial<Workflow['metadata']> }
  ): Promise<Workflow> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const fullWorkflow: Workflow = {
      ...workflow,
      id,
      metadata: {
        created: now,
        updated: now,
        ...(workflow.metadata || {})
      }
    }

    const validatedWorkflow = validateWorkflow(fullWorkflow)

    // Save to disk
    await fs.writeFile(
      join(this.workflowsDir, `${id}.json`),
      JSON.stringify(validatedWorkflow, null, 2),
      'utf8'
    )

    // Store in memory and setup triggers
    this.workflows.set(id, validatedWorkflow)
    if (validatedWorkflow.enabled) {
      this.setupWorkflowTriggers(validatedWorkflow)
    }

    telemetry.trackEvent({
      type: 'system_event',
      category: 'workflow',
      action: 'workflow_created',
      metadata: { workflowId: id, stepCount: validatedWorkflow.steps.length }
    })

    return validatedWorkflow
  }

  private setupWorkflowTriggers(workflow: Workflow): void {
    for (const trigger of workflow.triggers) {
      switch (trigger.type) {
        case 'event':
          if (trigger.event) {
            if (!this.eventListeners.has(trigger.event)) {
              this.eventListeners.set(trigger.event, new Set())
            }
            this.eventListeners.get(trigger.event)!.add(workflow.id)
          }
          break

        case 'schedule':
          if (trigger.schedule) {
            try {
              // Simple cron-like scheduling (basic implementation)
              // TODO: Add proper cron parsing library or implement basic scheduler
              console.warn(`Schedule trigger not fully implemented for workflow ${workflow.id}`)

              // For now, just set a simple interval (this needs proper cron implementation)
              const timer = setInterval(() => {
                this.triggerWorkflow(workflow.id, 'schedule')
              }, 60000) // Default to 1 minute for demo

              this.scheduledJobs.set(workflow.id, timer)
            } catch (error) {
              console.error(`Invalid schedule expression for workflow ${workflow.id}:`, error)
            }
          }
          break

        case 'webhook':
          // Webhook triggers are handled by the main process
          // This would need integration with the Express server
          break
      }
    }
  }

  async triggerWorkflow(workflowId: string, triggeredBy: string, input?: any): Promise<string> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`)
    }

    const executionId = uuidv4()
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startTime: new Date().toISOString(),
      variables: { ...(workflow.variables || {}) },
      stepResults: [],
      triggeredBy
    }

    this.executions.set(executionId, execution)
    await this.saveExecution(execution)

    telemetry.trackEvent({
      type: 'operation',
      category: 'workflow',
      action: 'execution_started',
      metadata: { workflowId, executionId, triggeredBy }
    })

    // Execute workflow asynchronously
    this.executeWorkflow(execution, workflow, input).catch((error) => {
      console.error(`Workflow execution failed:`, error)
    })

    return executionId
  }

  private async executeWorkflow(
    execution: WorkflowExecution,
    workflow: Workflow,
    input?: any
  ): Promise<void> {
    const context: WorkflowExecutionContext = {
      workflow,
      execution,
      variables: execution.variables,
      stepResults: {},
      input
    }

    try {
      let currentStepId = workflow.steps[0]?.id
      let stepIndex = 0

      while (currentStepId && stepIndex < 100) {
        // Prevent infinite loops
        const step = workflow.steps.find((s) => s.id === currentStepId)
        if (!step) {
          throw new Error(`Step ${currentStepId} not found`)
        }

        execution.currentStep = currentStepId
        await this.saveExecution(execution)

        try {
          const stepStartTime = new Date().toISOString()
          const result = await this.executeStep(step, context)
          const stepEndTime = new Date().toISOString()
          context.stepResults[currentStepId] = result

          execution.stepResults.push({
            stepId: currentStepId,
            status: 'completed',
            startTime: stepStartTime,
            endTime: stepEndTime,
            input: step.config || {},
            output: result,
            duration: new Date(stepEndTime).getTime() - new Date(stepStartTime).getTime()
          })

          // Determine next step
          currentStepId =
            step.onSuccess ||
            (stepIndex + 1 < workflow.steps.length ? workflow.steps[stepIndex + 1].id : null)
        } catch (error) {
          const stepEndTime = new Date().toISOString()
          execution.stepResults.push({
            stepId: currentStepId,
            status: 'failed',
            startTime: new Date().toISOString(),
            endTime: stepEndTime,
            input: step.config || {},
            output: null,
            error: error.message,
            duration: 0
          })

          if (step.retries > 0) {
            // Implement retry logic here
          }

          currentStepId = step.onFailure
          if (!currentStepId) {
            throw error
          }
        }

        stepIndex++
      }

      execution.status = 'completed'
      execution.endTime = new Date().toISOString()
    } catch (error) {
      execution.status = 'failed'
      execution.endTime = new Date().toISOString()
      execution.error = error.message

      telemetry.trackEvent({
        type: 'operation',
        category: 'workflow',
        action: 'execution_failed',
        metadata: {
          workflowId: workflow.id,
          executionId: execution.id,
          error: error.message
        }
      })
    } finally {
      await this.saveExecution(execution)
      this.executions.delete(execution.id)

      telemetry.trackEvent({
        type: 'operation',
        category: 'workflow',
        action: 'execution_completed',
        metadata: {
          workflowId: workflow.id,
          executionId: execution.id,
          status: execution.status,
          duration: execution.endTime
            ? new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()
            : null
        }
      })
    }
  }

  private async executeStep(step: WorkflowStep, context: WorkflowExecutionContext): Promise<any> {
    switch (step.type) {
      case 'tool':
        if (!step.tool) {
          throw new Error('Tool step missing tool specification')
        }

        const executor = this.toolExecutors.get(step.tool)
        if (!executor) {
          throw new Error(`Tool ${step.tool} not found`)
        }

        return await executor.execute(step.config || {}, context)

      case 'condition':
        if (!step.condition) {
          throw new Error('Condition step missing condition')
        }

        return this.evaluateCondition(step.condition, context)

      case 'transform':
        if (!step.transform) {
          throw new Error('Transform step missing transform expression')
        }

        return this.evaluateTransform(step.transform, context)

      case 'delay':
        if (!step.delay) {
          throw new Error('Delay step missing delay duration')
        }

        await new Promise((resolve) => setTimeout(resolve, step.delay))
        return { delayed: step.delay }

      case 'parallel':
        // Execute multiple steps in parallel
        // This would need more complex implementation
        throw new Error('Parallel execution not yet implemented')

      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  private evaluateCondition(condition: string, context: WorkflowExecutionContext): boolean {
    try {
      // Create a safe evaluation context
      const evalContext = {
        variables: context.variables,
        stepResults: context.stepResults,
        input: context.input
      }

      // Use Function constructor for safer evaluation than eval()
      const func = new Function(
        'context',
        `
        const { variables, stepResults, input } = context;
        return ${condition};
      `
      )

      return Boolean(func(evalContext))
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error.message}`)
    }
  }

  private evaluateTransform(transform: string, context: WorkflowExecutionContext): any {
    try {
      const evalContext = {
        variables: context.variables,
        stepResults: context.stepResults,
        input: context.input
      }

      const func = new Function(
        'context',
        `
        const { variables, stepResults, input } = context;
        return ${transform};
      `
      )

      return func(evalContext)
    } catch (error) {
      throw new Error(`Transform evaluation failed: ${error.message}`)
    }
  }

  registerToolExecutor(toolName: string, executor: ToolExecutor): void {
    this.toolExecutors.set(toolName, executor)
  }
  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const filename = `${execution.id}.json`
      await fs.writeFile(
        join(this.executionsDir, filename),
        JSON.stringify(execution, null, 2),
        'utf8'
      )
    } catch (error) {
      console.error('Failed to save execution:', error)
    }
  }

  // Public API methods
  async getWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const existing = this.workflows.get(id)
    if (!existing) {
      throw new Error(`Workflow ${id} not found`)
    }

    const updated: Workflow = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        updated: new Date().toISOString()
      }
    }

    const validatedWorkflow = validateWorkflow(updated)

    // Save to disk
    await fs.writeFile(
      join(this.workflowsDir, `${id}.json`),
      JSON.stringify(validatedWorkflow, null, 2),
      'utf8'
    )

    // Update in-memory and re-setup triggers
    this.workflows.set(id, validatedWorkflow)
    this.clearWorkflowTriggers(id)
    this.setupWorkflowTriggers(validatedWorkflow)

    telemetry.trackEvent({
      type: 'system_event',
      category: 'workflow',
      action: 'workflow_updated',
      metadata: { workflowId: id }
    })

    return validatedWorkflow
  }

  async deleteWorkflow(id: string): Promise<void> {
    const workflow = this.workflows.get(id)
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`)
    }

    // Clear triggers and timers
    this.clearWorkflowTriggers(id)

    // Remove from memory
    this.workflows.delete(id)

    // Delete file
    try {
      await fs.unlink(join(this.workflowsDir, `${id}.json`))
    } catch (error) {
      console.error('Failed to delete workflow file:', error)
    }

    telemetry.trackEvent({
      type: 'system_event',
      category: 'workflow',
      action: 'workflow_deleted',
      metadata: { workflowId: id }
    })
  }

  private clearWorkflowTriggers(workflowId: string): void {
    // Clear event listeners
    for (const [event, workflowIds] of this.eventListeners.entries()) {
      workflowIds.delete(workflowId)
      if (workflowIds.size === 0) {
        this.eventListeners.delete(event)
      }
    }

    // Clear scheduled jobs
    const timer = this.scheduledJobs.get(workflowId)
    if (timer) {
      clearTimeout(timer)
      clearInterval(timer) // Handle both setTimeout and setInterval
      this.scheduledJobs.delete(workflowId)
    }
  }

  async getExecutions(workflowId?: string, limit: number = 50): Promise<WorkflowExecution[]> {
    try {
      const files = await fs.readdir(this.executionsDir)
      const executionFiles = files.filter((f) => f.endsWith('.json')).slice(0, limit)

      const executions: WorkflowExecution[] = []

      for (const file of executionFiles) {
        try {
          const content = await fs.readFile(join(this.executionsDir, file), 'utf8')
          const execution = validateWorkflowExecution(JSON.parse(content))

          if (!workflowId || execution.workflowId === workflowId) {
            executions.push(execution)
          }
        } catch (error) {
          console.error(`Failed to load execution ${file}:`, error)
        }
      }

      // Sort by start time, newest first
      return executions.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
    } catch (error) {
      console.error('Failed to load executions:', error)
      return []
    }
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    return this.executions.get(id) || null
  }

  async cancelExecution(id: string): Promise<void> {
    const execution = this.executions.get(id)
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled'
      execution.endTime = new Date().toISOString()
      await this.saveExecution(execution)

      telemetry.trackEvent({
        type: 'operation',
        category: 'workflow',
        action: 'execution_cancelled',
        metadata: { executionId: id }
      })
    }
  }

  // Event emission for triggering workflows
  async emitEvent(eventName: string, data: any): Promise<string[]> {
    const workflowIds = this.eventListeners.get(eventName)
    const executionIds: string[] = []

    if (workflowIds && workflowIds.size > 0) {
      for (const workflowId of workflowIds) {
        try {
          const executionId = await this.triggerWorkflow(workflowId, 'event', data)
          executionIds.push(executionId)
        } catch (error) {
          console.error(`Failed to trigger workflow ${workflowId} for event ${eventName}:`, error)
        }
      }
    }

    return executionIds
  }

  // Get workflow statistics
  async getWorkflowStats(): Promise<any> {
    const workflows = await this.getWorkflows()
    const executions = await this.getExecutions()

    const stats = {
      totalWorkflows: workflows.length,
      enabledWorkflows: workflows.filter((w) => w.enabled).length,
      totalExecutions: executions.length,
      runningExecutions: executions.filter((e) => e.status === 'running').length,
      completedExecutions: executions.filter((e) => e.status === 'completed').length,
      failedExecutions: executions.filter((e) => e.status === 'failed').length,
      eventListeners: this.eventListeners.size,
      scheduledJobs: this.scheduledJobs.size,
      recentExecutions: executions.slice(0, 10).map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        status: e.status,
        startTime: e.startTime,
        duration: e.endTime ? new Date(e.endTime).getTime() - new Date(e.startTime).getTime() : null
      }))
    }

    return stats
  }

  // Testing and debugging
  async validateWorkflowExecution(workflowId: string, testInput: any): Promise<any> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    // Create a test execution without actually running it
    const testExecution: WorkflowExecution = {
      id: 'test-' + uuidv4(),
      workflowId,
      status: 'running',
      startTime: new Date().toISOString(),
      variables: { ...(workflow.variables || {}) },
      stepResults: [],
      triggeredBy: 'test'
    }

    const context: WorkflowExecutionContext = {
      workflow,
      execution: testExecution,
      variables: testExecution.variables,
      stepResults: {},
      input: testInput
    }

    // Validate each step configuration
    const validationResults = []
    for (const step of workflow.steps) {
      try {
        // Check if tool exists
        if (step.type === 'tool' && step.tool) {
          const toolExists = Boolean(this.toolExecutors.get(step.tool))
          validationResults.push({
            stepId: step.id,
            valid: toolExists,
            message: toolExists ? 'Tool available' : `Unknown tool: ${step.tool}`
          })
        } else if (step.type === 'condition' && step.condition) {
          // Test condition syntax
          try {
            this.evaluateCondition(step.condition, context)
            validationResults.push({
              stepId: step.id,
              valid: true,
              message: 'Condition syntax valid'
            })
          } catch (error) {
            validationResults.push({
              stepId: step.id,
              valid: false,
              message: `Condition error: ${error.message}`
            })
          }
        } else {
          validationResults.push({
            stepId: step.id,
            valid: true,
            message: 'Step configuration valid'
          })
        }
      } catch (error) {
        validationResults.push({
          stepId: step.id,
          valid: false,
          message: error.message
        })
      }
    }

    return {
      workflow: workflow.name,
      valid: validationResults.every((r) => r.valid),
      steps: validationResults,
      testInput,
      estimatedSteps: workflow.steps.length
    }
  }

  async shutdown(): Promise<void> {
    // Cancel all running executions
    for (const execution of this.executions.values()) {
      if (execution.status === 'running') {
        await this.cancelExecution(execution.id)
      }
    }

    // Clear all timers
    for (const timer of this.scheduledJobs.values()) {
      clearTimeout(timer)
      clearInterval(timer) // Handle both types
    }

    console.log('🔄 Workflow engine shutdown complete')
  }
}

export const workflowEngine = new WorkflowEngine()

// Global event emission helper
export function emitWorkflowEvent(eventName: string, data: any): Promise<string[]> {
  return workflowEngine.emitEvent(eventName, data)
}
