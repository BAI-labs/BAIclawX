const VERIFY_URL = 'https://chat.b.ai/webapi/apikey/verify';

type VerifyResponse = {
  valid?: boolean;
};

/**
 * Validate a BAI API key for a wallet address.
 * Only `{ "valid": true }` is considered success.
 */
export async function verifyBankOfAiApiKeyByWalletAddress(
  walletAddress: string,
  apiKey: string,
): Promise<boolean> {
  const wa = walletAddress.trim();
  const key = apiKey.trim();
  if (!wa || !key) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        wallet_address: wa,
        api_key: key,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const json = (await res.json()) as VerifyResponse;
    return json?.valid === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
