import Link from 'next/link';
import Image from 'next/image';
import { getServices } from '@/modules/services-offered/actions';
import { getProfessionals } from '@/modules/professionals/actions';
import { getSession } from '@/lib/session';
import ProfessionalsSection from './components/ProfessionalsSection';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  const servicesRes = await getServices();
  const professionalsRes = await getProfessionals();

  const services = servicesRes.success ? servicesRes.services || [] : [];
  const professionals = professionalsRes.success ? professionalsRes.professionals || [] : [];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src="/logo.png" alt="Nicolas Jaled Kine Logo" width={48} height={48} className="object-contain sm:w-[56px] sm:h-[56px]" unoptimized />
            <div>
              <span className="font-title text-base sm:text-lg text-primary font-bold tracking-tight">Nicolas Jaled Kine</span>
              <p className="hidden sm:block text-[9px] sm:text-[10px] text-slate-500 font-subtitle uppercase tracking-wider">Kinesiología & Rendimiento</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-4 sm:gap-6">
            <a href="#servicios" className="hidden md:inline-block text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Servicios</a>
            <a href="#profesionales" className="hidden md:inline-block text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Equipo</a>
            {session ? (
              <Link 
                href={session.role === 'ADMIN' ? '/admin/dashboard' : '/client/dashboard'}
                className="bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:bg-secondary transition-all"
              >
                Mi Panel
              </Link>
            ) : (
              <div className="flex items-center">
                <Link href="/auth/login" className="bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:bg-secondary transition-all">
                  Iniciar Sesión
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 bg-gradient-to-br from-primary via-slate-900 to-primary text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <h1 className="font-title text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Entrenar con ciencia,<br />
              <span className="text-accent-light">recuperar con conciencia.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 font-sans max-w-2xl leading-relaxed">
               En Nicolas Jaled Kine fusionamos el respaldo científico de la kinesiología con técnicas avanzadas de optimización deportiva. Diseñamos planes de rehabilitación y fuerza personalizados a tu medida.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 max-w-md sm:max-w-none">
              <Link href="/auth/login" className="bg-accent text-white px-8 py-3.5 rounded-xl font-title text-base font-bold shadow-lg hover:bg-accent-light transition-all hover:scale-105 text-center w-full sm:w-auto">
                Reservar un Turno
              </Link>
              <a href="#servicios" className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-3.5 rounded-xl font-title text-base font-bold hover:bg-white/25 transition-all text-center w-full sm:w-auto">
                Ver Servicios
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-title text-3xl sm:text-4xl text-primary font-bold">Nuestros Servicios</h2>
          <p className="mt-4 text-slate-600 font-sans text-lg">Rehabilitación física y optimización del rendimiento con profesionales calificados.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {services.filter((srv: any) => srv.active).map((srv: any) => {
            const getServiceImage = (id: string) => {
              switch (id) {
                case 'srv-1':
                  return '/kinesiologia-deportiva.png';
                case 'srv-2':
                  return '/evaluacion-dinamometrica.png';
                case 'srv-3':
                  return '/osteopatia-integral.png';
                default:
                  return '/kinesiologia-deportiva.png';
              }
            };

            return (
              <div key={srv.id} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <Image 
                    src={getServiceImage(srv.id)} 
                    alt={srv.name} 
                    fill 
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"></div>
                </div>

                <div className="p-8 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-title text-xl text-slate-900 font-bold mb-3">{srv.name}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-line">{srv.description || 'Sin descripción disponible'}</p>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 mt-auto flex justify-between items-center">
                    <span className="text-base font-bold text-primary">
                      {srv.price > 0 ? `$${srv.price.toLocaleString('es-AR')}` : 'Frecuencia Libre'}
                    </span>
                    <Link href="/auth/login" className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                      Reservar Turno
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Professionals Section */}
      <section id="profesionales" className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-title text-3xl sm:text-4xl text-primary font-bold">Nuestros Profesionales</h2>
            <p className="mt-4 text-slate-600 font-sans text-lg">Contamos con un equipo de especialistas dedicados a tu bienestar y rendimiento físico.</p>
          </div>

          <ProfessionalsSection professionals={professionals} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Nicolas Jaled Kine Logo" width={40} height={40} className="object-contain" unoptimized />
            <div>
              <span className="font-title text-white text-lg font-bold">Nicolas Jaled Kine</span>
              <p className="text-[9px] text-slate-500 font-subtitle uppercase tracking-wider">Kinesiología & Rendimiento</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Nicolas Jaled Kine. Todos los derechos reservados. Diseñado bajo el kit de marca oficial.</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/5493884459941?text=Hola%20Nicol%C3%A1s!%20Me%20gustar%C3%ADa%20solicitar%20el%20alta%20de%20mi%20usuario%20para%20poder%20reservar%20turnos%20en%20la%20aplicaci%C3%B3n."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:shadow-2xl hover:bg-[#20ba5a] transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
        aria-label="Contactar por WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-6 h-6 fill-current">
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 496l131-34.4c32.4 17.6 68.8 26.8 105.8 26.8 122.4 0 222-99.6 222-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-77.9 20.5 20.9-75.8-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
        </svg>
        <span className="absolute right-14 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-md">
          Solicitá tu usuario aquí
        </span>
      </a>
    </div>
  );
}
