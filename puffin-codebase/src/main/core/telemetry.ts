import { join } from 'path'
import { promises as fs } from 'fs'
import { app } from 'electron'
import { crashRecovery } from './crashRecovery'

export interface TelemetryEvent {
  type: 'operation' | 'performance' | 'user_action' | 'system_event' | 'error'
  category: string
  action: string
  label?: string
  value?: number
  metadata?: Record<string, any>
  timestamp: string
  sessionId: string
  userId?: string
}

export interface AuditRecord {
  id: string
  timestamp: string
  sessionId: string
  operation: string
  component: string
  actor: 'user' | 'system' | 'service'
  success: boolean
  duration?: number
  inputHash?: string
  outputHash?: string
  metadata?: Record<string, any>
}

class TelemetryManager {
  private telemetryDir: string
  private auditDir: string
  private sessionId: string
  private isEnabled: boolean = true
  private buffer: (TelemetryEvent | AuditRecord)[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor() {
    this.telemetryDir = join(app.getPath('userData'), 'telemetry')
    this.auditDir = join(app.getPath('userData'), 'audit')
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2)
    this.ensureDirectories()
    this.startFlushTimer()
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.telemetryDir, { recursive: true })
      await fs.mkdir(this.auditDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create telemetry directories:', error)
      await crashRecovery.logError(error as Error, {
        operation: 'create_telemetry_dirs',
        component: 'main',
        severity: 'medium',
        timestamp: new Date().toISOString()
      })
    }
  }

  private startFlushTimer() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 30000) // Flush every 30 seconds
  }

  trackEvent(event: Omit<TelemetryEvent, 'timestamp' | 'sessionId'>): void {
    if (!this.isEnabled) return

    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    }

    this.buffer.push(fullEvent)

    // Immediate flush for critical events
    if (event.type === 'error' || event.category === 'crash') {
      this.flush()
    }
  }

  async auditOperation(record: Omit<AuditRecord, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    if (!this.isEnabled) return

    const fullRecord: AuditRecord = {
      ...record,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    }

    this.buffer.push(fullRecord)
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const events = this.buffer.filter((item) => 'type' in item) as TelemetryEvent[]
    const audits = this.buffer.filter((item) => 'actor' in item) as AuditRecord[]

    this.buffer = []

    try {
      // Write telemetry events
      if (events.length > 0) {
        const telemetryFile = join(
          this.telemetryDir,
          `telemetry-${new Date().toISOString().split('T')[0]}.jsonl`
        )
        const telemetryData = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
        await fs.appendFile(telemetryFile, telemetryData, 'utf8')
      }

      // Write audit records
      if (audits.length > 0) {
        const auditFile = join(
          this.auditDir,
          `audit-${new Date().toISOString().split('T')[0]}.jsonl`
        )
        const auditData = audits.map((a) => JSON.stringify(a)).join('\n') + '\n'
        await fs.appendFile(auditFile, auditData, 'utf8')
      }
    } catch (error) {
      console.error('Failed to flush telemetry/audit data:', error)
      // Don't create recursive logging loop
    }
  }

  async exportTelemetry(options: {
    startDate?: string
    endDate?: string
    types?: string[]
    format: 'json' | 'csv' | 'jsonl'
    outputPath?: string
  }): Promise<string> {
    try {
      const files = await fs.readdir(this.telemetryDir)
      const telemetryFiles = files.filter((f) => f.startsWith('telemetry-') && f.endsWith('.jsonl'))

      let allEvents: TelemetryEvent[] = []

      for (const file of telemetryFiles) {
        const content = await fs.readFile(join(this.telemetryDir, file), 'utf8')
        const lines = content
          .trim()
          .split('\n')
          .filter((l) => l.trim())

        for (const line of lines) {
          try {
            const event = JSON.parse(line) as TelemetryEvent

            // Apply filters
            if (options.startDate && event.timestamp < options.startDate) continue
            if (options.endDate && event.timestamp > options.endDate) continue
            if (options.types && !options.types.includes(event.type)) continue

            allEvents.push(event)
          } catch (parseError) {
            // Skip malformed entries
          }
        }
      }

      // Generate output
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath =
        options.outputPath ||
        join(app.getPath('userData'), `telemetry-export-${timestamp}.${options.format}`)

      let outputData: string

      switch (options.format) {
        case 'json':
          outputData = JSON.stringify(allEvents, null, 2)
          break

        case 'csv':
          const headers = ['timestamp', 'type', 'category', 'action', 'label', 'value', 'sessionId']
          const csvRows = [
            headers.join(','),
            ...allEvents.map((event) =>
              [
                event.timestamp,
                event.type,
                event.category,
                event.action,
                event.label || '',
                event.value || '',
                event.sessionId
              ]
                .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                .join(',')
            )
          ]
          outputData = csvRows.join('\n')
          break

        case 'jsonl':
        default:
          outputData = allEvents.map((e) => JSON.stringify(e)).join('\n')
          break
      }

      await fs.writeFile(outputPath, outputData, 'utf8')
      return outputPath
    } catch (error) {
      console.error('Failed to export telemetry:', error)
      throw error
    }
  }

  async exportAudit(options: {
    startDate?: string
    endDate?: string
    operations?: string[]
    components?: string[]
    format: 'json' | 'csv' | 'jsonl'
    outputPath?: string
  }): Promise<string> {
    try {
      const files = await fs.readdir(this.auditDir)
      const auditFiles = files.filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))

      let allRecords: AuditRecord[] = []

      for (const file of auditFiles) {
        const content = await fs.readFile(join(this.auditDir, file), 'utf8')
        const lines = content
          .trim()
          .split('\n')
          .filter((l) => l.trim())

        for (const line of lines) {
          try {
            const record = JSON.parse(line) as AuditRecord

            // Apply filters
            if (options.startDate && record.timestamp < options.startDate) continue
            if (options.endDate && record.timestamp > options.endDate) continue
            if (options.operations && !options.operations.includes(record.operation)) continue
            if (options.components && !options.components.includes(record.component)) continue

            allRecords.push(record)
          } catch (parseError) {
            // Skip malformed entries
          }
        }
      }

      // Generate output
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath =
        options.outputPath ||
        join(app.getPath('userData'), `audit-export-${timestamp}.${options.format}`)

      let outputData: string

      switch (options.format) {
        case 'json':
          outputData = JSON.stringify(allRecords, null, 2)
          break

        case 'csv':
          const headers = [
            'timestamp',
            'operation',
            'component',
            'actor',
            'success',
            'duration',
            'sessionId'
          ]
          const csvRows = [
            headers.join(','),
            ...allRecords.map((record) =>
              [
                record.timestamp,
                record.operation,
                record.component,
                record.actor,
                record.success,
                record.duration || '',
                record.sessionId
              ]
                .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                .join(',')
            )
          ]
          outputData = csvRows.join('\n')
          break

        case 'jsonl':
        default:
          outputData = allRecords.map((r) => JSON.stringify(r)).join('\n')
          break
      }

      await fs.writeFile(outputPath, outputData, 'utf8')
      return outputPath
    } catch (error) {
      console.error('Failed to export audit records:', error)
      throw error
    }
  }

  async getTelemetrySummary(): Promise<any> {
    try {
      const files = await fs.readdir(this.telemetryDir)
      const telemetryFiles = files.filter((f) => f.startsWith('telemetry-') && f.endsWith('.jsonl'))

      let totalEvents = 0
      let eventsByType: Record<string, number> = {}
      let eventsByCategory: Record<string, number> = {}
      let recentEvents = []

      for (const file of telemetryFiles.slice(-7)) {
        // Last 7 days
        const content = await fs.readFile(join(this.telemetryDir, file), 'utf8')
        const lines = content
          .trim()
          .split('\n')
          .filter((l) => l.trim())

        for (const line of lines.slice(-1000)) {
          // Recent events only
          try {
            const event = JSON.parse(line)
            totalEvents++

            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
            eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1

            if (recentEvents.length < 50) {
              recentEvents.push({
                timestamp: event.timestamp,
                type: event.type,
                category: event.category,
                action: event.action,
                label: event.label
              })
            }
          } catch (parseError) {
            // Skip malformed entries
          }
        }
      }

      return {
        totalEvents,
        eventsByType,
        eventsByCategory,
        recentEvents,
        telemetryDirectory: this.telemetryDir,
        auditDirectory: this.auditDir,
        sessionId: this.sessionId,
        isEnabled: this.isEnabled
      }
    } catch (error) {
      console.error('Failed to generate telemetry summary:', error)
      return null
    }
  }

  async searchLogs(query: {
    text?: string
    type?: 'telemetry' | 'audit' | 'crash'
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<any[]> {
    try {
      let searchDirs: string[] = []

      if (!query.type || query.type === 'telemetry') searchDirs.push(this.telemetryDir)
      if (!query.type || query.type === 'audit') searchDirs.push(this.auditDir)
      if (!query.type || query.type === 'crash')
        searchDirs.push(join(app.getPath('userData'), 'logs'))

      let results: any[] = []
      const limit = query.limit || 100

      for (const dir of searchDirs) {
        try {
          const files = await fs.readdir(dir)

          for (const file of files.slice(-10)) {
            // Recent files only
            const content = await fs.readFile(join(dir, file), 'utf8')
            const lines = content
              .trim()
              .split('\n')
              .filter((l) => l.trim())

            for (const line of lines) {
              try {
                const record = JSON.parse(line)

                // Apply filters
                if (query.startDate && record.timestamp < query.startDate) continue
                if (query.endDate && record.timestamp > query.endDate) continue
                if (query.text) {
                  const searchText = JSON.stringify(record).toLowerCase()
                  if (!searchText.includes(query.text.toLowerCase())) continue
                }

                results.push({
                  ...record,
                  sourceFile: file,
                  sourceDir: dir
                })

                if (results.length >= limit) break
              } catch (parseError) {
                // Skip malformed entries
              }
            }

            if (results.length >= limit) break
          }

          if (results.length >= limit) break
        } catch (dirError) {
          // Skip inaccessible directories
        }
      }

      return results.slice(0, limit)
    } catch (error) {
      console.error('Failed to search logs:', error)
      return []
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (enabled && !this.flushInterval) {
      this.startFlushTimer()
    } else if (!enabled && this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
      this.flush() // Final flush
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    await this.flush()
  }
}

export const telemetry = new TelemetryManager()

// Graceful shutdown handling
process.on('beforeExit', () => {
  telemetry.shutdown()
})
