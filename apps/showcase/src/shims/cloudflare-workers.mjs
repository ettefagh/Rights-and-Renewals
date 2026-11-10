/**
 * Shim for 'cloudflare:workers' to allow Astro SSR static prerendering in Node.js
 * without throwing "Received protocol 'cloudflare:'" while preserving runtime compatibility.
 */
export const env = new Proxy({}, {
	get(target, prop) {
		if (typeof globalThis !== 'undefined' && globalThis.__CF_ENV__ && globalThis.__CF_ENV__[prop]) {
			return globalThis.__CF_ENV__[prop];
		}
		return target[prop];
	}
});

export const waitUntil = (promise) => {
	if (promise && typeof promise.then === 'function') {
		promise.catch(() => {});
	}
};

export class WorkerGlobalScope {}

export class ExecutionContext {
	waitUntil(promise) {}
	passThroughOnException() {}
}

export default { env, waitUntil, WorkerGlobalScope, ExecutionContext };
