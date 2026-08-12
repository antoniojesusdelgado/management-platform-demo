export type ProductRelease = {
  version: string;
  title: string;
  summary: string;
  publishedDate: string;
};

export const PRODUCT_RELEASES = [
  { version: "0.1.0", title: "Todo el trabajo, en un solo lugar", summary: "Una base común para consultar los módulos y acceder a cada función según el perfil.", publishedDate: "2026-02-02" },
  { version: "0.2.0", title: "Vacaciones más fáciles de gestionar", summary: "Solicitudes, aprobaciones y calendario de ausencias reunidos en un mismo espacio.", publishedDate: "2026-02-16" },
  { version: "0.3.0", title: "Proyectos y tareas bajo control", summary: "Seguimiento claro de responsables, fechas, dependencias y trabajo pendiente.", publishedDate: "2026-03-02" },
  { version: "0.4.0", title: "Mejor atención y visión del equipo", summary: "Incidencias y directorio de personal conectados para facilitar la coordinación diaria.", publishedDate: "2026-03-16" },
  { version: "0.5.0", title: "Finanzas y nóminas más claras", summary: "Movimientos revisados y ciclos de nómina resumidos para una consulta más sencilla.", publishedDate: "2026-03-30" },
  { version: "0.6.0", title: "Procesos conectados y menos trabajo manual", summary: "Importaciones programadas y controles que ayudan a mantener la información al día.", publishedDate: "2026-04-20" },
  { version: "0.7.0", title: "Información histórica lista para consultar", summary: "La actividad anterior queda organizada y validada para poder revisarla con confianza.", publishedDate: "2026-04-30" },
  { version: "1.0.0", title: "Una plataforma preparada para el día a día", summary: "Acceso seguro con Google y espacios separados para cada organización.", publishedDate: "2026-05-24" },
  { version: "1.1.0", title: "Más claridad para decidir", summary: "Nuevos indicadores, filtros y mejoras de accesibilidad para trabajar con mayor comodidad.", publishedDate: "2026-06-01" },
  { version: "1.2.0", title: "Una visión más completa de la actividad", summary: "Datos mejor equilibrados y comparaciones más útiles para entender la evolución del trabajo.", publishedDate: "2026-06-15" },
  { version: "1.2.1", title: "Una experiencia más cuidada", summary: "Mejoras en el acceso, los gráficos, los proyectos y la navegación desde distintos dispositivos.", publishedDate: "2026-06-16" },
  { version: "1.2.2", title: "Mejoras en toda la plataforma", summary: "Una experiencia más fluida en analítica, trabajo móvil, nóminas y equipos.", publishedDate: "2026-06-17" },
  { version: "1.3.0", title: "Elige cómo quieres trabajar", summary: "Tema claro por defecto, modo oscuro opcional y una visión de la actividad siempre actualizada.", publishedDate: "2026-06-23" },
  { version: "1.3.1", title: "Más cómoda en móvil y más segura", summary: "Las tareas se consultan mejor desde el teléfono y la protección de los datos se ha reforzado.", publishedDate: "2026-07-29" },
  { version: "1.3.2", title: "Un directorio más cercano y claro", summary: "Todos los perfiles muestran nombres completos y las novedades son ahora más fáciles de entender.", publishedDate: "2026-07-30" },
  { version: "1.4.0", title: "Un acceso más claro y seguro", summary: "La pantalla inicial permite elegir con claridad entre recorrer la demo o continuar con Google.", publishedDate: "2026-08-03" },
  { version: "1.4.1", title: "Acceso más fiable desde cualquier dispositivo", summary: "El inicio con Google y la recuperación de la sesión funcionan mejor dentro y fuera del móvil.", publishedDate: "2026-08-03" },
  { version: "1.5.0", title: "Seguridad reforzada de principio a fin", summary: "Se han revisado los permisos, las validaciones y los controles que protegen cada publicación.", publishedDate: "2026-08-05" },
  { version: "1.5.1", title: "Novedades siempre al día", summary: "La versión visible coincide ahora con la publicación disponible y se explica cómo se ha desarrollado el proyecto.", publishedDate: "2026-08-07" },
  { version: "1.6.0", title: "Encuentra y prioriza tu trabajo", summary: "Una búsqueda global y una bandeja personal reúnen personas, proyectos, tareas, solicitudes e incidencias que requieren atención.", publishedDate: "2026-08-10" },
  { version: "1.7.0", title: "Menos tareas repetitivas, más control", summary: "Automatizaciones, plantillas, planificación de capacidad e informes conectados reúnen el trabajo operativo en un mismo lugar.", publishedDate: "2026-08-10" },
  { version: "1.8.0", title: "Tu empresa, preparada para crecer", summary: "Un nuevo inicio, acceso con Google o Microsoft, varias empresas y sincronización corporativa facilitan la puesta en marcha de cada equipo.", publishedDate: "2026-08-11" },
  { version: "1.8.1", title: "Todo resulta más claro y fácil de usar", summary: "Hemos cuidado el acceso, las personas, las novedades y los indicadores para que encuentres antes lo que necesitas.", publishedDate: "2026-08-11" },
  { version: "1.8.2", title: "Acceso más claro y seguro", summary: "Mejoramos el inicio de sesión, el rendimiento y la protección de la plataforma. Google y Microsoft ahora solicitan solo los permisos necesarios para cada acción.", publishedDate: "2026-08-12" },
] as const satisfies readonly ProductRelease[];

export const LATEST_PRODUCT_RELEASE = PRODUCT_RELEASES.at(-1)!;
export const PRODUCT_VERSION = LATEST_PRODUCT_RELEASE.version;
