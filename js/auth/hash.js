// SHA-256 기반 PIN 해싱
// ⚠️  보안 목적이 아닌 "우연한 노출 방지용"입니다.
//     (localStorage에 평문 PIN이 남지 않도록 하는 최소한의 처리)
//     실제 인증 시스템에서는 bcrypt 등 전용 라이브러리를 사용하세요.

/**
 * PIN과 salt를 받아 SHA-256 hex 문자열을 반환합니다.
 * @param {string} pin   - 4자리 숫자 문자열
 * @param {string} salt  - 계정 생성 시 생성된 랜덤 hex 문자열
 * @returns {Promise<string>} hex digest
 */
export async function hashPin(pin, salt) {
  const data    = new TextEncoder().encode(pin + salt);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
