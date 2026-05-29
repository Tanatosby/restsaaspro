# ISS-004 — Caracteres corruptos en owner.html (BOM + doble codificación)

**Estado:** ✅ Resuelto 2026-05-22 (2 incidentes)  
**Módulo:** owner.html / ARCH-001 paso 1.1  
**Captura:** [Issues_letrasExtrañas.png](screenshots/Issues_letrasExtrañas.png)

---

## Descripción

Al abrir `owner.html` después de extraer el CSS a `owner.css` (paso 1.1 de ARCH-001), todos los caracteres especiales aparecieron corruptos: tildes, eñes y emojis se veían como `MenÃº del dÃa`, `ðŸ"`, etc.

## Causa raíz

PowerShell 5.1 (`Set-Content -Encoding utf8`) guarda archivos como **UTF-8 con BOM** (3 bytes extra `EF BB BF` al inicio del archivo). El navegador, al encontrar el BOM antes del doctype, interpreta el archivo como Latin-1/Windows-1252 en lugar de UTF-8, corrompiendo todos los caracteres multibyte.

## Solución aplicada

Re-guardar el archivo como UTF-8 sin BOM usando la API .NET directamente:

```powershell
$content = [System.IO.File]::ReadAllText($file)
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
```

## Regla permanente para este proyecto

**Nunca usar `Set-Content -Encoding utf8` en PowerShell 5.1 para archivos HTML/JS/CSS.**

Siempre usar:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```

O preferir las herramientas nativas del editor (`Write`, `Edit`) que no introducen BOM.

---

## Incidente 2 — Doble codificación (2026-05-22)

### Descripción

`owner.html` seguía mostrando caracteres corruptos (`MenÃº`, `GestiÃ³n`) a pesar de no tener BOM.

### Causa raíz

En algún momento el archivo fue abierto por un programa que lo interpretó como **Windows-1252** (en lugar de UTF-8), realizó ediciones, y lo guardó de vuelta como UTF-8. Esto causa **doble codificación**:

- `ú` (UTF-8: `C3 BA`) fue leído como dos caracteres Latin-1: `Ã` + `º`
- Al re-guardar como UTF-8: `Ã` → `C3 83`, `º` → `C2 BA`
- Resultado en archivo: `C3 83 C2 BA` (que el navegador muestra como `Ãº`)

No había BOM, y `<meta charset="UTF-8">` estaba presente — el browser interpretaba correctamente como UTF-8, pero el contenido mismo estaba corrupto.

### Diagnóstico

```
ú correcto  (C3 BA):       0 instancias
ú corrupto  (C3 83 C2 BA): 51 instancias
ó correcto  (C3 B3):       0 instancias
ó corrupto  (C3 83 C2 B3): 40 instancias
```

### Solución aplicada

Script Python que revierte la doble codificación: lee el archivo como UTF-8, re-codifica caracter a caracter como cp1252 (obteniendo los bytes UTF-8 originales) y guarda sin BOM:

```python
CP1252_UNDEF_TO_BYTE = {'\x81': b'\x81', '\x8d': b'\x8d', '\x8f': b'\x8f', '\x90': b'\x90', '\x9d': b'\x9d'}

def fix_double_encoding(content_bytes):
    text = content_bytes.decode('utf-8')
    result = bytearray()
    for ch in text:
        if ord(ch) < 0x80:
            result.extend(ch.encode('utf-8'))
        elif ch in CP1252_UNDEF_TO_BYTE:
            result.extend(CP1252_UNDEF_TO_BYTE[ch])
        else:
            try:
                result.extend(ch.encode('cp1252'))
            except UnicodeEncodeError:
                result.extend(ch.encode('utf-8'))
    return bytes(result)
```

Resultado: 51 `ú` correctas, 40 `ó` correctas, 0 corrupciones. Tamaño: 130KB → 119KB.
