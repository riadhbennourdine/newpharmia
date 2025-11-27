import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import getAbsoluteImageUrl from '../utils/image';
import { useResizeDetector } from 'react-resize-detector';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline'; // Importing icons // Import useResizeDetector

// Configure pdfjs worker source
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf-worker.min.js`;

interface PdfSlideshowProps {
  pdfUrl: string;
}

const PdfSlideshow: React.FC<PdfSlideshowProps> = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1); // Start with page 1
  const absolutePdfUrl = getAbsoluteImageUrl(pdfUrl);

  const { width, ref } = useResizeDetector(); // Use the hook to detect width
  const pdfContainerRef = useRef<HTMLDivElement>(null); // Ref for the PDF container

  console.log('PdfSlideshow rendered. pdfUrl:', pdfUrl, 'absolutePdfUrl:', absolutePdfUrl, 'Current container width:', width);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1); // Reset page number when a new document loads
    console.log('PDF loaded successfully. Number of pages:', numPages);
  };

  const goToPrevPage = () =>
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));

  const goToNextPage = () =>
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages || 1));
  
  const toggleFullScreen = () => {
    if (pdfContainerRef.current) {
        if (!document.fullscreenElement) {
            pdfContainerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }
  };

  const fileToLoad = `/api/proxy-pdf?pdfUrl=${encodeURIComponent(absolutePdfUrl)}`;
  console.log('File prop for Document:', fileToLoad);

  return (
    <div className="flex flex-col items-center p-4">
      {numPages && (
        <div className="flex justify-between items-center w-full max-w-lg mb-4">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-teal-600 text-white rounded-md disabled:bg-gray-400"
          >
            Précédent
          </button>
          <p className="text-lg font-semibold">
            Page {pageNumber} sur {numPages}
          </p>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            className="px-4 py-2 bg-teal-600 text-white rounded-md disabled:bg-gray-400"
          >
            Suivant
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 ml-2 bg-slate-200 rounded-md hover:bg-slate-300"
            title="Activer/Désactiver le plein écran"
          >
            {document.fullscreenElement ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
          </button>
        </div>
      )}

      <div ref={ref} className="border border-gray-300 rounded-lg overflow-hidden shadow-md w-full max-w-full">
        {absolutePdfUrl ? ( // Only render Document if absolutePdfUrl is valid
            <Document
                file={fileToLoad}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => { console.error('Error while loading document from react-pdf:', error); }}
                className="flex justify-center"
            >
                {width && width > 100 ? (
                    <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
                ) : (
                    <p>Chargement du PDF...</p>
                )}
            </Document>
        ) : (
            <p className="text-red-500">URL PDF invalide ou manquante.</p>
        )}
      </div>
    </div>
  );
};

export default PdfSlideshow;
