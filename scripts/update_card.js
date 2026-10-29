const fs = require('fs');
const filePath = 'c:/Users/edite/Desktop/my-local-info_n/src/components/CardGorillaHome.tsx';
let raw = fs.readFileSync(filePath, 'utf8');
const isCRLF = raw.includes('\r\n');
let lines = raw.split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('{topHighlights.map((item, idx) => {'));
if (startIdx === -1) {
  console.error('startIdx not found');
  process.exit(1);
}

let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].trim() === '})}' && lines[i+1]?.includes('</div>')) {
    endIdx = i;
    break;
  }
}

if (endIdx === -1) {
  console.error('endIdx not found');
  process.exit(1);
}

console.log('Replacing from line', startIdx, 'to', endIdx);

const replacement = [
  '          {topHighlights.map((item, idx) => {',
  '            const hasPost = Boolean(item.slug);',
  '            const detailHref = hasPost ? `/blog/${item.slug}/` : (item.link || "https://www.gov.kr");',
  '            const districtInfo = getDistrictBadge(item.location);',
  '            const rankBadges = [',
  '              "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white",',
  '              "bg-gradient-to-tr from-teal-600 to-emerald-400 text-white",',
  '              "bg-gradient-to-tr from-green-600 to-emerald-400 text-white",',
  '              "bg-gradient-to-tr from-emerald-800 to-teal-600 text-white",',
  '            ];',
  '',
  '            return (',
  '              <div',
  '                key={item.id}',
  '                className="relative bg-white rounded-2xl p-5 border border-emerald-100/90 shadow-sm hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"',
  '              >',
  '                <div>',
  '                  {/* 상단 랭킹 및 지역 배지 */}',
  '                  <div className="flex items-center justify-between mb-3">',
  '                    <span',
  '                      className={`w-8 h-8 rounded-xl ${rankBadges[idx % 4]} font-black text-sm flex items-center justify-center shadow-md`}',
  '                    >',
  '                      0{idx + 1}',
  '                    </span>',
  '                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${districtInfo.color}`}>',
  '                      {districtInfo.name}',
  '                    </span>',
  '                  </div>',
  '',
  '                  {/* 제목 및 내용 */}',
  '                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug mb-2">',
  '                    {hasPost ? (',
  '                      <Link href={detailHref}>{item.title}</Link>',
  '                    ) : (',
  '                      <a href={detailHref} target="_blank" rel="noopener noreferrer">',
  '                        {item.title}',
  '                      </a>',
  '                    )}',
  '                  </h3>',
  '                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">',
  '                    {item.summary}',
  '                  </p>',
  '                </div>',
  '',
  '                {/* 하단 세부 정보 및 버튼 */}',
  '                <div className="space-y-3 pt-3 border-t border-slate-100">',
  '                  <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] space-y-1">',
  '                    <div className="flex justify-between text-slate-500">',
  '                      <span>접수/소관</span>',
  '                      <span className="font-semibold text-slate-700 truncate max-w-[120px]">{item.location}</span>',
  '                    </div>',
  '                  </div>',
  '',
  '                  {hasPost ? (',
  '                    <Link',
  '                      href={detailHref}',
  '                      className="block text-center w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs rounded-xl transition-all"',
  '                    >',
  '                      상세 혜택 분석 보기 →',
  '                    </Link>',
  '                  ) : (',
  '                    <a',
  '                      href={detailHref}',
  '                      target="_blank"',
  '                      rel="noopener noreferrer"',
  '                      className="block text-center w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs rounded-xl transition-all"',
  '                    >',
  '                      공식 신청/안내 바로가기 ↗',
  '                    </a>',
  '                  )}',
  '                </div>',
  '              </div>',
  '            );',
  '          })}'
];

lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
fs.writeFileSync(filePath, lines.join(isCRLF ? '\r\n' : '\n'), 'utf8');
console.log('Successfully updated CardGorillaHome.tsx!');
