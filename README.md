# Linku Payment Functions# 🚀 Linku Payment Gateway
 


Sistema de gateway de pagos que unifica múltiples proveedores bajo una API consistente.**Firebase Cloud Functions para integración completa de pagos**



## Arquitectura> Integración real con Stripe, Transbank y MercadoPago usando SDKs oficiales  

> **✨ Ahora con autenticación Bearer Token y validación User-Agent**

Este repositorio contiene las funciones específicas del dominio de pagos como parte del ecosistema Linku microservicios.

---

- **Repositorio Principal**: linku-core (orquestrador)  

- **Este Repositorio**: linku-payment-functions (dominio de pagos)## ⚡ **Setup Rápido**



## Características```bash

# 1. Clonar repositorio  

- Soporte para múltiples proveedores de pago:git clone https://github.com/aldemi-tech/linku-payment-gateway.git

  - Stripecd linku-payment-gateway

  - Transbank (Chile) 

  - MercadoPago# 2. Setup automático (crea repo, secrets, deploy)

- Tokenización de tarjetas para pagos seguros./setup.sh

- Procesamiento de pagos unificado```

- Sistema de credenciales de prueba automático

- Lazy initialization para mejor rendimiento**¡Eso es todo!** El script hace:

- ✅ Instala dependencias

## Funciones Exportadas- ✅ Genera Firebase CI token seguramente  

- ✅ Configura GitHub Secrets

### Tokenización- ✅ Despliega automáticamente a Firebase

- `paymentTokenizeCardDirect`: Tokeniza tarjetas de crédito

---

### Procesamiento

- `paymentProcessPayment`: Procesa pagos usando tokens## 🎯 Características

- `paymentGetPaymentStatus`: Consulta estado de pagos

- `paymentCancelPayment`: Cancela transacciones### 🔐 **Seguridad Mejorada**

- ✅ **Bearer Token Authentication** - Validación de tokens Firebase Auth

### Utilidades- ✅ **User-Agent Validation** - Debe comenzar con "Linku"

- `paymentGetProviders`: Lista proveedores disponibles- ✅ **Request Metadata** - Tracking completo de headers y ubicación

- ✅ **Execution Location Detection** - Detecta ubicación via headers x-appengine-*

## Instalación

### Proveedores Soportados

```bash- ✅ **Stripe** - Tokenización directa

npm install- ✅ **Transbank OneClick** - Tokenización con redirección web

```- ✅ **MercadoPago** - Tokenización directa con CVC opcional



## Configuración### Arquitectura

- 🔄 **HTTP Request Functions** (no más onCall)

### Credenciales de Producción- 📍 **Location Tracking** - Metadata en cada operación

Configura en Firebase Remote Config:- 🛡️ **Enhanced Validation** - Bearer + User-Agent + Metadata



```json### Métodos de Tokenización

{1. **Tokenización Directa** (Stripe/MercadoPago)

  "stripe": {   - Formulario en la app

    "secretKey": "sk_live_...",   - Sin redirección

    "publicKey": "pk_live_..."   - Inmediato

  },

  "transbank": {2. **Tokenización con Redirección** (Transbank)

    "commerceCode": "12345678",   - Genera link de pago

    "apiKey": "real_api_key_here"   - Abre WebView

  },   - Callback de confirmación

  "mercadopago": {

    "accessToken": "PROD-..."## 📁 Estructura del Proyecto

  }

}```

```payment-gateway-functions/

├── src/

### Credenciales de Prueba (Automáticas)│   ├── index.ts                 # Cloud Functions principales

Si no se proporcionan credenciales, el sistema usa automáticamente:│   ├── types/

- Stripe: Credenciales de test oficiales│   │   └── index.ts            # TypeScript types e interfaces

- Transbank: Ambiente de integración │   ├── utils/

- MercadoPago: Tokens de sandbox│   │   └── index.ts            # Utilidades compartidas

│   └── providers/

## Uso│       ├── base.ts             # Interface base

