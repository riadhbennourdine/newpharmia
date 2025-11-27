import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import getAbsoluteImageUrl from '../utils/image';
import { useResizeDetector } from 'react-resize-detector'; // Import useResizeDetector

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1); // Reset page number when a new document loads
  };

  const goToPrevPage = () =>
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));

  const goToNextPage = () =>
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages || 1));

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
        </div>
      )}

      <div ref={ref} className="border border-gray-300 rounded-lg overflow-hidden shadow-md w-full max-w-full">
        <Document
          file={`/api/proxy-pdf?pdfUrl=${encodeURIComponent(absolutePdfUrl)}`}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error('Error while loading document!', error)}
          className="flex justify-center"
        >
          {width && width > 100 ? ( // Only render Page if width is available and reasonable
            <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
          ) : (
            <p>Chargement du PDF...</p>
          )}
        </Document>
      </div>
    </div>
  );
};

export default PdfSlideshow;
