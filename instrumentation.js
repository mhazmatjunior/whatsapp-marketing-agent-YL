export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { startScheduler } = await import('@/lib/scheduler');
            startScheduler();
        } catch (err) {
            console.error('[Instrumentation] Failed to load background scheduler:', err);
        }
    }
}