│       ├── factory.ts          # Factory de proveedores

```typescript│       ├── stripe.ts           # Implementación Stripe

// Tokenización│       └── transbank.ts        # Implementación Transbank

const token = await paymentTokenizeCardDirect({├── lib/                         # Código compilado (generado)

  provider: 'stripe',├── node_modules/

  cardData: {├── package.json

    number: '4242424242424242',├── tsconfig.json

    expiryMonth: '12',├── .eslintrc.js

    expiryYear: '2025',├── firebase.json

    cvv: '123',└── README.md

    holderName: 'John Doe'```

  }

});## 🚀 Instalación



// Procesamiento### 1. Clonar e Instalar Dependencias

const payment = await paymentProcessPayment({

  provider: 'stripe',```bash

  amount: 10000,cd payment-gateway-functions

  currency: 'clp',npm install

  token: token.token,```

  orderId: 'order_123'

});### 2. Configurar Firebase

```

```bash

## Desarrollo# Login a Firebase

firebase login

### Tests

```bash# Inicializar proyecto (si no está inicializado)

npm testfirebase init functions

```

# Seleccionar proyecto existente o crear uno nuevo

### Build```

```bash

npm run build### 3. Configurar Variables de Entorno

```

#### Opción A: Firebase Functions Config (Recomendado para producción)

### Deploy Payment Functions

```bash```bash

# Deploy todas las funciones de pago# Stripe

firebase deploy --only functions:paymentfirebase functions:config:set stripe.public_key="pk_live_..."

firebase functions:config:set stripe.secret_key="sk_live_..."

# Deploy función específicafirebase functions:config:set stripe.webhook_secret="whsec_..."

firebase deploy --only functions:paymentTokenizeCardDirect

```# Transbank

firebase functions:config:set transbank.merchant_id="123456789"

## Proveedores Soportadosfirebase functions:config:set transbank.secret_key="your_secret_key"

firebase functions:config:set transbank.api_url="https://webpay3g.transbank.cl"

### Stripe```

- Tokenización completa

- Procesamiento inmediato#### Opción B: Variables de Entorno Locales (Para desarrollo)

- Webhooks de estado

Crear archivo `.env` en la raíz:

### Transbank

- Integración con Webpay Plus```env

- Ambiente de pruebas automáticoSTRIPE_PUBLIC_KEY=pk_test_...

- Confirmación de transaccionesSTRIPE_SECRET_KEY=sk_test_...

STRIPE_WEBHOOK_SECRET=whsec_...

### MercadoPago

- API v1 y v2TRANSBANK_MERCHANT_ID=123456789

- Sandbox automáticoTRANSBANK_SECRET_KEY=your_secret_key

- Notificaciones IPNTRANSBANK_API_URL=https://webpay3gint.transbank.cl

```

## Contribución

### 🚀 **NUEVO: Credenciales de Prueba Automáticas**

1. Fork este repositorio específico

2. Crea rama feature: `git checkout -b feature/payment-improvement`¡Ahora puedes empezar a desarrollar sin configurar nada! 

3. Commit cambios: `git commit -m 'feat: improve stripe integration'`

4. Push: `git push origin feature/payment-improvement`- ✅ **Transbank**: Se inicializa automáticamente con credenciales de prueba públicas

5. Crear Pull Request- ⚠️ **Stripe**: Requiere tus propias claves de prueba (desde tu dashboard de Stripe)

- ⚠️ **MercadoPago**: Requiere crear una aplicación de prueba en tu cuenta

## Licencia

**Verificar providers disponibles:**

MIT License```bash
curl https://tu-proyecto.cloudfunctions.net/getAvailableProviders
```

📖 **Ver documentación completa**: [TEST_CREDENTIALS.md](./docs/TEST_CREDENTIALS.md)

## 🔧 Desarrollo

### Compilar TypeScript

```bash
npm run build
```

### Ejecutar Emuladores Locales

```bash
npm run serve
```

