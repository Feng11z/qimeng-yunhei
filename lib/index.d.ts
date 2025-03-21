import { Context, Schema } from 'koishi';
export declare const name = "yunhei-api";
export declare const inject: string[];
export interface IApiResponse {
    info?: Array<{
        yh?: string;
        type?: string;
        note?: string;
        admin?: string;
        date?: string;
        level?: string;
    }>;
}
export interface Config {
    apiKey: string;
    endpoint: string;
    rateLimit: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
