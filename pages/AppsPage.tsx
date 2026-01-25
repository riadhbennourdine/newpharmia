import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../components/Icons';

const AppsPage: React.FC = () => {
  const navigate = useNavigate();

  const apps = [
    {
      id: 'dermo-guide',
      title: 'DermoGuide',
      description:
        "L'application d'aide au triage dermatologique. Identifiez les lésions, accédez aux protocoles et lancez des simulations.",
      icon: '🧴',
      route: '/apps/dermo',
      status: 'BETA',
      color: 'bg-pink-50 text-pink-700 hover:bg-pink-100',
    },
    {
      id: 'dermo-generator',
      title: 'Générateur DermoGuide',
      description:
        "[OUTIL ADMIN] Créez vos fiches à partir de vos atlas grâce à l'IA.",
      icon: '🧬',
      route: '/apps/dermoguide-generator',
      status: 'BETA',
      color: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl font-poppins">
            Apps PharmIA
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Des outils spécialisés conçus pour simplifier votre quotidien à
            l'officine et sécuriser vos conseils.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className={`relative flex flex-col p-8 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group cursor-pointer ${app.status === 'COMING_SOON' ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={() =>
                app.status !== 'COMING_SOON' && navigate(app.route)
              }
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{app.icon}</span>
                {app.status === 'BETA' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                    Nouveau
                  </span>
                )}
                {app.status === 'COMING_SOON' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Bientôt
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                {app.title}
              </h3>

              <p className="text-gray-600 mb-6 flex-grow">{app.description}</p>

              <div className="flex items-center text-teal-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                {app.status !== 'COMING_SOON' ? (
                  <>
                    Ouvrir l\'application{' '}
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </>
                ) : (
                  <span className="text-gray-400">En développement...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppsPage;