Esto iniciará los emuladores de Firebase Functions en `http://localhost:5001`.

### Linting

```bash
# Ver errores
npm run lint

# Corregir automáticamente
npm run lint:fix
```

## 📤 Deployment

### Deploy todas las funciones

```bash
npm run deploy
```

### Deploy función específica

```bash
firebase deploy --only functions:tokenizeCardDirect
firebase deploy --only functions:processPayment
```

## 📚 API Reference

> **🚨 IMPORTANTE:** Todas las funciones ahora son **HTTP Request** (no más httpsCallable)

### 🔐 **Autenticación Requerida**

Todas las requests deben incluir:

```javascript
headers: {
  'Authorization': 'Bearer <firebase-id-token>',
  'User-Agent': 'Linku/1.0.0 (iOS/Android)',
  'Content-Type': 'application/json'
}
```

### 1. Tokenización Directa (Stripe/MercadoPago)

**Endpoint:** `POST /tokenizeCardDirect`

**Headers:**
```javascript
{
  'Authorization': 'Bearer <firebase-id-token>',
  'User-Agent': 'Linku/1.0.0',
  'Content-Type': 'application/json'
}
```

**Request Body:**
```typescript
{
  user_id: string;
  provider: "stripe" | "mercadopago";
  card_number: string;
  card_exp_month: number;
  card_exp_year: number;
  card_cvv: string;
  card_holder_name: string;
  set_as_default?: boolean;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    token_id: string;
    card_last4: string;
    card_brand: string;
    card_exp_month: number;
    card_exp_year: number;
    is_default: boolean;
  }
}
```

**Ejemplo desde la App:**
```typescript
import auth from '@react-native-firebase/auth';

const tokenizeCard = async (cardData) => {
  const user = auth().currentUser;
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://region-project.cloudfunctions.net/tokenizeCardDirect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'User-Agent': 'Linku/1.0.0 iOS',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.uid,
      provider: 'stripe',
      card_number: '4242424242424242',
      card_exp_month: 12,
      card_exp_year: 2025,
      card_cvv: '123',
      card_holder_name: 'Juan Pérez',
      set_as_default: true,
    }),
  });
  
  const result = await response.json();
  console.log(result); // { success: true, data: { token_id: '...' } }
};
```

### 2. Crear Sesión de Tokenización (Transbank)

**Function:** `createTokenizationSession`

**Request:**
```typescript
{
  user_id: string;
  provider: "transbank";
  return_url: string;
  set_as_default?: boolean;
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    session_id: string;
    redirect_url: string;  // URL para abrir en WebView
    expires_at: Timestamp;
  }
}
```

**Ejemplo desde la App:**
```typescript
const createSession = httpsCallable(functions, 'createTokenizationSession');

const result = await createSession({
  user_id: currentUser.uid,
  provider: 'transbank',
  return_url: 'myapp://payment/callback',
});

// Abrir WebView con redirect_url
const { redirect_url, session_id } = result.data.data;
Linking.openURL(redirect_url);
```

### 3. Completar Tokenización (Callback)

**Function:** `completeTokenization`

**Request:**
```typescript
{
  session_id: string;
  provider: "transbank";
  callback_data: any; // Datos del callback de Transbank
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    token_id: string;
    card_last4: string;
    card_brand: string;
    card_exp_month: number;
    card_exp_year: number;
    is_default: boolean;
  }
}
```

### 4. Procesar Pago

**Function:** `processPayment`

**Request:**
```typescript
{
  user_id: string;
  professional_id: string;
  service_request_id: string;
  amount: number;
  currency: string;
  provider: "stripe" | "transbank";
  token_id: string; // Token de tarjeta guardado
  description: string;
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    payment_id: string;
    status: "completed";
    amount: number;
    currency: string;
    provider_payment_id: string;
  }
}
```

