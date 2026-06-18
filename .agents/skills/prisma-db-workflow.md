# Prisma DB Workflow Skill

## Description
Flujo seguro de cambios de esquema y migraciones con Prisma. Usar al modificar el modelo de datos o la base.

## Workflow Rules
1. **Modelado**: Definir las tablas, relaciones e índices en `prisma/schema.prisma`.
2. **Indices**: Asegurar índices en columnas de búsqueda frecuentes (como `email` en `User`, y `fechaInicio` o `clientId` en `Turno`).
3. **Generación de Migración**:
   - Ejecutar siempre `npx prisma migrate dev --name <descripcion>` para entornos locales.
   - Revisar el archivo SQL generado antes de aplicarlo a producción para verificar que no destruya datos.
4. **Respaldo de Datos**: Evitar cambios destructivos directos (como cambiar tipos de columna con datos existentes). Usar migraciones en varias fases si es necesario.
5. **Generador del Cliente**: Asegurar que `prisma generate` se ejecuta tras cada cambio de esquema.
