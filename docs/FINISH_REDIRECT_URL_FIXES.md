# Correcciones para finish_redirect_url

## Resumen de Correcciones Implementadas

Se corrigieron los siguientes puntos para mejorar el manejo de `finish_redirect_url`:

### ✅ 1. **Guardar como `null` en lugar de `undefined`**

**Problema:** Firestore no maneja bien los valores `undefined`, pueden causar errores.

**Solución:** Cambiar a usar `|| null` en lugar de dejar `undefined`.

#### Providers Corregidos:

**Transbank** (ya estaba correcto):
```typescript
finish_redirect_url: request.finish_redirect_url || null,
```

**Stripe:**
```typescript
// ANTES
finish_redirect_url: request.finish_redirect_url || "",
finish_redirect_url: request.finish_redirect_url,

// DESPUÉS  
finish_redirect_url: request.finish_redirect_url || null,
finish_redirect_url: request.finish_redirect_url || null,
```

**MercadoPago:**
```typescript
// ANTES
finish_redirect_url: request.finish_redirect_url || "",
finish_redirect_url: request.finish_redirect_url,

// DESPUÉS
finish_redirect_url: request.finish_redirect_url || null,
finish_redirect_url: request.finish_redirect_url || null,
```

### ✅ 2. **No hacer redirección si no existe finish_redirect_url**

**Problema:** Se estaba intentando redirigir incluso cuando no había URL de destino.

**Solución:** Verificar que `redirectUrl` no sea `null` ni `"null"` antes de mostrar elementos de redirección.

#### Funciones HTML Corregidas:

**generateTokenizationHTML:**
```typescript
// ANTES
const redirectScript = redirectUrl ? `...` : "";
const redirectMessage = redirectUrl ? `...` : "";
${redirectUrl ? `<a href="${redirectUrl}">Continuar</a>` : ""}

// DESPUÉS
const redirectScript = (redirectUrl && redirectUrl !== "null") ? `...` : "";
const redirectMessage = (redirectUrl && redirectUrl !== "null") ? `...` : "";
${(redirectUrl && redirectUrl !== "null") ? `<a href="${redirectUrl}">Continuar</a>` : ""}
```

**generateWebhookHTML:** (mismos cambios aplicados)

### ✅ 3. **Distinguir entre return_url y finish_redirect_url**

**Clarificación:** Se confirmó que el código ya maneja correctamente la distinción:

- **`return_url`**: Parámetro técnico de integración (usado por providers para callbacks)
- **`finish_redirect_url`**: URL de cara al usuario (donde redirigir después de mostrar el resultado)

#### En Webhooks:
```typescript
// CORRECTO: Usa redirect_url de query params (que sería finish_redirect_url)
const html = generateWebhookHTML(
  true,
  "El webhook ha sido procesado exitosamente.",
  req.query.redirect_url as string  // ✅ Correcto, no confundir con return_url
);
```

### ✅ 4. **Controller mejorado para manejo seguro de null**

**TokenizationController:**
```typescript
// ANTES
const finishRedirectUrl = sessionData?.finish_redirect_url;
finishRedirectUrl = sessionData?.finish_redirect_url;

// DESPUÉS
const finishRedirectUrl = sessionData?.finish_redirect_url || null;
finishRedirectUrl = sessionData?.finish_redirect_url || null;
```

## Comportamiento Actualizado

### ✅ **Escenario 1: Con finish_redirect_url**
```
Usuario → Provider → return_url → HTML con redirección → finish_redirect_url
```
- ✅ Muestra mensaje de éxito
- ✅ Redirección automática en 3 segundos  
- ✅ Botón "Continuar" como fallback

### ✅ **Escenario 2: Sin finish_redirect_url** 
```
Usuario → Provider → return_url → HTML sin redirección → Usuario cierra pestaña
```
- ✅ Muestra mensaje de éxito
- ✅ NO intenta redirigir (no hay script ni botón)
- ✅ Usuario puede cerrar la pestaña manualmente

### ✅ **Escenario 3: Error**
```
Usuario → Provider → return_url → HTML de error → finish_redirect_url (si existe)
```
- ✅ Muestra mensaje de error
- ✅ Redirecciona solo si hay finish_redirect_url
- ✅ Permite volver a intentar o continuar

## Base de Datos

### ✅ **Firestore - tokenization_sessions**
```typescript
{
  session_id: "tbk_abc123",
  user_id: "user123", 
  provider: "transbank",
  return_url: "https://app.com/callback/tokenization", // Para provider
  finish_redirect_url: null, // Para usuario (puede ser null)
  status: "pending",
  // ... otros campos
}
```

### ✅ **Casos de Uso:**

1. **Con redirección**: `finish_redirect_url: "https://app.com/dashboard"`
2. **Sin redirección**: `finish_redirect_url: null`  
3. **Error en guardado**: Nunca será `undefined` (siempre `null`)

## Ejemplo de Integración

```javascript
// ✅ CORRECTO: Con redirección
const tokenizationResponse = await fetch('/paymentCreateTokenizationSession', {
  method: 'POST', 
  body: JSON.stringify({
    user_id: 'user123',
    provider: 'transbank',
    return_url: 'https://mi-app.com/callback/tokenization', // Para integración
    finish_redirect_url: 'https://mi-app.com/dashboard' // Para usuario
  })
});

// ✅ CORRECTO: Sin redirección (usuario cierra pestaña)
const tokenizationResponse = await fetch('/paymentCreateTokenizationSession', {
  method: 'POST',
  body: JSON.stringify({
    user_id: 'user123',
    provider: 'transbank', 
    return_url: 'https://mi-app.com/callback/tokenization',
    // finish_redirect_url omitido = se guarda como null
  })
});
```

## Webhook Clarificación

```javascript
// ✅ CORRECTO: Para webhooks user-facing
GET /paymentWebhookStripe?html=true&redirect_url=https://app.com/success

// ✅ CORRECTO: Para webhooks sistema (no user-facing)  
POST /paymentWebhookStripe
// Solo retorna JSON, no HTML
```

**return_url** ≠ **finish_redirect_url**:
- `return_url`: Donde el provider redirige técnicamente 
- `finish_redirect_url`: Donde el usuario va después de ver el resultado