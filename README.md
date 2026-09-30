# 🏓 Torneo de Ping Pong

App web (Vue 3) para llevar torneos de ping pong: arma el cuadro, sortea, registra los puntos
partido por partido y guarda todo en una base **SQLite** que vive en el navegador.
Toda la interfaz está en español.

## Arrancar

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # versión de producción en dist/
npm run preview  # servir dist/ (accesible desde el celular en la misma red)
```

## Cómo se usa

1. **Pantalla inicial** — elegís cuántas personas juegan (2 a 64, par o impar), les ponés nombre
   y definís las reglas:
   - puntos para ganar un juego (11 por defecto),
   - si hace falta **diferencia de 2 puntos** al llegar al límite (regla estándar),
   - cuántos **juegos por partido** (a 1, al mejor de 3, de 5, de 7…).

   Hay cuatro formatos listos (Normal, Exprés, Clásico, Muerte súbita) y cualquier valor se puede
   ajustar a mano.

2. **Cuadro** — eliminación directa. Si la cantidad de jugadores no es potencia de dos, la app
   reparte los **pases libres** (byes) con el orden de siembras estándar, así nadie queda sin
   partido y los pases libres no se concentran en una sola rama.

   - **Sortear cuadro**: se puede repetir todas las veces que quieras… hasta que alguien anote el
     primer punto. Ahí el cuadro queda **bloqueado** (🔒) y el botón se deshabilita.
   - **Reiniciar torneo**: borra todos los marcadores, mantiene jugadores y reglas, y vuelve a
     habilitar el sorteo.
   - Menú **⋯** de cada partido: cargar el resultado a mano o reiniciar ese partido.
   - Menú **⋯** general: torneo nuevo, descargar la base `.sqlite`, o vaciar todo.

3. **Partido en vivo** — desde el cuadro, **▶ Iniciar partido**. La pantalla queda con lo mínimo:
   los dos nombres, los dos marcadores y nada más. Cada toque sobre un jugador le suma un punto.
   - el botón **−** dentro de cada zona resta un punto,
   - indicador de **saque** (cambia cada 2 puntos, cada 1 en ventaja),
   - aviso de **ventaja** cuando hay que sacar 2 de diferencia,
   - menú **⋯**: cargar el marcador a mano o corregir el último juego,
   - teclado: `A`/`1`/`←` suman al jugador 1, `L`/`2`/`→` al jugador 2, `Esc` vuelve al cuadro.

   Cuando se cierra un juego aparece el aviso y sigue el siguiente. Al ganar el partido, el
   ganador avanza solo en el cuadro y se vuelve a la vista de llaves.

4. **Campeón** — al terminar la final aparece la pantalla del campeón con confeti.

## La base de datos

- SQLite real, compilado a WebAssembly ([sql.js](https://github.com/sql-js/sql.js)). No hace falta
  servidor ni conexión: el archivo `.sqlite` completo se guarda en **IndexedDB** del navegador
  después de cada cambio, así que si cerrás la pestaña el torneo sigue donde estaba.
- Se puede **descargar el archivo `.sqlite`** desde el menú ⋯ y abrirlo con cualquier herramienta
  de SQLite.
- Tablas: `torneos`, `participantes`, `partidos`, `juegos`, `meta`. Se guarda el detalle punto a
  punto: cada juego queda con su marcador final.

## Estructura

```
src/
  db/
    schema.js        estructura de tablas
    sqlite.js        apertura, consultas y persistencia en IndexedDB
  lib/
    bracket.js       tamaño del cuadro, siembras, pases libres, nombres de ronda
    reglas.js        fin de juego, diferencia de 2, juegos para ganar, saque
    usarMenu.js      menús que se cierran al hacer clic afuera
  stores/
    torneo.js        toda la lógica del torneo (Pinia) sobre la base
  components/
    VistaInicio.vue  configuración del torneo
    VistaCuadro.vue  cuadro, sorteo, reinicios y carga manual
    VistaPartido.vue pantalla de partido en vivo
    Modal.vue, Confeti.vue
  styles/main.css    tema, animaciones y diseño responsivo
```

## Correcciones a mano

Todo lo que se registra se puede corregir sin reiniciar el torneo:

| Situación | Qué usar |
|---|---|
| Un punto de más | botón **−** en la zona del jugador |
| El marcador quedó mal | **⋯ → Cargar marcador a mano** |
| Se cerró un juego por error | **⋯ → Corregir último juego** |
| El partido se jugó fuera de la app | **⋯ → Cargar resultado a mano** en el cuadro |
| Hay que rehacer un partido | **⋯ → Reiniciar partido** (también limpia lo que dependía de él) |
| Se desordenó todo | **Reiniciar torneo** |

Al cambiar el resultado de un partido ya jugado, la app invalida automáticamente las rondas
siguientes que dependían de ese ganador.
