import React from 'react';
import { TrendingUpIcon, BrainCircuitIcon } from './Icons';

interface Skill {
  category: string;
  score: number;
  count: number;
}

interface SkillHeatmapProps {
  skills: Skill[];
}

const SkillHeatmap: React.FC<SkillHeatmapProps> = ({ skills }) => {
  if (!skills || skills.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center">
        <BrainCircuitIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          Maîtrise par Catégorie
        </h3>
        <p className="text-slate-500 text-sm">
          Complétez des quiz pour voir vos statistiques de maîtrise ici.
        </p>
      </div>
    );
  }

  const getColorClass = (score: number) => {
    if (score >= 80)
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-slate-800">
            Maîtrise par Thématique
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          IA Analytics
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill, index) => (
          <div
            key={index}
            className="p-3 rounded-lg border border-slate-50 bg-slate-50/50"
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className="text-sm font-semibold text-slate-700 truncate max-w-[150px]"
                title={skill.category}
              >
                {skill.category}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getColorClass(skill.score)}`}
              >
                {skill.score}%
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-1000 ${getProgressColor(skill.score)}`}
                style={{ width: `${skill.score}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Basé sur {skill.count} quiz
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Expert
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              En cours
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Lacunes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillHeatmap;
