import { toast } from '@/components/ui/use-toast'

// Define context type
type ErrorContext = {
    [key: string]: string | number | boolean | null | undefined
}

// Custom error types
export class APIError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public context?: ErrorContext
    ) {
        super(message)
        this.name = 'APIError'
    }
}

export interface ErrorDetails {
    [key: string]: unknown
}

export class WhatsAppError extends Error {
    code: string
    details: ErrorDetails
    isRateLimitError: boolean

    constructor(message: string, code: string, details?: ErrorDetails) {
        super(message)
        this.name = 'WhatsAppError'
        this.code = code
        this.details = details || {}
        this.isRateLimitError =
            code === '429' || message.toLowerCase().includes('rate limit')
    }
}

export class DatabaseError extends Error {
    code: string
    details: ErrorDetails

    constructor(message: string, code: string, details?: ErrorDetails) {
        super(message)
        this.name = 'DatabaseError'
        this.code = code
        this.details = details || {}
    }
}

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// Main error handler
export const handleError = (
    error: Error,
    severity: ErrorSeverity = 'medium',
    context?: ErrorDetails
) => {
    // Log error details
    const errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        severity,
        context,
        timestamp: new Date().toISOString(),
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error Details:', errorDetails)
    }

    // TODO: Add error tracking service integration here (Sentry, LogRocket, etc.)

    // Show user-friendly toast message
    const userMessage = getUserFriendlyMessage(error)
    toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
    })

    // Optionally report to analytics
    // TODO: Add analytics tracking here
}

// Get user-friendly error messages
const getUserFriendlyMessage = (error: Error): string => {
    if (error instanceof APIError) {
        switch (error.statusCode) {
            case 401:
                return 'Your session has expired. Please log in again.'
            case 403:
                return "You don't have permission to perform this action."
            case 404:
                return 'The requested resource was not found.'
            case 429:
                return 'Too many requests. Please try again later.'
            default:
                return 'An unexpected error occurred. Please try again.'
        }
    }

    if (error instanceof WhatsAppError) {
        switch (error.code) {
            case 'message_failed':
                return 'Failed to send WhatsApp message. Please try again.'
            case 'template_invalid':
                return 'Invalid message template.'
            default:
                return 'WhatsApp message error. Please try again.'
        }
    }

    if (error instanceof DatabaseError) {
        return 'A database error occurred. Please try again.'
    }

    return 'An unexpected error occurred. Please try again.'
}

interface RetryOptions {
    retries: number
    delay: number
    onError?: (error: Error) => boolean
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions | number,
    delayMs?: number
): Promise<T> {
    const { retries, delay, onError } =
        typeof options === 'number'
            ? { retries: options, delay: delayMs || 1000, onError: undefined }
            : options

    try {
        return await fn()
    } catch (error) {
        if (retries === 0 || (onError && !onError(error as Error))) {
            throw error
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
        return withRetry(fn, {
            retries: retries - 1,
            delay,
            onError,
        })
    }
}
