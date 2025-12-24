import React, { useState } from 'react';
import { ArrowLeftIcon, SearchIcon, FilterIcon } from '../../components/Icons'; // Assuming you have these icons
import { useNavigate } from 'react-router-dom';

// Placeholder data type
interface Product {
  id: string;
  name: string;
  category: string;
  indication: string;
  image: string; // Placeholder image URL or FTP path
  description: string;
}

const DermoGuideApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Mock data - to be replaced with real data from your catalog
  const products: Product[] = [
    { id: '1', name: 'Crème Hydratante Riche', category: 'Hydratation', indication: 'Peau sèche à très sèche', image: 'https://via.placeholder.com/150', description: 'Hydratation intense 24h.' },
    { id: '2', name: 'Gel Nettoyant Purifiant', category: 'Acné', indication: 'Peau grasse à tendance acnéique', image: 'https://via.placeholder.com/150', description: 'Nettoie sans dessécher.' },
    { id: '3', name: 'Baume Apaisant', category: 'Eczéma', indication: 'Peau atopique, démangeaisons', image: 'https://via.placeholder.com/150', description: 'Apaise immédiatement les irritations.' },
    { id: '4', name: 'Sérum Anti-Taches', category: 'Hyperpigmentation', indication: 'Taches brunes, teint terne', image: 'https://via.placeholder.com/150', description: 'Corrige les taches et unifie le teint.' },
    { id: '5', name: 'Crème Solaire SPF 50+', category: 'Solaire', indication: 'Protection solaire visage', image: 'https://via.placeholder.com/150', description: 'Très haute protection, fini invisible.' },
  ];

  const categories = ['All', 'Hydratation', 'Acné', 'Eczéma', 'Hyperpigmentation', 'Solaire', 'Anti-âge'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.indication.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/apps')} className="mr-4 text-gray-500 hover:text-teal-600 transition-colors">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 font-poppins flex items-center">
              <span className="text-2xl mr-2">🧴</span> DermoGuide
            </h1>
          </div>
          {/* Mobile filter/search toggle could go here */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recherche</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Symptôme, produit..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Catégories</h3>
            <nav className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
                <div className="aspect-w-1 aspect-h-1 w-full bg-gray-100 relative overflow-hidden">
                   {/* Image container */}
                   <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-48 object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                   />
                   <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-teal-700 shadow-sm">
                     {product.category}
                   </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-teal-600 font-medium mb-2">
                    {product.indication}
                  </p>
                  <p className="text-sm text-gray-500 flex-grow">
                    {product.description}
                  </p>
                  <button className="mt-4 w-full py-2 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-teal-600 hover:text-white transition-colors text-sm">
                    Voir la fiche conseil
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucun produit ne correspond à votre recherche.</p>
              <button 
                onClick={() => {setSearchTerm(''); setSelectedCategory('All');}}
                className="mt-4 text-teal-600 hover:underline font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DermoGuideApp;
