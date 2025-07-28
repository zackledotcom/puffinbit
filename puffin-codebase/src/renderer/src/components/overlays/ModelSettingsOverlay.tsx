import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Gear,
  Brain,
  Lightning,
  Copy,
  Download,
  Upload,
  ArrowsClockwise,
  CheckCircle,
  Warning,
  Info,
  MagicWand,
  Code,
  Robot,
  Star
} from 'phosphor-react';

interface ModelSettings {
  // Core Generation Parameters
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  max_tokens: number;
  seed?: number;
  
  // System & Behavior
  system_prompt: string;
  stop_sequences: string[];
  context_length: number;
  
  // Conversation Settings
  memory_enabled: boolean;
  personality: 'professional' | 'friendly' | 'casual' | 'bro' | 'technical' | 'creative' | 'custom';
  response_style: 'concise' | 'detailed' | 'balanced';
  
  // Advanced Settings
  mirostat: number;
  mirostat_eta: number;
  mirostat_tau: number;
  tfs_z: number;
  typical_p: number;
}

interface ModelSettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  currentSettings?: Partial<ModelSettings>;
  onSaveSettings: (settings: ModelSettings) => void;
}
// Predefined personality presets
const PERSONALITY_PRESETS: Record<string, Partial<ModelSettings>> = {
  professional: {
    system_prompt: "You are a professional AI assistant. Provide clear, accurate, and well-structured responses. Maintain a formal but approachable tone.",
    temperature: 0.3,
    top_p: 0.8,
    response_style: 'detailed'
  },
  friendly: {
    system_prompt: "You are a friendly and helpful AI assistant. Be warm, encouraging, and personable in your responses while staying informative.",
    temperature: 0.7,
    top_p: 0.9,
    response_style: 'balanced'
  },
  casual: {
    system_prompt: "You are a casual, laid-back AI assistant. Respond like a knowledgeable friend - be helpful but keep things relaxed and conversational. Use natural language and don't be overly formal.",
    temperature: 0.8,
    top_p: 0.9,
    response_style: 'concise'
  },
  bro: {
    system_prompt: "You're a helpful AI bro. Keep it real, stay chill, and just answer what people ask without overthinking it. Be friendly, direct, and conversational like you're talking to a friend. No need to be fancy or analyze everything.",
    temperature: 0.7,        // ✅ Relaxed but coherent
    top_p: 0.9,              // ✅ Natural variety without chaos
    max_tokens: 2000,        // ✅ Enough for explanations, concise enough for chat
    repeat_penalty: 1.1,     // ✅ Prevent repetitive "bro" speech
    response_style: 'concise'
  },
  technical: {
    system_prompt: "You are a technical AI assistant focused on providing precise, detailed technical information. Use appropriate terminology and provide comprehensive explanations.",
    temperature: 0.2,
    top_p: 0.8,
    response_style: 'detailed'
  },
  creative: {
    system_prompt: "You are a creative AI assistant. Be imaginative, inspiring, and think outside the box. Help with creative projects and provide innovative solutions.",
    temperature: 0.9,
    top_p: 0.95,
    response_style: 'detailed'
  }
};

