# MercadoPago Billing Skill (Fase 2 - Inactiva)

## Description
Integración de planes y pagos con Mercado Pago detrás de la interfaz de billing. Usar al implementar suscripciones o cobros.

> [!NOTE]
> Esta skill se encuentra inactiva/deshabilitada durante la **FASE 1 (MVP)**. Se mantendrá el esqueleto técnico de interfaces y feature flags listo para su activación en la **FASE 2**.

## Architecture Patterns (Fase 2)
1. **Billing Interface**: Toda interacción con la pasarela de pagos debe estar detrás de una interfaz abstracta (por ejemplo, `BillingService`).
2. **Mercado Pago Implementation**: Implementación concreta de `BillingService` usando el SDK oficial de Mercado Pago de Argentina.
3. **Webhooks**: Endpoint de recepción de notificaciones de Mercado Pago (IPN/Webhooks) para actualizar de forma asíncrona el estado de las suscripciones.
4. **Subscription Lifecycle**: Manejo de suscripciones mensuales, cobros recurrentes y reintentos ante fallos de pago.
