# CodeRun 로그인 시스템 — 바이브 코딩 단계별 프롬프트

> VS Code + Claude (Cline, Continue, Claude Code 등)에서 그대로 복붙해서 쓸 수 있도록 만든 프롬프트 모음입니다.
> 각 단계는 **독립적으로 동작 가능한 결과물**을 만들도록 설계되어 있어요. 한 단계 끝날 때마다 브라우저에서 확인하고 다음 단계로 넘어가세요.

---

## 📋 사용 방법

1. 각 단계 프롬프트를 순서대로 Claude에게 전달
2. 단계 사이에 ⏸️ **검증 체크포인트**가 있음 → 실제로 확인 후 다음 단계로
3. Claude가 의도와 다르게 만들면 **롤백 후 그 단계만 재시도**
4. 단계 0의 컨텍스트 프롬프트는 **새 대화 시작할 때마다** 먼저 한 번 보내주세요

---

## 단계 0. 컨텍스트 셋업 (새 대화 시작 시마다)

```
나는 CodeRun이라는 HTML5 Canvas 기반 2D 무한 러너 게임을 개발 중이야.
취준생의 취업 지옥 탈출이 컨셉이고, 자기소개서가 HP, 코딩 젤리(Java/Python/C/MySQL/Git)를 모으는 게임이야.

기술 스택:
- Vanilla JavaScript (ES2022, ES Modules)
- HTML5 Canvas 2D API
- 번들러 없음, 외부 라이브러리 없음
- localStorage로 영속 저장
- 싱글톤 패턴 (AssetLoader, AudioManager, Game)

기존 디렉터리 구조:
coderun/
├── index.html
├── css/style.css
├── js/
│   ├── game.js                    # Game 싱글톤, SceneManager
│   ├── config/constants.js
│   ├── scenes/
│   │   ├── Scene.js               # 추상 베이스
│   │   ├── BlankScene.js
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   ├── PauseScene.js
│   │   └── GameOverScene.js
│   ├── entities/                  # Player, Obstacle, Jelly 등
│   └── utils/
│       ├── AssetLoader.js
│       ├── AudioManager.js
│       └── InputHandler.js
└── assets/

씬 전환은 SceneManager.switchScene(key, payload)로 하고,
크로스페이드(0.25s 페이드아웃 → exit → enter → 0.2s 블랙홀드 → 0.25s 페이드인) 패턴을 따라.

지금부터 단계별로 "로컬 멀티유저 로그인 시스템"을 만들 거야.
각 단계는 독립적으로 검증 가능해야 하고, 기존 코드를 최소한으로 건드려야 해.

각 단계가 끝나면:
1. 어떤 파일을 만들었거나 수정했는지 요약
2. 브라우저에서 어떻게 확인할 수 있는지
3. 다음 단계로 넘어가기 전에 체크할 사항
을 명확히 알려줘.

준비됐으면 "준비 완료"라고만 답해줘. 다음 메시지에서 단계 1부터 시작할 거야.
```

⏸️ **체크포인트**: Claude가 컨텍스트를 잘 받았는지 확인. 코드 미리 짜기 시작하면 멈춰주세요.

---

## 단계 1. 데이터 모델과 AccountManager 만들기

> **목표**: localStorage 기반 계정 CRUD가 작동하는 모듈을 만든다. UI는 아직 없음.
> **검증**: 브라우저 콘솔에서 함수 호출해서 계정 생성/조회/삭제 동작.