// Default Gemini-style settings (based on your previous configuration)
const DEFAULT_GEMINI_SETTINGS: ModelSettings = {
  temperature: 0.2,
  top_p: 0.8,
  top_k: 40,
  repeat_penalty: 1.1,
  max_tokens: 8000,
  system_prompt: "You are a helpful, knowledgeable AI assistant. Provide accurate, detailed responses while maintaining a professional yet approachable tone. Focus on being genuinely helpful and thorough in your explanations.",
  stop_sequences: [],
  context_length: 4096,
  memory_enabled: true,
  personality: 'professional',
  response_style: 'detailed',
  mirostat: 0,
  mirostat_eta: 0.1,
  mirostat_tau: 5.0,
  tfs_z: 1.0,
  typical_p: 1.0
};
export default function ModelSettingsOverlay({
  isOpen,
  onClose,
  modelName,
  currentSettings = {},
  onSaveSettings
}: ModelSettingsOverlayProps) {
  const [settings, setSettings] = useState<ModelSettings>(() => {
    // Load existing settings for this model
    const settingsKey = `model-settings-${modelName}`;
    const saved = localStorage.getItem(settingsKey);
    if (saved) {
      try {
        return { ...DEFAULT_GEMINI_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse saved model settings:', e);
      }
    }
    return { ...DEFAULT_GEMINI_SETTINGS, ...currentSettings };
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanged = JSON.stringify(settings) !== JSON.stringify({
      ...DEFAULT_GEMINI_SETTINGS,
      ...currentSettings
    });
    setHasChanges(hasChanged);
  }, [settings, currentSettings]);

  const updateSetting = <K extends keyof ModelSettings>(
    key: K,
    value: ModelSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPersonalityPreset = (personality: string) => {
    if (personality === 'custom') return;
    
    const preset = PERSONALITY_PRESETS[personality];
    if (preset) {
      setSettings(prev => ({
        ...prev,
        ...preset,
        personality: personality as ModelSettings['personality']
      }));
    }
  };
  const resetToDefaults = () => {
    setSettings(DEFAULT_GEMINI_SETTINGS);
  };

  const saveSettings = () => {
    // Save to localStorage for now (could be improved to use IPC)
    const settingsKey = `model-settings-${modelName}`;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    
    onSaveSettings(settings);
    setHasChanges(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Gear className="w-5 h-5 text-white" />
            </div>
            <div>
              <span>Model Settings</span>
              <p className="text-sm text-gray-500 font-normal mt-1">
                Configure {modelName} • {hasChanges ? 'Unsaved changes' : 'Saved'}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Adjust model parameters, personality, and behavior settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="personality">Personality</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Basic Settings Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightning className="w-4 h-4" />
                        Generation Parameters
                      </CardTitle>
                    </CardHeader>                    <CardContent className="space-y-4">
                      <div>
                        <Label>Temperature: {settings.temperature}</Label>
                        <p className="text-xs text-gray-500 mb-2">Controls randomness (0.0 = focused, 1.0 = creative)</p>
                        <Slider
                          value={[settings.temperature]}
                          onValueChange={([value]) => updateSetting('temperature', value)}
                          min={0}
                          max={1}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label>Top P: {settings.top_p}</Label>
                        <p className="text-xs text-gray-500 mb-2">Nucleus sampling threshold</p>
                        <Slider
                          value={[settings.top_p]}
                          onValueChange={([value]) => updateSetting('top_p', value)}
                          min={0.1}
                          max={1}
                          step={0.05}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label>Max Tokens: {settings.max_tokens}</Label>
                        <p className="text-xs text-gray-500 mb-2">Maximum response length</p>
                        <Slider
                          value={[settings.max_tokens]}
                          onValueChange={([value]) => updateSetting('max_tokens', value)}
                          min={100}
                          max={16000}
                          step={100}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label>Repeat Penalty: {settings.repeat_penalty}</Label>
                        <p className="text-xs text-gray-500 mb-2">Prevents repetitive responses</p>
                        <Slider
                          value={[settings.repeat_penalty]}
                          onValueChange={([value]) => updateSetting('repeat_penalty', value)}
                          min={0.8}
                          max={1.5}
                          step={0.05}
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Personality Tab */}
                <TabsContent value="personality" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Robot className="w-4 h-4" />
                        Personality Presets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select
                        value={settings.personality}
                        onValueChange={(value) => {
                          updateSetting('personality', value as ModelSettings['personality']);
                          applyPersonalityPreset(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="bro">Bro Mode 😎</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>

                      <div>
                        <Label>Response Style</Label>
                        <Select
                          value={settings.response_style}
                          onValueChange={(value) => updateSetting('response_style', value as ModelSettings['response_style'])}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="concise">Concise</SelectItem>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Conversation Memory</Label>
                          <p className="text-xs text-gray-500">Remember previous messages</p>
                        </div>
                        <Switch
                          checked={settings.memory_enabled}
                          onCheckedChange={(checked) => updateSetting('memory_enabled', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>System Prompt</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={settings.system_prompt}
                        onChange={(e) => updateSetting('system_prompt', e.target.value)}
                        placeholder="Define how the AI should behave and respond..."
                        className="h-32"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Advanced Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Top K: {settings.top_k}</Label>
                        <p className="text-xs text-gray-500 mb-2">Limits token selection to top K choices</p>
                        <Slider
                          value={[settings.top_k]}
                          onValueChange={([value]) => updateSetting('top_k', value)}
                          min={1}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Settings Preview Panel */}
          <div className="w-80">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-sm">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Creativity</span>
                    <Badge variant={settings.temperature > 0.7 ? 'default' : 'secondary'}>
                      {settings.temperature > 0.7 ? 'High' : settings.temperature > 0.4 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Response Length</span>
                    <Badge variant="outline">
                      {settings.max_tokens > 4000 ? 'Long' : settings.max_tokens > 1000 ? 'Medium' : 'Short'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="text-xs space-y-2">
                  <div className="font-medium">Personality</div>
                  <div className="text-gray-600 capitalize">{settings.personality}</div>
                  <div className="text-gray-600 capitalize">{settings.response_style} responses</div>
                </div>

                {hasChanges && (
                  <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                    <Warning className="w-3 h-3 inline mr-1" />
                    Unsaved changes
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={resetToDefaults}
            variant="outline"
            disabled={!hasChanges}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={saveSettings}
            disabled={false}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}