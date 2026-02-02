export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface ApiError {
    success: false;
    message: string;
    error?: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;