import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import {
  Brain,
  Clock,
  Trash,
  ArrowsClockwise,
  Warning,
  CheckCircle,
  Gear,
  Eye,
  EyeSlash
} from 'phosphor-react'
import { useMemoryService, useSettingsService } from '../hooks/useServices'

interface AdvancedMemoryPanelProps {
  isOpen: boolean
  onClose: () => void
}

const AdvancedMemoryPanel: React.FC<AdvancedMemoryPanelProps> = ({ isOpen, onClose }) => {
  const [showDetails, setShowDetails] = useState(false)

  // Use centralized services
  const {
    memoryStore,
    loading: memoryLoading,
    clearMemory,
    updateSettings: updateMemorySettings
  } = useMemoryService()
  const { settings, loading: settingsLoading, saveSettings } = useSettingsService()

  const loading = memoryLoading || settingsLoading

  const handleMemoryToggle = async (enabled: boolean) => {
    if (!settings) return

    const updatedSettings = {
      ...settings,
      memorySettings: {
        ...settings.memorySettings,
        enabled
      }
    }

    await saveSettings(updatedSettings)
    await updateMemorySettings(enabled)
  }

  const handleClearMemory = async () => {
    if (window.confirm('Are you sure you want to clear all memory? This cannot be undone.')) {
      await clearMemory()
    }
  }

  const handleRetentionChange = async (retentionDays: number) => {
    if (!settings) return

    const updatedSettings = {
      ...settings,
      memorySettings: {
        ...settings.memorySettings,
        retentionDays
      }
    }

    await saveSettings(updatedSettings)
    await updateMemorySettings(settings.memorySettings.enabled, retentionDays)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getMemoryHealth = (): { status: string; color: string; icon: React.ReactNode } => {
    if (!memoryStore) return { status: 'Unknown', color: 'gray', icon: <Warning /> }

    if (!memoryStore.settings.enabled) {
      return { status: 'Disabled', color: 'yellow', icon: <Warning /> }
    }

    const summaryCount = memoryStore.summaries.length
    const maxSummaries = memoryStore.settings.maxSummaries

    if (summaryCount < maxSummaries * 0.5) {
      return { status: 'Healthy', color: 'green', icon: <CheckCircle /> }
    } else if (summaryCount < maxSummaries * 0.8) {
      return { status: 'Good', color: 'blue', icon: <CheckCircle /> }
    } else {
      return { status: 'High Usage', color: 'orange', icon: <Warning /> }
    }
  }

  if (!isOpen) return null

  const health = getMemoryHealth()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain size={24} className="text-blue-600" />
            Advanced Memory Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Memory Health Overview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-${health.color}-500`} />
                Memory System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {memoryStore?.summaries.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Summaries Stored</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {memoryStore?.maxSummaries || 0}
                  </div>
                  <div className="text-sm text-gray-600">Max Capacity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {settings?.memory.retentionDays || 0}
                  </div>
                  <div className="text-sm text-gray-600">Retention Days</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${health.color}-600`}>
                    {health.status}
                  </div>
                  <div className="text-sm text-gray-600">Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Settings */}
          <Card className="bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gear size={20} />
                Memory Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable/Disable Memory */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Memory System</h3>
                  <p className="text-sm text-gray-600">
                    Enable conversation memory and context retention
                  </p>
                </div>
                <Switch
                  checked={settings?.memory.enabled || false}
                  onCheckedChange={handleMemoryToggle}
                  disabled={loading}
                />
              </div>

              <Separator />

              {/* Auto-summarize Threshold */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-summarize Threshold</h3>
                  <p className="text-sm text-gray-600">
                    Automatically summarize after {settings?.memory.autoSummarizeThreshold || 20}{' '}
                    messages
                  </p>
                </div>
                <Badge variant="outline">
                  {settings?.memory.autoSummarizeThreshold || 20} messages
                </Badge>
              </div>

              <Separator />

              {/* Retention Settings */}
              <div className="space-y-3">
                <h3 className="font-medium">Retention Period</h3>
                <div className="flex gap-2">
                  {[7, 14, 30, 60, 90].map((days) => (
                    <Button
                      key={days}
                      variant={settings?.memory.retentionDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleRetentionChange(days)}
                      disabled={loading}
                      className="bg-white/60"
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Summaries */}
          <Card className="bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={20} />
                  Memory Summaries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="bg-white/60"
                  >
                    {showDetails ? <EyeSlash size={16} /> : <Eye size={16} />}
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearMemory}
                    disabled={loading || !memoryStore?.summaries.length}
                    className="bg-white/60 text-red-600 hover:text-red-700"
                  >
                    <Trash size={16} />
                    Clear All
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowsClockwise size={24} className="animate-spin text-blue-500" />
                  <span className="ml-2">Loading memory data...</span>
                </div>
              ) : !memoryStore?.summaries.length ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No memory summaries yet</p>
                  <p className="text-sm">Summaries will appear after conversations</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {memoryStore.summaries
                    .slice(-10)
                    .reverse()
                    .map((summary, index) => (
                      <div key={summary.id} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {summary.messageCount} messages
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(summary.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {showDetails && (
                              <>
                                <p className="text-sm text-gray-700 mb-2">{summary.summary}</p>

                                {summary.topics.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-xs font-medium text-gray-600">
                                      Topics:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {summary.topics.map((topic, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {summary.keyFacts.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">
                                      Key Facts:
                                    </span>
                                    <ul className="text-xs text-gray-600 mt-1 ml-4">
                                      {summary.keyFacts.slice(0, 3).map((fact, i) => (
                                        <li key={i} className="list-disc">
                                          {fact}
                                        </li>
                                      ))}
                                      {summary.keyFacts.length > 3 && (
                                        <li className="list-disc text-gray-400">
                                          +{summary.keyFacts.length - 3} more...
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AdvancedMemoryPanel
