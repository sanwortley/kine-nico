// Feature flags for the application
export const FEATURE_FLAGS = {
  // Use mock data JSON persistence instead of Prisma connection.
  // Set to false when DATABASE_URL is configured and PostgreSQL is available.
  USE_MOCK_DATA: true,

  // Enable Phase 2 features: Plans and Mercado Pago billing skelton
  ENABLE_PLANS_PHASE_2: true,
};
