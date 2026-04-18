/**
 * Chat Page
 * Native React implementation communicating with OpenClaw Gateway
 * via gateway:rpc IPC. Session selector, thinking toggle, and refresh
 * are in the toolbar; messages render with markdown + streaming.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, type RawMessage } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { useProviderStore } from '@/stores/providers';
import { useWeb3Store } from '@/stores/web3';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatToolbar } from './ChatToolbar';
import { extractImages, extractText, extractThinking, extractToolUse } from './message-utils';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useStickToBottomInstant } from '@/hooks/use-stick-to-bottom-instant';
import { useMinLoading } from '@/hooks/use-min-loading';
import { Button } from '@/components/ui/button';
import { getChatProviderGate } from '@/lib/provider-policy';

export function Chat() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';
  const providerAccounts = useProviderStore((s) => s.accounts);
  const defaultAccountId = useProviderStore((s) => s.defaultAccountId);
  const refreshProviderSnapshot = useProviderStore((s) => s.refreshProviderSnapshot);
  const managedWeb3Packs = useWeb3Store((s) => s.managedPacks);
  const refreshWeb3 = useWeb3Store((s) => s.refresh);
  const web3Entitlement = useWeb3Store((s) => s.entitlement);

  const messages = useChatStore((s) => s.messages);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const showThinking = useChatStore((s) => s.showThinking);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const pendingFinal = useChatStore((s) => s.pendingFinal);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortRun = useChatStore((s) => s.abortRun);
  const clearError = useChatStore((s) => s.clearError);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const cleanupEmptySession = useChatStore((s) => s.cleanupEmptySession);

  const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);
  const [providerGateReady, setProviderGateReady] = useState(false);
  const minLoading = useMinLoading(loading && messages.length > 0);
  const { contentRef, scrollRef } = useStickToBottomInstant(currentSessionKey);

  // Load data when gateway is running.
  // When the store already holds messages for this session (i.e. the user
  // is navigating *back* to Chat), use quiet mode so the existing messages
  // stay visible while fresh data loads in the background.  This avoids
  // an unnecessary messages → spinner → messages flicker.
  useEffect(() => {
    return () => {
      // If the user navigates away without sending any messages, remove the
      // empty session so it doesn't linger as a ghost entry in the sidebar.
      cleanupEmptySession();
    };
  }, [cleanupEmptySession]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    let cancelled = false;
    void refreshProviderSnapshot().finally(() => {
      if (!cancelled) {
        setProviderGateReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshProviderSnapshot]);

  useEffect(() => {
    void refreshWeb3();
  }, [refreshWeb3]);

  // Update timestamp when sending starts
  useEffect(() => {
    if (sending && streamingTimestamp === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreamingTimestamp(Date.now() / 1000);
    } else if (!sending && streamingTimestamp !== 0) {
      setStreamingTimestamp(0);
    }
  }, [sending, streamingTimestamp]);

  // Gateway not running block has been completely removed so the UI always renders.

  const streamMsg = streamingMessage && typeof streamingMessage === 'object'
    ? streamingMessage as unknown as { role?: string; content?: unknown; timestamp?: number }
    : null;
  const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
  const hasStreamText = streamText.trim().length > 0;
  const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
  const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
  const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
  const hasStreamTools = streamTools.length > 0;
  const streamImages = streamMsg ? extractImages(streamMsg) : [];
  const hasStreamImages = streamImages.length > 0;
  const hasStreamToolStatus = streamingTools.length > 0;
  const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);
  const hasAnyStreamContent = hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus;

  const isEmpty = messages.length === 0 && !sending;
  const providerGate = getChatProviderGate(providerAccounts, defaultAccountId);
  const chatBlocked = providerGateReady && providerGate.blocked;

  return (
    <div className={cn("relative flex flex-col -m-6 transition-colors duration-500 dark:bg-background")} style={{ height: 'calc(100vh - 2.5rem)' }}>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-end px-4 py-2">
        <ChatToolbar />
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div ref={contentRef} className="max-w-4xl mx-auto space-y-4">
          {chatBlocked ? (
            <ChatProviderGate
              title={providerGate.reason === 'default_not_allowed'
                ? t('providerGate.defaultRequiredTitle')
                : t('providerGate.missingTitle')}
              description={providerGate.reason === 'default_not_allowed'
                ? t('providerGate.defaultRequiredDescription')
                : t('providerGate.missingDescription')}
              cta={t('providerGate.openModels')}
              onOpenModels={() => navigate('/models')}
            />
          ) : isEmpty ? (
            <WelcomeScreen managedWeb3Packs={managedWeb3Packs} web3Locked={!web3Entitlement?.canUseManagedWeb3Skills} />
          ) : (
            <>
              {managedWeb3Packs.length > 0 && (
                <ManagedWeb3Card packs={managedWeb3Packs} />
              )}
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || `msg-${idx}`}
                  message={msg}
                  showThinking={showThinking}
                />
              ))}

              {/* Streaming message */}
              {shouldRenderStreaming && (
                <ChatMessage
                  message={(streamMsg
                    ? {
                        ...(streamMsg as Record<string, unknown>),
                        role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'],
                        content: streamMsg.content ?? streamText,
                        timestamp: streamMsg.timestamp ?? streamingTimestamp,
                      }
                    : {
                        role: 'assistant',
                        content: streamText,
                        timestamp: streamingTimestamp,
                      }) as RawMessage}
                  showThinking={showThinking}
                  isStreaming
                  streamingTools={streamingTools}
                />
              )}

              {/* Activity indicator: waiting for next AI turn after tool execution */}
              {sending && pendingFinal && !shouldRenderStreaming && (
                <ActivityIndicator phase="tool_processing" />
              )}

              {/* Typing indicator when sending but no stream content yet */}
              {sending && !pendingFinal && !hasAnyStreamContent && (
                <TypingIndicator />
              )}
            </>
          )}
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
            <button
              onClick={clearError}
              className="text-xs text-destructive/60 hover:text-destructive underline"
            >
              {t('common:actions.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        onStop={abortRun}
        disabled={!isGatewayRunning || chatBlocked}
        sending={sending}
        isEmpty={isEmpty}
      />

      {/* Transparent loading overlay */}
      {minLoading && !sending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-xl pointer-events-auto">
          <div className="bg-background shadow-lg rounded-full p-2.5 border border-border">
            <LoadingSpinner size="md" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Welcome Screen ──────────────────────────────────────────────

function WelcomeScreen({
  managedWeb3Packs,
  web3Locked,
}: {
  managedWeb3Packs: Array<{
    id: string;
    title: string;
    description: string;
    docsUrl: string;
    locked: boolean;
    enabled: boolean;
    configured: boolean;
  }>;
  web3Locked: boolean;
}) {
  const { t } = useTranslation('chat');
  const quickActions = [
    { key: 'askQuestions', label: t('welcome.askQuestions') },
    { key: 'creativeTasks', label: t('welcome.creativeTasks') },
    { key: 'brainstorming', label: t('welcome.brainstorming') },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center h-[60vh]">
      <h1 className="text-4xl md:text-5xl font-serif text-foreground/80 mb-8 font-normal tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        {t('welcome.subtitle')}
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg w-full">
        {quickActions.map(({ key, label }) => (
          <button 
            key={key}
            className="px-4 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-[13px] font-medium text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors bg-black/[0.02]"
          >
            {label}
          </button>
        ))}
      </div>

      {managedWeb3Packs.length > 0 && (
        <div className="mt-12 w-full max-w-xl">
          <ManagedWeb3Card packs={managedWeb3Packs} lockedOverride={web3Locked} />
        </div>
      )}
    </div>
  );
}

function ManagedWeb3Card({
  packs,
  lockedOverride,
}: {
  packs: Array<{
    id: string;
    title: string;
    description: string;
    docsUrl: string;
    locked: boolean;
    enabled: boolean;
    configured: boolean;
  }>;
  lockedOverride?: boolean;
}) {
  const { t } = useTranslation('chat');
  const locked = lockedOverride ?? packs.every((pack) => pack.locked);

  return (
    <div className="rounded-[28px] border border-black/10 dark:border-white/10 bg-background/95 px-6 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[28px] font-serif tracking-tight text-foreground">
            {t('web3.title', { defaultValue: 'Web3 Skills' })}
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {locked
              ? t('web3.lockedDescription', { defaultValue: 'Upgrade to Pro or Max to unlock the managed Web3 skill packs.' })
              : t('web3.unlockedDescription', { defaultValue: 'Managed Web3 packs are ready in this conversation.' })}
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {packs.map((pack) => (
          <div key={pack.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-semibold text-foreground">{pack.title}</p>
                <span className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                  pack.locked
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : pack.enabled
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-black/5 text-muted-foreground',
                )}>
                  {pack.locked
                    ? t('web3.locked', { defaultValue: 'Locked' })
                    : pack.enabled
                      ? t('web3.enabled', { defaultValue: 'Enabled' })
                      : t('web3.available', { defaultValue: 'Available' })}
                </span>
                {!pack.configured && !pack.locked && (
                  <span className="inline-flex rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t('web3.needsConfig', { defaultValue: 'Needs config' })}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{pack.description}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 rounded-full"
              onClick={() => void window.electron?.openExternal?.(pack.docsUrl)}
            >
              {t('web3.viewDocs', { defaultValue: 'View docs' })}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatProviderGate({
  title,
  description,
  cta,
  onOpenModels,
}: {
  title: string;
  description: string;
  cta: string;
  onOpenModels: () => void;
}) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
        <AlertCircle className="h-6 w-6 text-foreground/70" />
      </div>
      <h1 className="mb-3 text-3xl font-normal tracking-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
        {title}
      </h1>
      <p className="mb-6 max-w-md text-[15px] text-foreground/70">
        {description}
      </p>
      <Button onClick={onOpenModels} className="rounded-full px-6">
        {cta}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1 bg-black/5 dark:bg-white/5 text-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-black/5 dark:bg-white/5 text-foreground rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Activity Indicator (shown between tool cycles) ─────────────

function ActivityIndicator({ phase }: { phase: 'tool_processing' }) {
  void phase;
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1 bg-black/5 dark:bg-white/5 text-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-black/5 dark:bg-white/5 text-foreground rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Processing tool results…</span>
        </div>
      </div>
    </div>
  );
}

export default Chat;
