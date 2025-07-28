import { z } from 'zod'

// Core workflow schema definitions
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['tool', 'condition', 'transform', 'delay', 'parallel']),
  tool: z.string().optional(), // e.g., "reddit.send_dm"
  config: z.record(z.any()).optional(),
  condition: z.string().optional(), // JavaScript expression for conditions
  transform: z.string().optional(), // JavaScript expression for data transformation
  delay: z.number().optional(), // milliseconds
  onSuccess: z.string().optional(), // next step ID
  onFailure: z.string().optional(), // next step ID on error
  retries: z.number().default(0),
  timeout: z.number().default(30000)
})

export const WorkflowTriggerSchema = z.object({
  type: z.enum(['event', 'schedule', 'webhook', 'manual']),
  event: z.string().optional(), // e.g., "reddit.dm_received"
  schedule: z.string().optional(), // cron expression
  webhook: z.string().optional(), // webhook endpoint
  filter: z.record(z.any()).optional() // conditions for trigger activation
})

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  enabled: z.boolean().default(true),
  triggers: z.array(WorkflowTriggerSchema),
  steps: z.array(WorkflowStepSchema),
  variables: z.record(z.any()).optional(), // workflow-level variables
  metadata: z.object({
    created: z.string(),
    updated: z.string(),
    createdBy: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
})

export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  startTime: z.string(),
  endTime: z.string().optional(),
  currentStep: z.string().optional(),
  variables: z.record(z.any()),
  stepResults: z.array(
    z.object({
      stepId: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
      startTime: z.string(),
      endTime: z.string().optional(),
      input: z.any(),
      output: z.any(),
      error: z.string().optional(),
      duration: z.number().optional()
    })
  ),
  error: z.string().optional(),
  triggeredBy: z.string()
})

// Type exports
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>
export type Workflow = z.infer<typeof WorkflowSchema>
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>
export type StepResult = WorkflowExecution['stepResults'][0]

