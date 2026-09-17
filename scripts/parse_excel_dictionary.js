/**
 * 관심종목.xlsx 정식 파싱 스크립트 (scripts/parse_excel_dictionary.js)
 * 
 * [초보자 설명서]
 * - 프로젝트 루트의 '관심종목.xlsx' 파일을 읽어옵니다.
 * - Sheet1의 모든 5개 열 묶음(A:B, D:E, G:H, J:K, M:N)을 꼼꼼하게 검사합니다.
 * - 대분류 테마와 세부 테마, 종목명, 6자리 종목코드를 추출하여
 *   'data/stock_dictionary.json' 파일로 저장합니다.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function buildStockDictionary() {
  const excelPath = path.join(__dirname, '..', '관심종목.xlsx');
  const outputPath = path.join(__dirname, '..', 'data', 'stock_dictionary.json');

  if (!fs.existsSync(excelPath)) {
    console.error('❌ 관심종목.xlsx 파일을 찾을 수 없습니다:', excelPath);
    return;
  }

  console.log('📖 관심종목.xlsx 파일 읽는 중...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 5개 열 묶음: A:B (0,1), D:E (3,4), G:H (6,7), J:K (9,10), M:N (12,13)
  const colPairs = [
    [0, 1],
    [3, 4],
    [6, 7],
    [9, 10],
    [12, 13]
  ];

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:N924');
  const themeMap = new Map();
  let totalStockRows = 0;

  colPairs.forEach(([cName, cCode]) => {
    let currentCategory = '';
    let currentSubTheme = '';

    for (let r = 1; r <= range.e.r; r++) {
      const cellNameAddr = XLSX.utils.encode_cell({ r, c: cName });
      const cellCodeAddr = XLSX.utils.encode_cell({ r, c: cCode });

      const cellName = worksheet[cellNameAddr];
      const cellCode = worksheet[cellCodeAddr];

      const rawName = cellName ? cellName.v?.toString().trim() : '';
      let rawCode = cellCode ? cellCode.v?.toString().trim() : '';

      // 빈 행 처리
      if (!rawName) {
        currentCategory = '';
        currentSubTheme = '';
        continue;
      }

      // 종목코드가 없는 경우 -> 테마/소분류 헤더
      if (!rawCode) {
        // 장식 문자 제거
        const cleanHeader = rawName.replace(/^[■\s\-─=★]+|[■\s\-─=★]+$/g, '').trim();
        if (!cleanHeader) continue;

        if (!currentCategory) {
          currentCategory = cleanHeader;
        } else {
          currentSubTheme = cleanHeader;
        }
      } else {
        // 종목코드가 있는 경우 -> 소속 종목
        // 종목코드를 6자리 숫자로 정규화 (예: '5930' -> '005930')
        rawCode = rawCode.padStart(6, '0');

        // 테마 식별자 및 표시명 결정
        const themeName = currentSubTheme 
          ? `${currentCategory} > ${currentSubTheme}` 
          : (currentCategory || '기타 테마');

        if (!themeMap.has(themeName)) {
          themeMap.set(themeName, {
            name: themeName,
            category: currentCategory || '기타',
            sub_theme: currentSubTheme || currentCategory || '기타',
            stocks: []
          });
        }

        const themeEntry = themeMap.get(themeName);
        // 중복 종목 방지
        if (!themeEntry.stocks.some(s => s.name === rawName && s.code === rawCode)) {
          themeEntry.stocks.push({
            name: rawName,
            code: rawCode
          });
          totalStockRows++;
        }
      }
    }
  });

  const themesArray = Array.from(themeMap.values()).filter(t => t.stocks.length > 0);

  const resultData = {
    count: themesArray.length,
    total_stocks: totalStockRows,
    updated_at: new Date().toISOString(),
    themes: themesArray
  };

  fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2), 'utf8');
  console.log(`✅ [성공] 총 ${themesArray.length}개 테마 및 ${totalStockRows}개 종목 매핑 완료!`);
  console.log(`📁 저장 위치: ${outputPath}`);
}

if (require.main === module) {
  buildStockDictionary();
}

module.exports = { buildStockDictionary };
