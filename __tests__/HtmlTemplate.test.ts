import { getHtmlTemplate } from '../src/utils/htmlTemplate';

// Mock the huge bundled libs to avoid Jest memory issues or slow snapshots
jest.mock('../src/utils/bundledLibs', () => ({
  HTML2CANVAS_SRC: 'MOCK_HTML2CANVAS',
  JSPDF_SRC: 'MOCK_JSPDF',
  PDFJS_SRC: 'MOCK_PDFJS',
  PDF_WORKER_SRC: 'MOCK_PDF_WORKER',
}));

describe('HTML Template Generator', () => {
  it('should generate valid HTML structure', () => {
    const html = getHtmlTemplate();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('id="app"');
  });

  it('should inject bundled libraries', () => {
    const html = getHtmlTemplate();
    expect(html).toContain('MOCK_HTML2CANVAS');
    expect(html).toContain('MOCK_JSPDF');
    expect(html).toContain('MOCK_PDFJS');
  });

  it('should inject PDF worker setup', () => {
    const html = getHtmlTemplate();
    expect(html).toContain('id="pdf-worker" type="application/javascript"');
    expect(html).toContain('MOCK_PDF_WORKER');
    expect(html).toContain('window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)');
  });

  it('should include the chunked PDF buffer handling', () => {
    const html = getHtmlTemplate();
    expect(html).toContain('state.pdfDataBuffer = []');
    expect(html).toContain("case 'PDF_DATA_CHUNK':");
    expect(html).toContain('state.pdfDataBuffer.push(data.chunk)');
  });
});
