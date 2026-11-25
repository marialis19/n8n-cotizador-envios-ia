#  Cotizador de envíos con IA — n8n

Automatización que recibe pedidos de cotización escritos en **lenguaje natural**, usa **IA** para extraer los datos del envío, **valida y calcula** el precio con código, **registra** cada cotización en Google Sheets y **responde por email** al cliente.

Pensado para el flujo de una empresa de **logística internacional** (China · Miami · Latinoamérica): carga aérea, marítima y courier.

![Flujo en n8n](docs/img/flujo.png)

---

##  Problema que resuelve

Los pedidos de cotización llegan escritos de forma libre:

> *"Necesito traer 3 cajas de 20 kg de Guangzhou a Córdoba, aéreo"*

Normalmente una persona tiene que leerlos, sacar los datos, calcular el precio, registrarlo y contestar. Este flujo lo hace en segundos. Si al pedido le falta información, le pide al cliente **solo los datos que faltan**.

##  Cómo funciona

```
Formulario ─► IA (Gemini) ─► Validación y cálculo (JS) ─► If ─┬─ completo ──► Google Sheets ─► Gmail: cotización
                                                              └─ incompleto ► Gmail: pide los datos faltantes
```

| # | Nodo | Qué hace |
|---|------|----------|
| 1 | **On form submission** | Formulario web de n8n: nombre, email y pedido en texto libre |
| 2 | **Basic LLM Chain + Google Gemini + Structured Output Parser** | La IA interpreta el texto y devuelve un **JSON estructurado**: origen, destino, modalidad, bultos, peso por bulto / total y producto |
| 3 | **Code (JavaScript)** | Calcula el peso total, **valida** los datos obligatorios y calcula la cotización según tarifa por kg y mínimo ([ver código](code/calcular-cotizacion.js)) |
| 4 | **If** | Separa los pedidos completos de los incompletos |
| 5 | **Google Sheets** | Registra cada cotización (fecha, cliente, ruta, modalidad, peso, tarifa, total) |
| 6 | **Gmail** | Envía la cotización, o un pedido de los datos que faltan |

## 📸 Resultado

| Registro en Google Sheets | Email de cotización | Email de datos faltantes |
|---|---|---|
| ![Planilla](docs/img/planilla.png) | ![Mail cotización](docs/img/mail-cotizacion.png) | ![Mail datos faltantes](docs/img/mail-datos-faltantes.png) |

Ejemplo real de salida del nodo Code:

```json
{
  "origen": "Guangzhou",
  "destino": "Córdoba",
  "modalidad": "aereo",
  "bultos": 3,
  "peso_por_bulto_kg": 20,
  "peso_kg": 60,
  "completo": true,
  "faltan": [],
  "tarifa_usd_kg": 9,
  "total_usd": 540
}
```

> Las tarifas son **ficticias** y se usan solo con fines demostrativos.

##  Decisiones de diseño, desafíos y soluciones

| Desafío | Solución |
|---|---|
| **La IA calculaba mal el peso total** (devolvía 20 kg en vez de 3 × 20 = 60 kg), aunque el JSON tenía el formato correcto | Separé responsabilidades: **la IA solo extrae** datos del texto (bultos, peso por bulto) y **el cálculo lo hace el código**, que es determinista |
| La IA marcaba como "faltantes" datos que no faltaban | La **validación de negocio** se hace en JavaScript, no se confía ciegamente en la respuesta del modelo |
| **Error 503** (modelo saturado) en la API de Gemini | **Reintentos automáticos** en el nodo (3 intentos, 5 s de espera) y uso de un modelo estable en lugar de uno *preview* |
| **Error 404** (modelo discontinuado) | Actualización al modelo vigente indicado por la API |
| **Error 403** en OAuth de Google | Configuración de la app de Google Cloud en modo *Testing* con **usuarios de prueba** autorizados |
| Respuestas libres de la IA difíciles de procesar | **Structured Output Parser** con esquema JSON para obtener siempre los mismos campos |

## 🛠️ Tecnologías

**n8n** (self-hosted con Docker) · **Google Gemini API** (LLM) · **JavaScript** · **Google Sheets API** · **Gmail API** · **OAuth 2.0** · **Docker**

##  Cómo ejecutarlo

1. Levantar n8n con Docker:
   ```bash
   docker volume create n8n_data
   docker run -it --rm --name n8n -p 5678:5678 \
     -e GENERIC_TIMEZONE="America/Argentina/Buenos_Aires" -e TZ="America/Argentina/Buenos_Aires" \
     -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
   ```
2. Abrir `http://localhost:5678` e importar [`workflow/cotizador-envios.json`](workflow/cotizador-envios.json) (menú **⋯ → Importar**).
3. Crear las credenciales:
   - **Google Gemini API**: API key desde Google AI Studio.
   - **Google Sheets OAuth2** y **Gmail OAuth2**: cliente OAuth (aplicación web) en Google Cloud con las APIs de Sheets, Drive y Gmail habilitadas, y redirect URI `http://localhost:5678/rest/oauth2-credential/callback`.
4. Crear una planilla con las columnas: `fecha | nombre | email | origen | destino | modalidad | peso_kg | tarifa_usd_kg | total_usd`, y seleccionarla en el nodo de Google Sheets.
5. Ejecutar el flujo y completar el formulario.

##  Próximas mejoras

- Recibir los pedidos directamente desde **Gmail** o **WhatsApp Business API** en lugar del formulario.
- Tarifas por ruta y peso volumétrico, tomadas de una planilla en vez de estar fijas en el código.
- Reporte semanal automático de cotizaciones (Schedule Trigger).

---

### English summary

AI-powered shipping quote automation built with **n8n**. It receives free-text quote requests, uses **Google Gemini** with a structured output parser to extract shipment data, validates it and calculates the price in **JavaScript** (the LLM only extracts; deterministic code does the math), logs each quote in **Google Sheets**, and replies via **Gmail**, asking only for missing data when the request is incomplete. Includes retry handling for API errors (503) and Google **OAuth 2.0** setup.

---

 **Marialis Aquino** — [LinkedIn](https://www.linkedin.com/in/marialis-aquino-006a07149/) · [GitHub](https://github.com/marialis19)
