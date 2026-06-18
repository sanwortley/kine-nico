import fs from 'fs';
import path from 'path';

// Types matching the Prisma Schema
export type Role = 'ADMIN' | 'CLIENT' | 'PROFESSIONAL';
export type AccountStatus = 'PENDING' | 'EMAIL_VERIFIED' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type TurnoState = 'DISPONIBLE' | 'RESERVADO' | 'CANCELADO' | 'COMPLETADO';

export interface User {
  id: string;
  email: string;
  hashedPassword?: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  email?: string;
  active: boolean;
  serviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Turno {
  id: string;
  fechaInicio: string; // ISO string
  duracion: number;
  estado: TurnoState;
  notas?: string;
  serviceId: string;
  professionalId: string;
  clientId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  price: number;
  interval: string;
  features: string[];
  activo: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  estado: string;
  fechaInicio: string;
  fechaFin?: string;
  paymentGateway: string;
  gatewaySubId?: string;
}

interface MockDataSchema {
  users: User[];
  professionals: Professional[];
  services: Service[];
  turnos: Turno[];
  plans: Plan[];
  subscriptions: Subscription[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'mock-db.json');

// Default Seed Data
const DEFAULT_DATA: MockDataSchema = {
  users: [
    {
      id: 'admin-1',
      email: 'admin@njk.com',
      hashedPassword: '$2b$10$qpGTacCS.nMrs5pGaUnNd.a2LBx1EN1LBp73cD8W6bZOZNKeFUoV6', // password: admin
      name: 'Dr. Nicolás Jaled (Admin)',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'client-1',
      email: 'paciente@gmail.com',
      hashedPassword: '$2b$10$0c.QKpw0xoaFLPhyfa1RD.vZGwMmxkwa457eXLc5ayI6Wzqu4vNye', // password: paciente
      name: 'Carlos Menem',
      role: 'CLIENT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'client-pending',
      email: 'pendiente@gmail.com',
      hashedPassword: '$2b$10$0c.QKpw0xoaFLPhyfa1RD.vZGwMmxkwa457eXLc5ayI6Wzqu4vNye', // password: paciente
      name: 'María Becerra (Pendiente)',
      role: 'CLIENT',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  professionals: [
    {
      id: 'prof-1',
      name: 'Lic. Nicolás Jaled',
      specialty: 'Kinesiología Deportiva y Osteopatía',
      email: 'nico@njk.com',
      active: true,
      serviceId: 'srv-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prof-2',
      name: 'Lic. Sofía Rodríguez',
      specialty: 'Reeducación Postural Global (RPG)',
      email: 'sofia@njk.com',
      active: true,
      serviceId: 'srv-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  services: [
    {
      id: 'srv-1',
      name: 'Gimnasio Supervisado',
      description: 'Pensado para: pacientes que terminaron rehabilitación, personas con patologías, adultos activos, deportistas amateurs. Incluye: acceso al gimnasio, plan de entrenamiento y supervisión profesional. Frecuencia libre.',
      price: 0,
      duration: 60,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'srv-2',
      name: 'Readaptación Física',
      description: 'Pensado para: lesiones musculares, esguinces, post-cirugía, dolor cervical-dorsal-lumbar, readaptación inicial. Incluye: evaluación funcional, planificación de ejercicios, entrenamiento supervisado, progresión de cargas y seguimiento.',
      price: 12000,
      duration: 60,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'srv-3',
      name: 'Osteopatía Integral',
      description: 'Terapia manual holística para la restauración de la movilidad corporal.',
      price: 18000,
      duration: 60,
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  turnos: [],
  plans: [
    {
      id: 'plan-eval-pack',
      nombre: 'Evaluación + Plan de Entrenamiento',
      descripcion: '1 reserva - válido por 7 días desde la fecha de compra',
      price: 70000,
      interval: 'week',
      features: ['1 reserva', 'Válido por 7 días'],
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan-eval-func',
      nombre: 'Evaluación Funcional',
      descripcion: '1 reserva - válido por 7 días desde la fecha de compra',
      price: 40000,
      interval: 'week',
      features: ['1 reserva', 'Válido por 7 días'],
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan-gym-supervisado',
      nombre: 'Gimnasio Supervisado',
      descripcion: '24 reservas - válido por 30 días desde la fecha de compra',
      price: 60000,
      interval: 'month',
      features: ['24 reservas', 'Válido por 30 días'],
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan-pack-8',
      nombre: 'Pack de 8 Sesiones',
      descripcion: '8 reservas - válido por 45 días desde la fecha de compra',
      price: 76000,
      interval: 'custom',
      features: ['8 reservas', 'Válido por 45 días'],
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan-pack-12',
      nombre: 'Pack por 12 sesiones',
      descripcion: '12 reservas - válido por 45 días desde la fecha de compra',
      price: 102000,
      interval: 'custom',
      features: ['12 reservas', 'Válido por 45 días'],
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan-training-only',
      nombre: 'Plan de entrenamiento',
      descripcion: '1 reserva - válido por 2 días desde la fecha de compra',
      price: 30000,
      interval: 'custom',
      features: ['1 reserva', 'Válido por 2 días'],
      activo: true,
      createdAt: new Date().toISOString(),
    },
  ],
  subscriptions: []
};

// Helpers to read and write database
export function getMockDb(): MockDataSchema {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      // Create seed turnos for the next 7 days
      const mockData = { ...DEFAULT_DATA };
      const services = mockData.services;
      const professionals = mockData.professionals;
      
      const now = new Date();
      let turnoCount = 1;
      
      // Seed some available appointments for the next 5 days
      for (let day = 1; day <= 5; day++) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + day);
        
        // Seed times: 9:00, 10:00, 11:00, 15:00, 16:00
        const hours = [9, 10, 11, 15, 16];
        hours.forEach(hour => {
          targetDate.setHours(hour, 0, 0, 0);
          
          // Rotate professionals and services
          const prof = professionals[(day + hour) % professionals.length];
          const srv = services[(day + hour) % services.length];
          
          // Create a mock open slot
          mockData.turnos.push({
            id: `turno-${turnoCount++}`,
            fechaInicio: targetDate.toISOString(),
            duracion: srv.duration,
            estado: 'DISPONIBLE',
            serviceId: srv.id,
            professionalId: prof.id,
            createdById: 'admin-1',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            version: 0,
          });
        });
      }

      // Seed 2 reserved turnos for the patient client-1
      const reservedDate1 = new Date();
      reservedDate1.setDate(now.getDate() + 1);
      reservedDate1.setHours(10, 0, 0, 0);
      mockData.turnos.push({
        id: `turno-res-1`,
        fechaInicio: reservedDate1.toISOString(),
        duracion: 60,
        estado: 'RESERVADO',
        serviceId: 'srv-1',
        professionalId: 'prof-1',
        clientId: 'client-1',
        createdById: 'admin-1',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        version: 1,
      });

      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(mockData, null, 2), 'utf-8');
      return mockData;
    }
    
    const dataStr = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(dataStr);
  } catch (error) {
    console.error('Error reading mock db', error);
    return DEFAULT_DATA;
  }
}

export function saveMockDb(data: MockDataSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing mock db', error);
  }
}
