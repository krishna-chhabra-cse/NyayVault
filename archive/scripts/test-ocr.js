import fs from 'fs';
import pdfParse from 'pdf-parse';

async function testOCR() {
  try {
    const doc = new jsPDF();
    doc.text('This is a test document for OCR', 10, 10);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const data = await pdfParse(pdfBuffer);
    console.log("Extracted text:", data.text);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
