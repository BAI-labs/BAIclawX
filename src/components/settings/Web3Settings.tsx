/**
 * Web3 / AgentWallet settings — horizontal card layout (Host API).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, Shield, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { hostApiFetch } from '@/lib/host-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { trackUiEvent } from '@/lib/telemetry';
import { useProviderStore } from '@/stores/providers';
import { hasConfiguredCredentials, pickPreferredAccount } from '@/lib/provider-accounts';
import { brandHeadingStyle } from '@/lib/brand';
import { CreateAgentWalletWizard } from './CreateAgentWalletWizard';
import { useGatewayStore } from '@/stores/gateway';

type AgentWalletRow = {
  id: string;
  address: string;
  network: string;
  isActive: boolean;
  label?: string;
};

export function Web3Settings() {
  const { t } = useTranslation('settings');
  const accounts = useProviderStore((s) => s.accounts);
  const statuses = useProviderStore((s) => s.statuses);
  const defaultAccountId = useProviderStore((s) => s.defaultAccountId);
  const providersLoading = useProviderStore((s) => s.loading);
  const refreshProviderSnapshot = useProviderStore((s) => s.refreshProviderSnapshot);
  const { restart: restartGateway } = useGatewayStore();

  const accountList = Array.isArray(accounts) ? accounts : [];
  const statusList = Array.isArray(statuses) ? statuses : [];

  const [wallets, setWallets] = useState<AgentWalletRow[]>([]);
  const [vaultUnlockRequired, setVaultUnlockRequired] = useState(false);
  const [savedPasswordMismatch, setSavedPasswordMismatch] = useState(false);
  const [vaultTopologyIncomplete, setVaultTopologyIncomplete] = useState(false);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [providersReady, setProvidersReady] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showBankOfAiKeyWarning, setShowBankOfAiKeyWarning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentWalletRow | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [walletStoragePath, setWalletStoragePath] = useState<string | null>(null);

  /** Ignore stale GET /api/agent-wallets results when an older request finishes after a newer one (e.g. mount + post-create refresh). */
  const walletListFetchGen = useRef(0);

  const statusById = useMemo(
    () => new Map(statusList.map((s) => [s.id, s])),
    [statusList],
  );

  const bankOfAiAccount = useMemo(
    () => pickPreferredAccount(accountList, defaultAccountId, 'bai', statusById),
    [accountList, defaultAccountId, statusById],
  );

  const bankOfAiAccountId = bankOfAiAccount?.id ?? '';

  const hasBankOfAiKey = useMemo(
    () =>
      accountList.some(
        (a) => a.vendorId === 'bai' && hasConfiguredCredentials(a, statusById.get(a.id)),
      ),
    [accountList, statusById],
  );

  const displayWallet = useMemo(() => {
    if (wallets.length === 0) return null;
    return wallets.find((w) => w.isActive) ?? wallets[0];
  }, [wallets]);

  const refreshWallets = useCallback(async () => {
    const gen = ++walletListFetchGen.current;
    try {
      const data = await hostApiFetch<{
        success: boolean;
        wallets?: AgentWalletRow[];
        vaultUnlockRequired?: boolean;
        savedPasswordMismatch?: boolean;
        vaultTopologyIncomplete?: boolean;
        storagePath?: string;
      }>('/api/agent-wallets');
      if (gen !== walletListFetchGen.current) return;
      setWallets(data.wallets ?? []);
      setVaultUnlockRequired(Boolean(data.vaultUnlockRequired));
      setSavedPasswordMismatch(Boolean(data.savedPasswordMismatch));
      setVaultTopologyIncomplete(Boolean(data.vaultTopologyIncomplete));
      setWalletStoragePath(typeof data.storagePath === 'string' ? data.storagePath : null);
    } catch (error) {
      if (gen !== walletListFetchGen.current) return;
      toast.error(`${t('web3.loadFailed')}: ${toUserMessage(error)}`);
      setWallets([]);
      setVaultUnlockRequired(false);
      setSavedPasswordMismatch(false);
      setVaultTopologyIncomplete(false);
      setWalletStoragePath(null);
    } finally {
      if (gen === walletListFetchGen.current) {
        setWalletsLoading(false);
      }
    }
  }, [t]);

  const submitVaultUnlock = async () => {
    const pw = unlockPassword.trim();
    if (!pw) {
      toast.error(t('web3.vaultUnlockPasswordRequired'));
      return;
    }
    setUnlockSubmitting(true);
    try {
      await hostApiFetch('/api/agent-wallets/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPassword: pw }),
      });
      setUnlockPassword('');
      toast.success(t('web3.vaultUnlockSuccess'));
      await refreshWallets();
    } catch (error) {
      toast.error(`${t('web3.vaultUnlockFailed')}: ${toUserMessage(error)}`);
    } finally {
      setUnlockSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void refreshProviderSnapshot().finally(() => {
      if (!cancelled) setProvidersReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshProviderSnapshot]);

  useEffect(() => {
    void refreshWallets();
  }, [refreshWallets]);

  useEffect(() => {
    if (hasBankOfAiKey) {
      setShowBankOfAiKeyWarning(false);
    }
  }, [hasBankOfAiKey]);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t('web3.copied'));
    } catch (error) {
      toast.error(String(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hostApiFetch(`/api/agent-wallets/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      toast.success(t('web3.deleteSuccess'));
      trackUiEvent('settings.agent_wallet_deleted');
      setDeleteTarget(null);
      await refreshWallets();
      restartGateway();
    } catch (error) {
      toast.error(`${t('web3.deleteFailed')}: ${toUserMessage(error)}`);
    }
  };

  const loading = walletsLoading || providersLoading || !providersReady;
  const canOpenWizard =
    providersReady
    && Boolean(bankOfAiAccountId)
    && !walletsLoading
    && !vaultUnlockRequired;

  const handleOpenWizard = useCallback(() => {
    if (!hasBankOfAiKey) {
      setShowBankOfAiKeyWarning(true);
      return;
    }
    if (!canOpenWizard) {
      return;
    }
    setShowBankOfAiKeyWarning(false);
    setShowWizard(true);
  }, [canOpenWizard, hasBankOfAiKey]);

  return (
    <div>
      <h2 className="text-3xl font-serif text-foreground mb-6 font-normal tracking-tight" style={brandHeadingStyle}>
        {t('web3.sectionTitle')}
      </h2>

      <div
        className={cn(
          'flex flex-col gap-4 px-5 py-4 sm:px-6 sm:flex-row sm:items-center',
        )}
      >
        <div className="flex items-center gap-4 min-w-0 sm:flex-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
          <Wallet className="h-6 w-6 text-foreground" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-foreground leading-tight">
            {t('web3.agentWalletTitle')}
          </p>
          {loading ? (
            <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              {t('common:status.loading')}
            </div>
          ) : vaultUnlockRequired ? (
            <p className="mt-1 text-[13px] text-muted-foreground leading-snug">
              {t('web3.vaultUnlockSubtitle')}
            </p>
          ) : savedPasswordMismatch ? (
            <p className="mt-1 text-[13px] text-muted-foreground leading-snug">
              {t('web3.savedPasswordMismatchSubtitle')}
            </p>
          ) : !displayWallet ? (
            <p className="mt-1 text-[13px] text-muted-foreground">{t('web3.notCreatedSubtitle')}</p>
          ) : (
            <div className="mt-1 flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-mono text-muted-foreground truncate">
                {displayWallet.address}
              </span>
              <button
                type="button"
                onClick={() => void copyAddress(displayWallet.address)}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors"
                aria-label={t('web3.copyAddress')}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        </div>

        <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2 sm:pl-2">
          {(vaultUnlockRequired || savedPasswordMismatch) && !loading ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
              <Input
                type="password"
                autoComplete="current-password"
                placeholder={t(savedPasswordMismatch ? 'web3.savedPasswordMismatchPasswordPlaceholder' : 'web3.vaultUnlockPasswordPlaceholder')}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitVaultUnlock();
                }}
                className="h-10 rounded-xl"
                disabled={unlockSubmitting}
              />
              <Button
                type="button"
                onClick={() => void submitVaultUnlock()}
                disabled={unlockSubmitting}
                className={cn(
                  'rounded-full h-10 px-5 gap-2 font-medium shadow-sm',
                  'bg-[#0a84ff] hover:bg-[#007aff] text-white',
                  'disabled:opacity-50 disabled:pointer-events-none',
                )}
              >
                {unlockSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Shield className="h-4 w-4 text-white" strokeWidth={2} />
                )}
                {t(savedPasswordMismatch ? 'web3.savedPasswordMismatchSubmit' : 'web3.vaultUnlockSubmit')}
              </Button>
            </div>
          ) : null}

          {!displayWallet && !loading && !vaultUnlockRequired ? (
            <Button
              type="button"
              onClick={handleOpenWizard}
              disabled={!providersReady || walletsLoading}
              className={cn(
                'rounded-full h-10 px-5 gap-2 font-medium shadow-sm',
                'bg-[#0a84ff] hover:bg-[#007aff] text-white',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              <Shield className="h-4 w-4 text-white" strokeWidth={2} />
              {t('web3.createWallet')}
            </Button>
          ) : null}

          {displayWallet && !loading ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteTarget(displayWallet)}
              className="rounded-full h-10 px-5 gap-2 font-medium shadow-sm"
            >
              <Shield className="h-4 w-4" strokeWidth={2} />
              {t('web3.deleteWallet')}
            </Button>
          ) : null}
        </div>
      </div>

      {walletStoragePath && !walletsLoading ? (
        <p className="mt-2 text-[12px] text-muted-foreground leading-snug break-all hidden">
          {t('web3.storagePathHint', { path: walletStoragePath })}
        </p>
      ) : null}

      {vaultTopologyIncomplete && !walletsLoading && !displayWallet ? (
        <p className="mt-2 text-left text-[13px] text-amber-800 dark:text-amber-400 leading-snug rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
          {t('web3.vaultTopologyIncompleteBanner')}
        </p>
      ) : null}

      {savedPasswordMismatch && !walletsLoading ? (
        <p className="mt-2 text-left text-[13px] text-amber-800 dark:text-amber-400 leading-snug rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
          {t('web3.savedPasswordMismatchBanner')}
        </p>
      ) : null}

      {providersReady && !displayWallet && !walletsLoading && !vaultUnlockRequired && showBankOfAiKeyWarning && !hasBankOfAiKey ? (
        <p className="mt-2 text-left text-[13px] text-red-600 dark:text-red-500 leading-snug max-w-full sm:ml-[0%]">
          {t('web3.bankOfAiKeyWarning')}
        </p>
      ) : null}

      {showWizard && bankOfAiAccountId ? (
        <CreateAgentWalletWizard
          open={showWizard}
          bankOfAiAccountId={bankOfAiAccountId}
          onClose={() => setShowWizard(false)}
          onSuccess={refreshWallets}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('web3.deleteConfirmTitle')}
        message={deleteTarget ? t('web3.deleteConfirmMessage', { id: deleteTarget.id }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
