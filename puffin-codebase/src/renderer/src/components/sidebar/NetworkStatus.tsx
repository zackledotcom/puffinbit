import React from 'react'
import { WifiHigh as Wifi, WifiSlash, Cloud, Monitor } from 'phosphor-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface NetworkStatusProps {
  isOnline: boolean
  isCloudMode: boolean
  onToggleMode: () => void
  pingLatency?: number
  lastSync?: Date
}

export default function NetworkStatus({
  isOnline,
  isCloudMode,
  onToggleMode,
  pingLatency,
  lastSync
}: NetworkStatusProps) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={16} className="text-green-500" />
            ) : (
              <WifiSlash size={16} className="text-red-500" />
            )}
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={onToggleMode} className="gap-2">
            {isCloudMode ? (
              <>
                <Cloud size={14} />
                Cloud
              </>
            ) : (
              <>
                <Monitor size={14} />
                Local
              </>
            )}
          </Button>
        </div>

        {pingLatency && (
          <div className="text-xs text-muted-foreground mt-2">Ping: {pingLatency}ms</div>
        )}

        {lastSync && isCloudMode && (
          <div className="text-xs text-muted-foreground mt-1">
            Synced:{' '}
            {new Date().getTime() - lastSync.getTime() < 60000
              ? 'Just now'
              : lastSync.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
