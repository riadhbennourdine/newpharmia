import React from 'react';
import { XCircleIcon, CalendarIcon, ClockIcon } from './Icons';

interface MasterClassProgramModalProps {
  onClose: () => void;
}

const MasterClassProgramModal: React.FC<MasterClassProgramModalProps> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="h-7 w-7 text-teal-600" />
              Programme & Calendrier 2026
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Master Class Officine • Mercredis 09h00 - 13h00
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XCircleIcon className="h-8 w-8" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-10">
          {/* SECTION 1: Déroulement (Steps) */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-l-4 border-teal-500 pl-3">
              <ClockIcon className="h-6 w-6 text-slate-400" />
              Structure d'une Matinée Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-slate-400">
                  1
                </div>
                <div className="text-teal-600 font-bold text-sm mb-1">
                  09h00 – 11h00
                </div>
                <div className="font-bold text-slate-800 mb-1">
                  Théorie & Analyse
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fondamentaux, physiopathologie et reconnaissance visuelle.
                </p>
              </div>
              {/* Step 2 */}
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-amber-400">
                  2
                </div>
                <div className="text-amber-600 font-bold text-sm mb-1">
                  11h00 – 11h30
                </div>
                <div className="font-bold text-slate-800 mb-1">Pause Café</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Moment d'échange convivial et networking.
                </p>
              </div>
              {/* Step 3 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-slate-400">
                  3
                </div>
                <div className="text-teal-600 font-bold text-sm mb-1">
                  11h30 – 13h00
                </div>
                <div className="font-bold text-slate-800 mb-1">
                  Pratique & Méthode
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cas comptoir, Méthode PHARMA et arbres décisionnels.
                </p>
              </div>
              {/* Step 4 */}
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-indigo-400">
                  4
                </div>
                <div className="text-indigo-600 font-bold text-sm mb-1">
                  13h00
                </div>
                <div className="font-bold text-slate-800 mb-1">Clôture</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Remise des supports numériques et fiches pratiques.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: Calendrier (Table) */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-l-4 border-teal-500 pl-3">
              Planning Annuel 2026
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3">Thème Master Class</th>
                      <th className="px-4 py-3 text-center">Webinaire 1</th>
                      <th className="px-4 py-3 text-center">Webinaire 2</th>
                      <th className="px-4 py-3 text-center">Webinaire 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        1
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Dermatologie & Triage
                      </td>
                      <td className="px-4 py-3 text-center">28 janv</td>
                      <td className="px-4 py-3 text-center">04 fév</td>
                      <td className="px-4 py-3 text-center">11 fév</td>
                    </tr>
                    {/* RAMADAN */}
                    <tr className="bg-amber-50/60 border-y-2 border-amber-100">
                      <td
                        colSpan={5}
                        className="px-4 py-2 text-center text-amber-700 font-bold text-xs uppercase tracking-widest"
                      >
                        Pause Ramadan (15 fév - 15 mar)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        2
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Micronutrition Fondamentale
                      </td>
                      <td className="px-4 py-3 text-center">25 mars</td>
                      <td className="px-4 py-3 text-center">01 avr</td>
                      <td className="px-4 py-3 text-center">08 avr</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        3
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Communication & Patient Care
                      </td>
                      <td className="px-4 py-3 text-center">22 avr</td>
                      <td className="px-4 py-3 text-center">29 avr</td>
                      <td className="px-4 py-3 text-center">06 mai</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        4
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Dermocosmétique & Analyse
                      </td>
                      <td className="px-4 py-3 text-center">20 mai</td>
                      <td className="px-4 py-3 text-center">27 mai</td>
                      <td className="px-4 py-3 text-center">03 juin</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        5
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Dispensation & Ordonnances
                      </td>
                      <td className="px-4 py-3 text-center">17 juin</td>
                      <td className="px-4 py-3 text-center">24 juin</td>
                      <td className="px-4 py-3 text-center">01 juil</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        6
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Interactions Médicamenteuses
                      </td>
                      <td className="px-4 py-3 text-center">15 juil</td>
                      <td className="px-4 py-3 text-center">22 juil</td>
                      <td className="px-4 py-3 text-center">29 juil</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        7
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Pharmacie Vétérinaire 1
                      </td>
                      <td className="px-4 py-3 text-center">12 août</td>
                      <td className="px-4 py-3 text-center">19 août</td>
                      <td className="px-4 py-3 text-center">26 août</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        8
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Pharmacie Vétérinaire 2
                      </td>
                      <td className="px-4 py-3 text-center">09 sept</td>
                      <td className="px-4 py-3 text-center">16 sept</td>
                      <td className="px-4 py-3 text-center">23 sept</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        9
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Micronutrition Approfondie
                      </td>
                      <td className="px-4 py-3 text-center">07 oct</td>
                      <td className="px-4 py-3 text-center">14 oct</td>
                      <td className="px-4 py-3 text-center">21 oct</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-teal-600">
                        10
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Diabète & Suivi Glycémique
                      </td>
                      <td className="px-4 py-3 text-center">04 nov</td>
                      <td className="px-4 py-3 text-center">11 nov</td>
                      <td className="px-4 py-3 text-center">18 nov</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterClassProgramModal;
