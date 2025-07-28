import { ToolRiskLevel } from '@/types/agents'

export const TOOL_SECURITY_REGISTRY: Record<string, ToolRiskLevel> = {
  'memory.purge': ToolRiskLevel.DANGEROUS,
  'memory.summary': ToolRiskLevel.MODERATE,
  'search.web': ToolRiskLevel.SAFE,
  'training.finetune': ToolRiskLevel.CRITICAL,
  'training.evaluate': ToolRiskLevel.MODERATE,
  'model.switch': ToolRiskLevel.MODERATE,
  'file.upload': ToolRiskLevel.MODERATE,
  'file.download': ToolRiskLevel.DANGEROUS,
  'system.shutdown': ToolRiskLevel.CRITICAL,
  'system.restart': ToolRiskLevel.CRITICAL,
  'agent.clone': ToolRiskLevel.SAFE,
  'agent.delete': ToolRiskLevel.DANGEROUS,
  'context7.query': ToolRiskLevel.SAFE,
  'magicui.generate': ToolRiskLevel.MODERATE,
  'sequentialthinking.run': ToolRiskLevel.MODERATE
}
