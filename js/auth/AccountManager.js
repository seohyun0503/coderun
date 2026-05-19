import { hashPin } from './hash.js';

const KEY_ACCOUNTS = 'coderun_accounts';
const KEY_CURRENT  = 'coderun_current';

// ─── 검증 헬퍼 ────────────────────────────────────────────────────────────────

function validateNickname(nickname) {
  if (typeof nickname !== 'string' || nickname.trim().length < 1)
    throw new Error('닉네임은 최소 1자 이상이어야 해요!');
  if (nickname.trim().length > 12)
    throw new Error('닉네임은 12자까지만 가능해요!');
}

function validatePin(pin) {
  if (!/^\d{4}$/.test(pin))
    throw new Error('PIN은 숫자 4자리로 입력해 주세요!');
}

// ─── localStorage 래퍼 ────────────────────────────────────────────────────────

function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패해도 게임 진행에 영향 없도록 조용히 무시
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ─── AccountManager ───────────────────────────────────────────────────────────

class AccountManager {
  constructor() {
    // DB가 없으면 초기화
    const db = storageGet(KEY_ACCOUNTS);
    if (!db || db.version !== 1) {
      storageSet(KEY_ACCOUNTS, { version: 1, accounts: [] });
    }
  }

  // ─── 내부 헬퍼 ──────────────────────────────────────────────────────────────

  _readAll() {
    return storageGet(KEY_ACCOUNTS, { version: 1, accounts: [] });
  }

  _writeAll(db) {
    storageSet(KEY_ACCOUNTS, db);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** 최근 플레이순으로 정렬된 계정 배열 반환 */
  listAccounts() {
    const { accounts } = this._readAll();
    return [...accounts].sort(
      (a, b) => new Date(b.lastPlayedAt) - new Date(a.lastPlayedAt),
    );
  }

  /**
   * 새 계정 생성 후 자동 로그인
   * @returns {Promise<object>} 생성된 계정 객체
   */
  async createAccount(nickname, pin) {
    validateNickname(nickname);
    validatePin(pin);

    const trimmed = nickname.trim();
    const id      = `${trimmed}_${pin}`;

    const db = this._readAll();
    if (db.accounts.some(a => a.id === id)) {
      throw new Error(`"${trimmed}" + 그 PIN은 이미 사용 중이에요. 다른 닉네임이나 PIN을 써 보세요!`);
    }

    const salt      = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const pinHash   = await hashPin(pin, salt);
    const now       = new Date().toISOString();

    const account = {
      id,
      nickname:     trimmed,
      pinHash,
      salt,
      createdAt:    now,
      lastPlayedAt: now,
    };

    db.accounts.push(account);
    this._writeAll(db);
    this.setCurrent(id);
    return account;
  }

  /**
   * PIN 검증 후 로그인, 성공 시 lastPlayedAt 갱신
   * @returns {Promise<object>} 로그인된 계정 객체
   */
  async login(accountId, pin) {
    validatePin(pin);

    const db      = this._readAll();
    const idx     = db.accounts.findIndex(a => a.id === accountId);
    if (idx === -1) throw new Error('계정을 찾을 수 없어요.');

    const account  = db.accounts[idx];
    const computed = await hashPin(pin, account.salt);
    if (computed !== account.pinHash) throw new Error('PIN이 틀렸어요. 다시 확인해 주세요!');

    account.lastPlayedAt = new Date().toISOString();
    db.accounts[idx]     = account;
    this._writeAll(db);
    this.setCurrent(accountId);
    return account;
  }

  /** 현재 로그인 세션을 지정 (null = 로그아웃) */
  setCurrent(accountId) {
    storageSet(KEY_CURRENT, accountId);
  }

  /** 현재 로그인된 계정 객체, 없으면 null */
  getCurrent() {
    const id = storageGet(KEY_CURRENT);
    if (!id) return null;
    const { accounts } = this._readAll();
    return accounts.find(a => a.id === id) ?? null;
  }

  /** 현재 세션만 종료 (계정 데이터는 유지) */
  switchPlayer() {
    this.setCurrent(null);
  }

  /** 계정 + 해당 계정 메타데이터 완전 삭제 */
  deleteAccount(accountId) {
    const db    = this._readAll();
    db.accounts = db.accounts.filter(a => a.id !== accountId);
    this._writeAll(db);

    storageRemove(`coderun_meta_${accountId}`);

    if (storageGet(KEY_CURRENT) === accountId) {
      this.setCurrent(null);
    }
  }
}

export const Accounts = new AccountManager();
