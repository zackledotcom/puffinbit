/**
 * Console Migration Utility for Puffer
 *
 * This utility helps migrate console.* statements to safe logging
 * throughout the codebase to prevent EPIPE errors.
 */

import { promises as fs } from 'fs'
import { join } from 'path'

const SAFE_LOGGER_IMPORT =
  "import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'"

interface ConsoleReplacement {
  from: string
  to: string
}

const CONSOLE_REPLACEMENTS: ConsoleReplacement[] = [
  { from: 'console.log', to: 'safeLog' },
  { from: 'console.error', to: 'safeError' },
  { from: 'console.warn', to: 'safeWarn' },
  { from: 'console.info', to: 'safeInfo' }
]

export async function migrateConsoleStatementsInFile(filePath: string): Promise<boolean> {
  try {
    let content = await fs.readFile(filePath, 'utf-8')
    let hasConsoleStatements = false
    let modified = false

    // Check if file has console statements
    for (const replacement of CONSOLE_REPLACEMENTS) {
      if (content.includes(replacement.from)) {
        hasConsoleStatements = true
        break
      }
    }

    if (!hasConsoleStatements) {
      return false // No changes needed
    }

    // Add safe logger import if not present and file has console statements
    if (!content.includes('safeLog') && !content.includes("from '@utils/safeLogger'")) {
      // Find the last import statement
      const lines = content.split('\n')
      let lastImportIndex = -1

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('const ')) {
          lastImportIndex = i
        }
      }

      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, SAFE_LOGGER_IMPORT)
        content = lines.join('\n')
        modified = true
      }
    }

    // Replace console statements
    for (const replacement of CONSOLE_REPLACEMENTS) {
      if (content.includes(replacement.from)) {
        content = content.replace(new RegExp(replacement.from, 'g'), replacement.to)
        modified = true
      }
    }

    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8')
      return true
    }

    return false
  } catch (error) {
    console.error(`Failed to migrate console statements in ${filePath}:`, error)
    return false
  }
}

export async function migrateConsoleStatementsInDirectory(dirPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        await migrateConsoleStatementsInDirectory(fullPath)
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        const migrated = await migrateConsoleStatementsInFile(fullPath)
        if (migrated) {
          console.log(`✅ Migrated console statements in: ${fullPath}`)
        }
      }
    }
  } catch (error) {
    console.error(`Failed to process directory ${dirPath}:`, error)
  }
}

// Export for manual usage
export { CONSOLE_REPLACEMENTS, SAFE_LOGGER_IMPORT }
