// 사용법: node scripts/make_admin_hash.js 새비밀번호
// → 출력된 해시(암호화 값)를 js/inspector_admin_gate.js 의 ADMIN_HASH 에 붙여넣으세요. (주식센터 사본 2개도 동일)
const crypto = require('crypto');
const pw = process.argv[2];
if (!pw) {
  console.log('사용법: node scripts/make_admin_hash.js 새비밀번호');
  process.exit(1);
}
console.log(crypto.createHash('sha256').update(pw).digest('hex'));
