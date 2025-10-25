# API Endpoints

## Payment Functions (linku-payment-functions)

Base URL: `https://us-central1-linku-app.cloudfunctions.net/`

### Payment Endpoints:

- **POST** `/paymentTokenizeCardDirect` - Tokeniza una tarjeta directamente sin sesión
- **POST** `/paymentCreateTokenizationSession` - Crea una sesión de tokenización
- **POST** `/paymentCompleteTokenization` - Completa el proceso de tokenización
- **POST** `/paymentProcessPayment` - Procesa un pago con el proveedor correspondiente
- **POST** `/paymentRefundPayment` - Procesa un reembolso
- **GET** `/paymentGetExecutionLocation` - Obtiene la ubicación de ejecución
- **POST** `/paymentWebhook` - Webhook para recibir notificaciones de proveedores
- **GET** `/paymentGetAvailableProviders` - Obtiene los proveedores de pago disponibles

## Meet Functions (linku-meet-functions)

### Meet Endpoints:

- **POST** `/meetCreateMeeting` - Crear una nueva reunión de Google Meet
- **GET** `/meetListMeetings` - Listar todas las reuniones
- **PUT** `/meetUpdateMeeting` - Actualizar una reunión existente
- **DELETE** `/meetDeleteMeeting` - Eliminar una reunión
- **GET** `/meetGenerateJoinLink` - Generar enlace de acceso a reunión

## URL Structure

The functions now follow a clear naming pattern:
- Payment functions: `payment{FunctionName}`
- Meet functions: `meet{FunctionName}`

This provides better organization and prevents function name conflicts between microservices.