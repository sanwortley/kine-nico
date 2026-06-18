# Module Scaffolding Skill

## Description
Patrón para crear un nuevo módulo de dominio de forma consistente. Usar al agregar un módulo o feature.

## Folder Structure
Cada módulo en `/src/modules/[module_name]` debe estructurarse de la siguiente manera:
- `/types`: Definiciones de TypeScript específicas del módulo.
- `/services` o `/use-cases`: Lógica de negocio pura (independiente de la capa HTTP/API).
- `/actions` o `/components`: Componentes visuales y Server Actions específicos del módulo.
- `/validation`: Esquemas de validación de entrada usando `zod`.

## Principles
1. **Lógica de negocio aislada**: La lógica del servicio no debe acceder directamente a objetos `NextRequest` ni `NextResponse`. Debe recibir parámetros tipados y lanzar excepciones limpias.
2. **Validación en los bordes**: Toda entrada desde la red (API routes, Server Actions) debe validarse con `zod` antes de pasar a la lógica de negocio.
3. **Modular Monolith**: Minimizar las dependencias cruzadas directas entre módulos. Si el módulo A necesita interactuar con el módulo B, debe hacerlo a través de servicios públicos expuestos, no importando archivos internos.
