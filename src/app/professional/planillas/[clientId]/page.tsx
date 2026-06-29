import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getPlanilla, savePlanilla } from '@/modules/planillas/actions';
import PlanillaView from './PlanillaView';

export const dynamic = 'force-dynamic';

export default async function PlanillaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role === 'CLIENT') redirect('/client/dashboard');

  const { clientId } = await params;

  const [client, planilla, dinamometrias] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
    getPlanilla(clientId),
    prisma.dinamometria.findMany({
      where: { clientId },
      orderBy: { fecha: 'asc' },
      select: {
        id: true, fecha: true,
        cuadDer: true, cuadIzq: true,
        isquioDer: true, isquioIzq: true,
        abdDer: true, abdIzq: true,
        eversorDer: true, eversorIzq: true,
        romCaderaDer: true, romCaderaIzq: true,
        romTobilloDer: true, romTobilloIzq: true,
        velocidadSquat: true,
        peso: true,
      },
    }),
  ]);

  if (!client) redirect('/professional/planillas');

  return (
    <PlanillaView
      clientId={client.id}
      clientName={client.name}
      planilla={planilla as any}
      dinamometrias={dinamometrias}
      saveAction={savePlanilla}
    />
  );
}