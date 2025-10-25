# Guía de Implementación - Monorepo Architecture

Esta guía te llevará paso a paso para migrar de una función monolítica a una arquitectura de monorepo con microservicios por dominio.

## 🎯 Estado Actual vs Estado Objetivo

### ❌ Estado Actual (Monolítico)
```
linku-payment-gateway/
├── src/index.ts              # Todas las funciones mezcladas
├── firebase.json            # Una sola configuración
└── .github/workflows/       # Deploy todo junto
```

### ✅ Estado Objetivo (Monorepo + Microservicios)
```
aldemi-functions-core/       # Repo orquestador
├── packages/
│   ├── payment/            # Submódulo: funciones payment
│   ├── meet/              # Submódulo: funciones meet  
│   └── notifications/     # Submódulo: funciones notifications
└── src/index.ts          # Orquestador que importa de packages/

linku-payment-gateway/     # Repo independiente (actual)
linku-meet-functions/      # Repo independiente (nuevo)
linku-notifications/       # Repo independiente (futuro)
```

## 🚀 Fase 1: Preparar Proyecto Payment (ACTUAL)

### ✅ Paso 1.1: Prefixar Funciones Exportadas

**Ya completado** - Todas las funciones ahora tienen prefijo `payment`:

- `tokenizeCardDirect` → `paymentTokenizeCardDirect`
- `createTokenizationSession` → `paymentCreateTokenizationSession`
- `processPayment` → `paymentProcessPayment`
- etc...

### ✅ Paso 1.2: Actualizar CI/CD para Deploy Selectivo

**Ya completado** - Creado workflow específico de payment:
- `.github/workflows/payment-deploy.yml`
- Deploy solo funciones con prefijo `payment*`

### 🔄 Paso 1.3: Verificar que Todo Funcione

```bash
# Compilar
npm run build

# Tests
npm test

# Probar localmente
npm run serve
curl http://localhost:5001/project/us-central1/paymentGetAvailableProviders
```

### 🔄 Paso 1.4: Commit y Push Cambios

```bash
git add .
git commit -m "feat: prepare payment domain as submodule with prefixed functions"
git push origin main
```

## 🏗️ Fase 2: Crear Repo Core

### 🔄 Paso 2.1: Crear Nuevo Repositorio

1. **En GitHub:** Crear repo `aldemi-functions-core`
2. **Clonar localmente:**
   ```bash
   git clone https://github.com/aldemi-tech/aldemi-functions-core.git
   cd aldemi-functions-core
   ```

### 🔄 Paso 2.2: Ejecutar Script de Setup

```bash
# Usar el script que creamos
curl -o setup.sh https://raw.githubusercontent.com/aldemi-tech/linku-payment-gateway/main/scripts/create-monorepo-core.sh
chmod +x setup.sh
./setup.sh
```

### 🔄 Paso 2.3: Instalar Dependencies

```bash
npm install
```

### 🔄 Paso 2.4: Agregar Submódulo Payment

```bash
git submodule add https://github.com/aldemi-tech/linku-payment-gateway.git packages/payment
git submodule update --init --recursive
```

### 🔄 Paso 2.5: Crear Orquestador

```typescript
// src/index.ts
/**
 * Aldemi Functions Core - Orquestador Principal
 */

// Export payment functions
export * from '../packages/payment/src';

// Health check for entire system
export * from './shared';
```

### 🔄 Paso 2.6: Configurar Firebase

```bash
firebase init functions
# Seleccionar proyecto existente
# TypeScript: Yes
# Source directory: . (no src)
# Install dependencies: Yes
```

### 🔄 Paso 2.7: Probar Build

```bash
npm run build:all
npm run serve
```

## 🎯 Fase 3: Deploy y Verificación

### 🔄 Paso 3.1: Deploy Inicial

```bash
# Deploy manual inicial
firebase deploy --only functions

# Verificar que las funciones estén disponibles
curl https://project-id.cloudfunctions.net/paymentGetAvailableProviders
```

### 🔄 Paso 3.2: Configurar GitHub Actions en Core

```yaml
# .github/workflows/deploy.yml en core repo
name: Smart Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        submodules: recursive
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    - run: npm ci
    - name: Build all packages
      run: npm run build:all
    - name: Deploy with smart detection
      run: ./scripts/deploy-smart.sh auto
      env:
        FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### 🔄 Paso 3.3: Configurar Secrets

En el repo core, agregar secrets:
- `FIREBASE_TOKEN`: Token de Firebase CLI

## 📅 Fase 4: Agregar Dominio Meet

### 🔄 Paso 4.1: Crear Repo Meet

```bash
# Crear nuevo repo
gh repo create aldemi-tech/linku-meet-functions --public