```
단계 1을 시작할게.

이번 단계에서는 UI는 만들지 말고, 순수 데이터 레이어만 구현해줘.

만들 파일:
1. js/auth/hash.js
2. js/auth/AccountManager.js

요구사항:

[js/auth/hash.js]
- Web Crypto API의 SHA-256을 사용
- hashPin(pin, salt) async 함수 export
- 4자리 PIN과 솔트를 받아서 hex 문자열 반환
- 보안용이 아니라 "우연한 노출 방지용"임을 주석으로 명시

[js/auth/AccountManager.js]
- 싱글톤 인스턴스로 export (export const Accounts = new AccountManager())
- localStorage 키:
  - 'coderun_accounts' : 모든 계정 목록 { version: 1, accounts: [...] }
  - 'coderun_current'  : 현재 로그인된 accountId 또는 null
- 계정 객체 형태:
  {
    id: 'nickname_pin',           // 내부 식별자
    nickname: string,             // 표시용 (중복 가능)
    pinHash: string,
    salt: string,
    createdAt: ISO string,
    lastPlayedAt: ISO string,
  }

- 메서드 (모두 정확히 이 시그니처):
  - listAccounts() → 최근 플레이순 정렬된 배열
  - async createAccount(nickname, pin) → 새 계정 생성 후 자동 로그인, 계정 객체 반환
  - async login(accountId, pin) → PIN 검증 후 로그인, 성공 시 lastPlayedAt 갱신
  - setCurrent(accountId | null)
  - getCurrent() → 현재 계정 객체 or null
  - switchPlayer() → 현재 세션만 종료 (setCurrent(null) 호출)
  - deleteAccount(accountId) → 계정 + 해당 계정의 메타 데이터(coderun_meta_${id}) 함께 삭제

- 검증 규칙:
  - 닉네임: 1~12자 문자열
  - PIN: 정확히 4자리 숫자 문자열 (/^\d{4}$/)
  - 같은 id (nickname_pin 조합)가 이미 있으면 에러 throw
  - 에러 메시지는 한국어로 친근하게

- localStorage 접근은 try/catch로 감싸서 실패해도 게임이 안 죽게

코드만 작성하고, 작성 후에는:
1. 두 파일의 경로와 역할 요약
2. 브라우저 콘솔에서 테스트할 수 있는 코드 스니펫 5~6줄 제시
   (예: import { Accounts } from './js/auth/AccountManager.js'; await Accounts.createAccount('테스트', '1234'); console.log(Accounts.listAccounts()); 등)
3. 다음 단계로 넘어가기 전 확인사항

위 형식으로 마무리해줘. 기존 파일은 절대 건드리지 마.
```

⏸️ **체크포인트**:
- [ ] `js/auth/hash.js`, `js/auth/AccountManager.js` 두 파일이 생겼는지
- [ ] 브라우저 콘솔에서 `Accounts.createAccount('민수', '1234')` 호출해서 정상 동작하는지
- [ ] `localStorage.getItem('coderun_accounts')` 로 데이터 저장 확인
- [ ] 같은 닉네임+PIN 다시 만들면 에러 나는지
- [ ] PIN 5자리 같은 잘못된 입력 시 에러 나는지

---

## 단계 2. PlayerSelectScene — 계정 선택 화면

> **목표**: 등록된 계정 카드 그리드 + "새 계정 만들기" 버튼 표시. 클릭은 placeholder.
> **검증**: 화면이 보이고, 카드 클릭 시 콘솔에 어떤 계정인지 출력.

```
단계 2를 시작할게.

이번 단계에서는 PlayerSelectScene을 만들어. 실제 씬 전환은 아직 연결 안 해도 되고, 단독으로 띄워서 UI 확인이 가능해야 해.

만들 파일:
- js/scenes/PlayerSelectScene.js

요구사항:

[화면 구성]
- 배경: 다크 톤 (#0e0c0a)
- 상단: "누가 플레이하나요?" 타이틀, 골드 컬러 (#ffd060)
- 중앙: 계정 카드 그리드 (한 줄에 3~4개, 부족하면 더 적게)
- "새 계정 만들기" 카드는 항상 그리드 마지막에 있음 (점선 테두리 + "+" 아이콘)
- 하단: "게스트로 플레이" 작은 텍스트 링크

[계정 카드 디자인 — 사원증 느낌]
- 크기: 220 × 280 px
- 배경: #1a1612 (옅은 갈색빛 다크)
- 상단에 👤 아이콘 (이모지로 충분, 64px)
- 닉네임 (큰 글자, 흰색, 28px)
- #PIN (작은 글자, 골드 #ffaa20, 18px)
- 구분선
- 작게 "n판 · X.Xkm" 표시 (지금은 placeholder로 "0판 · 0.0km")
- 마우스 호버 시 살짝 떠오르는 효과 (transform: translateY)

[상호작용]
- 카드 클릭 → console.log('[PlayerSelect] selected account:', account)
- "새 계정 만들기" 클릭 → console.log('[PlayerSelect] create new account')
- "게스트로 플레이" 클릭 → console.log('[PlayerSelect] guest mode')

[Scene 클래스 구조]
- 기존 Scene 추상 클래스를 상속
- enter(), exit(), update(dt), render(ctx), handleInput(input) 메서드 구현
- Canvas 위에 직접 그리는 방식 (HTML 오버레이 X)
- 마우스 클릭은 InputHandler에서 받아온다고 가정 (또는 직접 캔버스에 이벤트 리스너 등록)

[특수 케이스]
- 계정이 0개일 때: "아직 등록된 플레이어가 없어요" 메시지 + 중앙에 큰 "새 계정 만들기" 카드만 표시
- 계정이 8개 넘으면 스크롤 또는 페이지네이션은 일단 신경 쓰지 말고 그리드 줄만 늘려서 표시 (TODO 주석)

[테스트 진입점]
파일 하단에 주석으로 "콘솔에서 단독 테스트하는 방법" 안내:
// Game.switchScene('playerSelect') 같은 거 (실제 등록은 단계 5에서)
// 임시 테스트: import 후 PlayerSelectScene 인스턴스 생성 → enter() → 매 프레임 render(ctx) 호출

AccountManager는 단계 1에서 만든 거 그대로 import해서 사용해줘.
listAccounts()로 목록 가져오면 돼.

코드 작성 후:
1. PlayerSelectScene.js 경로와 역할 요약
2. 임시로 이 씬을 화면에 띄워서 확인하는 방법
   (game.js의 부트 부분을 임시로 한두 줄 수정하는 방법 제안 — diff 형식으로)
3. 단계 3로 넘어가기 전 체크사항

⚠️ 카드 클릭이나 새 계정 클릭의 실제 씬 전환은 단계 5에서 연결할 거니까 지금은 console.log만.
```