// Built-in workflow templates
export const WORKFLOW_TEMPLATES = {
  reddit_auto_responder: {
    name: 'Reddit Auto-Responder',
    description: 'Automatically respond to Reddit DMs with AI-generated replies',
    triggers: [
      {
        type: 'event' as const,
        event: 'reddit.dm_received'
      }
    ],
    steps: [
      {
        id: 'check_user',
        name: 'Check User Blacklist',
        type: 'condition' as const,
        condition: '!workflow.blacklistedUsers?.includes(input.author)',
        onSuccess: 'generate_response',
        onFailure: 'log_ignored'
      },
      {
        id: 'generate_response',
        name: 'Generate AI Response',
        type: 'tool' as const,
        tool: 'ollama.generate',
        config: {
          model: '${workflow.model || "llama2"}',
          prompt: 'Respond helpfully to this Reddit DM: ${input.body}',
          temperature: 0.7
        },
        onSuccess: 'send_reply',
        onFailure: 'log_error'
      },
      {
        id: 'send_reply',
        name: 'Send Reddit Reply',
        type: 'tool' as const,
        tool: 'reddit.reply_dm',
        config: {
          messageId: '${input.id}',
          reply: '${steps.generate_response.output.response}'
        },
        onSuccess: 'log_success'
      },
      {
        id: 'log_success',
        name: 'Log Successful Reply',
        type: 'tool' as const,
        tool: 'system.log',
        config: {
          level: 'info',
          message: 'Successfully replied to DM from ${input.author}'
        }
      },
      {
        id: 'log_ignored',
        name: 'Log Ignored User',
        type: 'tool' as const,
        tool: 'system.log',
        config: {
          level: 'info',
          message: 'Ignored DM from blacklisted user ${input.author}'
        }
      },
      {
        id: 'log_error',
        name: 'Log Error',
        type: 'tool' as const,
        tool: 'system.log',
        config: {
          level: 'error',
          message: 'Failed to process DM: ${error}'
        }
      }
    ]
  },

  content_moderation: {
    name: 'Content Moderation Pipeline',
    description: 'Multi-step content analysis and moderation workflow',
    triggers: [
      {
        type: 'event' as const,
        event: 'content.received'
      }
    ],
    steps: [
      {
        id: 'analyze_sentiment',
        name: 'Analyze Sentiment',
        type: 'tool' as const,
        tool: 'ollama.generate',
        config: {
          model: 'llama2',
          prompt: 'Analyze the sentiment of this text (positive/negative/neutral): ${input.text}'
        },
        onSuccess: 'check_toxicity'
      },
      {
        id: 'check_toxicity',
        name: 'Check for Toxic Content',
        type: 'tool' as const,
        tool: 'ollama.generate',
        config: {
          model: 'llama2',
          prompt: 'Rate the toxicity of this text from 1-10: ${input.text}'
        },
        onSuccess: 'moderate_content'
      },
      {
        id: 'moderate_content',
        name: 'Make Moderation Decision',
        type: 'condition' as const,
        condition: 'parseInt(steps.check_toxicity.output.response) > 7',
        onSuccess: 'flag_content',
        onFailure: 'approve_content'
      },
      {
        id: 'flag_content',
        name: 'Flag for Review',
        type: 'tool' as const,
        tool: 'system.flag_content',
        config: {
          contentId: '${input.id}',
          reason: 'High toxicity score: ${steps.check_toxicity.output.response}'
        }
      },
      {
        id: 'approve_content',
        name: 'Approve Content',
        type: 'tool' as const,
        tool: 'system.approve_content',
        config: {
          contentId: '${input.id}',
          sentiment: '${steps.analyze_sentiment.output.response}'
        }
      }
    ]
  },

  data_processing_pipeline: {
    name: 'Data Processing Pipeline',
    description: 'Extract, transform, and load data through multiple steps',
    triggers: [
      {
        type: 'schedule' as const,
        schedule: '0 */6 * * *' // Every 6 hours
      }
    ],
    steps: [
      {
        id: 'extract_data',
        name: 'Extract Data',
        type: 'tool' as const,
        tool: 'file.read',
        config: {
          path: '${workflow.dataPath}'
        },
        onSuccess: 'transform_data'
      },
      {
        id: 'transform_data',
        name: 'Transform Data',
        type: 'transform' as const,
        transform: `
          const data = JSON.parse(input);
          return data.map(item => ({
            id: item.id,
            processed_at: new Date().toISOString(),
            value: item.value * 2
          }));
        `,
        onSuccess: 'parallel_processing'
      },
      {
        id: 'parallel_processing',
        name: 'Parallel Processing',
        type: 'parallel' as const,
        config: {
          steps: ['save_to_db', 'generate_report', 'send_notification']
        }
      },
      {
        id: 'save_to_db',
        name: 'Save to Database',
        type: 'tool' as const,
        tool: 'chroma.add',
        config: {
          collection: 'processed_data',
          documents: '${steps.transform_data.output}'
        }
      },
      {
        id: 'generate_report',
        name: 'Generate Report',
        type: 'tool' as const,
        tool: 'ollama.generate',
        config: {
          model: 'llama2',
          prompt: 'Generate a summary report for this data: ${steps.transform_data.output}'
        }
      },
      {
        id: 'send_notification',
        name: 'Send Notification',
        type: 'tool' as const,
        tool: 'system.notify',
        config: {
          message:
            'Data processing completed: ${steps.transform_data.output.length} items processed'
        }
      }
    ]
  }
} as const

// Validation helpers
export function validateWorkflow(workflow: unknown): Workflow {
  return WorkflowSchema.parse(workflow)
}

export function validateWorkflowStep(step: unknown): WorkflowStep {
  return WorkflowStepSchema.parse(step)
}

export function validateWorkflowExecution(execution: unknown): WorkflowExecution {
  return WorkflowExecutionSchema.parse(execution)
}
