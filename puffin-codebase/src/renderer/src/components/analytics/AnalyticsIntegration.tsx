import React, { useState } from 'react'
import { Button } from '../ui/button'
import { ChartBar } from 'phosphor-react' // Changed from BarChart
import ModelAnalyticsDashboard from '../analytics/ModelAnalyticsDashboard'
import { useAnalyticsTracking } from '../../services/modelAnalytics'

interface AnalyticsIntegrationProps {
  models: Array<{
    id: string
    name: string
    version: string
    size: string
  }>
  selectedModel: string
}

const AnalyticsIntegration: React.FC<AnalyticsIntegrationProps> = ({ models, selectedModel }) => {
  const [showDashboard, setShowDashboard] = useState(false)
  const analytics = useAnalyticsTracking()

  // Example of how to integrate analytics tracking into your chat
  const handleChatMessage = async (prompt: string, response: string, responseTime: number) => {
    const sessionId = `session-${Date.now()}` // Would be persistent session ID

    await analytics.trackChatMessage({
      modelId: selectedModel,
      sessionId,
      prompt,
      response,
      responseTime,
      success: true // Would be based on actual success
    })
  }

  const handleUserRating = async (messageId: string, rating: number) => {
    const sessionId = `session-${Date.now()}` // Would be current session ID

    await analytics.trackUserRating({
      modelId: selectedModel,
      sessionId,
      messageId,
      rating
    })
  }

  return (
    <>
      {/* Analytics Button - Add this to your existing UI */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDashboard(true)}
        className="flex items-center gap-2"
      >
        <ChartBar size={16} />
        Analytics
      </Button>

      {/* Analytics Dashboard Modal */}
      <ModelAnalyticsDashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        selectedModel={selectedModel}
        models={models}
      />
    </>
  )
}

export default AnalyticsIntegration
