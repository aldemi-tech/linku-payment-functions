# Arquitectura Monorepo con Microservicios

## 🏗️ Estructura de Repositorios Propuesta

### **Repositorio Core (Orquestador)**
```
aldemi-functions-core/
├── packages/                    # Submódulos git
│   ├── payment/                # Git submodule → linku-payment-gateway
│   ├── meet/                   # Git submodule → linku-meet-functions  
│   ├── notifications/          # Git submodule → linku-notifications-functions
│   └── shared/                # Utilidades compartidas entre dominios
├── src/
│   └── index.ts               # Orquestador principal - importa de packages/
├── package.json               # Dependencies del monorepo
├── firebase.json             # Configuración Firebase unificada
├── .github/
│   └── workflows/            # CI/CD que orquesta todo
├── scripts/
│   ├── setup-submodules.sh   # Configura submódulos git
│   ├── build-all.sh         # Build de todos los packages
│   └── deploy.sh            # Deploy inteligente por cambios
└── docs/
    └── ARCHITECTURE.md       # Esta documentación
```

### **Repositorios Independientes por Dominio**

#### **Payment Gateway (Actual)**
```
linku-payment-gateway/         # Repo actual, se convierte en submódulo
├── src/
│   ├── index.ts              # Exporta funciones con prefijo "payment"
│   ├── providers/
│   ├── types/
│   ├── utils/
│   └── config/
├── package.json              # Dependencies específicas de payment
├── .github/workflows/        # CI/CD independiente de payment
└── docs/                     # Documentación específica de payment
```

#### **Google Meet Functions (Nuevo)**
```
linku-meet-functions/
├── src/
│   ├── index.ts              # Exporta funciones con prefijo "meet"
│   ├── calendar/
│   ├── meetings/
│   └── types/
├── package.json              # Dependencies específicas de meet
├── .github/workflows/        # CI/CD independiente de meet
└── docs/
```

#### **Notifications Functions (Futuro)**
```
linku-notifications-functions/
├── src/
│   ├── index.ts              # Exporta funciones con prefijo "notification"
│   ├── email/
│   ├── push/
│   └── sms/
├── package.json
├── .github/workflows/
└── docs/
```

## 🔄 Flujo de Trabajo

### **1. Desarrollo Independiente**
- Cada dominio trabaja en su propio repo
- CI/CD independiente para testing y validación
- Versioning independiente (tags git)

### **2. Integración en Core**
- Core repo usa git submodules para importar dominios
- Script automatizado sincroniza cambios
- Deploy inteligente basado en qué submódulos cambiaron

### **3. Deploy Selectivo**
```bash
# Solo deploy payment si cambió
git diff --name-only HEAD~1 | grep packages/payment && deploy payment

# Deploy meet si cambió  
git diff --name-only HEAD~1 | grep packages/meet && deploy meet

# Deploy shared siempre (afecta a todos)
git diff --name-only HEAD~1 | grep packages/shared && deploy all
```

## 🚀 Setup Inicial

### **Paso 1: Preparar Repo Actual (Payment)**

1. **Prefixar funciones exportadas:**
```typescript
// src/index.ts
export const paymentTokenizeCardDirect = functions.https.onRequest(...)
export const paymentCreateTokenizationSession = functions.https.onRequest(...)
export const paymentProcessPayment = functions.https.onRequest(...)
// etc...
```

2. **Actualizar CI/CD para deployment selectivo:**
```yaml
# .github/workflows/payment-deploy.yml
name: Payment Functions Deploy
on:
  push:
    branches: [main]
    paths: ['src/**', 'package.json']
```

### **Paso 2: Crear Repo Core**

1. **Crear nuevo repo:** `aldemi-functions-core`
2. **Agregar submódulos:**
```bash
git submodule add https://github.com/aldemi-tech/linku-payment-gateway.git packages/payment
git submodule add https://github.com/aldemi-tech/linku-meet-functions.git packages/meet
```

3. **Crear orquestador:**
```typescript
// src/index.ts
export * from '../packages/payment/src';
export * from '../packages/meet/src';
export * from '../packages/notifications/src';
```

### **Paso 3: CI/CD Inteligente**

```yaml
# .github/workflows/deploy.yml
name: Smart Deploy
on:
  push:
    branches: [main]
  submodule:
    branches: [main]

jobs:
  detect-changes:
    outputs:
      payment: ${{ steps.changes.outputs.payment }}
      meet: ${{ steps.changes.outputs.meet }}
      
  deploy-payment:
    needs: detect-changes
    if: needs.detect-changes.outputs.payment == 'true'
    # Deploy solo funciones payment
    
  deploy-meet:
    needs: detect-changes  
    if: needs.detect-changes.outputs.meet == 'true'
    # Deploy solo funciones meet
```

## ✅ Beneficios

### **Para Desarrollo**
- 🔄 **Trabajo paralelo:** Equipos independientes por dominio
- 🧪 **Testing aislado:** Cada dominio tiene sus propias pruebas
- 📦 **Dependencies separadas:** No hay conflictos entre dominios
- 🏷️ **Versioning independiente:** Cada dominio evoluciona a su ritmo

### **Para Deploy**
- ⚡ **Deploy selectivo:** Solo se despliega lo que cambió
- 🛡️ **Menor riesgo:** Un dominio no afecta otros
- 📊 **Mejor monitoring:** Logs separados por dominio
- 🎯 **Rollback granular:** Rollback individual por dominio

### **Para Mantenimiento**
- 🗂️ **Código organizado:** Cada cosa en su lugar
- 🔍 **Debug más fácil:** Problemas aislados por dominio  
- 📚 **Documentación específica:** Cada dominio documenta su API
- 👥 **Ownership claro:** Equipos responsables por dominio

## 🛠️ Comandos Útiles

```bash
# Setup inicial del monorepo
./scripts/setup-monorepo.sh

# Actualizar todos los submódulos
git submodule update --recursive --remote

# Build de todos los dominios
npm run build:all

# Deploy selectivo
npm run deploy:payment
npm run deploy:meet
npm run deploy:all

# Testing por dominio
npm run test:payment
npm run test:meet
npm run test:integration
```

## 📋 Roadmap de Implementación

### **Fase 1: Preparación (Actual)**
- ✅ Prefixar funciones en payment gateway
- ✅ Actualizar CI/CD para deployment selectivo
- ✅ Documentar arquitectura

### **Fase 2: Core Setup** 
- 🔄 Crear repo `aldemi-functions-core`
- 🔄 Configurar submódulos git
- 🔄 Implementar orquestador
- 🔄 Setup CI/CD inteligente

### **Fase 3: Nuevos Dominios**
- 📅 Crear `linku-meet-functions`
- 📅 Implementar funciones de Google Meet
- 📅 Integrar con core repo

### **Fase 4: Expansión**
- 📅 `linku-notifications-functions`  
- 📅 `linku-analytics-functions`
- 📅 `linku-auth-functions`