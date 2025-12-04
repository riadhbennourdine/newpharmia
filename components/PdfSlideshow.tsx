import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import getAbsoluteImageUrl from '../utils/image';
import { useResizeDetector } from 'react-resize-detector';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

// Configure pdfjs worker source
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf-worker.min.js`;

interface PdfSlideshowProps {
  pdfUrl: string;
}

const PdfSlideshow: React.FC<PdfSlideshowProps> = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const absolutePdfUrl = getAbsoluteImageUrl(pdfUrl);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeDetector({ targetRef: pdfContainerRef });

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  const toggleFullScreen = () => {
    const elem = pdfContainerRef.current;
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

  let fileToLoad = absolutePdfUrl;
  if (absolutePdfUrl && absolutePdfUrl.startsWith('http')) {
      fileToLoad = `/api/proxy-pdf?pdfUrl=${encodeURIComponent(absolutePdfUrl)}`;
  }

  return (
    <div ref={pdfContainerRef} className="relative w-full max-w-full group bg-slate-100 rounded-lg shadow-md">
      {absolutePdfUrl ? (
        <Document
          file={fileToLoad}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error('Error while loading document:', error)}
          className="flex justify-center"
        >
          <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      ) : (
        <p className="text-red-500 text-center p-4">URL PDF invalide ou manquante.</p>
      )}

      {numPages && (
        <>
          {/* Previous Button */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-20 disabled:cursor-not-allowed z-10"
            aria-label="Previous Page"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>

          {/* Next Button */}
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-20 disabled:cursor-not-allowed z-10"
            aria-label="Next Page"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>

          {/* Controls Overlay */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-sm rounded-full px-4 py-1 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
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

export default PdfSlideshow;