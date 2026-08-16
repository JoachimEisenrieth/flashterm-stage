export const BootstrapState = Object.freeze({
    STARTING: 'starting',
    READY: 'ready',
    DEGRADED: 'degraded',
    FAILED: 'failed'
});

const STATE_VALUES = new Set(Object.values(BootstrapState));

const MESSAGES = {
    'de-DE': {
        starting: 'flashterm stage wird gestartet ...',
        degraded: 'flashterm stage ist nur eingeschränkt verfügbar. Einige Daten konnten nicht geladen werden.',
        failed: 'flashterm stage konnte nicht gestartet werden. Bitte versuche es erneut.',
        retry: 'Erneut versuchen'
    },
    'en-GB': {
        starting: 'flashterm stage is starting ...',
        degraded: 'flashterm stage is only partially available. Some data could not be loaded.',
        failed: 'flashterm stage could not be started. Please try again.',
        retry: 'Try again'
    }
};

function getMessages(guiLanguage) {
    return MESSAGES[guiLanguage] ?? MESSAGES['en-GB'];
}

export function getBootstrapPresentation(state, guiLanguage) {
    if (!STATE_VALUES.has(state)) {
        throw new TypeError(`Unknown bootstrap state: ${state}`);
    }

    const messages = getMessages(guiLanguage);
    const isFailed = state === BootstrapState.FAILED;
    const isDegraded = state === BootstrapState.DEGRADED;

    return {
        state,
        message: messages[state] ?? '',
        retryLabel: messages.retry,
        showLoading: state === BootstrapState.STARTING,
        showStatus: isFailed || isDegraded,
        showRetry: isFailed || isDegraded,
        enableDataControls: state === BootstrapState.READY || isDegraded,
        role: isFailed ? 'alert' : 'status',
        ariaLive: isFailed ? 'assertive' : 'polite'
    };
}

export function createInitializationGuard() {
    let isRunning = false;

    return {
        get isRunning() {
            return isRunning;
        },

        async run(task) {
            if (isRunning) {
                return false;
            }
            if (typeof task !== 'function') {
                throw new TypeError('Initialization task must be a function.');
            }

            isRunning = true;
            try {
                await task();
                return true;
            } finally {
                isRunning = false;
            }
        }
    };
}
