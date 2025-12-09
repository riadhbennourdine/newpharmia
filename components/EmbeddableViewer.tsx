import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import getAbsoluteImageUrl from '../utils/image';
import { useResizeDetector } from 'react-resize-detector';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

// Configure pdfjs worker source
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf-worker.min.js`;

interface EmbeddableViewerProps {
  source: string;
}

const EmbeddableViewer: React.FC<EmbeddableViewerProps> = ({ source }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Case 1: Raw HTML Embed Code
  if (source && (source.trim().startsWith('<iframe') || source.trim().startsWith('<div'))) {
    return (
      <div
        ref={containerRef}
        className="w-full"
        dangerouslySetInnerHTML={{ __html: source }}
      />
    );
  }

  // From here, we assume 'source' is a URL
  const absoluteUrl = getAbsoluteImageUrl(source);

  // Case 2: Canva URL
  if (absoluteUrl && absoluteUrl.includes('canva.com/design')) {
    let embedUrl = absoluteUrl;
    // Ensure the URL is in the correct embeddable format
    const urlParts = absoluteUrl.split('?');
    const baseUrl = urlParts[0];

    // Reconstruct the URL to end with /view?embed
    if (baseUrl.includes('/view')) {
      embedUrl = baseUrl + '?embed';
    } else {
      // If it's a canva URL but not a "view" link, it might be an edit link.
      // We'll try to embed it but it may not work as expected.
      // A more robust solution might require the user to provide the correct share link.
      embedUrl = baseUrl.replace('/edit', '/view') + '?embed';
    }
    
    return (
      <div ref={containerRef} className="relative w-full rounded-lg shadow-md overflow-hidden" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
        <iframe
          loading="lazy"
          className="absolute top-0 left-0 w-full h-full border-0"
          src={embedUrl}
          allowFullScreen
          allow="fullscreen"
          title="Canva Embed"
        ></iframe>
      </div>
    );
  }

  // Case 3: PDF URL (default)
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const { width } = useResizeDetector({ targetRef: containerRef });

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  const toggleFullScreen = () => {
    const elem = containerRef.current;
    if (elem) {
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen: ${err.message} (${err.name})`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  let fileToLoad = absoluteUrl;
  if (absoluteUrl && absoluteUrl.startsWith('http')) {
      fileToLoad = `/api/proxy-pdf?pdfUrl=${encodeURIComponent(absoluteUrl)}`;
  }

  if (!source) {
    return <p className="text-red-500 text-center p-4">Source invalide ou manquante.</p>;
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-full group bg-slate-100 rounded-lg shadow-md">
      <Document
        file={fileToLoad}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => console.error('Error while loading document:', error)}
        className="flex justify-center"
      >
        <Page 
          pageNumber={pageNumber} 
          width={width} 
          renderTextLayer={false} 
          renderAnnotationLayer={false} 
          className="max-w-full h-auto"
        />
      </Document>

      {numPages && (
        <>
          {/* PDF Controls */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-20 disabled:cursor-not-allowed z-10"
            aria-label="Previous Page"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-20 disabled:cursor-not-allowed z-10"
            aria-label="Next Page"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-sm rounded-full px-4 py-1 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <a
              href={absoluteUrl}
              download
              title="Télécharger le PDF"
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:text-slate-200"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
            </a>
            <span>
              Page {pageNumber} / {numPages}
            </span>
            <button
              onClick={toggleFullScreen}
              className="p-1"
              title="Activer/Désactiver le plein écran"
            >
              {document.fullscreenElement ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EmbeddableViewer;