import type { ApiResponse, UploadFileStreamComplete } from './types/index.js';

/** Base error for every exception intentionally thrown by the LavenderLuma SDK. */
export class LavenderLumaError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LavenderLumaError';
    }
}

/** A one-step media operation failed. The original error is preserved as cause. */
export class LavenderLumaMediaSendError extends LavenderLumaError {
    readonly stage: 'upload' | 'send';
    /** Present after a completed upload, even when sending fails or is cancelled. */
    readonly upload?: UploadFileStreamComplete;

    constructor(stage: 'upload' | 'send', cause: unknown, upload?: UploadFileStreamComplete) {
        super(`Media ${stage} failed${cause instanceof Error ? `: ${cause.message}` : ''}`, {
            cause,
        });
        this.name = 'LavenderLumaMediaSendError';
        this.stage = stage;
        this.upload = upload;
    }
}

/** Transport-layer failures before a valid OneBot API response is available. */
export class LavenderLumaTransportError extends LavenderLumaError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LavenderLumaTransportError';
    }
}

/** The request was cancelled by the caller's AbortSignal. */
export class LavenderLumaAbortError extends LavenderLumaTransportError {
    constructor(message = 'LavenderLuma request aborted', options?: ErrorOptions) {
        super(message, options);
        this.name = 'LavenderLumaAbortError';
    }
}

/** The request exceeded the configured timeout. */
export class LavenderLumaTimeoutError extends LavenderLumaTransportError {
    readonly timeoutMs: number;

    constructor(message: string, timeoutMs: number, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LavenderLumaTimeoutError';
        this.timeoutMs = timeoutMs;
    }
}

/** The SDK could not establish or keep a connection to LavenderLuma. */
export class LavenderLumaConnectionError extends LavenderLumaTransportError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LavenderLumaConnectionError';
    }
}

/** LavenderLuma returned a payload that could not be parsed as the expected protocol shape. */
export class LavenderLumaParseError extends LavenderLumaTransportError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LavenderLumaParseError';
    }
}

/** A OneBot API response with status failed or a non-zero retcode. */
export class LavenderLumaApiError<TData = unknown> extends LavenderLumaError {
    readonly response: ApiResponse<TData>;
    readonly retcode: number;
    readonly wording?: string;

    constructor(response: ApiResponse<TData>) {
        super(response.wording || `LavenderLuma API failed with retcode ${response.retcode}`);
        this.name = 'LavenderLumaApiError';
        this.response = response;
        this.retcode = response.retcode;
        this.wording = response.wording;
    }
}

/** Authentication or authorization failure returned by LavenderLuma. */
export class LavenderLumaAuthError<TData = unknown> extends LavenderLumaApiError<TData> {
    constructor(response: ApiResponse<TData>) {
        super(response);
        this.name = 'LavenderLumaAuthError';
    }
}

export function createLavenderLumaApiError<TData>(
    response: ApiResponse<TData>,
): LavenderLumaApiError<TData> {
    return isAuthFailure(response)
        ? new LavenderLumaAuthError(response)
        : new LavenderLumaApiError(response);
}

function isAuthFailure(response: ApiResponse<unknown>): boolean {
    return response.retcode === 1401 || response.retcode === 401 || response.retcode === 403;
}
