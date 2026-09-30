export const SCHEMA = `
CREATE TABLE IF NOT EXISTS torneos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre            TEXT    NOT NULL,
  puntos_por_juego  INTEGER NOT NULL,
  ventaja_dos       INTEGER NOT NULL DEFAULT 1,
  juegos_por_partido INTEGER NOT NULL,
  estado            TEXT    NOT NULL DEFAULT 'en_curso',
  bloqueado         INTEGER NOT NULL DEFAULT 0,
  campeon_id        INTEGER,
  creado_en         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS participantes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  torneo_id INTEGER NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  nombre    TEXT    NOT NULL,
  semilla   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS partidos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  torneo_id  INTEGER NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  ronda      INTEGER NOT NULL,
  orden      INTEGER NOT NULL,
  p1_id      INTEGER,
  p2_id      INTEGER,
  juegos_p1  INTEGER NOT NULL DEFAULT 0,
  juegos_p2  INTEGER NOT NULL DEFAULT 0,
  ganador_id INTEGER,
  estado     TEXT    NOT NULL DEFAULT 'pendiente',
  inicio     TEXT,
  fin        TEXT
);

CREATE TABLE IF NOT EXISTS juegos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  partido_id INTEGER NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  numero     INTEGER NOT NULL,
  puntos_p1  INTEGER NOT NULL DEFAULT 0,
  puntos_p2  INTEGER NOT NULL DEFAULT 0,
  ganador_id INTEGER,
  fin        TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE INDEX IF NOT EXISTS idx_partidos_torneo ON partidos(torneo_id, ronda, orden);
CREATE INDEX IF NOT EXISTS idx_juegos_partido  ON juegos(partido_id, numero);
CREATE INDEX IF NOT EXISTS idx_part_torneo     ON participantes(torneo_id, semilla);
`
