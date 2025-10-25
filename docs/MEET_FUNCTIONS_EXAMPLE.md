# Google Meet Functions - Domain Module Template

Este es un **template/ejemplo** de cómo sería el repo `linku-meet-functions` para funciones de Google Meet dentro del ecosistema Aldemi Functions.

## 📁 Estructura Propuesta

```
linku-meet-functions/
├── src/
│   ├── index.ts                  # Exporta funciones con prefijo "meet"
│   ├── calendar/
│   │   ├── calendar-service.ts   # Integración con Google Calendar
│   │   └── types.ts
│   ├── meetings/
│   │   ├── meet-service.ts       # Integración con Google Meet
│   │   └── room-manager.ts
│   ├── auth/
│   │   └── google-auth.ts        # Autenticación con Google APIs
│   └── types/
│       └── index.ts              # Types específicos de Meet
├── package.json
├── .github/workflows/
│   └── meet-deploy.yml           # CI/CD independiente
└── docs/
    └── GOOGLE_MEET_API.md
```

## 🎯 Funciones que Exportaría

```typescript
// src/index.ts
import * as functions from 'firebase-functions';

// Funciones con prefijo "meet" para evitar conflictos
export const meetCreateMeeting = functions.https.onRequest(async (req, res) => {
  // Crear reunión de Google Meet
});

export const meetUpdateMeeting = functions.https.onRequest(async (req, res) => {
  // Actualizar reunión existente  
});

export const meetDeleteMeeting = functions.https.onRequest(async (req, res) => {
  // Eliminar reunión
});

export const meetListMeetings = functions.https.onRequest(async (req, res) => {
  // Listar reuniones de un usuario
});

export const meetGenerateJoinLink = functions.https.onRequest(async (req, res) => {
  // Generar link de ingreso a reunión
});

export const meetWebhook = functions.https.onRequest(async (req, res) => {
  // Webhook para eventos de Google Calendar/Meet
});
```

## 🔧 package.json Ejemplo

```json
{
  "name": "linku-meet-functions",
  "version": "1.0.0",
  "description": "Google Meet integration functions for Aldemi ecosystem",
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "deploy": "firebase deploy --only functions:meet*",
    "logs": "firebase functions:log --only meet*",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "firebase-admin": "^11.11.0",
    "firebase-functions": "^4.8.1",
    "googleapis": "^128.0.0",
    "google-auth-library": "^9.4.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.8",
    "@typescript-eslint/eslint-plugin": "^5.62.0",
    "@typescript-eslint/parser": "^5.62.0",
    "eslint": "^8.57.0",
    "firebase-functions-test": "^3.3.0",
    "jest": "^29.7.0",
    "typescript": "^5.4.5"
  }
}
```

## 🔐 Configuración Google APIs

```bash
# Variables de entorno para Google APIs
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# O usando Firebase config
firebase functions:config:set google.client_id="your_client_id"
firebase functions:config:set google.client_secret="your_client_secret"
```

## 🚀 CI/CD Workflow

```yaml
# .github/workflows/meet-deploy.yml
name: Meet Domain - CI/CD

on:
  push:
    branches: [ main ]
    paths: 
      - 'src/**'
      - 'package.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run build
    - name: Deploy to Firebase
      uses: w9jds/firebase-action@master
      with:
        args: deploy --only functions:meetCreateMeeting,functions:meetUpdateMeeting,functions:meetDeleteMeeting,functions:meetListMeetings,functions:meetGenerateJoinLink,functions:meetWebhook
      env:
        FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## 🧪 Testing Ejemplo

```typescript
// src/__tests__/meet.test.ts
import { meetCreateMeeting } from '../index';

describe('Google Meet Functions', () => {
  test('should create meeting successfully', async () => {
    const req = {
      method: 'POST',
      body: {
        title: 'Test Meeting',
        start_time: '2024-01-01T10:00:00Z',
        duration: 60
      }
    };
    
    // Mock response
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    await meetCreateMeeting(req as any, res as any);
    
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        meeting_id: expect.any(String),
        join_url: expect.any(String)
      })
    });
  });
});
```

## 🔄 Integración con Monorepo

### En el Core Repo:
```typescript
// aldemi-functions-core/src/index.ts
export * from '../packages/payment/src';    // Payment functions  
export * from '../packages/meet/src';       // Meet functions (este repo)
export * from '../packages/notifications/src'; // Future domain
```

### Deploy Inteligente:
```bash
# Solo despliega meet si cambió
./scripts/deploy.sh meet

# O automáticamente si detecta cambios en packages/meet/
./scripts/deploy.sh auto
```

## 📊 APIs de Google que Usaría

1. **Google Calendar API**
   - Crear/editar eventos
   - Gestionar invitados
   - Configurar recordatorios

2. **Google Meet API** 
   - Crear reuniones
   - Generar links de ingreso
   - Configurar opciones de reunión

3. **Google Workspace Admin API**
   - Gestionar usuarios organizacionales
   - Configuraciones de dominio

## 🎯 Casos de Uso

1. **Crear Reunión Rápida**
   ```bash
   curl -X POST /meetCreateMeeting \
     -d '{"title": "Stand-up Daily", "duration": 15}'
   ```

2. **Programar Reunión**
   ```bash
   curl -X POST /meetCreateMeeting \
     -d '{"title": "Review Semanal", "start_time": "2024-01-15T14:00:00Z", "attendees": ["user@example.com"]}'
   ```

3. **Integración con Calendario**
   ```bash
   curl -X POST /meetCreateMeeting \
     -d '{"title": "Demo Cliente", "calendar_sync": true, "reminder": 15}'
   ```

---

**Este es solo un ejemplo de cómo se estructuraría un dominio Google Meet dentro del ecosistema de funciones** 📅🎥