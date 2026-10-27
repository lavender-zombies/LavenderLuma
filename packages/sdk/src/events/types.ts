import type { LavenderLumaApiClient } from '../client/api-client.js';
import type {
    JsonObject,
    OneBotMessageEvent,
    OutgoingMessage,
    RequestOptions,
    SendMessageResult,
    LavenderLumaEvent,
} from '../types/index.js';

export type MaybePromise<T = void> = T | Promise<T>;
export type EventNext = () => Promise<void>;

export type EventPredicate<TEvent extends LavenderLumaEvent = LavenderLumaEvent> = (
    event: LavenderLumaEvent,
) => event is TEvent;

export type EventHandler<
    TEvent extends LavenderLumaEvent = LavenderLumaEvent,
    TContext extends LavenderLumaEventContext<TEvent> = LavenderLumaEventContext<TEvent>,
> = (event: TEvent, context: TContext) => MaybePromise;

export type EventMiddleware<TContext extends LavenderLumaEventContext = LavenderLumaEventContext> = (
    event: LavenderLumaEvent,
    context: TContext,
    next: EventNext,
) => MaybePromise;

export interface RequestDecisionOptions extends RequestOptions {
    reason?: string;
    subType?: string;
}

export interface LavenderLumaEventContext<TEvent extends LavenderLumaEvent = LavenderLumaEvent> {
    readonly event: TEvent;
    readonly client: LavenderLumaApiClient;
    readonly stopped: boolean;
    stopPropagation(): void;
    reply(
        message: OutgoingMessage,
        options?: RequestOptions & { autoEscape?: boolean },
    ): Promise<unknown>;
    approve(options?: RequestDecisionOptions): Promise<unknown>;
    reject(reason?: string, options?: RequestDecisionOptions): Promise<unknown>;
    quickOperation(operation: JsonObject, options?: RequestOptions): Promise<unknown>;
}

/** Contexts supplied by the SDK include explicit quoted replies. */
export interface LavenderLumaEventContextWithQuote<
    TEvent extends LavenderLumaEvent = LavenderLumaEvent,
> extends LavenderLumaEventContext<TEvent> {
    /** Quotes this message and sends the body to the same group or private conversation. */
    quote(
        message: OutgoingMessage,
        options?: RequestOptions & { autoEscape?: boolean },
    ): Promise<SendMessageResult>;
}

export interface CommandOptions {
    prefixes?: string | string[];
    trim?: boolean;
    caseSensitive?: boolean;
}

export interface CommandMatch {
    command: string;
    text: string;
    args: string[];
    rest: string;
    prefix: string;
    match: RegExpMatchArray | null;
}

export type CommandHandler<
    TEvent extends OneBotMessageEvent = OneBotMessageEvent,
    TContext extends LavenderLumaEventContext<TEvent> = LavenderLumaEventContext<TEvent>,
> = (
    event: TEvent,
    context: TContext & { command: CommandMatch },
    match: CommandMatch,
) => MaybePromise;
