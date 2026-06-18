# Turnos Domain Rules Skill

## Description
Reglas de negocio de turnos y reservas. Usar al trabajar en disponibilidad, reservas, estados o calendario.

## Domain Rules

### 1. Estados de los Turnos
- **DISPONIBLE**: Turno creado por el administrador que está libre para ser reservado por un cliente.
- **RESERVADO**: Turno que ha sido reservado por un cliente (requiere `clientId`).
- **CANCELADO**: Turno anulado por el administrador o por el cliente.
- **COMPLETADO**: Turno asistido y concluido con éxito.

### 2. Prevención de Doble Reserva (Concurrencia)
- Al reservar un turno, se debe garantizar la atomicidad de la operación para evitar que dos clientes reserven el mismo turno simultáneamente.
- Utilizar transacciones de base de datos (Prisma `$transaction`) y bloqueos optimistas o cláusulas `where` que verifiquen que el estado sigue siendo `DISPONIBLE` al momento de actualizar.

### 3. Zona Horaria y Fechas
- **Zona Horaria Oficial**: `America/Argentina/Cordoba` (UTC-3).
- Las fechas deben almacenarse en formato UTC en la base de datos, pero procesarse y mostrarse en el frontend en la zona horaria de Argentina.
- Formatos de presentación en español de Argentina (`es-AR`).

### 4. Validaciones de Negocio
- Los turnos no pueden reservarse en el pasado.
- Duración estándar por defecto: 60 minutos (o parametrizable).
- El cliente solo puede cancelar con un límite de anticipación establecido (ej. 24 horas antes).
