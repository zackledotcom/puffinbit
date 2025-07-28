import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { AppSettings } from '../../../types/settings'
import type { Message } from '../types/chat'

const StorageTest: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // Test loading settings
      const loadedSettings = await window.api.getSettings()
      setSettings(loadedSettings)
      console.log('Loaded settings:', loadedSettings)

      // Test loading chat history
      const loadedHistory = await window.api.getChatHistory()
      setChatHistory(loadedHistory)
      console.log('Loaded chat history:', loadedHistory)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const testSaveSettings = async () => {
    if (!settings) return

    try {
      const updatedSettings = {
        ...settings,
        theme: settings.theme === 'light' ? 'dark' : ('light' as const)
      }

      await window.api.saveSettings(updatedSettings)
      setSettings(updatedSettings)
      console.log('Settings updated successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const testAddMessage = async () => {
    try {
      const newMessage: Message = {
        id: `test-${Date.now()}`,
        role: 'user',
        content: `Test message at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString()
      }

      await window.api.addMessageToHistory(newMessage)
      setChatHistory((prev) => [...prev, newMessage])
      console.log('Message added successfully')
    } catch (error) {
      console.error('Error adding message:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>🔒 Secure Storage Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={loadData} disabled={loading}>
              {loading ? 'Loading...' : 'Load Data'}
            </Button>
            <Button onClick={testSaveSettings} disabled={!settings}>
              Toggle Theme
            </Button>
            <Button onClick={testAddMessage}>Add Test Message</Button>
          </div>

          {settings && (
            <div className="space-y-2">
              <h3 className="font-semibold">Current Settings:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm">
                {JSON.stringify(settings, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Chat History ({chatHistory.length} messages):</h3>
            <div className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto">
              {chatHistory.length === 0 ? (
                <p>No messages in history</p>
              ) : (
                chatHistory.map((msg) => (
                  <div key={msg.id} className="mb-2 border-b pb-1">
                    <strong>{msg.role}:</strong> {msg.content}
                    <br />
                    <small className="text-gray-600">
                      {new Date(msg.timestamp).toLocaleString()}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StorageTest
