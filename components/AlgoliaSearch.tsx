import React, { useState, useEffect, useRef } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { Link } from 'react-router-dom';
import { Spinner } from './Icons';

// --- Configuration ---
const ALGOLIA_APP_ID = process.env.VITE_ALGOLIA_APP_ID || 'U8M4DQYZUH';
const ALGOLIA_SEARCH_KEY = process.env.VITE_ALGOLIA_SEARCH_KEY || '2b79ffdfe77107245e684764280f339a';
const ALGOLIA_INDEX_NAME = 'memofiches';

// --- Algolia Client Initialization ---
// We use the search-only API key for the frontend.
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const index = searchClient.initIndex(ALGOLIA_INDEX_NAME);

// --- Hit Component ---
// This component defines how each search result (hit) is displayed.
const Hit = ({ hit }: { hit: any }) => {
  return (
    <Link to={`/memofiches/${hit.objectID}`} className="block p-4 border-b border-slate-200 hover:bg-slate-50">
      <h4 className="font-bold text-teal-700">{hit.title}</h4>
      <p className="text-sm text-slate-600 mt-1">{hit.theme} - {hit.system}</p>
      {hit.keyPoints && (
        <ul className="list-disc pl-5 mt-2 text-xs text-slate-500">
          {hit.keyPoints.slice(0, 2).map((point: string, i: number) => <li key={i}>{point}</li>)}
        </ul>
      )}
    </Link>
  );
};


// --- Main Search Component ---
const AlgoliaSearch = () => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    // Clear the previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.length > 1) {
      setIsLoading(true);
      // Set a new timeout
      searchTimeout.current = setTimeout(() => {
        index.search(query)
          .then(({ hits }) => {
            setHits(hits);
            setIsLoading(false);
          })
          .catch(err => {
            console.error(err);
            setIsLoading(false);
          });
      }, 300); // 300ms debounce delay
    } else {
      setHits([]);
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans les mémofiches..."
          className="w-full p-4 pr-12 text-lg border-2 border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
        {isLoading && (
          <div className="absolute top-0 right-0 bottom-0 flex items-center pr-4">
            <Spinner className="h-6 w-6 text-slate-400" />
          </div>
        )}
      </div>

      {hits.length > 0 && (
        <div className="mt-4 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {hits.map(hit => (
              <li key={hit.objectID}>
                <Hit hit={hit} />
              </li>
            ))}
          </ul>
           <div className="p-2 bg-slate-50 text-right text-xs text-slate-400">
              Recherche fournie par Algolia
            </div>
        </div>
      )}
    </div>
  );
};

export default AlgoliaSearch;