⏸️ **체크포인트**:
- [ ] PlayerSelectScene이 화면에 떴는지
- [ ] 단계 1에서 만든 테스트 계정이 카드로 보이는지
- [ ] 호버 효과 동작하는지
- [ ] 카드 클릭 시 콘솔에 계정 정보 출력되는지
- [ ] 계정 0개 상태도 확인 (`localStorage.clear()` 후 새로고침)

---

## 단계 3. CreateAccountScene — 신규 계정 생성 화면

> **목표**: 닉네임 + PIN 두 번 입력 + 안내문. 생성 성공 시 콘솔 로그.
> **검증**: 입력 검증이 작동하고, 정상 입력 시 AccountManager.createAccount 호출되는지.

```
단계 3를 시작할게.

이번 단계에서는 CreateAccountScene을 만들어. 새 계정 생성 UI야.

만들 파일:
- js/scenes/CreateAccountScene.js

요구사항:

[화면 구성 — 위에서 아래로]
1. 타이틀: "새 플레이어 등록"
2. 안내문 (작은 글자, 회색):
   "이 번호는 같은 컴퓨터에서 내 계정을 찾기 위한 것이에요.
    친구가 봐도 괜찮은 숫자로 정해주세요."
3. 입력 단계가 3단계 (한 번에 하나씩 화면 전환):
   Step A: 닉네임 입력 (1~12자)
   Step B: 4자리 번호 입력
   Step C: 한 번 더 입력 (확인용)
4. 하단에 ← "뒤로" 버튼 (PlayerSelectScene으로 돌아감)

[Step A — 닉네임 입력]
- 큰 입력 박스 (캔버스에 그리는 가짜 input, 키보드 이벤트로 처리)
- 실시간 글자수 표시 "3 / 12"
- 입력하면서 검증: 1자 미만이면 "다음" 버튼 비활성
- Enter 또는 "다음" 클릭 → Step B로

[Step B — PIN 입력]
- 4개의 빈 칸 (□ □ □ □)
- 화면 중앙에 큰 키패드 (3 × 4 그리드: 1-9, 빈칸, 0, ⌫)
- 키패드 버튼 크기: 80 × 80 px, 간격 12 px
- 키보드 숫자 입력도 받음
- 4자리 채워지면 자동으로 Step C로

[Step C — PIN 확인]
- "한 번 더 입력해주세요. 잊으면 이 계정을 못 찾아요." 문구
- 같은 키패드 UI
- 4자리 입력 완료 시:
  - 일치 → AccountManager.createAccount() 호출
  - 불일치 → 키패드 흔들림 애니메이션 + "번호가 일치하지 않아요" 메시지 + Step B로 돌아감 (닉네임은 유지)

[키패드 흔들림 애니메이션]
- 0.4초 동안 x축으로 -8 → +8 → -6 → +6 → -3 → +3 → 0
- requestAnimationFrame 기반

[성공 시 동작]
- console.log('[CreateAccount] account created:', account)
- 0.5초 대기 후 console.log('[CreateAccount] would switch to MenuScene')
- (실제 씬 전환은 단계 5에서 연결)

[에러 처리]
- AccountManager.createAccount가 throw하는 경우:
  - "이미 같은 번호로 만든 계정이 있어요" → 다이얼로그 표시:
    [내 계정이에요 → 로그인] [다른 사람이에요 → 다른 번호로]
    (지금은 둘 다 console.log만, 단계 5에서 연결)
  - 그 외 에러 → 화면 하단에 빨간 에러 메시지

[스타일]
- 기존 PlayerSelectScene과 같은 다크 톤
- 키패드 버튼: 평소 #2a241e, 호버 #3a3128, 눌림 #1a1612
- 폰트 색: 흰색, 골드(#ffd060) 강조

코드 작성 후:
1. 파일 경로와 역할 요약
2. 임시로 이 씬을 띄워서 확인하는 방법 (단계 2와 비슷한 방식)
3. 입력 검증이 모두 작동하는지 확인할 시나리오 5개:
   - 정상 생성
   - 닉네임 0자
   - PIN 일치 안 함
   - 이미 존재하는 닉네임+PIN
   - 뒤로 가기

4. 단계 4로 넘어가기 전 체크사항
```

