# El Faro Liveblogs

Plugin de WordPress para las coberturas en directo (minuto a minuto) de los diarios de El Faro. Es un fork independiente del plugin [Liveblog](https://github.com/Automattic/liveblog) de WordPress.com VIP, adaptado al diseño de nuestras webs y mantenido por Grupo Faro. Licencia GPLv2 o posterior.

## Qué cambia respecto al original

* Diseño del directo integrado con el tema (línea de tiempo con la hora de cada entrada, colores y tipografías del sitio), franja "En directo" y botón "Cargar más actualizaciones" en lugar de paginación.
* Enlaces de X/Twitter incrustados siempre, también con `x.com`; la vista previa del editor muestra el embed.
* Feed que sigue funcionando en navegadores antiguos y editor que no se congela en directos largos.
* Interfaz de lectores y de redactores en español.
* Las actualizaciones llegan desde las [releases de este repositorio](https://github.com/Grupo-Faro/liveblog/releases), nunca desde wordpress.org.

El plugin conserva los mismos datos que el original (las entradas son comentarios y el estado del directo es un meta del post), así que los directos existentes siguen funcionando tras el cambio.

## Instalación

1. Descarga `elfaro-liveblogs.zip` de la última release.
2. Plugins → Añadir nuevo → Subir plugin y activa "El Faro Liveblogs". Si el plugin original "Liveblog" estaba activo, se desactiva solo.
3. Borra el plugin "Liveblog" original y purga la caché de página (W3TC).

## Publicar una versión

1. Sube la versión en `elfaro-liveblogs.php` (cabecera y `WPCOM_Liveblog::VERSION`) y en `package.json`, y anota los cambios en `CHANGELOG.md`.
2. Haz commit y etiqueta: `git tag v1.0.1 && git push origin v1.0.1`.
3. El workflow **Release** compila los assets, empaqueta `elfaro-liveblogs.zip` y crea la release en GitHub.

WordPress comprueba la última release en cada comprobación de actualizaciones (el resultado se cachea 6 horas; "Comprobar de nuevo" en Escritorio → Actualizaciones lo fuerza) y ofrece la nueva versión en Plugins como con cualquier otro plugin. Si el repositorio pasara a ser privado, define `ELFARO_LIVEBLOGS_GITHUB_TOKEN` en `wp-config.php` con un token de lectura.

## Desarrollo

```bash
npm ci                # dependencias del front
npm run build         # compila build/ (necesario antes de empaquetar)
npm test              # tests de JavaScript
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
npm run i18n:json     # regenera las traducciones JS desde languages/*.po
composer cs           # PHPCS (WordPress + VIP)
composer test:unit    # tests PHP unitarios
```

La documentación técnica está en [`docs/`](docs/) y en [`AGENTS.md`](AGENTS.md); [`CONTRIBUTING.md`](CONTRIBUTING.md) explica el entorno de desarrollo.
