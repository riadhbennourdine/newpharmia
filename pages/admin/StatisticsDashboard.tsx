
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

// Interfaces... (gardées identiques)
interface RoleStat {
  _id: string;
  count: number;
}
interface MonthlyStat {
  _id: { year: number; month: number };
  count: number;
}
interface FicheStat {
  ficheId: string;
  title: string;
  count: number;
}
interface StatsData {
  usersByRole: RoleStat[];
  registrationsByMonth: MonthlyStat[];
  totalFicheReads: number;
  topFiches: FicheStat[];
}
interface EventData {
  _id: string;
  count: number;
}

type Period = 'daily' | 'weekly' | 'monthly';

const StatisticsDashboard: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Nouveaux états pour les statistiques d'événements
  const [eventPeriod, setEventPeriod] = useState<Period>('daily');
  const [loginData, setLoginData] = useState<EventData[]>([]);
  const [ficheViewData, setFicheViewData] = useState<EventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const fetchEventData = useCallback(async (period: Period) => {
    setLoadingEvents(true);
    try {
      const [loginsRes, fichesRes] = await Promise.all([
        fetch(`/api/admin/analytics?eventType=USER_LOGIN&period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics?eventType=FICHE_VIEW&period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!loginsRes.ok || !fichesRes.ok) {
        throw new Error("Impossible de charger les données d'événements.");
      }

      const logins = await loginsRes.json();
      const fiches = await fichesRes.json();
      
      setLoginData(logins);
      setFicheViewData(fiches);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [token]);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users/admin/retrospective-stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Impossible de charger les statistiques rétrospectives.');
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
    fetchEventData(eventPeriod);
  }, [token, eventPeriod, fetchEventData]);

  if (loading) return <div className="text-center p-8">Chargement des statistiques...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;
  if (!stats) return <div className="text-center p-8">Aucune statistique à afficher.</div>;

  const getChartData = (data: EventData[], label: string, color: string) => ({
    labels: data.map(item => item._id),
    datasets: [{
      label,
      data: data.map(item => item.count),
      backgroundColor: `rgba(${color}, 0.5)`,
      borderColor: `rgb(${color})`,
      tension: 0.1
    }]
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Statistiques de la plateforme</h1>
      
      {/* Section Statistiques d'événements */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Activité des utilisateurs</h2>
        <div className="flex justify-center gap-2 mb-4">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button key={p} onClick={() => setEventPeriod(p)} className={`px-4 py-2 text-sm font-medium rounded-md ${eventPeriod === p ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              {p === 'daily' ? 'Journalier (30j)' : p === 'weekly' ? 'Hebdomadaire (12s)' : 'Mensuel (12m)'}
            </button>
          ))}
        </div>
        {loadingEvents ? <div className="text-center">Chargement...</div> :
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Connexions</h3>
              <Line data={getChartData(loginData, 'Connexions', '52, 211, 153')} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Consultations de fiches</h3>
              <Line data={getChartData(ficheViewData, 'Consultations', '59, 130, 246')} />
            </div>
          </div>
        }
      </div>

      <h2 className="text-2xl font-semibold text-slate-700 mb-4 mt-12">Statistiques rétrospectives</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Utilisateurs par rôle</h3>
          <ul>
            {stats.usersByRole.map(role => (
              <li key={role._id} className="flex justify-between items-center py-1 border-b">
                <span className="text-slate-700">{role._id || 'N/A'}</span>
                <span className="font-bold text-teal-600">{role.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-6 rounded-xl shadow col-span-1 md:col-span-2 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Total de lectures de mémofiches</h3>
            <p className="text-4xl font-bold text-teal-600">{stats.totalFicheReads}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h3 className="text-lg font-semibold text-slate-600 mb-4">Évolution des inscriptions</h3>
        <Bar data={{
          labels: stats.registrationsByMonth.map(item => `${item._id.year}-${String(item._id.month).padStart(2, '0')}`),
          datasets: [{
            label: 'Nouvelles inscriptions',
            data: stats.registrationsByMonth.map(item => item.count),
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
          }],
        }} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold text-slate-600 mb-4">Top 10 des mémofiches les plus lues</h3>
        <Bar data={{
          labels: stats.topFiches.map(item => item.title),
          datasets: [{
            label: 'Nombre de lectures',
            data: stats.topFiches.map(item => item.count),
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
          }],
        }} options={{ indexAxis: 'y' }} />
      </div>

    </div>
  );
};

export default StatisticsDashboard;