⏸️ **체크포인트**:
- [ ] 3단계가 순서대로 진행되는지
- [ ] 키패드와 키보드 양쪽 입력 다 되는지
- [ ] PIN 불일치 시 흔들림 + 재입력
- [ ] 정상 생성 시 콘솔에 계정 정보 출력 + localStorage에 저장 확인
- [ ] "뒤로" 버튼 동작 (지금은 console.log만이라도)

---

## 단계 4. PinEntryScene — 기존 계정 로그인 화면

> **목표**: 선택된 계정의 PIN을 입력받아 로그인.
> **검증**: 정상 입력 시 로그인, 틀렸을 때 흔들림 + 재시도.

```
단계 4를 시작할게.

이번 단계에서는 PinEntryScene을 만들어. 기존 계정 로그인 화면이야.

만들 파일:
- js/scenes/PinEntryScene.js

요구사항:

[화면 진입 시]
- enter(payload) 메서드가 payload.accountId를 받음
- AccountManager에서 해당 계정 찾아서 정보 표시
- 페이로드 없거나 계정 못 찾으면 console.error 후 PlayerSelect로 돌아감 (단계 5에서 연결)

[화면 구성 — 위에서 아래로]
1. 상단 좌측: ← "뒤로" 버튼
2. 중앙 상단: 계정 정보 카드 (작게)
   - 👤 아이콘 + 닉네임 + #PIN
3. 중앙: "출입 번호를 입력해주세요" 안내문
4. 4개의 빈 칸 (□ □ □ □) — Step B/C와 같은 디자인
5. 중앙 하단: 키패드 (CreateAccountScene과 동일)
6. 하단: 실패 카운터 표시 영역 (3회 실패 시 메시지 영역)

[입력 동작]
- 키패드 클릭 또는 키보드 숫자 입력
- 한 자리씩 □에 채워짐 (●로 표시, 평문 노출 X)
- 4자리 채워지면 자동으로 AccountManager.login() 호출

[로그인 성공 시]
- console.log('[PinEntry] login success:', account)
- 0.3초 대기 후 console.log('[PinEntry] would switch to MenuScene')
- (실제 씬 전환은 단계 5)

[로그인 실패 시]
- 키패드 + 입력 칸 흔들림 애니메이션
- "번호가 일치하지 않아요" 메시지 표시
- 입력 칸 초기화
- 실패 횟수 카운트 (this.failCount)
- 3회 연속 실패 시:
  - 5초 카운트다운 표시 ("5초 후 다시 시도할 수 있어요...")
  - 그동안 키패드 비활성화 (회색, 클릭 무시)
  - 카운트다운 끝나면 다시 활성화

[ESC 키 또는 뒤로 버튼]
- console.log('[PinEntry] back to player select')

[스타일]
- CreateAccountScene과 동일한 톤 유지
- 계정 정보 카드: 220 × 80 px, 살짝 떠 있는 느낌 (그림자 또는 border)

코드 작성 후:
1. 파일 경로와 역할 요약
2. 임시 테스트 방법:
   - 단계 1에서 만든 테스트 계정으로 진입하는 방법
   - 정상/실패/3회 실패 시나리오 각각 어떻게 확인하는지
3. 단계 5로 넘어가기 전 체크사항

⚠️ AccountManager.login()은 비동기야. async/await 또는 then 처리 잘 해줘.
⚠️ 비밀번호 평문 표시 절대 금지. ● 또는 ★로만.
```

