const PDFDocument = require('pdfkit');

// builds a PDF stream from a report row + its related candidate/job names.
// returns the PDFDocument so the controller can pipe it straight into the
// http response, no temp file needed.
function generateReportPdf({ report, candidateName, jobTitle }) {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text('AI Screening Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(11).fillColor('#555').text(`Generated: ${new Date().toISOString()}`);
  doc.text(`Provider: ${report.ai_provider || 'pending'}`);
  doc.moveDown();

  doc.fillColor('#000').fontSize(14).text(`Candidate: ${candidateName}`);
  doc.fontSize(14).text(`Job: ${jobTitle}`);
  doc.moveDown();

  doc.fontSize(16).text(`Fit Score: ${report.fit_score !== null ? report.fit_score + '%' : 'N/A'}`);
  doc.moveDown(0.5);

  doc.fontSize(13).text('Summary', { underline: true });
  doc.fontSize(11).text(report.fit_summary || 'not generated yet');
  doc.moveDown();

  doc.fontSize(13).text('Mandatory Skill Checklist', { underline: true });
  const checklist = report.skill_checklist || [];
  if (checklist.length === 0) {
    doc.fontSize(11).text('no skills extracted');
  } else {
    checklist.forEach((item) => {
      doc.fontSize(11).text(`${item.present ? '[x]' : '[ ]'} ${item.skill}`);
    });
  }
  doc.moveDown();

  doc.fontSize(13).text('Gap Analysis', { underline: true });
  const gaps = report.gap_analysis || [];
  if (gaps.length === 0) {
    doc.fontSize(11).text('no gaps identified');
  } else {
    gaps.forEach((gap) => {
      doc.fontSize(11).text(`- ${gap.skill}: ${gap.recommendation}`);
    });
  }
  doc.moveDown();

  doc.fontSize(13).text('Suggested Task Assignment', { underline: true });
  doc.fontSize(11).text(report.task_suggestion || 'not generated yet');

  doc.end();
  return doc;
}

// simple HTML alternative export, used by GET /api/reports/:id/export?format=html
function generateReportHtml({ report, candidateName, jobTitle }) {
  const checklist = (report.skill_checklist || [])
    .map((c) => `<li>${c.present ? '✅' : '⬜'} ${escapeHtml(c.skill)}</li>`)
    .join('');
  const gaps = (report.gap_analysis || [])
    .map((g) => `<li><b>${escapeHtml(g.skill)}</b>: ${escapeHtml(g.recommendation)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Screening Report</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #222; }
  h1 { font-size: 22px; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { color: #666; font-size: 13px; }
  .score { font-size: 28px; font-weight: bold; color: #1a5cff; }
</style>
</head>
<body>
  <h1>AI Screening Report</h1>
  <p class="meta">Candidate: ${escapeHtml(candidateName)} &middot; Job: ${escapeHtml(jobTitle)} &middot; Provider: ${escapeHtml(report.ai_provider || 'pending')}</p>
  <p class="score">${report.fit_score !== null ? report.fit_score + '%' : 'N/A'} fit</p>

  <h2>Summary</h2>
  <p>${escapeHtml(report.fit_summary || 'not generated yet')}</p>

  <h2>Mandatory Skill Checklist</h2>
  <ul>${checklist || '<li>no skills extracted</li>'}</ul>

  <h2>Gap Analysis</h2>
  <ul>${gaps || '<li>no gaps identified</li>'}</ul>

  <h2>Suggested Task Assignment</h2>
  <p>${escapeHtml(report.task_suggestion || 'not generated yet')}</p>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { generateReportPdf, generateReportHtml };
