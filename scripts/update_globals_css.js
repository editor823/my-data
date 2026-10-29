const fs = require('fs');

const cssContent = `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, Menlo, Monaco, Consolas, monospace;
}

body {
  background: #f8fafc;
  color: #1e293b;
}

/* Article Body Typography */
.article-content {
  font-size: 1.0625rem;
  line-height: 1.85;
  color: #334155;
}

.article-content p {
  margin-top: 1.25rem;
  margin-bottom: 1.25rem;
}

.article-content h2 {
  font-size: 1.625rem;
  font-weight: 800;
  color: #0f172a;
  margin-top: 2.75rem;
  margin-bottom: 1.25rem;
  letter-spacing: -0.02em;
}

.article-content h3 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  margin-top: 2.25rem;
  margin-bottom: 1rem;
  letter-spacing: -0.015em;
}

.article-content h4 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
}

.article-content ul,
.article-content ol {
  margin-top: 1.25rem;
  margin-bottom: 1.25rem;
  padding-left: 1.5rem;
}

.article-content li {
  margin-top: 0.65rem;
  margin-bottom: 0.65rem;
  line-height: 1.8;
}

.article-content ul {
  list-style-type: disc;
}

.article-content ol {
  list-style-type: decimal;
}

.article-content hr {
  margin-top: 2.5rem;
  margin-bottom: 2.5rem;
  border: 0;
  border-top: 1px solid #e2e8f0;
}

.article-content blockquote {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  background-color: #f1f5f9;
  border-left: 4px solid #10b981;
  border-radius: 0.75rem;
  color: #475569;
}

.article-content strong {
  font-weight: 700;
  color: #0f172a;
}

/* Markdown Table Clean Design */
.article-content table {
  width: 100%;
  margin-top: 1.75rem;
  margin-bottom: 2rem;
  border-collapse: collapse;
  font-size: 0.9375rem;
  line-height: 1.6;
  background-color: #ffffff;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.article-content th {
  background-color: #f0fdf4;
  color: #065f46;
  font-weight: 700;
  text-align: left;
  padding: 0.875rem 1.25rem;
  border-bottom: 2px solid #bbf7d0;
  white-space: nowrap;
}

.article-content td {
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: top;
}

.article-content tr:last-child td {
  border-bottom: none;
}

.article-content tr:nth-child(even) td {
  background-color: #f8fafc;
}

.article-content td strong {
  color: #0f172a;
  font-weight: 700;
}
`;

fs.writeFileSync('c:/Users/edite/Desktop/my-local-info_n/src/app/globals.css', cssContent, { encoding: 'utf8' });
console.log('Successfully written clean UTF-8 globals.css');
