# ISS-005 — ENOENT al subir foto de plato en laptop nueva

**Estado:** ✅ Resuelto 2026-05-22
**Módulo:** Fotos de platos (Menú del día / Carta)
**Captura:** [issue_falta_uploads.png](screenshots/issue_falta_uploads.png)

---

## Descripción

Al intentar subir una foto de plato en una laptop nueva (o luego de clonar el repo), aparece el toast de error:

```
ENOENT: no such file or directory, open '...public\uploads\platos-menu\plato_2.png'
```

## Causa raíz

`public/uploads/` está en `.gitignore` — las carpetas no se sincronizan entre laptops. Multer (`diskStorage`) asume que el directorio de destino ya existe; si no existe, falla al intentar escribir el archivo y lanza ENOENT. El backend lo captura y lo devuelve como `{ error: "ENOENT..." }` con status 400, que el frontend muestra como toast.

`routes/public.js` ya tenía `mkdirSync` para `uploads/comprobantes/`, pero `routes/menu.js` no lo hacía para sus 3 subcarpetas.

## Solución aplicada

Agregar `mkdirSync({ recursive: true })` al cargar `routes/menu.js`, antes de configurar multer:

```js
['restaurantes', 'platos-menu', 'platos-carta'].forEach(sub => {
  fs.mkdirSync(path.join(__dirname, '..', 'public', 'uploads', sub), { recursive: true });
});
```

Con `recursive: true` no falla si la carpeta ya existe. Las carpetas se crean automáticamente en cada arranque del servidor.
