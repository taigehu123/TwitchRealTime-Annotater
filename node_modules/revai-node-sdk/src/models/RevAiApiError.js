"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RevAiApiError {
    constructor(e) {
        if (e.response) {
            this.statusCode = e.response.status;
            this.title = e.response.data.title || '';
            this.detail = e.response.data.detail || '';
            this.type = e.response.data.type || '';
        }
    }
}
exports.RevAiApiError = RevAiApiError;
class InvalidParameterError extends RevAiApiError {
    constructor(e) {
        super(e);
        this.parameters = e.response.data.parameters;
    }
}
exports.InvalidParameterError = InvalidParameterError;
class InvalidStateError extends RevAiApiError {
    constructor(e) {
        super(e);
        this.currentValue = e.response.data.current_value;
        this.allowedValues = e.response.data.allowed_values;
    }
}
exports.InvalidStateError = InvalidStateError;
class InsufficientCreditsError extends RevAiApiError {
    constructor(e) {
        super(e);
        this.currentBalance = e.response.data.current_balance;
    }
}
exports.InsufficientCreditsError = InsufficientCreditsError;
//# sourceMappingURL=RevAiApiError.js.map