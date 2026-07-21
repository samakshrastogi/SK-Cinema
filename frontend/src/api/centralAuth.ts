const centralApiUrl = (import.meta.env.VITE_SK_CENTRAL_AUTH_URL || "https://www.sk-hub.in/api").replace(/\/$/, "");
export const CENTRAL_LOGIN_URL = import.meta.env.VITE_SK_CENTRAL_LOGIN_URL || "https://www.sk-hub.in/login";
export const CENTRAL_PROFILE_URL = import.meta.env.VITE_SK_CENTRAL_PROFILE_URL || "https://www.sk-hub.in/profile";

export type CentralProfile = { name: string; email: string; avatarUrl?: string; avatarInitials?: string };
export class CentralAuthError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = "CentralAuthError";
        this.status = status;
    }
}
let appTokenPromise: Promise<string> | null = null;
let centralProfile: CentralProfile | null = null;
export const getCentralProfile = () => centralProfile;

export const redirectToCentralLogin = () => {
    window.location.assign(`${CENTRAL_LOGIN_URL}?returnTo=${encodeURIComponent(window.location.href)}`);
};

export const requestCentralAppToken = async () => {
    if (appTokenPromise) return appTokenPromise;
    appTokenPromise = (async () => {
        let lastError: unknown;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 20_000);
            try {
                const response = await fetch(`${centralApiUrl}/auth/app-token?appId=sk-mediaflow`, {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                    cache: "no-store",
                    signal: controller.signal,
                });
                if (response.status === 401 || response.status === 403) throw new CentralAuthError("SK Central login required", response.status);
                if (!response.ok) throw new CentralAuthError(`SK Central token request failed (${response.status})`, response.status);
                const result = await response.json() as { data?: { token?: string; user?: CentralProfile } };
                if (!result.data?.token) throw new CentralAuthError("SK Central did not return an application token");
                centralProfile = result.data.user ?? null;
                return result.data.token;
            } catch (error) {
                lastError = error;
                if (error instanceof CentralAuthError && (error.status === 401 || error.status === 403)) throw error;
                if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 750));
            } finally {
                window.clearTimeout(timeout);
            }
        }
        throw lastError instanceof Error ? lastError : new CentralAuthError("Unable to reach SK Central");
    })().finally(() => { appTokenPromise = null; });
    return appTokenPromise;
};

export const getCentralSessionState = async (): Promise<boolean | null> => {
    try {
        const response = await fetch(`${centralApiUrl}/auth/me`, {
            credentials: "include",
            headers: { Accept: "application/json" },
            cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) return false;
        if (!response.ok) return null;
        const result = await response.json() as { data?: { authenticated?: boolean } };
        return result.data?.authenticated === true;
    } catch {
        return null;
    }
};
