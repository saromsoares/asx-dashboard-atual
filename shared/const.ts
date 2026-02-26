/** Cookie name for session JWT */
export const COOKIE_NAME = "asx_session";

/** Error messages matching tRPC middleware */
export const UNAUTHED_ERR_MSG = "Não autenticado. Faça login novamente.";
export const NOT_ADMIN_ERR_MSG = "Acesso restrito a administradores.";

/** Timeout for external HTTP requests (ms) */
export const AXIOS_TIMEOUT_MS = 15_000;

/** Session / cookie durations */
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