⏸️ **체크포인트**:
- [ ] 정상 PIN 입력 시 로그인 성공 콘솔 로그
- [ ] 틀린 PIN 입력 시 흔들림 + 메시지
- [ ] 3회 연속 실패 시 5초 잠금
- [ ] ESC 누르면 뒤로 동작
- [ ] localStorage의 `coderun_current`가 정상 갱신되는지

---

## 단계 5. 씬 연결 + 게임 부트 플로우 수정

> **목표**: 모든 씬을 SceneManager에 등록하고, 게임 부트 시 분기 로직을 추가.
> **검증**: 처음 켰을 때 → 신규 계정 생성 → 메뉴 진입 → 새로고침 후 자동 로그인.

```
단계 5를 시작할게.

이번 단계가 가장 중요해. 만든 씬들을 SceneManager에 등록하고, 게임 시작 시점의 분기 로직을 만들어.

수정할 파일 (기존 파일):
- js/game.js
- js/scenes/MenuScene.js (살짝)

추가 작업:
- 단계 2~4에서 console.log로만 남겨둔 부분들을 실제 씬 전환으로 교체

요구사항:

[js/game.js 수정]
- SceneManager에 새 씬 3개 등록:
  - 'playerSelect': PlayerSelectScene
  - 'createAccount': CreateAccountScene
  - 'pinEntry': PinEntryScene
- 게임 부트 분기:
  - 에셋 프리로딩 완료 후
  - AccountManager.getCurrent()로 현재 계정 확인
  - 있으면 → MenuScene
  - 없으면 → PlayerSelectScene
  - 단, listAccounts()가 0개면 → CreateAccountScene (첫 사용자 배려)

[PlayerSelectScene 연결]
- 카드 클릭 → SceneManager.switchScene('pinEntry', { accountId: account.id })
- "새 계정 만들기" 클릭 → SceneManager.switchScene('createAccount')
- "게스트로 플레이" 클릭 → 게스트 모드로 MenuScene 진입
  - Game 객체에 isGuest 플래그 설정
  - AccountManager.setCurrent(null) 보장

[CreateAccountScene 연결]
- 계정 생성 성공 → SceneManager.switchScene('menu')
- "뒤로" → SceneManager.switchScene('playerSelect')
- "이미 존재하는 계정" 다이얼로그:
  - [내 계정이에요] → switchScene('pinEntry', { accountId: 해당 id })
  - [다른 사람이에요] → Step B로 돌아가서 닉네임은 유지하고 PIN만 재입력

[PinEntryScene 연결]
- 로그인 성공 → switchScene('menu')
- "뒤로" 또는 ESC → switchScene('playerSelect')

[MenuScene 수정 — 우상단에 현재 사용자 표시]
- 캔버스 우상단 (1080, 30 위치쯤)에 작게:
  "민수 #1234 ▾" 형태로 표시
  (게스트면 "게스트 ▾", 색상 살짝 다르게)
- 클릭 시 드롭다운 메뉴 (캔버스에 그리기):
  - 플레이어 전환 (PlayerSelectScene으로)
  - 로그아웃 (AccountManager.setCurrent(null) 후 PlayerSelectScene)
- 드롭다운은 ESC 또는 다른 곳 클릭 시 닫힘
- 기존 메뉴 동작(시작/설정 등)은 절대 건드리지 마

[엣지 케이스]
- 게스트 모드에서 "플레이어 전환" 누르면 그냥 PlayerSelectScene으로
- 페이지 새로고침 후에도 getCurrent() 있으면 메뉴로 직행되는지 확인

코드 작성 후:
1. 수정된 파일들의 변경점 요약 (diff 형식 권장)
2. 처음부터 끝까지 시나리오 5개를 테스트하는 순서:
   시나리오 A: 처음 켰을 때 → 첫 계정 생성 → 메뉴 진입
   시나리오 B: 새로고침 후 자동 로그인 확인
   시나리오 C: 메뉴에서 "플레이어 전환" → 다른 계정 로그인
   시나리오 D: PIN 틀리고 뒤로가기 → PlayerSelect
   시나리오 E: 게스트로 플레이 → 메뉴에서 게스트 표시 확인
3. localStorage 상태가 각 시점에 어떻게 변하는지 설명

⚠️ 기존 게임 플레이 로직(GameScene, PauseScene, GameOverScene)은 절대 건드리지 마.
⚠️ MenuScene의 기존 기능은 그대로 유지하고, 우상단 표시만 추가하는 거야.
```