# Clonar y configurar
git clone https://github.com/aldemi-tech/linku-meet-functions.git
cd linku-meet-functions
```

### 🔄 Paso 4.2: Implementar Funciones Meet

```typescript
// src/index.ts
export const meetCreateMeeting = functions.https.onRequest(async (req, res) => {
  // Implementación Google Meet
});

export const meetListMeetings = functions.https.onRequest(async (req, res) => {
  // Implementación listado
});
```

### 🔄 Paso 4.3: Agregar al Core como Submódulo

```bash
cd aldemi-functions-core
git submodule add https://github.com/aldemi-tech/linku-meet-functions.git packages/meet
```

### 🔄 Paso 4.4: Actualizar Orquestador

```typescript
// aldemi-functions-core/src/index.ts
export * from '../packages/payment/src';    // Payment functions
export * from '../packages/meet/src';       // Meet functions ← NUEVO
export * from './shared';                   // Shared functions
```

## 🔧 Fase 5: Scripts y Automation

### 🔄 Paso 5.1: Script de Actualización de Submódulos

```bash
# scripts/update-submodules.sh
#!/bin/bash
echo "🔄 Actualizando submódulos..."

git submodule update --recursive --remote

for submodule in packages/*; do
    if [ -d "$submodule" ]; then
        echo "📦 Actualizando $(basename $submodule)"
        cd $submodule
        git checkout main
        git pull origin main
        cd ../..
    fi
done

echo "✅ Todos los submódulos actualizados"
```

### 🔄 Paso 5.2: Script de Build Paralelo

```bash
# scripts/build-all.sh
#!/bin/bash
echo "🔨 Building all packages..."

# Build en paralelo
for package in packages/*; do
    if [ -d "$package" ] && [ -f "$package/package.json" ]; then
        echo "Building $(basename $package)..."
        (cd $package && npm run build) &
    fi
done

# Esperar que terminen todos
wait

# Build del core
echo "Building core..."
npm run build

echo "✅ All builds completed"
```

## 📊 Fase 6: Monitoring y Maintenance

### 🔄 Paso 6.1: Dashboard de Monitoreo

```bash
# Ver logs por dominio
firebase functions:log --only payment*
firebase functions:log --only meet*

# Métricas de performance
firebase functions:list
```

### 🔄 Paso 6.2: Automated Health Checks

```typescript
// src/shared.ts - en core repo
export const healthCheck = functions.https.onRequest(async (req, res) => {
  const domains = ['payment', 'meet'];
  const health = {};
  
  for (const domain of domains) {
    try {
      // Hacer health check de cada dominio
      health[domain] = 'healthy';
    } catch (error) {
      health[domain] = 'unhealthy';
    }
  }
  
  res.json({ status: 'ok', domains: health, timestamp: new Date() });
});
```

## ✅ Checklist de Verificación

### Repo Payment (Actual)
- [ ] ✅ Funciones prefixadas con `payment`
- [ ] ✅ CI/CD configurado para deploy selectivo
- [ ] ✅ Tests funcionando
- [ ] 🔄 Documentación actualizada

### Repo Core (Nuevo)  
- [ ] 🔄 Repositorio creado
- [ ] 🔄 Submódulo payment agregado
- [ ] 🔄 Orquestador funcionando
- [ ] 🔄 CI/CD inteligente configurado
- [ ] 🔄 Deploy funcionando

### Repo Meet (Futuro)
- [ ] 📅 Repositorio creado  
- [ ] 📅 Funciones implementadas
- [ ] 📅 Agregado como submódulo
- [ ] 📅 Integrado al deploy

## 🚨 Posibles Problemas y Soluciones

### Problema: Submódulos no se actualizan
```bash
# Solución: Forzar actualización
git submodule update --init --recursive --force
```

### Problema: Conflictos de dependencias
```bash
# Solución: Usar workspaces en core
npm install --workspaces
```

### Problema: Deploy falla por timeout
```bash
# Solución: Deploy por chunks
firebase deploy --only functions:payment*
firebase deploy --only functions:meet*
```

## 🎉 Beneficios Esperados

1. **🔄 Desarrollo Paralelo:** Equipos pueden trabajar independientemente
2. **🎯 Deploy Selectivo:** Solo se despliega lo que cambió
3. **📦 Dependency Isolation:** Cada dominio maneja sus propias deps
4. **🔍 Better Debugging:** Problemas aislados por dominio
5. **📊 Clear Ownership:** Cada equipo responsable de su dominio
6. **⚡ Faster Builds:** Builds paralelos y selectivos

---

**¡Con esta arquitectura tendrás un sistema escalable y mantenible para agregar nuevos dominios de funciones!** 🚀