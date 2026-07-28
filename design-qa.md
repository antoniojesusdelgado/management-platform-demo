# Design QA — acceso v1.2.2

## Evidencias

- Verdad visual: `C:\Users\anton\Downloads\OAuth Front-End.png`.
- Implementación: `artifacts/release-v1.2.2/access-implementation-final.png`.
- Comparación conjunta: `artifacts/release-v1.2.2/access-comparison.png`.
- Ruta y estado: `/`, sesión sin autenticar y OAuth no configurado en local.
- Viewport CSS: `1488 × 1058 px`.
- Densidad: `1×`.
- Imagen de referencia: `1488 × 1058 px`.
- Captura de implementación: `1488 × 1058 px`.
- Normalización: no fue necesario escalar para la comparación.

## Superficies revisadas

- Tipografía: jerarquía, peso, saltos de línea, altura de línea y alineación de
  marca, titular, texto descriptivo, botones y textos legales.
- Espaciado: cabecera de 100 px, división 50/50, posición y dimensiones de la
  tarjeta, ritmos verticales y márgenes del bloque izquierdo.
- Color: navy de cabecera, blanco del bloque de presentación, gris del panel,
  bordes neutrales y acento azul.
- Assets: símbolo original del producto e icono oficial de Google, sin
  sustituciones dibujadas en CSS.
- Contenido: los textos y acciones coinciden con la referencia. El aviso legal
  y el copyright amplían la referencia por un requisito explícito del cierre.

## Comparación e iteraciones

### Iteración 1 — bloqueada

- [P1] El titular izquierdo y el título de la tarjeta tenían un peso demasiado
  ligero.
- [P2] La tarjeta estaba desplazada 30 px hacia la derecha.
- [P2] La cabecera de la tarjeta estaba alineada a la izquierda y el ritmo
  vertical no coincidía con la referencia.

Correcciones: pesos de texto ajustados, tarjeta desplazada al eje de la
referencia, contenido centrado y espaciado vertical normalizado.

Evidencia posterior: `artifacts/release-v1.2.2/access-implementation-02.png`.

### Iteración 2 — bloqueada

- [P2] El titular se repartía en tres líneas o incorporaba «en» en la primera
  línea según el ancho disponible.
- [P2] El borde de la acción invitada no utilizaba el acento azul aprobado.

Correcciones: salto editorial explícito después de «Gestión diaria», tamaño y
altura de línea ajustados, y borde azul en la acción secundaria.

Evidencia posterior:
`artifacts/release-v1.2.2/access-implementation-final.png`.

### Iteración final — aprobada

La composición conjunta confirma que no quedan diferencias P0, P1 o P2 en los
cinco frentes obligatorios. El copyright y los enlaces legales permanecen fuera
de la tarjeta, discretos y alineados al pie, por requisito funcional. No fue
necesaria una comparación adicional por regiones: todos los elementos críticos
son legibles a escala completa en la composición conjunta.

Interacciones primarias verificadas en navegador: carga de `/`, presencia de
Google, enlace de acceso invitado y enlaces legales. La consola no mostró
errores de aplicación durante la captura.

final result: passed
