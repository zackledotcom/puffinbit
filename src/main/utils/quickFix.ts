#!/usr/bin/env node

/**
 * Quick Fix Script for Console EPIPE Errors
 *
 * This script updates the most critical console.log statements
 * in key service files to prevent EPIPE errors.
 */

import { migrateConsoleStatementsInFile } from './consoleMigration'
import { join } from 'path'

const CRITICAL_FILES = [
  'src/main/services/ollamaService.ts',
  'src/main/services/chromaService.ts',
  'src/main/services/memoryService.ts',
  'src/main/streaming/streamingService.ts'
]

async function applyCriticalFixes(): Promise<void> {
  console.log('🔧 Applying critical fixes for EPIPE errors...')

  const baseDir = process.cwd()

  for (const file of CRITICAL_FILES) {
    const filePath = join(baseDir, file)
    try {
      const migrated = await migrateConsoleStatementsInFile(filePath)
      if (migrated) {
        console.log(`✅ Fixed console statements in: ${file}`)
      } else {
        console.log(`ℹ️  No console statements found in: ${file}`)
      }
    } catch (error) {
      console.error(`❌ Failed to fix: ${file}`, error)
    }
  }

  console.log('🎉 Critical fixes completed!')
}

// Run if called directly
if (require.main === module) {
  applyCriticalFixes().catch(console.error)
}

export { applyCriticalFixes }
