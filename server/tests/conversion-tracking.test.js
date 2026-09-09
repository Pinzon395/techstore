'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
require('dotenv').config();

test.describe('Conversion Tracking & Migration 009', () => {
    let connection;
    const requiredEvents = [
        'whatsapp_click',
        'phone_click',
        'add_to_cart',
        'checkout_start',
        'order_created',
        'ticket_start',
        'ticket_submit',
        'language_switch'
    ];

    test.before(async () => {
        const { initDB } = require('../database');
        await initDB();
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'pixon_app',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pixon_db',
            charset: 'utf8mb4'
        });
    });

    test.after(async () => {
        if (connection) {
            await connection.execute("DELETE FROM conversion_events WHERE session_id = 'test-session-conv-tracking'");
            await connection.end();
        }
        try {
            const { getDB } = require('../database');
            await getDB().end();
        } catch (_) {}
    });

    test('tabla conversion_events existe y tiene la estructura correcta de migracion 009', async () => {
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversion_events'
        `);
        const colNames = columns.map(c => c.COLUMN_NAME);
        assert.ok(colNames.includes('id'));
        assert.ok(colNames.includes('event_name'));
        assert.ok(colNames.includes('path'));
        assert.ok(colNames.includes('locale'));
        assert.ok(colNames.includes('referrer'));
        assert.ok(colNames.includes('utm_source'));
        assert.ok(colNames.includes('utm_medium'));
        assert.ok(colNames.includes('utm_campaign'));
        assert.ok(colNames.includes('session_id'));
        assert.ok(colNames.includes('user_id'));
        assert.ok(colNames.includes('created_at'));

        // Verificar que NO existen campos PII en la tabla
        assert.ok(!colNames.includes('email'), 'No debe contener email');
        assert.ok(!colNames.includes('phone'), 'No debe contener phone');
        assert.ok(!colNames.includes('name'), 'No debe contener name');
    });

    test('los 8 eventos de conversion se insertan correctamente sin PII', async () => {
        const { trackConversionEvent } = require('../database');

        for (const eventName of requiredEvents) {
            await trackConversionEvent({
                event_name: eventName,
                path: `/test-${eventName}`,
                locale: 'es',
                referrer: 'https://google.com',
                utm_source: 'test_src',
                utm_medium: 'test_med',
                utm_campaign: 'test_camp',
                session_id: 'test-session-conv-tracking',
                user_id: null
            });
        }

        const [rows] = await connection.query(`
            SELECT event_name, path, locale, utm_source, session_id
            FROM conversion_events
            WHERE session_id = 'test-session-conv-tracking'
        `);

        assert.equal(rows.length, 8);
        const recordedEvents = rows.map(r => r.event_name);
        for (const expected of requiredEvents) {
            assert.ok(recordedEvents.includes(expected), `Debe contener evento ${expected}`);
        }
    });
});
