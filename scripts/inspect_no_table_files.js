const fs = require('fs');
const path = require('path');

const postsDir = 'c:/Users/edite/Desktop/my-local-info_n/src/content/posts';
const files = [
  '2026-08-15-earned-income-tax-credit.md',
  '2026-08-15-hf-monthly-rent-guarantee.md',
  '2026-08-15-preschool-tuition-support.md',
  '2026-09-13-nowon-safety-insurance.md',
  '2026-10-11-nowon-longevity-grant.md',
  'dobong-dobongsan-festival.md',
  'dobong-senior-support.md',
  'gangbuk-419-revolution-festival.md',
  'gangbuk-maternal-health-support.md',
  'gangbuk-pay-local-currency.md',
  'gangbuk-scholarship-support.md',
  'gangbuk-senior-walker-support.md',
  'gangbuk-uicheon-cherry-blossom.md',
  'gangbuk-veterans-support.md',
  'nowon-light-garden-walk.md',
  'nowon-mask-street-festival.md',
  'nowon-north-korean-defectors-support.md'
];

files.forEach(f => {
  const content = fs.readFileSync(path.join(postsDir, f), 'utf8');
  console.log('=== FILE:', f, '===');
  const lines = content.split('\n');
  console.log(lines.slice(0, 25).join('\n'));
});
