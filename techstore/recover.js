const fs = require('fs');
const initSqlJs = require('sql.js');
const dbPath = './server/pixon.db';

const salvaged = [
  { name: 'Eduardo Álvarez', stars: 5, text: 'Excelente servicio, dejé mi PC y todas las instalaciones se veían muy limpias y me instalo los drivers . Todo un experto.' },
  { name: 'Ana Maria Martínez', stars: 5, text: 'Pensé que mi equipo estaba perdido, dado a que se mojo mi laptop Rápido y todo con transparencia.' },
  { name: 'Carlos Rodríguez', stars: 5, text: 'Mi laptop gamer quedó como nueva. Las temperaturas bajaron 30 °C después del mantenimiento Pro. Recomendado 100%' },
  { name: 'Laura Gómez', stars: 5, text: 'Llevé mi impresora que nadie quería reparar. En Pixon PC la dejaron lista al siguiente dia. Increíble' },
  { name: 'Constanza G', stars: 1, text: 'Es un misógino de lo peor, tengan mucho cuidado. Supongo que espera que todos sus clientes sean hombres porque a las mujeres las trata muy mal' },
  { name: 'Marina Vazquez', stars: 1, text: 'Lleve mi computadora y no quedó bien la primera vez, le llamé al muchacho y fue bastante grosero por teléfono, la segunda vez que la lleve no me contestaba cuando quería preguntar si ya estaba mi equipo, al final nunca me contestó, se quedó con el dinero y robaron la computadora.' },
  { name: 'Xari Lara', stars: 5, text: 'Mi pc se trababa en los videojuegos por sobrecalentamiento, se le hizo un mantenimiento PRO y quedo impecable como nueva. GRACIAS' },
  { name: 'Estefania Gonzales', stars: 5, text: 'Muchas gracias, agradezco lo rápido que fue' },
  { name: 'Fernando', stars: 5, text: 'Reparación perfecta, cambio de batería y pantalla' }
];

initSqlJs().then(SQL => {
  const db = new SQL.Database();
  db.run(`
      CREATE TABLE IF NOT EXISTS comments (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          stars      INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
          text       TEXT    NOT NULL,
          approved   INTEGER NOT NULL DEFAULT 1,
          created_at TEXT    DEFAULT (datetime('now', 'localtime'))
      );
      CREATE INDEX IF NOT EXISTS idx_comments_date
          ON comments(created_at DESC);
  `);
  
  salvaged.forEach(c => {
      db.run('INSERT INTO comments (name, stars, text) VALUES (?, ?, ?)', [c.name, c.stars, c.text]);
  });
  
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Recovery complete! ' + salvaged.length + ' comments restored.');
}).catch(console.error);
