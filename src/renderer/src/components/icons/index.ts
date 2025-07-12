// Icon mapping for phosphor-react naming fixes
import {
  Brain,
  Code,
  Database,
  Users,
  Warning,
  Info,
  Play,
  Stop,
  Plus,
  Trash,
  Eye,
  Gear,
  Download,
  Upload,
  Copy,
  Lightning,
  Robot,
  MagicWand,
  FileCode,
  ShieldWarning,
  FlowArrow,
  GitBranch,
  WifiHigh,
  CaretDown,
  ArrowsClockwise,
  Clock,
  Activity,
  CheckCircle,
  HardDrive,
  Cpu,
  Thermometer
} from 'phosphor-react'

// Export all standard icons
export {
  Brain,
  Code,
  Database,
  Users,
  Warning,
  Info,
  Play,
  Stop,
  Plus,
  Trash,
  Eye,
  Gear,
  Download,
  Upload,
  Copy,
  Lightning,
  Robot,
  MagicWand,
  FileCode,
  ShieldWarning,
  FlowArrow,
  GitBranch,
  WifiHigh,
  CaretDown,
  ArrowsClockwise,
  Clock,
  Activity,
  CheckCircle,
  HardDrive,
  Cpu,
  Thermometer
}

// Common naming fixes - export correct names with problematic aliases
export const ShieldAlert = ShieldWarning // Fix: ShieldAlert -> ShieldWarning
export const Workflow = FlowArrow // Fix: Workflow -> FlowArrow
export const Settings = Gear // Fix: Settings -> Gear
export const Wand = MagicWand // Fix: Wand -> MagicWand

// Re-export everything else from phosphor-react
export * from 'phosphor-react'
