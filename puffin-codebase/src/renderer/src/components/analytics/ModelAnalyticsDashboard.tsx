import React from 'react'

interface ModelAnalyticsDashboardProps {
  analytics?: any
  className?: string
}

// Temporary stub to fix TypeScript compilation
// TODO: Restore full analytics dashboard implementation
const ModelAnalyticsDashboard: React.FC<ModelAnalyticsDashboardProps> = ({
  analytics,
  className
}) => {
  return (
    <div className={className}>
      <div className="p-4 text-muted-foreground">Analytics Dashboard (temporarily disabled)</div>
    </div>
  )
}

export default ModelAnalyticsDashboard
