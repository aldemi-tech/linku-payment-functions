# HTML Callbacks para Tokenización y Webhooks

## Resumen

Los callbacks de `completeTokenization` y `webhook` ahora responden con HTML amigable para el usuario en lugar de solo JSON, ya que estos endpoints son visitados directamente por los usuarios.

## Nuevas Funcionalidades

### 1. Campo `finish_redirect_url`

Se añadió el campo opcional `finish_redirect_url` a las requests de tokenización para especificar dónde redirigir al usuario después de completar el proceso.

```typescript
interface RedirectTokenizationRequest {
  user_id: string;
  provider: PaymentProvider;
  return_url: string;
  finish_redirect_url?: string; // ✨ Nuevo campo
  set_as_default?: boolean;
  metadata?: Record<string, unknown>;
}
```

### 2. Respuestas HTML

Los endpoints de callback ahora generan páginas HTML responsivas con:
- ✅ Indicador visual de éxito/error
- 🔄 Redirección automática en 3 segundos (si se proporciona `finish_redirect_url`)
- 🎯 Botón manual para continuar
- 💳 Información de la tarjeta registrada (en tokenización exitosa)
- 📱 Diseño responsive

## Ejemplos de Uso

### Tokenización con HTML Callback

```javascript
// 1. Crear sesión de tokenización
const tokenizationResponse = await fetch('/paymentCreateTokenizationSession', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    user_id: 'user123',
    provider: 'transbank',
    return_url: 'https://mi-app.com/callback/tokenization',
    finish_redirect_url: 'https://mi-app.com/dashboard' // ✨ Nueva URL de finalización
  })
});

// 2. El usuario completa el proceso en el proveedor
// 3. Es redirigido a return_url con parámetros del callback
// 4. Ve una página HTML amigable con el resultado
// 5. Es redirigido automáticamente a finish_redirect_url
```

### Webhook con HTML Response

Para webhooks que son visitados por usuarios (como notificaciones de MercadoPago), puedes solicitar respuesta HTML:

```
POST /paymentWebhookMercadoPago?html=true&redirect_url=https://mi-app.com/success
```

## Estructura HTML Generada

### Tokenización Exitosa
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <title>¡Tokenización Exitosa!</title>
    <!-- Meta tags y estilos -->
</head>
<body>
    <div class="container">
        <div class="status-icon">✅</div>
        <h1 class="title">¡Tokenización Exitosa!</h1>
        <div class="message">Tu tarjeta ha sido registrada exitosamente.</div>
        
        <!-- Información de la tarjeta -->
        <div class="card-info">
            <strong>Tarjeta registrada:</strong><br>
            •••••••••••• 4242<br>
            <small>Visa</small>
        </div>
        
        <!-- Redirección automática -->
        <p>Redirigiendo automáticamente en 3 segundos...</p>
        <a href="https://mi-app.com/dashboard" class="redirect-button">Continuar</a>
    </div>
    
    <script>
        setTimeout(function() {
            window.location.href = "https://mi-app.com/dashboard";
        }, 3000);
    </script>
</body>
</html>
```

### Error de Tokenización
```html
<div class="container">
    <div class="status-icon">❌</div>
    <h1 class="title">Error en Tokenización</h1>
    <div class="message">Error al registrar la tarjeta: Session already processed</div>
    <a href="https://mi-app.com/dashboard" class="redirect-button">Volver</a>
</div>
```

## Compatibilidad por Provider

| Provider | Soporte HTML | Campos Guardados |
|----------|--------------|------------------|
| Transbank | ✅ Completo | `finish_redirect_url`, sesión completa en Firestore |
| Stripe | ✅ Completo | `finish_redirect_url` en metadata, sesión en Firestore |
| MercadoPago | ✅ Completo | `finish_redirect_url` en metadata, sesión en Firestore |

## Flujo de Usuario Mejorado

### Antes (Solo JSON)
```
Usuario → Provider → return_url → JSON crudo → ❌ Mala UX
```

### Después (Con HTML)
```
Usuario → Provider → return_url → HTML amigable → Auto-redirect → ✅ Excelente UX
```

## Consideraciones Técnicas

1. **Backward Compatibility**: Los endpoints siguen funcionando con JSON para integraciones de sistema
2. **Session Storage**: Todos los providers ahora guardan sesiones en Firestore para recuperar `finish_redirect_url`
3. **Error Handling**: Los errores también se muestran en HTML amigable
4. **Mobile Responsive**: Las páginas HTML están optimizadas para móviles
5. **Auto-redirect**: Redirección automática en 3 segundos + botón manual como fallback

## Migración

### Para Implementar HTML Callbacks

1. **Añade `finish_redirect_url`** a tus requests de tokenización:
```javascript
{
  // ... campos existentes
  finish_redirect_url: "https://tu-app.com/success"
}
```

2. **Actualiza tu flujo** para aprovechar la redirección automática

3. **Opcional**: Para webhooks user-facing, añade `?html=true&redirect_url=...`

### Para Mantener JSON (API-to-API)

No se requieren cambios. Los endpoints siguen devolviendo JSON por defecto para integraciones de sistema.