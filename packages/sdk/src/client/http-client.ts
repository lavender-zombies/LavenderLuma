import {
    LavenderLumaAbortError,
    LavenderLumaConnectionError,
    LavenderLumaParseError,
    LavenderLumaTimeoutError,
    LavenderLumaTransportError,
} from '../errors.js';
import { LavenderLumaApiClient, toJsonObject } from './api-client.js';
import { createRequestAbortState, isAbortError, throwIfAborted } from '../internal/abort.js';
import { assertApiResponse } from '../internal/json.js';
import { isStreamTerminal, readHttpFrames, streamLimits } from '../internal/streaming.js';
import type {
    ActionParams,
    ActionResult,
    ApiResponse,
    JsonObject,
    RequestOptions,
    LavenderLumaAction,
    LavenderLumaClientOptions,
    LavenderLumaStreamAction,
    StreamApiResponse,
    StreamRequestOptions,
} from '../types/index.js';

/** Options for the HTTP transport client. */
export interface LavenderLumaHttpClientOptions extends LavenderLumaClientOptions {
    /** OneBot HTTP endpoint. Defaults to http://127.0.0.1:3000/. */
    baseUrl?: string;
    /** Custom fetch implementation for tests or non-standard runtimes. */
    fetch?: typeof fetch;
    /** Extra headers sent with every request. Authorization is managed by accessToken. */
    headers?: Record<string, string>;
}

/** OneBot HTTP client for LavenderLuma. */
export class LavenderLumaHttpClient extends LavenderLumaApiClient {
    readonly baseUrl: string;
    readonly accessToken?: string;
    readonly requestTimeoutMs: number;

    private readonly fetchImpl: typeof fetch;
    private readonly headers: Record<string, string>;

    constructor(options: LavenderLumaHttpClientOptions = {}) {
        super();
        this.baseUrl = options.baseUrl ?? 'http://127.0.0.1:3000/';
        this.accessToken = options.accessToken;
        this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
        this.fetchImpl = options.fetch ?? globalThis.fetch;
        this.headers = options.headers ?? {};

        if (!this.fetchImpl) {
            throw new LavenderLumaConnectionError('No fetch implementation is available');
        }
    }

    /** Sends one OneBot action over HTTP and returns the raw response envelope. */
    override async request<TAction extends LavenderLumaAction>(
        action: TAction,
        params?: ActionParams<TAction>,
        options?: RequestOptions,
    ): Promise<ApiResponse<ActionResult<TAction>>> {
        const timeoutMs = options?.timeoutMs ?? this.requestTimeoutMs;
        const abort = createRequestAbortState(timeoutMs, options?.signal);

        try {
            const response = await this.fetchImpl(this.baseUrl, {
                method: 'POST',
                headers: this.createHeaders(),
                body: JSON.stringify({
                    action,
                    params: toJsonObject(params as JsonObject | undefined),
                    echo: options?.echo,
                }),
                signal: abort.signal,
            });

            const text = await response.text();
            let parsed: unknown;

            try {
                parsed = text ? JSON.parse(text) : null;
            } catch (error) {
                throw new LavenderLumaParseError(`LavenderLuma returned non-JSON HTTP ${response.status}`, {
                    cause: error,
                });
            }

            const apiResponse = assertApiResponse(parsed) as ApiResponse<ActionResult<TAction>>;
            return apiResponse;
        } catch (error) {
            if (error instanceof LavenderLumaTransportError) {
                throw error;
            }

            if (isAbortError(error) || abort.signal.aborted) {
                if (abort.isTimedOut()) {
                    throw new LavenderLumaTimeoutError(
                        `LavenderLuma request timed out after ${timeoutMs}ms`,
                        timeoutMs,
                        { cause: error },
                    );
                }

                if (abort.isExternallyAborted()) {
                    throw new LavenderLumaAbortError('LavenderLuma request aborted', { cause: error });
                }
            }

            throw new LavenderLumaConnectionError('LavenderLuma HTTP request failed', { cause: error });
        } finally {
            abort.cleanup();
        }
    }

    override async *requestStream<TAction extends LavenderLumaStreamAction>(
        action: TAction,
        params: ActionParams<TAction>,
        options?: StreamRequestOptions,
    ): AsyncGenerator<StreamApiResponse<ActionResult<TAction>>, void, void> {
        const { maxBufferBytes } = streamLimits(options);
        const timeoutMs = options?.timeoutMs ?? this.requestTimeoutMs;
        const abort = createRequestAbortState(timeoutMs, options?.signal);

        try {
            throwIfAborted(abort.signal);
            const response = await this.fetchImpl(this.baseUrl, {
                method: 'POST',
                headers: this.createHeaders(),
                body: JSON.stringify({ action, params, echo: options?.echo }),
                signal: abort.signal,
            });

            if (!response.body) {
                throw new LavenderLumaParseError('LavenderLuma HTTP stream has no response body');
            }

            for await (const frame of readHttpFrames(response.body, maxBufferBytes, abort.signal)) {
                throwIfAborted(abort.signal);
                const terminal = isStreamTerminal(action, frame);
                yield frame as StreamApiResponse<ActionResult<TAction>>;

                if (terminal) {
                    return;
                }
            }

            throw new LavenderLumaParseError('LavenderLuma HTTP stream ended before its terminal frame');
        } catch (error) {
            if (abort.isTimedOut()) {
                throw new LavenderLumaTimeoutError(
                    `LavenderLuma stream timed out after ${timeoutMs}ms`,
                    timeoutMs,
                    { cause: error },
                );
            }

            if (abort.isExternallyAborted()) {
                throw new LavenderLumaAbortError('LavenderLuma stream aborted', { cause: error });
            }

            if (error instanceof LavenderLumaTransportError) {
                throw error;
            }

            throw new LavenderLumaConnectionError('LavenderLuma HTTP stream failed', { cause: error });
        } finally {
            abort.cleanup();
        }
    }

    private createHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.headers,
        };

        if (this.accessToken) {
            headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return headers;
    }
}

export function createHttpClient(options?: LavenderLumaHttpClientOptions): LavenderLumaHttpClient {
    return new LavenderLumaHttpClient(options);
}
