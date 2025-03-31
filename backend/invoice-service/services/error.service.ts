export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, message);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string) {
        super(401, message);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(404, message);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message);
    }
}

export class DatabaseError extends AppError {
    constructor(message: string) {
        super(500, message);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(message: string) {
        super(503, message);
    }
}

export const handleError = (error: unknown): AppError => {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return new DatabaseError(error.message);
    }

    return new DatabaseError('An unexpected error occurred');
};