import * as React from "react"
import { Copy } from "phosphor-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "next-themes"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"

type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const { theme } = useTheme()
  const language = className?.replace("language-", "") || "plaintext"
  const content = typeof children === "string" ? children : React.Children.toArray(children).join("")

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast({ title: "Copied to clipboard" })
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" })
    }
  }

  return (
    <div className="relative group border rounded-md overflow-hidden bg-muted/30">
      <ScrollArea className="max-h-[320px] w-full">
        <SyntaxHighlighter
          language={language}
          style={theme === "dark" ? oneDark : oneLight}
          customStyle={{
            background: "transparent",
            fontSize: "0.875rem",
            padding: "1rem",
            margin: 0,
          }}
        >
          {content}
        </SyntaxHighlighter>
      </ScrollArea>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleCopy}
        >
          <Copy size={14} />
        </Button>
      </div>
    </div>
  )
}