⏸️ **체크포인트** (가장 꼼꼼히 봐야 함):
- [ ] 시나리오 A 끝까지 완주
- [ ] 새로고침해도 로그인 유지
- [ ] 게임 자체(GameScene)는 멀쩡히 작동하는지 (한 판 돌려보기)
- [ ] 메뉴 우상단에 현재 사용자 표시
- [ ] 플레이어 전환 메뉴 동작
- [ ] localStorage 직접 까봐서 데이터 잘 쌓이는지

---

## 단계 6. MetaProgression을 계정 인식하도록 준비

> **목표**: 메타 진행감 데이터가 계정별로 분리되도록 기반만 마련. 실제 메타 로직은 다음 작업.
> **검증**: 더미 메타 데이터를 계정 A에 저장하고, 계정 B로 전환 후 안 보이는지 확인.

```
단계 6를 시작할게.

이번 단계에서는 메타 진행감 시스템의 "껍데기"만 만들어. 실제 마일스톤 로직은 다음에 할 거고, 지금은 계정별로 데이터가 분리되는 구조만 잡아.

만들 파일:
- js/systems/MetaProgression.js

기존 파일 수정:
- 단계 5에서 만든 PlayerSelectScene의 카드에 "n판 · X.Xkm" 부분을 실제 데이터로 표시

요구사항:

[js/systems/MetaProgression.js]
- 싱글톤 export const Meta = new MetaProgression()
- localStorage 키: `coderun_meta_${accountId}` (계정별 분리)
- 게스트는 메모리에만 보관 (this._guestData)

- 기본 메타 데이터:
  {
    version: 1,
    totalRuns: 0,
    totalDistance: 0,
    totalScore: 0,
    bestScore: 0,
    bestDistance: 0,
    jellies: { java: 0, python: 0, c: 0, mysql: 0, git: 0 },
    unlockedTitles: [],
    activeTitle: null,
    passiveBuffs: {
      startComboMult: 1.0,
      comboTimerBonus: 0,
      slideDistanceMult: 1.0,
      extraRevives: 0,
    },
  }

- 메서드:
  - get data() : 현재 계정의 메타 데이터를 반환 (게터, 캐시 사용)
  - commitRun(runStats) : 한 판 결과 누적, 저장, 새로 해금된 마일스톤 배열 반환 (지금은 빈 배열 반환)
  - getSummary(accountId) : 특정 계정의 { totalRuns, totalDistance } 반환 (PlayerSelectScene 카드용)
  - resetForAccount(accountId) : 특정 계정의 메타 데이터 삭제 (AccountManager.deleteAccount가 호출)
  - 내부 _load(accountId), _save() 메서드

- 마이그레이션 함수 migrate(saved):
  - 버전 없으면 v0 → v1 변환
  - 그 외엔 그대로 반환

- 계정 변경 시 캐시 무효화 처리

[AccountManager.deleteAccount 보강]
- Meta.resetForAccount(accountId) 호출 추가
- (이미 이전 단계에서 localStorage.removeItem 호출했다면 Meta 모듈 호출로 교체)

[PlayerSelectScene 카드 갱신]
- 카드 그릴 때 Meta.getSummary(account.id) 호출
- "0판 · 0.0km" placeholder를 실제 값으로 교체
- 데이터 없으면 "0판 · 0.0km" 표시

[테스트용 디버그 함수 추가]
- 콘솔에서 호출할 수 있는 전역 함수 두 개:
  - window.debugAddRun(accountId, distance, score) : 가짜 판 누적
  - window.debugShowMeta(accountId) : 해당 계정의 메타 데이터 console.table
- 개발 편의용이고, 단계 7에서 제거할 거야

코드 작성 후:
1. MetaProgression.js 경로와 API 요약 (표 형식)
2. 테스트 시나리오:
   - 계정 A 생성 → debugAddRun(A.id, 500, 1000) → PlayerSelect 카드 확인
   - 계정 B 생성 → 카드는 0판으로 보여야 함
   - 계정 A로 다시 로그인 → debugShowMeta로 데이터 확인
   - 계정 A 삭제 → meta 데이터도 같이 사라지는지 localStorage 확인
3. 다음 단계 (실제 마일스톤 시스템)로 가기 전 체크사항

⚠️ GameScene이나 게임 플레이 로직에는 아직 commitRun 호출 연결하지 마.
⚠️ Meta.data는 항상 "현재 로그인된 계정" 기준으로 동작. 다른 계정 데이터 보고 싶으면 getSummary 써.
```

