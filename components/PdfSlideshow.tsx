import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import getAbsoluteImageUrl from '../utils/image';

// Configure pdfjs worker source
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf-worker.min.js`;

interface PdfSlideshowProps {
  pdfUrl: string;
}

const PdfSlideshow: React.FC<PdfSlideshowProps> = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1); // Start with page 1
  const absolutePdfUrl = getAbsoluteImageUrl(pdfUrl);

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

      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md max-w-full">
        <Document
          file={absolutePdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error('Error while loading document!', error)}
          className="flex justify-center"
        >
          <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    </div>
  );
};

export default PdfSlideshow;
