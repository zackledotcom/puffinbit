// downloadPuffinFiles.mjs
import fetch from 'node-fetch'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Replace with your actual file IDs and desired filenames
const files = [
  { id: 'file-LM4buUusT83LH7tH96wq63', name: 'puffin-codebase.zip' },
  { id: 'file-8jX6uBMsrCKKrfhMpm2BxF', name: 'AnalyticsIntegration.tsx' },
  { id: 'file-YXNurDvRjWxgUWnZB2Abx5', name: 'ModelAnalyticsDashboard.tsx' },
  { id: 'file-6d38Pw6Y6AT9Lts4wgJ798', name: 'CanvasPanel.tsx' },
  { id: 'file-KwpjRX1M3r83mSUsCtukdT', name: 'CanvasView.tsx' },
  { id: 'file-EV4R9yTBGc6pRc3utS8NKc', name: 'CodeCanvas.tsx' },
  { id: 'file-AKx4UDes9hTKP54aQGHzHK', name: 'MonacoCanvasEditor.tsx' },
  { id: 'file-NNhEKyCPYoH8gks8LDZPMk', name: 'ChatCanvas.tsx' },
  { id: 'file-PHKS9SaLH6G6rjysUEbvxL', name: 'FileTree.tsx' },
  { id: 'file-5HiAskbarCWZtS5wxAoT15', name: 'FileTree_v2.tsx' },
  { id: 'file-VCphCn8B2Pnw2u5pkBV81D', name: 'chromaService.ts' },
  { id: 'file-Sy1oWUX8yXxa6cGNB1VcTA', name: 'memoryService.ts' },
  { id: 'file-HpYcLNKctxXMJkAr2sg4Vs', name: 'modelAnalytics.ts' },
  { id: 'file-JqA39yHB4NiYNUMF8DTkP3', name: 'modelTuningService.ts.backup' },
  { id: 'file-HB7SUHYBTpGV1w1h5ntT64', name: 'ollamaService.ts' }
]
const downloadDir = path.join(__dirname, 'puffin-ui-session')
const downloadFile = async (file) => {
  const url = `https://files.openai.com/${file.id}/content`
  const res = await fetch(url, {
    headers: {
      // Use your OpenAI session cookie here if authentication is needed
    }
  })
  if (!res.ok) {
    throw new Error(`Failed to download ${file.name}: ${res.statusText}`)
  }
  const buffer = await res.buffer()
  await writeFile(path.join(downloadDir, file.name), buffer)
  console.log(`✅ Downloaded: ${file.name}`)
}
const run = async () => {
  try {
    await mkdir(downloadDir, { recursive: true })
    for (const file of files) {
      await downloadFile(file)
    }
    console.log('\n🎉 All files downloaded to:', downloadDir)
  } catch (err) {
    console.error('❌ Error downloading files:', err)
  }
}
run()