⏸️ **체크포인트** (마지막 단계):
- [ ] 두 계정의 메타 데이터가 분리되어 저장되는지
- [ ] PlayerSelectScene 카드에 실제 통계 보이는지
- [ ] 계정 삭제 시 메타 데이터도 같이 삭제되는지
- [ ] 게스트 모드에서 commitRun 호출해도 localStorage에 안 저장되는지

---

## 🎯 전체 완료 후 통합 테스트 프롬프트

```
모든 단계 완료했어. 이제 통합 테스트를 위해 다음을 도와줘:

1. 전체 흐름을 한 번에 검증할 수 있는 체크리스트를 만들어줘.
   (사용자 행동 → 기대 결과 → localStorage 상태 → UI 상태 순)

2. 발견될 수 있는 엣지 케이스 5가지를 알려주고, 각각 어떻게 재현하는지 알려줘.

3. 다음 작업("실제 마일스톤 시스템과 GameScene 연결")으로 넘어가기 전에,
   지금까지 만든 코드에서 리팩토링하거나 정리하면 좋을 부분을 찾아줘.
   (성능, 가독성, 일관성 측면)
```

---

## 💡 바이브 코딩 팁

### 단계별 진행 시 자주 쓰는 패턴

**문제가 생겼을 때:**
```
방금 만든 [파일명]에서 [구체적인 증상]이 발생해.
콘솔 에러는 [에러 메시지 그대로 붙여넣기].
어디가 잘못됐는지 추적해줘. 추측 말고 코드 보고 짚어줘.
```

**의도와 다르게 만들었을 때:**
```
방금 만든 거 롤백할게. 다시 시도하는데 이번엔:
- [원래 요구사항 다시]
- 추가로: [놓친 부분]
- 절대 하지 말 것: [잘못 만든 방향]
```

**범위를 좁히고 싶을 때:**
```
지금은 [작은 부분]만 집중해서 만들어줘.
나머지는 다음 메시지에서 다룰 거니까 placeholder로 둬도 돼.
```

### 절대 한꺼번에 시키지 말 것

❌ "로그인 시스템 만들어줘"
✅ "단계 1: 데이터 모델만 만들어. UI는 절대 만들지 마"

❌ "다 끝나고 마일스톤 시스템까지 한 번에"
✅ "단계 6까지만. 마일스톤 시스템은 따로 대화 새로 파서 진행할 거야"

### Git 커밋 권장 시점

- 단계 1 끝 → `feat: add AccountManager and hash module`
- 단계 2 끝 → `feat: add PlayerSelectScene UI`
- 단계 3 끝 → `feat: add CreateAccountScene with 3-step input`
- 단계 4 끝 → `feat: add PinEntryScene with lockout`
- 단계 5 끝 → `feat: wire up auth scenes into game boot flow`
- 단계 6 끝 → `feat: per-account meta progression scaffolding`

각 단계마다 커밋해두면 무언가 망가졌을 때 단계 단위로 롤백할 수 있어요.

---

## 📌 마지막 한 마디

이 프롬프트는 *처방전*이 아니라 *대본*이에요. Claude가 다른 좋은 제안을 하면 받아들이고, 본인 코드 스타일에 맞게 자유롭게 조정하세요. 단, **"한 단계 = 한 가지 검증 가능한 결과물"**이라는 원칙만 지키면 끝까지 흔들리지 않고 만들 수 있어요.

화이팅! 🚀
