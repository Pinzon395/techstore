'use strict';

function cleanText(value, max = 500) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMultilineText(value, max = 2000) {
    return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function stripHtml(value, max = 2000) {
    return cleanMultilineText(value, max).replace(/<[^>]*>/g, '').trim();
}

function cleanPhone(value) {
    return String(value || '').trim().replace(/[^\d+]/g, '').slice(0, 16);
}

function isValidPhone(value) {
    return /^\+?\d{8,15}$/.test(value);
}

function cleanEmail(value) {
    const email = String(value || '').trim().toLowerCase().slice(0, 254);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanDate(value) {
    const date = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function cleanTime(value) {
    const time = String(value || '').trim().slice(0, 5);
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
}

function cleanBoolean(value) {
    return value === true || value === 'true' || value === '1' || value === 1;
}

function toPositiveInt(value) {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function hasHtml(value) {
    return /<[^>]+>/.test(String(value || ''));
}

module.exports = {
    cleanText,
    cleanMultilineText,
    stripHtml,
    cleanPhone,
    isValidPhone,
    cleanEmail,
    cleanDate,
    cleanTime,
    cleanBoolean,
    toPositiveInt,
    hasHtml
};
