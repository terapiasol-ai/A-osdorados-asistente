# Media license server (simple)

Este servicio protege recursos multimedia (videos) para que solo los usuarios que tengan un token/QR puedan acceder a los tomos que compraron.

Archivos añadidos en rama feat/web-audio-videos:
- server.js : servidor Express con endpoints /redeem, /media/T0_RECU/:slug y /media/PISOS/:id
- tokens.json : ejemplo de mapeo token -> allowed

Cómo funciona (resumen corto):
1. El administrador añade pares token -> allowed list en tokens.json (ej: token ABC -> ["registros_akashicos", "1"]).
2. El QR del PDF apunta a: https://tu-servidor/redeem?token=ABC
3. El usuario abre ese enlace, pone su nombre (puede pasarse como query &name=Sol) y el servidor setea cookie license_token.
4. Las rutas /media/T0_RECU/:slug y /media/PISOS/:id validan la cookie y sirven solo los mp4 permitidos.

Notas importantes:
- En producción, NO dejes /admin/tokens accesible sin autenticación. La ruta se incluye solo para facilitar pruebas.
- Para habilitar protección, configura la variable de entorno ENABLE_LICENSES=true (por defecto en este repo la dejamos true). Para desactivar temporalmente: ENABLE_LICENSES=false.
- Coloca los archivos mp4 en las carpetas media/T0_RECU/ y media/PISOS/ con nombres slug.mp4 y id.mp4 respectivamente.

Cómo generar QR (simple):
- Genera enlaces tipo: https://tu-dominio/redeem?token=EXAMPLE_TOKEN_ABC123
- Crea un QR con esa URL y colócalo en la tarjeta dentro del PDF.

Ejemplo de tokens.json:
```
{
  "TOKEN123": { "allowed": ["registros_akashicos"], "name": "Cliente A", "expires": null }
}
```

Despliegue rápido (local):
1. node server.js
2. Subir mp4: media/T0_RECU/respiracion.mp4 etc.
3. Visitar: http://localhost:3000/redeem?token=EXAMPLE_TOKEN_ABC123&name=Sol
4. Probar: http://localhost:3000/media/T0_RECU/respiracion (debe devolver 403 si no tienes token, o el mp4 si está permitido)

Si quieres que yo cree también las rutas servidor-side para servir TTS y/o para obtener archivos desde Telegram Bot API (proxy) dímelo y lo añado en la siguiente iteración.
