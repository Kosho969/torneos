import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { SCHEMA } from './schema.js'

const DB_NAME = 'torneo_pinpon'
const STORE = 'kv'
const KEY = 'sqlite'

let SQL = null
let db = null
let guardadoPendiente = null

/* ---------- Almacenamiento del archivo .sqlite en IndexedDB ---------- */

const soportaIDB = typeof indexedDB !== 'undefined' && indexedDB !== null

function abrirIDB () {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbLeer (clave) {
  if (!soportaIDB) return null
  const idb = await abrirIDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(clave)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

async function idbEscribir (clave, valor) {
  if (!soportaIDB) return
  const idb = await abrirIDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(valor, clave)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/* ---------- Ciclo de vida ---------- */

export async function iniciarBD () {
  if (db) return db
  SQL = await initSqlJs({ locateFile: () => wasmUrl })

  let bytes = null
  try {
    bytes = await idbLeer(KEY)
  } catch (e) {
    console.warn('No se pudo leer la base guardada, se crea una nueva.', e)
  }

  db = bytes ? new SQL.Database(new Uint8Array(bytes)) : new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  db.run(SCHEMA)
  if (!bytes) await guardarAhora()
  return db
}

export function exportarBytes () {
  return db.export()
}

/** Guarda el archivo completo en IndexedDB (agrupado para no escribir en cada punto). */
export function guardar () {
  if (!soportaIDB) return
  if (guardadoPendiente) clearTimeout(guardadoPendiente)
  guardadoPendiente = setTimeout(() => {
    guardadoPendiente = null
    guardarAhora().catch(e => console.warn('Error al guardar la base', e))
  }, 250)
}

export async function guardarAhora () {
  if (guardadoPendiente) { clearTimeout(guardadoPendiente); guardadoPendiente = null }
  try {
    await idbEscribir(KEY, exportarBytes())
  } catch (e) {
    console.warn('Error al guardar la base', e)
  }
}

/* ---------- Consultas ---------- */

export function consultar (sql, params = []) {
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const filas = []
    while (stmt.step()) filas.push(stmt.getAsObject())
    return filas
  } finally {
    stmt.free()
  }
}

export function consultarUno (sql, params = []) {
  return consultar(sql, params)[0] ?? null
}

export function ejecutar (sql, params = []) {
  db.run(sql, params)
  guardar()
}

/** Ejecuta varias sentencias como una sola transacción. */
export function enTransaccion (fn) {
  db.run('BEGIN')
  try {
    const r = fn()
    db.run('COMMIT')
    guardar()
    return r
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

export function ultimoId () {
  return consultarUno('SELECT last_insert_rowid() AS id').id
}

export async function borrarTodo () {
  db.run('PRAGMA foreign_keys = OFF')
  db.run('DELETE FROM juegos; DELETE FROM partidos; DELETE FROM participantes; DELETE FROM torneos; DELETE FROM meta;')
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('juegos','partidos','participantes','torneos')")
  db.run('PRAGMA foreign_keys = ON')
  await guardarAhora()
}