**Ejemplo:**
```typescript
const processPayment = httpsCallable(functions, 'processPayment');

const result = await processPayment({
  user_id: currentUser.uid,
  professional_id: 'prof_123',
  service_request_id: 'req_456',
  amount: 50000, // CLP
  currency: 'CLP',
  provider: 'stripe',
  token_id: 'stripe_token_xyz',
  description: 'Pago por servicio de plomería',
});
```

### 5. Obtener Tarjetas del Usuario

**Function:** `getUserCards`

**Request:**
```typescript
{
  user_id: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    cards: Array<{
      token_id: string;
      card_last4: string;
      card_brand: string;
      card_exp_month: number;
      card_exp_year: number;
      card_holder_name?: string;
      is_default: boolean;
      provider: string;
      created_at: Timestamp;
    }>
  }
}
```

### 6. Eliminar Tarjeta

**Function:** `deleteCard`

**Request:**
```typescript
{
  token_id: string;
}
```

### 7. Reembolsar Pago

**Endpoint:** `POST /refundPayment`

**Request Body:**
```typescript
{
  payment_id: string;
  amount?: number; // Opcional, si no se especifica reembolsa el total
}
```

### 8. Obtener Ubicación de Ejecución

**Endpoint:** `GET /getExecutionLocation`

**Headers:**
```javascript
{
  'Authorization': 'Bearer <firebase-id-token>',
  'User-Agent': 'Linku/1.0.0'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    // App Engine location headers
    city: string | null;
    region: string | null;
    country: string | null;
    datacenter: string | null;
    
    // Additional location info
    cloudflareCountry: string | null;
    cloudTraceContext: string | null;
    
    // Network info
    forwardedFor: string | null;
    realIp: string | null;
    clientIp: string;
    
    // Server info
    serverName: string | null;
    userAgent: string;
    
    // Formatted location
    formattedLocation: string | null;
    
    // Timestamp
    timestamp: string;
  }
}
```

**Ejemplo:**
```typescript
const getLocation = async () => {
  const user = auth().currentUser;
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://region-project.cloudfunctions.net/getExecutionLocation', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'User-Agent': 'Linku/1.0.0 iOS',
    },
  });
  
  const result = await response.json();
  console.log(result.data.formattedLocation); // "Santiago, RM, Chile"
};
```

## 🔐 Seguridad

### 🚨 **CAMBIOS IMPORTANTES DE AUTENTICACIÓN**

#### **Migración de onCall a onRequest**

Las Cloud Functions ahora usan **HTTP Request** en lugar de **Callable Functions**:

**❌ Antes (onCall):**
```typescript
const tokenize = httpsCallable(functions, 'tokenizeCardDirect');
const result = await tokenize(data);
```

**✅ Ahora (onRequest):**
```typescript
const idToken = await auth().currentUser.getIdToken();

const response = await fetch('https://region-project.cloudfunctions.net/tokenizeCardDirect', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'User-Agent': 'Linku/1.0.0 iOS',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

const result = await response.json();
```

#### **Validaciones de Seguridad**

1. **Bearer Token:** Header `Authorization: Bearer <firebase-id-token>`
2. **User-Agent:** Debe comenzar con `"Linku"`
3. **Request Metadata:** Todos los headers se guardan para auditoría
4. **Execution Location:** Detecta y registra ubicación geográfica

### Reglas de Firestore

Agregar estas reglas en Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Card Tokens - Solo el dueño puede leer/escribir
    match /card_tokens/{tokenId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.user_id;
    }
    
    // Payments - Usuario o profesional pueden leer
    match /payments/{paymentId} {
      allow read: if request.auth != null 
        && (request.auth.uid == resource.data.user_id 
            || request.auth.uid == resource.data.professional_id);
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.user_id;
    }
    
    // Tokenization Sessions - Solo el dueño
    match /tokenization_sessions/{sessionId} {
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.user_id;
    }
  }
}
```

### Validaciones

- ✅ Autenticación requerida para todas las funciones
- ✅ Validación de user_id vs auth.uid
- ✅ Validación de algoritmo Luhn para números de tarjeta
- ✅ Validación de fechas de expiración
- ✅ Sanitización de logs (no se registran datos sensibles)
- ✅ Verificación de signatures en webhooks

## 🌐 Webhooks

### Stripe Webhook

**URL:** `https://[region]-[project-id].cloudfunctions.net/stripeWebhook`

