import * as pdfjsLib from 'pdfjs-dist';

// Handle ES module vs CommonJS interop (esm.sh sometimes wraps default exports)
const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
} else {
  console.warn("GlobalWorkerOptions not found on pdfjsLib");
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    if (!fullText.trim()) {
      throw new Error("No readable text found in PDF (it might be an image scan).");
    }

    return fullText;
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    if (error.name === 'MissingPDFException') {
       throw new Error("Invalid or corrupted PDF file.");
    }
    if (error.message && (error.message.includes('fake worker') || error.message.includes('Setting up fake worker failed'))) {
       throw new Error("Failed to initialize PDF processor. Please refresh or check your internet connection.");
    }
    throw new Error(error.message || "Failed to parse PDF file.");
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};
