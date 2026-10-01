require('dotenv').config();
const { createPoolFromEnv } = require('../server/db/connection');

async function main() {
  const pool = createPoolFromEnv();
  // Lunes a Sabado (weekday 1 a 6) de 11:00 AM a 10:00 PM (11:00 a 22:00)
  await pool.execute(`
    UPDATE appointment_settings 
    SET start_time = '11:00:00', end_time = '22:00:00', slot_minutes = 30 
    WHERE weekday BETWEEN 1 AND 6
  `);
  // Domingo (weekday 0)
  await pool.execute(`
    UPDATE appointment_settings 
    SET start_time = '11:00:00', end_time = '18:00:00', slot_minutes = 30 
    WHERE weekday = 0
  `);
  console.log('Horarios actualizados exitosamente en appointment_settings.');
  const [rows] = await pool.execute('SELECT weekday, is_open, start_time, end_time, slot_minutes FROM appointment_settings ORDER BY weekday');
  console.table(rows);
  await pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
