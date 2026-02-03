
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface RoleStat {
  _id: string;
  count: number;
}

interface MonthlyStat {
  _id: {
    year: number;
    month: number;
  };
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

const StatisticsDashboard: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users/admin/retrospective-stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Impossible de charger les statistiques.');
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return <div className="text-center p-8">Chargement des statistiques...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">Aucune statistique à afficher.</div>;
  }

  const registrationsChartData = {
    labels: stats.registrationsByMonth.map(item => `${item._id.year}-${String(item._id.month).padStart(2, '0')}`),
    datasets: [
      {
        label: 'Nouvelles inscriptions',
        data: stats.registrationsByMonth.map(item => item.count),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const topFichesChartData = {
    labels: stats.topFiches.map(item => item.title),
    datasets: [
      {
        label: 'Nombre de lectures',
        data: stats.topFiches.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Statistiques de la plateforme</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Utilisateurs par rôle</h3>
          <ul>
            {stats.usersByRole.map(role => (
              <li key={role._id} className="flex justify-between items-center py-1 border-b">
                <span className="text-slate-700">{role._id}</span>
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
        <Bar data={registrationsChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold text-slate-600 mb-4">Top 10 des mémofiches les plus lues</h3>
        <Bar data={topFichesChartData} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }} />
      </div>

    </div>
  );
};

export default StatisticsDashboard;
