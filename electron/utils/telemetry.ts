import { PostHog } from 'posthog-node';
import { machineIdSync } from 'node-machine-id';
import { app } from 'electron';
import { getSetting, setSetting } from './store';
import { logger } from './logger';

const REMOTE_TELEMETRY_ENABLED = false;
// const POSTHOG_API_KEY = 'phc_aGNegeJQP5FzNiF2rEoKqQbkuCpiiETMttplibXpB0n';
// const POSTHOG_HOST = 'https://us.i.posthog.com';
const TELEMETRY_SHUTDOWN_TIMEOUT_MS = 1500;

let posthogClient: PostHog | null = null;
let distinctId: string = '';

function isIgnorablePostHogShutdownError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const message = `${error.name} ${error.message}`.toLowerCase();
    if (
        message.includes('posthogfetchnetworkerror') ||
        message.includes('network error while fetching posthog') ||
        message.includes('timeouterror') ||
        message.includes('aborted due to timeout') ||
        message.includes('fetch failed')
    ) {
        return true;
    }

    return 'cause' in error && error.cause !== error
        ? isIgnorablePostHogShutdownError(error.cause)
        : false;
}

/**
 * Initialize PostHog telemetry
 */
export async function initTelemetry(): Promise<void> {
    try {
        if (!REMOTE_TELEMETRY_ENABLED) {
            logger.info('Remote telemetry is disabled at build time');
            return;
        }

        const telemetryEnabled = await getSetting('telemetryEnabled');
        if (!telemetryEnabled) {
            logger.info('Telemetry is disabled in settings');
            return;
        }

        // Initialize PostHog client
        posthogClient = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });

        // Get or generate machine ID
        distinctId = await getSetting('machineId');
        if (!distinctId) {
            distinctId = machineIdSync();
            await setSetting('machineId', distinctId);
            logger.debug(`Generated new machine ID for telemetry: ${distinctId}`);
        }

        // Common properties for all events
        const properties = {
            $app_version: app.getVersion(),
            $os: process.platform,
            arch: process.arch,
        };

        // Check if this is a new installation
        const hasReportedInstall = await getSetting('hasReportedInstall');
        if (!hasReportedInstall) {
            posthogClient.capture({
                distinctId,
                event: 'app_installed',
                properties,
            });
            await setSetting('hasReportedInstall', true);
            logger.info('Reported app_installed event');
        }

        // Always report app opened
        posthogClient.capture({
            distinctId,
            event: 'app_opened',
            properties,
        });
        logger.debug('Reported app_opened event');

    } catch (error) {
        logger.error('Failed to initialize telemetry:', error);
    }
}

/**
 * Best-effort telemetry shutdown that never blocks app exit on network issues.
 */
export async function shutdownTelemetry(): Promise<void> {
    const client = posthogClient;
    posthogClient = null;
    distinctId = '';

    if (!client) {
        return;
    }

    let didTimeout = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const shutdownPromise = client.shutdown().catch((error) => {
        if (isIgnorablePostHogShutdownError(error)) {
            logger.debug('Ignored telemetry shutdown network error:', error);
            return;
        }
        throw error;
    });

    try {
        await Promise.race([
            shutdownPromise,
            new Promise<void>((resolve) => {
                timeoutHandle = setTimeout(() => {
                    didTimeout = true;
                    resolve();
                }, TELEMETRY_SHUTDOWN_TIMEOUT_MS);
            }),
        ]);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }

        if (didTimeout) {
            logger.debug(`Skipped waiting for telemetry shutdown after ${TELEMETRY_SHUTDOWN_TIMEOUT_MS}ms`);
            return;
        }

        logger.debug('Flushed telemetry events on shutdown');
    } catch (error) {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
        logger.error('Error shutting down telemetry:', error);
    }
}
