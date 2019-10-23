import { AxiosError } from 'axios';
export declare class RevAiApiError {
    statusCode: number;
    title: string;
    detail?: string;
    type?: string;
    constructor(e: AxiosError);
}
export declare class InvalidParameterError extends RevAiApiError {
    parameters: {};
    constructor(e: AxiosError);
}
export declare class InvalidStateError extends RevAiApiError {
    currentValue: string;
    allowedValues: string[];
    constructor(e: AxiosError);
}
export declare class InsufficientCreditsError extends RevAiApiError {
    currentBalance: number;
    constructor(e: AxiosError);
}
