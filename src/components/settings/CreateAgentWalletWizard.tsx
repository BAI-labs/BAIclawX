/**
 * Four-step AgentWallet creation wizard (TRON + BAI binding + master password).
 */
import { useCallback, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hostApiFetch } from '@/lib/host-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { trackUiEvent } from '@/lib/telemetry';
import { useProviderStore } from '@/stores/providers';

type Step = 0 | 1 | 2 | 3;

function isStrongMasterPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

type ValidateKeyResponse = {
  success: boolean;
  ok?: boolean;
  errorCode?: string;
  derivedAddress?: string;
  bindingSkipped?: boolean;
};

export function CreateAgentWalletWizard({
  open,
  bankOfAiAccountId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  bankOfAiAccountId: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const { t } = useTranslation('settings');
  const getAccountApiKey = useProviderStore((s) => s.getAccountApiKey);
  const [step, setStep] = useState<Step>(0);
  const [privateKey, setPrivateKey] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validatingKey, setValidatingKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [keyErrorFormat, setKeyErrorFormat] = useState(false);
  const [keyErrorMismatch, setKeyErrorMismatch] = useState(false);
  const [keyErrorNotTron, setKeyErrorNotTron] = useState(false);
  const [keyErrorNoApiKey, setKeyErrorNoApiKey] = useState(false);

  const [passwordPolicyError, setPasswordPolicyError] = useState(false);
  const [passwordMismatchError, setPasswordMismatchError] = useState(false);

  const handleBack = useCallback(() => {
    // if (step === 2 || step === 1) {
    //   setPrivateKey('');
    // }
    setStep((s) => (s - 1) as Step);
  }, [step]);

  const resetTransientErrors = useCallback(() => {
    setKeyErrorFormat(false);
    setKeyErrorMismatch(false);
    setKeyErrorNotTron(false);
    setKeyErrorNoApiKey(false);
    setPasswordPolicyError(false);
    setPasswordMismatchError(false);
  }, []);

  const handleClose = useCallback(() => {
    setStep(0);
    setPrivateKey('');
    setMasterPassword('');
    setConfirmPassword('');
    resetTransientErrors();
    onClose();
  }, [onClose, resetTransientErrors]);

  if (!open) return null;

  const handleNextFromStep0 = async () => {
    // resetTransientErrors();
    setPrivateKey('');
    setMasterPassword('');
    setStep(1);
  }

  const handleNextFromStep1 = async () => {
    // resetTransientErrors();
    setValidatingKey(true);
    try {
      const apiKey = (await getAccountApiKey(bankOfAiAccountId))?.trim() ?? '';
      if (!apiKey) {
        setKeyErrorNoApiKey(true);
        return;
      }

      const res = await hostApiFetch<ValidateKeyResponse>('/api/agent-wallets/validate-private-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: privateKey.trim(),
          api_key: apiKey,
        }),
      });
      if (!res.success || res.ok !== true) {
        const code = res.errorCode;
        if (code === 'FORMAT') setKeyErrorFormat(true);
        else if (code === 'MISMATCH') setKeyErrorMismatch(true);
        else if (code === 'NOT_TRON') setKeyErrorNotTron(true);
        else if (code === 'NO_API_KEY') setKeyErrorNoApiKey(true);
        else setKeyErrorFormat(true);
        return;
      }
      
      setMasterPassword('');
      setConfirmPassword('');
      setStep(2);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setValidatingKey(false);
    }
  };

  const handleNextFromStep2 = async () => {
    resetTransientErrors();
    if (!isStrongMasterPassword(masterPassword)) {
      setPasswordPolicyError(true);
      return;
    }
    if (masterPassword !== confirmPassword) {
      setPasswordMismatchError(true);
      return;
    }
    await handleSubmitCreate();
  };

  const handleSubmitCreate = async () => {
    setSubmitting(true);
    try {
      await hostApiFetch('/api/agent-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateKey: privateKey.trim(),
          masterPassword,
          bankOfAiAccountId,
        }),
      });
      try {
        await hostApiFetch('/api/agent-wallets/runtime-baiclaw-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterPassword }),
        });
      } catch (runtimeErr) {
        toast.error(
          `${t('web3.wizard.errors.runtimePasswordFailed')}: ${toUserMessage(runtimeErr)}`,
        );
      }
      toast.success(t('web3.createSuccess'));
      trackUiEvent('settings.agent_wallet_created');
      await onSuccess();
      setStep(3);
    } catch (error) {
      const msg = toUserMessage(error);
      if (msg.includes('WEAK_MASTER_PASSWORD')) {
        setPasswordPolicyError(true);
        setStep(2);
      } else if (msg.includes('MASTER_PASSWORD_INCORRECT')) {
        toast.error(t('web3.wizard.errors.masterPasswordIncorrect'));
        setStep(2);
      } else if (msg.includes('WALLET_ALREADY_EXISTS')) {
        toast.error(t('web3.wizard.errors.walletExists'));
        handleClose();
      } else if (msg.includes('WALLET_PERSIST_FAILED')) {
        toast.error(t('web3.wizard.errors.persistFailed'));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Match ProvidersSettings / Agents inputs: override default `border-input` hover so borders stay soft */
  const inputClass = cn(
    'h-[44px] rounded-xl text-[13px] bg-secondary',
    'border border-black/10 dark:border-white/10',
    'hover:border-black/20 dark:hover:border-white/20',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/50 focus-visible:border-blue-500',
    'shadow-sm transition-all text-foreground placeholder:text-foreground/40',
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-wallet-wizard-title"
    >
      <Card className="w-full max-w-lg rounded-3xl border-0 shadow-2xl bg-card">
        <CardHeader className="relative pb-2 shrink-0">
          <CardTitle
            id="agent-wallet-wizard-title"
            className="text-2xl font-serif font-normal"
          >
            {t('web3.wizard.title')}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            onClick={handleClose}
            aria-label={t('common:actions.close')}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 p-6">
          {step === 0 && (
            <div className="space-y-3 text-[14px] leading-relaxed text-foreground/90">
              <p className="font-medium text-foreground">{t('web3.wizard.step0.subtitle')}</p>
              <p className="text-muted-foreground whitespace-pre-line pt-0">{t('web3.wizard.step0.body')}</p>
              <button
                type="button"
                className="text-[13px] text-[#0a84ff] hover:underline text-left"
                onClick={() => {
                  void window.electron?.openExternal?.(t('web3.wizard.step0.learnMoreUrl'));
                }}
              >
                {t('web3.wizard.step0.learnMore')}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Label className="text-[13px] font-medium">{t('web3.wizard.step1.label')} {t('web3.wizard.step1.desc')}</Label>
                <button
                  type="button"
                  className="text-[12px] text-[#0a84ff] hover:underline shrink-0"
                  onClick={() => {
                    void window.electron?.openExternal?.(t('web3.wizard.step1.howToUrl'));
                  }}
                >
                  {t('web3.wizard.step1.howTo')}
                </button>
              </div>
              <Input
                type="password"
                autoComplete="off"
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value);
                  resetTransientErrors();
                }}
                placeholder={t('web3.wizard.step1.placeholder')}
                className={cn(inputClass, 'font-mono')}
              />
              {keyErrorFormat ? (
                <p className="text-[12px] text-red-600 dark:text-red-500">{t('web3.wizard.step1.errorFormat')}</p>
              ) : null}
              {keyErrorMismatch ? (
                <p className="text-[12px] text-red-600 dark:text-red-500">{t('web3.wizard.step1.errorMismatch')}</p>
              ) : null}
              {keyErrorNotTron ? (
                <p className="text-[12px] text-red-600 dark:text-red-500">{t('web3.wizard.step1.errorTronOnly')}</p>
              ) : null}
              {keyErrorNoApiKey ? (
                <p className="text-[12px] text-red-600 dark:text-red-500">{t('web3.wizard.step1.errorNoApiKey')}</p>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">{t('web3.wizard.step2.passwordLabel')}</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setPasswordPolicyError(false);
                  }}
                  className={inputClass}
                />
                <p
                  className={cn(
                    'text-[12px]',
                    passwordPolicyError ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground',
                  )}
                >
                  {t('web3.wizard.step2.policyHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">{t('web3.wizard.step2.confirmLabel')}</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordMismatchError(false);
                  }}
                  className={inputClass}
                />
                {passwordMismatchError ? (
                  <p className="text-[12px] text-red-600 dark:text-red-500">
                    {t('web3.wizard.step2.mismatchHint')}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-[12px] text-foreground/90">
                <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-500 mt-0.5" />
                <ul className="list-disc space-y-1 pl-4">
                  <li>{t('web3.wizard.step2.warningBullet1')}</li>
                  <li>{t('web3.wizard.step2.warningBullet2')}</li>
                </ul>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[16px] font-semibold text-green-600 dark:text-green-500">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                {t('web3.wizard.step3.successTitle')}
              </div>
              <p className="text-[14px] text-muted-foreground">{t('web3.wizard.step3.intro')}</p>
              <ul className="list-disc space-y-2 pl-5 text-[13px] text-foreground/85">
                <li>{t('web3.wizard.step3.example1')}</li>
                <li>{t('web3.wizard.step3.example2')}</li>
                <li>{t('web3.wizard.step3.example3')}</li>
                <li>{t('web3.wizard.step3.example4')}</li>
              </ul>
              <button
                type="button"
                className="text-[13px] text-[#0a84ff] hover:underline"
                onClick={() => {
                  void window.electron?.openExternal?.(t('web3.wizard.step3.skillsUrl'));
                }}
              >
                {t('web3.wizard.step3.learnSkills')}
              </button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3 pt-4">
          {step < 3 ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
              onClick={step === 0 ? handleClose : handleBack}
              disabled={validatingKey || submitting}
            >
              {step === 0 ? t('web3.wizard.cancel') : t('web3.wizard.back')}
            </Button>
          ) : null}

          {step === 0 ? (
            <Button
              type="button"
              className="rounded-full px-6 bg-[#0a84ff] hover:bg-[#007aff] text-white"
              onClick={() => void handleNextFromStep0()}
            >
              {t('web3.wizard.next')}
            </Button>
          ) : null}

          {step === 1 ? (
            <Button
              type="button"
              className="rounded-full px-6 bg-[#0a84ff] hover:bg-[#007aff] text-white"
              onClick={() => void handleNextFromStep1()}
              disabled={!privateKey.trim() || validatingKey}
            >
              {validatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : t('web3.wizard.next')}
            </Button>
          ) : null}

          {step === 2 ? (
            <Button
              type="button"
              className="rounded-full px-6 bg-[#0a84ff] hover:bg-[#007aff] text-white"
              onClick={() => void handleNextFromStep2()}
              disabled={submitting || !masterPassword || !confirmPassword}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('web3.wizard.next')}
            </Button>
          ) : null}

          {step === 3 ? (
            <Button
              type="button"
              className="rounded-full px-6 bg-[#0a84ff] hover:bg-[#007aff] text-white"
              onClick={handleClose}
            >
              {t('web3.wizard.finish')}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
