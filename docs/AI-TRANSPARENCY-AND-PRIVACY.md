# Transparencia, privacidad y analítica

## Desarrollo asistido con inteligencia artificial

La réplica pública se ha desarrollado mediante programación asistida con
ChatGPT Codex, bajo dirección, revisión editorial y validación humana. Codex se
ha utilizado para analizar el repositorio, implementar cambios, preparar
documentación y ejecutar comprobaciones reproducibles.

La aplicación en producción no integra un modelo de inteligencia artificial,
no mantiene conversaciones automatizadas con usuarios y no envía datos a
OpenAI durante su uso.

## Aplicación del Reglamento europeo de IA

El Reglamento (UE) 2024/1689 se aplica, con las excepciones previstas en su
artículo 113, desde el 2 de agosto de 2026. El artículo 50 regula, entre otros
casos, la interacción directa con sistemas de IA y el etiquetado de determinados
contenidos sintéticos o manipulados.

La asistencia de Codex durante la programación no convierte cada pantalla del
software en contenido sintético sujeto a distintivo. La interfaz, los textos y
la documentación se publican bajo revisión y responsabilidad editorial humana.
Por ello se incorpora una declaración textual clara y no se muestra el icono
europeo opcional de contenido generado por IA, cuyo uso podría inducir a una
clasificación incorrecta del producto.

Fuentes oficiales:

- [Reglamento (UE) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=es)
- [Distintivos europeos para contenido generado por IA](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content)
- [Directrices de transparencia del artículo 50](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems)

## Consentimiento analítico

Google Analytics 4 es opcional y se configura mediante
`NEXT_PUBLIC_GA_MEASUREMENT_ID`. Si no existe consentimiento, el script de
Google no se descarga ni se ejecuta. El aviso presenta “Aceptar analítica” y
“Rechazar” al mismo nivel y permite revisar la elección desde el pie legal.

La configuración desactiva señales de Google y personalización publicitaria.
Los datos operativos escritos en formularios no se envían como eventos. Google
Search Console se utiliza únicamente para verificar el dominio y consultar el
rendimiento agregado en el buscador; no instala cookies en la aplicación.

## Supresión de cuenta

El perfil autenticado incluye una acción irreversible con confirmación textual.
El flujo:

1. elimina el avatar privado;
2. elimina las conexiones de productividad y sus credenciales guardadas en Vault;
3. desvincula el perfil del directorio y suspende sus membresías;
4. anonimiza los datos personales del perfil;
5. desactiva la identidad en Supabase Auth mediante borrado irreversible;
6. conserva solo una referencia criptográfica no identificativa de la solicitud.

Los registros operativos permanecen sin vínculo identificativo cuando son
necesarios para mantener la integridad y la trazabilidad de una organización.

Para ejercer derechos o comunicar una incidencia de privacidad:
[contacto@antoniodelgado.tech](mailto:contacto@antoniodelgado.tech).
