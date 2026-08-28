# Plan de empresa — Menú Pro

> **Estado: BORRADOR para analizar.** Nada de acá está decidido todavía. Es la base para que
> Pedro lo revise y anote definiciones desde cualquier laptop. Se armó el 2026-08-28 a partir de
> la conversación donde Pedro decidió empezar a pensar en formalizar (el piloto #1 se ve motivado
> y podría ser el primer cliente pagante).
>
> **Aviso:** este documento NO reemplaza asesoría legal ni contable. Los trámites de Perú
> (SUNARP, SUNAT, régimen tributario, Ley 29733, INDECOPI) deben validarse con un **contador**
> (≈ S/ 150–300/mes) y, para la marca y los contratos, con apoyo legal puntual.

---

## 1. Contexto

- Producto (Menú Pro / `menupro.tech`) maduro: pilotos en uso real, ~478 tests, flujo completo
  de pedidos/cocina/pagos/reservas/pensionistas.
- **Piloto #1** (Karina Menú) motivada tras la última visita → candidata a **primer cliente
  pagante**.
- Hoy todo es informal: sin empresa, sin RUC, sin cuenta bancaria propia del negocio, sin
  facturación, sin marca registrada, sin presencia en redes.
- Pedro quiere avanzar en varios frentes a la vez: **formalizar empresa**, **cuenta de banco
  propia**, **redes sociales + contenido**, **mejorar la landing**.

---

## 2. Orden y dependencias

El error a evitar es hacer los trámites en desorden. Secuencia real:

```
Formalización legal ──► RUC + régimen ──► Facturación electrónica ──► Cuenta banco empresa
       │                                                                      │
       └──► Marca INDECOPI (en paralelo)                                      └──► Pasarela de cobro recurrente
                                                                                      │
Primer cliente (piloto #1): contrato + precio fundador ───────────────────► Primer cobro real
                                                                                      │
Landing + redes + contenido (se puede empezar YA, no bloquea nada) ──────────────────┘
```

---

## 3. Los 5 frentes

### A. Formalización legal-tributaria

| Tema | Detalle | Decisión pendiente |
|------|---------|--------------------|
| Tipo de empresa | **S.A.C.** es lo estándar para un SaaS que piensa en socios/inversión (se constituye con 2 accionistas, uno puede tener 1%). **E.I.R.L.** es más simple pero atada a una sola persona natural; hay que transformarla si entra un socio. | ¿E.I.R.L. o S.A.C.? → depende de las preguntas 1 y 2 de §5 |
| Constitución | SUNARP (posible vía SID-SUNARP sin minuta si califica como MYPE) → notaría → inscripción. | — |
| RUC + régimen | RUC en SUNAT. Régimen: **Régimen MYPE Tributario (RMT)** es lo habitual para este tamaño (alternativas: RER, Régimen General). | Confirmar con contador |
| Facturación electrónica | Obligatoria. Opciones: SEE-SOL (gratis, SUNAT, poco usable) o proveedor tipo Nubefact (≈ S/ 30–80/mes, mucho mejor). Se emite **factura** a los restaurantes (o boleta si el restaurante es RUS). | Elegir proveedor |
| Protección de datos (Ley 29733) | Registrar los **bancos de datos personales** ante la Autoridad Nacional (MINJUS). Menú Pro es "encargado de tratamiento" de los datos de los clientes de cada restaurante. Conecta con ISS-082 (aceptación de términos) y con el contrato de suscripción. | Definir alcance con apoyo legal |
| Domicilio fiscal + representante legal | Requeridos en la constitución. | Dirección a usar |

### B. Bancarización y cobros

- **Cuenta corriente / cuenta negocios** con RUC + partida registral + DNI del representante.
  Comparar comisiones de mantenimiento (BCP, Interbank, BBVA, Scotiabank; ver también opciones
  digitales).
- **Cobro recurrente mensual** a los restaurantes:
  - Corto plazo (1–5 clientes): cobro manual por transferencia/Yape + recordatorio.
  - A escala: pasarela con débito automático de tarjeta (**Culqi / Izipay / Openpay**).
- Decisión depende de la pregunta 5 de §5 (cuántos clientes a 6 meses).

### C. Marca y dominios

- **Registro de marca en INDECOPI**, clases **9** (software) y **42** (servicios SaaS).
  ≈ S/ 535 por clase.
- ⚠️ *"Menú Pro"* es **descriptivo/genérico** → riesgo de observación. Alternativas: registrar
  logotipo + palabra (marca mixta), o evaluar un nombre más distintivo.
- Reservar **handles idénticos** en todas las redes + dominios `.pe` antes de publicar nada.

### D. Primer cliente (piloto #1)

