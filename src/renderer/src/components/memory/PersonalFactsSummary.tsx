import React, { useState, useEffect } from 'react'
import { User, Brain, Plus, Edit, Trash, Eye, Tag } from 'phosphor-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'

interface PersonalFact {
  id: string
  category: string
  fact: string
  source: 'user_provided' | 'conversation_learned' | 'manually_added'
  confidence: number
  created_at: string
  last_verified: string
}

interface PersonalFactsSummaryProps {
  className?: string
}

const PersonalFactsSummary: React.FC<PersonalFactsSummaryProps> = ({ className }) => {
  const [facts, setFacts] = useState<PersonalFact[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingFact, setEditingFact] = useState<PersonalFact | null>(null)
  const [newFact, setNewFact] = useState({
    category: '',
    fact: ''
  })

  const categories = [
    'Personal Info',
    'Preferences', 
    'Skills',
    'Goals',
    'Work',
    'Interests',
    'Background',
    'Other'
  ]

  const loadPersonalFacts = async () => {
    setLoading(true)
    try {
      // Search for personal facts in memory
      const response = await window.api.searchMemory('personal profile user about me', 20)
      
      if (response && response.length > 0) {
        const extractedFacts = response
          .filter((item: any) => item.metadata?.type === 'personal_fact' || 
                                 item.content?.toLowerCase().includes('i am') ||
                                 item.content?.toLowerCase().includes('my name') ||
                                 item.content?.toLowerCase().includes('i like') ||
                                 item.content?.toLowerCase().includes('i work'))
          .map((item: any, index: number) => ({
            id: item.id || `fact-${index}`,
            category: item.metadata?.category || inferCategory(item.content || item.text || ''),
            fact: item.content || item.text || '',
            source: item.metadata?.source || 'conversation_learned',
            confidence: item.score || 0.8,
            created_at: item.timestamp || new Date().toISOString(),
            last_verified: item.timestamp || new Date().toISOString()
          }))
        
        setFacts(extractedFacts)
      } else {
        setFacts([])
      }
    } catch (error) {
      console.error('Failed to load personal facts:', error)
      setFacts([])
    } finally {
      setLoading(false)
    }
  }

  const inferCategory = (content: string): string => {
    const text = content.toLowerCase()
    if (text.includes('name') || text.includes('age') || text.includes('live') || text.includes('from')) {
      return 'Personal Info'
    }
    if (text.includes('like') || text.includes('prefer') || text.includes('favorite')) {
      return 'Preferences'
    }
    if (text.includes('work') || text.includes('job') || text.includes('company')) {
      return 'Work'
    }
    if (text.includes('skill') || text.includes('good at') || text.includes('expert')) {
      return 'Skills'
    }
    if (text.includes('goal') || text.includes('want') || text.includes('planning')) {
      return 'Goals'
    }
    if (text.includes('hobby') || text.includes('interest') || text.includes('enjoy')) {
      return 'Interests'
    }
    return 'Other'
  }

  useEffect(() => {
    loadPersonalFacts()
  }, [])

  const handleAddFact = async () => {
    if (!newFact.fact.trim() || !newFact.category) return

    try {
      const factId = `personal-fact-${Date.now()}`
      
      // Store as a personal fact in memory
      await window.api.memoryManager?.storeMemory?.(newFact.fact, {
        type: 'personal_fact',
        category: newFact.category,
        source: 'manually_added',
        user_verified: true
      })

      // Add to local state
      const newPersonalFact: PersonalFact = {
        id: factId,
        category: newFact.category,
        fact: newFact.fact,
        source: 'manually_added',
        confidence: 1.0,
        created_at: new Date().toISOString(),
        last_verified: new Date().toISOString()
      }

      setFacts(prev => [newPersonalFact, ...prev])
      setNewFact({ category: '', fact: '' })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to add personal fact:', error)
    }
  }

  const handleDeleteFact = async (factId: string) => {
    try {
      // Remove from memory if possible
      // Note: This would need to be implemented in the backend
      setFacts(prev => prev.filter(fact => fact.id !== factId))
    } catch (error) {
      console.error('Failed to delete personal fact:', error)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSourceIcon = (source: PersonalFact['source']) => {
    switch (source) {
      case 'user_provided':
        return <User size={12} className="text-blue-500" />
      case 'conversation_learned':
        return <Brain size={12} className="text-purple-500" />
      case 'manually_added':
        return <Plus size={12} className="text-green-500" />
    }
  }

  const factsByCategory = facts.reduce((acc, fact) => {
    if (!acc[fact.category]) acc[fact.category] = []
    acc[fact.category].push(fact)
    return acc
  }, {} as Record<string, PersonalFact[]>)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center">
            <User size={20} className="mr-2" />
            What I Know About You
          </h2>
          <p className="text-sm text-muted-foreground">
            Personal facts and preferences learned from our conversations
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Add Fact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Personal Fact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={newFact.category}
                  onChange={(e) => setNewFact(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="fact">Fact</Label>
                <Textarea
                  id="fact"
                  value={newFact.fact}
                  onChange={(e) => setNewFact(prev => ({ ...prev, fact: e.target.value }))}
                  placeholder="Enter a personal fact (e.g., 'I work as a software engineer')"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddFact}
                  disabled={!newFact.fact.trim() || !newFact.category}
                >
                  Add Fact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Facts by Category */}
      {loading ? (
        <div className="text-center py-8">
          <Brain size={24} className="animate-pulse mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Loading personal facts...</p>
        </div>
      ) : Object.keys(factsByCategory).length === 0 ? (
        <Alert>
          <User size={16} />
          <AlertDescription>
            No personal facts found yet. Start a conversation or add facts manually to build your profile.
          </AlertDescription>
        </Alert>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {Object.entries(factsByCategory).map(([category, categoryFacts]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Tag size={16} className="mr-2" />
                    {category}
                    <Badge variant="outline" className="ml-2">
                      {categoryFacts.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryFacts.map((fact) => (
                    <div key={fact.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm mb-2">{fact.fact}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getSourceIcon(fact.source)}
                            <span className="capitalize">{fact.source.replace('_', ' ')}</span>
                            <span>•</span>
                            <span className={getConfidenceColor(fact.confidence)}>
                              {(fact.confidence * 100).toFixed(0)}% confidence
                            </span>
                            <span>•</span>
                            <span>{new Date(fact.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFact(fact.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export default PersonalFactsSummary
