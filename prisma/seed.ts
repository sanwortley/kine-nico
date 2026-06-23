import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const ADMIN_ID = 'admin-seed-1';
const CLIENT_ID = 'client-seed-1';
const SRV_GYM_ID = 'srv-gym-1';
const SRV_READAP_ID = 'srv-readap-1';
const SRV_OSTEO_ID = 'srv-osteo-1';
const PROF_1_ID = 'prof-nico-1';
const PROF_2_ID = 'prof-sofia-1';

async function main() {
  console.log('🌱 Seeding database...');

  // ── Servicios ──────────────────────────────────────────────────────────────
  const srvGym = await prisma.service.upsert({
    where: { id: SRV_GYM_ID },
    update: {},
    create: {
      id: SRV_GYM_ID,
      name: 'Gimnasio Supervisado',
      description: 'Pensado para: pacientes que terminaron rehabilitación, personas con patologías, adultos activos, deportistas amateurs. Incluye: acceso al gimnasio, plan de entrenamiento y supervisión profesional. Frecuencia libre.',
      price: 0,
      duration: 60,
      active: true,
    },
  });

  const srvReadap = await prisma.service.upsert({
    where: { id: SRV_READAP_ID },
    update: {},
    create: {
      id: SRV_READAP_ID,
      name: 'Readaptación Física',
      description: 'Pensado para: lesiones musculares, esguinces, post-cirugía, dolor cervical-dorsal-lumbar, readaptación inicial. Incluye: evaluación funcional, planificación de ejercicios, entrenamiento supervisado, progresión de cargas y seguimiento.',
      price: 12000,
      duration: 60,
      active: true,
    },
  });

  await prisma.service.upsert({
    where: { id: SRV_OSTEO_ID },
    update: {},
    create: {
      id: SRV_OSTEO_ID,
      name: 'Osteopatía Integral',
      description: 'Terapia manual holística para la restauración de la movilidad corporal.',
      price: 18000,
      duration: 60,
      active: false,
    },
  });

  console.log('✓ Servicios');

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@njk.com' },
    update: {},
    create: {
      id: ADMIN_ID,
      email: 'admin@njk.com',
      hashedPassword: '$2b$10$qpGTacCS.nMrs5pGaUnNd.a2LBx1EN1LBp73cD8W6bZOZNKeFUoV6', // admin
      name: 'Dr. Nicolás Jaled (Admin)',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'paciente@gmail.com' },
    update: {},
    create: {
      id: CLIENT_ID,
      email: 'paciente@gmail.com',
      hashedPassword: '$2b$10$0c.QKpw0xoaFLPhyfa1RD.vZGwMmxkwa457eXLc5ayI6Wzqu4vNye', // paciente
      name: 'Carlos Menem',
      role: 'CLIENT',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'pendiente@gmail.com' },
    update: {},
    create: {
      email: 'pendiente@gmail.com',
      hashedPassword: '$2b$10$0c.QKpw0xoaFLPhyfa1RD.vZGwMmxkwa457eXLc5ayI6Wzqu4vNye', // paciente
      name: 'María Becerra (Pendiente)',
      role: 'CLIENT',
      status: 'PENDING',
    },
  });

  console.log('✓ Usuarios');

  // ── Profesionales ──────────────────────────────────────────────────────────
  await prisma.professional.upsert({
    where: { id: PROF_1_ID },
    update: {},
    create: {
      id: PROF_1_ID,
      name: 'Lic. Nicolás Jaled',
      specialty: 'Kinesiología Deportiva y Osteopatía',
      email: 'nico@njk.com',
      active: true,
      serviceId: srvGym.id,
    },
  });

  await prisma.professional.upsert({
    where: { id: PROF_2_ID },
    update: {},
    create: {
      id: PROF_2_ID,
      name: 'Lic. Sofía Rodríguez',
      specialty: 'Reeducación Postural Global (RPG)',
      email: 'sofia@njk.com',
      active: true,
      serviceId: srvReadap.id,
    },
  });

  console.log('✓ Profesionales');

  // ── Planes ─────────────────────────────────────────────────────────────────
  const planDefs = [
    { id: 'plan-eval-pack',        nombre: 'Evaluación + Plan de Entrenamiento', descripcion: '1 reserva - válido por 7 días desde la fecha de compra',  price: 70000,  interval: 'week',   limiteTurnos: 1,  features: ['1 reserva', 'Válido por 7 días'] },
    { id: 'plan-eval-func',        nombre: 'Evaluación Funcional',               descripcion: '1 reserva - válido por 7 días desde la fecha de compra',  price: 40000,  interval: 'week',   limiteTurnos: 1,  features: ['1 reserva', 'Válido por 7 días'] },
    { id: 'plan-gym-supervisado',  nombre: 'Gimnasio Supervisado',               descripcion: '24 reservas - válido por 30 días desde la fecha de compra', price: 60000, interval: 'month',  limiteTurnos: 24, features: ['24 reservas', 'Válido por 30 días'] },
    { id: 'plan-pack-8',           nombre: 'Pack de 8 Sesiones',                 descripcion: '8 reservas - válido por 45 días desde la fecha de compra',  price: 76000, interval: 'custom', limiteTurnos: 8,  features: ['8 reservas', 'Válido por 45 días'] },
    { id: 'plan-pack-12',          nombre: 'Pack por 12 sesiones',               descripcion: '12 reservas - válido por 45 días desde la fecha de compra', price: 102000, interval: 'custom', limiteTurnos: 12, features: ['12 reservas', 'Válido por 45 días'] },
    { id: 'plan-training-only',    nombre: 'Plan de entrenamiento',              descripcion: '1 reserva - válido por 2 días desde la fecha de compra',   price: 30000, interval: 'custom', limiteTurnos: 1,  features: ['1 reserva', 'Válido por 2 días'] },
  ];

  for (const p of planDefs) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, activo: true },
    });
  }

  console.log('✓ Planes');

  // ── Suscripción demo para el cliente de prueba ─────────────────────────────
  const existingSub = await prisma.subscription.findFirst({
    where: { userId: client.id, estado: 'ACTIVE' },
  });

  if (!existingSub) {
    const now = new Date();
    await prisma.subscription.create({
      data: {
        userId: client.id,
        planId: 'plan-pack-8',
        estado: 'ACTIVE',
        turnosRestantes: 8,
        fechaInicio: now,
        fechaFin: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        paymentGateway: 'MANUAL',
      },
    });
    console.log('✓ Suscripción demo (Pack 8 → Carlos Menem)');
  }

  // ── Turnos disponibles: próximos 5 días (lun-vie, 3 horarios) ─────────────
  const existingTurnos = await prisma.turno.count({ where: { estado: 'DISPONIBLE' } });

  if (existingTurnos === 0) {
    const slots = ['09:00', '10:00', '11:00'];
    const now = new Date();
    const turnos: { fechaInicio: Date; duracion: number; estado: 'DISPONIBLE'; serviceId: string; professionalId: string; createdById: string; version: number }[] = [];

    for (let day = 1; day <= 7; day++) {
      const d = new Date(now);
      d.setDate(now.getDate() + day);
      const dow = d.getDay(); // 0 = Dom, 6 = Sáb
      if (dow === 0 || dow === 6) continue; // solo lun-vie

      for (const slot of slots) {
        const [h, m] = slot.split(':').map(Number);
        const fechaInicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);

        const isOdd: boolean = turnos.length % 2 === 0;
        turnos.push({
          fechaInicio,
          duracion: 60,
          estado: 'DISPONIBLE' as const,
          serviceId: isOdd ? srvGym.id : srvReadap.id,
          professionalId: isOdd ? PROF_1_ID : PROF_2_ID,
          createdById: admin.id,
          version: 0,
        });
      }
    }

    await prisma.turno.createMany({ data: turnos });
    console.log(`✓ Turnos disponibles (${turnos.length} slots)`);
  }

  console.log('\n✅ Seed completado exitosamente');
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());