- **Contrato de suscripción SaaS** firmado (con anexo de tratamiento de datos, Ley 29733).
- **Precio "fundador"**: descuento a cambio de testimonio + permiso para caso de éxito.
- Definir el **modelo de precio** (ver §4).
- Grabar **video testimonio** + armar **caso de estudio** (está motivada ahora → momento ideal).

### E. Landing + redes + contenido *(no depende de A–D, se puede arrancar ya)*

**Landing (`public/landing.html`):**
- Propuesta de valor clara arriba del fold.
- Precios visibles.
- Testimonio del piloto #1.
- Video demo.
- CTA único ("Agenda una demo" / "Prueba gratis").
- Señales de confianza ("hecho en Perú").
- **Aviso de transparencia sobre IA** (principio 9 de `vision_negocio.md` §11 / `features.md` —
  sigue pendiente).
- Captura de leads → WhatsApp Business o formulario.
- SEO básico.

**Canales:** Instagram + Facebook (donde están los dueños), TikTok (alcance), WhatsApp Business
(venta/soporte), YouTube (tutoriales). LinkedIn opcional.

**Pilares de contenido:**
1. Demos de features.
2. Tips de gestión para restaurantes de menú del día (mermas, rotación, stock, hora pico).
3. Testimonio / caso del piloto #1.
4. "Detrás de escena / hecho con IA supervisada por una persona".
5. Tutoriales de uso.

**Calendario:** 3 posts/semana (sostenible para 1 persona). Batch de grabación 1 vez/semana.

---

## 4. Modelo de precios — a definir

| Variable | Opciones a evaluar |
|----------|--------------------|
| Cuota mensual por restaurante | S/ ___ (definir con referencia al valor que le ahorra: tiempo, mermas, no-shows) |
| Prueba gratis | ¿15 / 30 días? ¿o piloto sin costo por tiempo limitado? |
| Cargo de onboarding | ¿único inicial por configuración + capacitación, o incluido? |
| Descuento fundador | % para los primeros N clientes, a cambio de testimonio |
| Cobro | Mensual / anual con descuento |

---

## 5. Decisiones abiertas (Pedro responde y se ajusta el plan)

1. **¿Trabajás solo o hay un co-founder / familiar que pueda ser 2º accionista?**
   → _(respuesta:)_

2. **¿Pensás buscar inversión externa en el próximo año, o crecer solo con lo que facture?**
   → _(respuesta:)_

3. **¿"Menú Pro" es el nombre definitivo, o está abierto a cambiarlo?**
   → _(respuesta:)_

4. **¿Qué presupuesto y plazo tenés para la formalización?** (constitución + notaría + contador
   + marca ≈ S/ 1,500–3,000 el primer mes)
   → _(respuesta:)_

5. **¿Cuántos restaurantes clientes proyectás a 6 meses?** (define si el cobro recurrente necesita
   pasarela ya o puede ser manual)
   → _(respuesta:)_

---

## 6. TODO propuesto (orden sugerido — sin fechas todавía)

**Etapa 1 — arranque en paralelo**
- [ ] Responder las 5 decisiones abiertas de §5.
- [ ] Contratar contador; con él iniciar constitución en SUNARP + RUC + régimen.
- [ ] Borrador del **contrato de suscripción SaaS** + anexo de datos (Ley 29733).
- [ ] Definir **modelo de precios** (§4).
- [ ] Reservar handles de redes + dominios `.pe`.

**Etapa 2**
- [ ] Alta de facturación electrónica (SUNAT o proveedor).
- [ ] Abrir cuenta bancaria de empresa (cuando salga RUC + partida).
- [ ] Iniciar trámite de marca en INDECOPI.
- [ ] Reescritura completa de `public/landing.html` (copy + estructura + precios + testimonio +
      disclosure IA).
- [ ] Cerrar acuerdo con piloto #1: contrato firmado + precio fundador + fecha de primer cobro.

**Etapa 3**
- [ ] Grabar video testimonio + demo; armar caso de estudio.
- [ ] Publicar redes (perfiles completos + primeros 6–9 posts) y arrancar calendario.
- [ ] Registrar bancos de datos personales ante la ANPD (MINJUS).
- [ ] Definir/configurar cobro recurrente.

---

## 7. Qué puede hacer Claude directamente (sin contador/abogado)

- Este roadmap y sus checklists.
- Borradores de: contrato de suscripción, anexo de tratamiento de datos, política de privacidad,
  términos y condiciones completos (ya hay base en `public/terminos.html`).
- Reescritura de la landing (copy + estructura + HTML).
- Plan de contenido detallado: calendario, guiones de posts, ideas de videos.
- Modelo de precios con escenarios.
- Checklist de configuración de cada red social.

Lo que **sí** necesita profesional local: constitución, elección fina de régimen tributario,
representación ante SUNAT/INDECOPI/ANPD, revisión legal final de los contratos.