Configurar en Stripe Dashboard:
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`

### Transbank Webhook

**URL:** `https://[region]-[project-id].cloudfunctions.net/transbankWebhook`

Configurar con Transbank (generalmente basado en IP whitelist).

## 🧪 Testing

### Test con Tarjetas de Prueba

**Stripe:**
```
Número: 4242 4242 4242 4242
CVV: Cualquier 3 dígitos
Fecha: Cualquier fecha futura
```

**Transbank:**
```
Usar ambiente de integración (webpay3gint.transbank.cl)
Tarjetas de prueba proporcionadas por Transbank
```

## 📊 Colecciones de Firestore

### `card_tokens`
```typescript
{
  token_id: string;
  user_id: string;
  provider: "stripe" | "transbank";
  card_last4: string;
  card_brand: string;
  card_exp_month: number;
  card_exp_year: number;
  card_holder_name?: string;
  is_default: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  metadata: object;
}
```

### `payments`
```typescript
{
  payment_id: string;
  user_id: string;
  professional_id: string;
  service_request_id: string;
  amount: number;
  currency: string;
  provider: "stripe" | "transbank" | "mercadopago";
  provider_payment_id?: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
  token_id?: string;
  payment_method_details?: object;
  error_message?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  completed_at?: Timestamp;
  
  // 📍 Metadata de la request de pago
  metadata: {
    ip: string;
    userAgent: string;
    executionLocation?: string;
    timestamp: Timestamp;
    [key: string]: any;
  };
  
  // Metadata de reembolso (si aplica)
  refund_metadata?: {
    ip: string;
    userAgent: string;
    executionLocation?: string;
    timestamp: Timestamp;
  };
  refunded_at?: Timestamp;
}
```

### `tokenization_sessions`
```typescript
{
  session_id: string;
  user_id: string;
  provider: "stripe" | "transbank" | "mercadopago";
  type: "direct" | "redirect";
  status: "pending" | "completed" | "failed" | "expired";
  redirect_url?: string;
  return_url?: string;
  token_id?: string;
  error_message?: string;
  created_at: Timestamp;
  expires_at?: Timestamp;
  completed_at?: Timestamp;
  
  // 📍 Metadata de la request
  metadata: {
    ip: string;
    userAgent: string;
    origin?: string;
    referer?: string;
    acceptLanguage?: string;
    executionLocation?: string; // "Santiago, RM, Chile"
    timestamp: Timestamp;
    // Headers adicionales (x-appengine-*, x-forwarded-*, etc.)
    [key: string]: any;
  };
  
  // Metadata de completación (solo para redirect)
  completion_metadata?: {
    ip: string;
    userAgent: string;
    executionLocation?: string;
    timestamp: Timestamp;
  };
}
```

## 🐛 Troubleshooting

### Error: "UNAUTHENTICATED"
- Verifica que el usuario esté autenticado con Firebase Auth
- Verifica que el `idToken` esté siendo enviado correctamente

### Error: "PROVIDER_NOT_FOUND"
- Verifica la configuración de variables de entorno
- Revisa los logs: `npm run logs`

### Error: "INVALID_CARD"
- Verifica que el número de tarjeta sea válido (algoritmo Luhn)
- Para Stripe, usa tarjetas de prueba válidas

## 📝 Licencia

ISC

## 👥 Autor

**Aldemi Tech**

---

## 🔄 Próximas Mejoras

- [ ] Soporte para MercadoPago
- [ ] Pagos recurrentes
- [ ] Soporte para múltiples monedas
- [ ] Dashboard de administración
- [ ] Retry automático de pagos fallidos
- [ ] Notificaciones push en cambios de estado
