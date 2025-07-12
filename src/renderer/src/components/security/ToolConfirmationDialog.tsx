import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { ShieldWarning, Warning, Info } from 'phosphor-react'

export interface ToolConfirmationData {
  id: string
  toolKey: string
  agentName: string
  context: string
  riskLevel: 'safe' | 'moderate' | 'dangerous' | 'critical'
  description: string
}

interface ToolConfirmationDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  data: ToolConfirmationData | null
}

const ToolConfirmationDialog: React.FC<ToolConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  data
}) => {
  if (!data) return null

  const { toolKey, agentName, context, riskLevel, description } = data

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'dangerous':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'dangerous':
        return <ShieldWarning size={24} className="text-red-500" />
      case 'moderate':
        return <Warning size={24} className="text-yellow-500" />
      default:
        return <Info size={24} className="text-blue-500" />
    }
  }

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            {getRiskIcon(riskLevel)}
            <div>
              <AlertDialogTitle>Agent Permission Request</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Agent "{agentName}" wants to use: {toolKey}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Risk Level:</span>
              <Badge className={getRiskColor(riskLevel)}>{riskLevel.toUpperCase()}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div>
            <span className="text-sm font-medium">Context:</span>
            <p className="text-sm text-muted-foreground mt-1">{context}</p>
          </div>

          {(riskLevel === 'critical' || riskLevel === 'dangerous') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ This tool can potentially harm your system. Only allow if you trust this
                operation completely.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Deny</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              riskLevel === 'critical'
                ? 'bg-red-600 hover:bg-red-700'
                : riskLevel === 'dangerous'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : ''
            }
          >
            Allow
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ToolConfirmationDialog
