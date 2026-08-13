'use strict';

class CommerceError extends Error {
    constructor({ code, message, status = 500, details, cause }) {
        super(message, cause ? { cause } : undefined);
        this.name = this.constructor.name;
        this.code = code || 'COMMERCE_ERROR';
        this.status = status;
        if (details !== undefined) this.details = details;
        Error.captureStackTrace?.(this, this.constructor);
    }
}

class ValidationError extends CommerceError {
    constructor(message = 'Los datos enviados no son validos', details) {
        super({ code: 'VALIDATION_ERROR', message, status: 422, details });
    }
}

class NotFoundError extends CommerceError {
    constructor(resource = 'Recurso') {
        super({ code: 'NOT_FOUND', message: `${resource} no encontrado`, status: 404 });
    }
}

class ConflictError extends CommerceError {
    constructor(message, details) {
        super({ code: 'CONFLICT', message, status: 409, details });
    }
}

class AuthenticationError extends CommerceError {
    constructor(message = 'Debes iniciar sesion') {
        super({ code: 'AUTHENTICATION_REQUIRED', message, status: 401 });
    }
}

class AuthorizationError extends CommerceError {
    constructor(permission) {
        super({
            code: 'FORBIDDEN',
            message: 'No tienes permiso para realizar esta accion',
            status: 403,
            details: permission ? { permission } : undefined
        });
    }
}

class InvalidStateError extends CommerceError {
    constructor(message, details) {
        super({ code: 'INVALID_STATE', message, status: 409, details });
    }
}

class MediaValidationError extends CommerceError {
    constructor(message, details) {
        super({ code: 'INVALID_MEDIA', message, status: 415, details });
    }
}

class PayloadTooLargeError extends CommerceError {
    constructor(message = 'La solicitud excede el tamano permitido') {
        super({ code: 'PAYLOAD_TOO_LARGE', message, status: 413 });
    }
}

class ServiceUnavailableError extends CommerceError {
    constructor(message = 'El servicio externo no esta disponible', details) {
        super({ code: 'SERVICE_UNAVAILABLE', message, status: 503, details });
    }
}

function isDuplicateKeyError(error) {
    return error?.errno === 1062 || error?.code === 'ER_DUP_ENTRY';
}

function mapDatabaseError(error, duplicateMessage = 'Ya existe un registro con esos datos') {
    if (error instanceof CommerceError) return error;
    if (isDuplicateKeyError(error)) {
        return new ConflictError(duplicateMessage);
    }
    return new CommerceError({
        code: 'DATABASE_ERROR',
        message: 'No fue posible completar la operacion',
        status: 500,
        cause: error
    });
}

module.exports = {
    CommerceError,
    ValidationError,
    NotFoundError,
    ConflictError,
    AuthenticationError,
    AuthorizationError,
    InvalidStateError,
    MediaValidationError,
    PayloadTooLargeError,
    ServiceUnavailableError,
    isDuplicateKeyError,
    mapDatabaseError
};
