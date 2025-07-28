import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="bg-black text-white box-border flex h-full flex-col overflow-hidden"
      style={{
        ["--thread-max-width" as string]: "42rem",
      }}
    >
      <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-black px-4 pt-8">
        <ThreadWelcome />

        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            EditComposer: EditComposer,
            AssistantMessage: AssistantMessage,
          }}
        />

        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 flex-grow" />
        </ThreadPrimitive.If>

        <div className="sticky bottom-0 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-black/95 relative" style={{ transform: 'translateY(-10px)' }}>
          {/* Dot pattern background for input area */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-dot-white/[0.05] bg-[size:12px_12px] [mask-image:radial-gradient(300px_circle_at_center,white,transparent)]" />
          </div>
          
          <div className="relative z-10 w-full flex flex-col items-center">
            <ThreadScrollToBottom />
            <Composer />
          </div>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible bg-zinc-900 border-white/30 text-white hover:bg-zinc-800 hover:border-white/50"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <h1 className="text-4xl font-semibold mb-4">
            <span className="relative inline-block bg-gradient-to-r from-blue-400 via-[#B0E0E6] to-blue-500 bg-clip-text text-transparent">
              How can I help you today?
            </span>
          </h1>
          <p className="text-zinc-400 animate-pulse">
            Powered by Assistant UI + Your Puffin Backend
          </p>
        </div>
        <ThreadWelcomeSuggestions />
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadWelcomeSuggestions: FC = () => {
  return (
    <div className="mt-3 flex w-full items-stretch justify-center gap-4">
      <ThreadPrimitive.Suggestion
        className="hover:bg-zinc-800/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border border-white/30 bg-zinc-900/50 p-3 transition-colors ease-in text-white hover:border-white/50"
        prompt="What is the weather in Tokyo?"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold text-white">
          What is the weather in Tokyo?
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-zinc-800/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border border-white/30 bg-zinc-900/50 p-3 transition-colors ease-in text-white hover:border-white/50"
        prompt="Help me code a React component"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold text-white">
          Help me code a React component
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="focus-within:border-white/50 flex w-full flex-wrap items-end rounded-lg border border-white/30 bg-zinc-950 px-2.5 shadow-sm transition-colors ease-in">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder="Message Puffin..."
        className="placeholder:text-zinc-500 max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm text-white outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in text-black hover:opacity-80"
            style={{ backgroundColor: '#B0E0E6' }}
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in bg-zinc-800 text-white hover:bg-zinc-700"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4 [&:where(>*)]:col-start-2">
      <UserActionBar />

      <div className="text-white col-start-2 row-start-2 max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 rounded-br-md" style={{ backgroundColor: '#B0E0E6', color: '#000' }}>
        <MessagePrimitive.Parts />
      </div>

      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="col-start-1 row-start-2 mr-3 mt-2.5 flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-white/30">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-zinc-900 my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl border border-white/30">
      <ComposerPrimitive.Input className="text-white flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none placeholder:text-zinc-500" />

      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button className="text-black hover:opacity-80" style={{ backgroundColor: '#B0E0E6' }}>Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div className="text-white col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>

      <AssistantActionBar />

      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-zinc-400 data-[floating]:bg-zinc-950 col-start-3 row-start-2 -ml-1 flex gap-1 data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:border-white/30 data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-white/30">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-white/30">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-zinc-400 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-white/30">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium text-zinc-400">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-white/30">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      width="16"
      height="16"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
