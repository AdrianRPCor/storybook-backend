import PDFDocument from "pdfkit";

export async function generatePdf(bookData) {
  const doc = new PDFDocument({ size: [432, 648] }); // 6x9 pulgadas
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  bookData.pages.forEach(page => {
    doc.addPage();
    if (page.text) {
      doc.text(page.text, 50, 50);
    }
  });

  doc.end();

  return Buffer.concat(buffers);
}
