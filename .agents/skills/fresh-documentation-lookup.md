# Fresh Documentation Lookup Skill

## Description
Busca y lee la documentación más reciente de Next.js, Prisma, Auth.js y Mercado Pago antes de generar código para evitar APIs desactualizadas o patrones en desuso.

## Lookup Strategy
- **Next.js (App Router)**: Buscar documentación oficial de Next.js para asegurar compatibilidad con las últimas versiones (e.g. Server Actions de Next.js 14/15, enrutamiento, optimizaciones).
- **Auth.js (NextAuth.js v5)**: Asegurar el uso de la API actualizada de Auth.js (`@auth/prisma-adapter`, funciones de configuración de NextAuth v5 con App Router).
- **Prisma ORM**: Verificar métodos y tipos actualizados del cliente Prisma.
- **Mercado Pago**: Consultar la API de la pasarela para Argentina antes de estructurar cobros.

## Instruction
Antes de escribir o modificar código técnico de estas librerías, utiliza herramientas de búsqueda web (`search_web`) o lectura de URLs oficiales (`read_url_content`) para comprobar el estado actual de las APIs de las versiones correspondientes y evitar patrones obsoletos.
