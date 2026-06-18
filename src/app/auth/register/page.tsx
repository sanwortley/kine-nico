import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block">
          <Image 
            src="/logo.png" 
            alt="NJK Logo" 
            width={64} 
            height={64} 
            className="mx-auto object-contain" 
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold font-title text-primary">
          Registro de Usuarios
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl">
            ⚠️
          </div>
          <h3 className="font-title text-xl text-slate-900 font-bold">Registro Deshabilitado</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            El auto-registro público se encuentra deshabilitado.<br />
            Para obtener una cuenta y poder reservar turnos en el Centro de Kinesiología y Entrenamiento Deportivo NJK, por favor contactá al personal administrativo.
          </p>
          <div className="pt-4 border-t border-slate-100">
            <Link href="/auth/login" className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-secondary transition-all">
              Ir al Inicio de Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
