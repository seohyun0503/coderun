# CreateAccountScene 한글 IME 버그 수정 프롬프트

> VS Code의 Claude에게 그대로 복붙해서 쓸 수 있는 단일 프롬프트입니다.
> 단계 0 컨텍스트가 이미 전달된 대화에 이어서 사용하세요.

---

## 📋 버그 진단 요약 (사전 분석)

현재 `js/scenes/CreateAccountScene.js`에 두 가지 한글 IME 관련 버그가 있어요:

**버그 1**: 한글 입력 시 글자 순서 역전 (예: "안녕하세요" → "안녕세요하")  
**버그 2**: Backspace/Delete로 한글 삭제 시 한 글자 이상 안 지워짐

**근본 원인 (두 버그 공통)**:

1. `_onInput` 핸들러에서 매 input 이벤트마다 `setSelectionRange(end, end)`를 호출하는데, 이게 IME의 selection 추적을 망가뜨림. IME는 다음 조합 위치를 selection 기반으로 결정하기 때문에 selection이 인위적으로 이동하면 다음 글자가 엉뚱한 위치에 삽입됨.

2. `_composing` 플래그로 compositionstart/end를 추적하는 방식이 브라우저별/상황별 이벤트 순서 차이에 취약함. Chrome에서 `compositionend`가 마지막 `input` 이벤트보다 *나중에* 오는 경우가 있어, 마지막 글자가 _composing=true 상태로 처리되어 누락되거나 setSelectionRange가 호출되지 않은 채로 다음 입력을 받음.

3. `input` 이벤트의 `inputType` 속성을 확인하지 않고 모든 input 이벤트를 동일하게 처리. Backspace로 인한 `deleteContentBackward`, IME 조합 삭제로 인한 `deleteCompositionText`, 일반 삽입 `insertText` 등을 구분 안 함.

4. `_onInput`에서 `hiddenInput.value.length > 12`일 때 `value = value.slice(0, 12)`로 강제 자르는데, **input 이벤트 도중에 value를 직접 수정하는 것** 또한 IME 상태를 흔듦. 길이 제한은 `beforeinput`에서 막아야 함.

---

## 🛠️ 수정 프롬프트 (이대로 Claude에게 전달)

```
js/scenes/CreateAccountScene.js 에서 한글 입력 관련 두 가지 버그를 수정해줘.

[버그 증상]
1. 한글 입력 시 글자 순서가 역전됨 ("안녕하세요" → "안녕세요하" 같은 식)
2. Backspace/Delete로 한글 삭제 시 한 글자 이상 안 지워짐

[원인 분석 결과]
근본 원인은 hiddenInput의 selection과 value를 _onInput 핸들러 안에서 인위적으로 조작하는 것임:

(1) setSelectionRange(end, end)를 input 이벤트마다 호출 → IME의 selection 추적을 망가뜨림.
    IME는 다음 조합 위치를 selection 기반으로 결정하는데, 우리가 끼어들면 꼬임.

(2) _composing 플래그 추적 방식이 compositionend vs input 이벤트 순서 차이에 취약함.
    Chrome에서 compositionend가 마지막 input보다 나중에 오는 케이스에서 마지막 글자 처리 누락.

(3) input 이벤트의 inputType을 보지 않아 insertText / deleteContentBackward / deleteCompositionText 구분 안 함.

(4) hiddenInput.value를 input 이벤트 도중에 .slice(0,12)로 자르면서 IME 상태를 흔듦.
    길이 제한은 beforeinput 이벤트에서 차단해야 함.

[수정 원칙]
"hiddenInput은 신성한 영역. 우리는 hiddenInput.value를 읽기만 하고,
 절대 value나 selection을 input/composition 이벤트 도중에 건드리지 않는다."

[구체적 수정 사항]

수정 1: _composing 플래그와 compositionstart/end 리스너를 완전히 제거해줘.
        IME 상태를 직접 추적하지 않고, 모든 input 이벤트에서 단순하게 hiddenInput.value를 this._nickname에 복사만 해.

수정 2: _onInput 핸들러를 다음 로직으로 단순화해줘:
        - if (this._step !== 'A') return; 만 가드로 두기
        - this._nickname = this._hiddenInput.value; 한 줄로 동기화
        - this._errorMsg = ''; 로 에러 클리어
        - setSelectionRange 호출은 완전히 제거
        - value.slice() 같은 hiddenInput 직접 수정도 완전히 제거

수정 3: 길이 제한 (1~12자)을 beforeinput 이벤트로 옮겨줘:
        - this._onBeforeInput = (e) => {
            if (this._step !== 'A') return;
            // 입력 후 길이가 12를 초과할 것 같으면 막기
            // insertText / insertCompositionText 인 경우만 길이 체크
            const inputType = e.inputType;
            if (inputType === 'insertText' || inputType === 'insertCompositionText') {
              const currentLength = this._hiddenInput.value.length;
              const addedLength = (e.data || '').length;
              // 선택 범위가 있으면 그만큼은 대체되니까 빼줌
              const selLength = (this._hiddenInput.selectionEnd ?? 0) - (this._hiddenInput.selectionStart ?? 0);
              if (currentLength - selLength + addedLength > 12) {
                e.preventDefault();
              }
            }
          };
        - 이 리스너를 enter()에서 등록, exit()에서 제거

수정 4: hiddenInput 엘리먼트 설정을 강화해줘:
        - autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" 속성 추가
        - 이건 모바일 IME나 자동완성이 끼어드는 걸 방지함

수정 5: Step A → Step B로 넘어갈 때 (_advanceToB 메서드):
        - 현재 this._hiddenInput?.blur(); 만 호출하는데,
        - 추가로 maxLength 같은 강제 트림을 advanceToB 호출 직전에 한 번만 적용:
          this._nickname = this._hiddenInput.value.slice(0, 12);
        - 이렇게 하면 혹시라도 beforeinput을 우회한 길이 초과를 마지막에 한 번 정리

수정 6: 캔버스 클릭으로 다시 hiddenInput에 포커스를 줄 때 (_handleClick의 step A 분기):
        - 현재 this._hiddenInput?.focus(); 호출 후 곧바로 _isNextHit 체크하는데,
        - focus() 직후 setSelectionRange를 호출해서 커서를 끝으로 보내고 싶다면
          이건 input/composition 이벤트와 무관한 시점이라 안전함
        - 단, focus() 호출만 해도 IME는 정상 동작하니 그냥 두는 것도 OK
        - 어쨌든 focus() 자체는 유지

수정 7: keydown 핸들러 _onHiddenKey 는 Enter 처리만 그대로 유지.
        Backspace는 hiddenInput의 기본 동작에 완전히 맡기고 우리는 안 건드림.

[수정하지 말 것]
- Step B / C (PIN 입력) 로직은 손대지 마. 거긴 hiddenInput을 안 쓰니까 영향 없어.
- 흔들림 애니메이션, 키패드 렌더링, 다이얼로그 등 다른 부분 손대지 마.
- 한글 커서 깜빡임 표시(_renderStepA의 커서 그리기 부분)는 그대로 유지.
- enter()/exit() 의 이벤트 리스너 등록·해제 패턴은 유지하되, 위에서 말한 추가/제거만 반영.

[검증 시나리오]
수정 후 다음을 확인하고 알려줘:
1. "안녕하세요" 빠르게 입력 → 정확히 "안녕하세요" 표시
2. "안녕하세요" 입력 후 Backspace 5번 → 빈 칸이 됨
3. 영문 "Hello" 빠르게 입력 → "Hello"
4. 한영 혼합 "Hi안녕" 입력 → "Hi안녕"
5. 12자 초과 시도 (예: "가나다라마바사아자차카타파" 13자) → 12자에서 멈춤
6. 12자 가득 채운 상태에서 Backspace → 정상 삭제
7. 한글 조합 중 (예: "ㅇ" 만 친 상태) Backspace → 자모만 사라지고 input 비워짐
8. 글자수 카운터 "n / 12" 가 정확히 갱신
9. 12자 초과 시도해도 Enter 키 → 정상적으로 Step B로 진입 가능
10. Step A → 뒤로 → 다시 Step A 진입 시 입력이 초기화되는지

[작업 후 알려줄 것]
1. 변경된 코드 부분을 diff 형식으로 (수정 1~7 어떻게 반영했는지)
2. 만약 위 검증 시나리오 중 잠재적으로 실패할 가능성이 있는 게 있다면 어떤 것이고 왜 그런지
3. 혹시 발견한 추가 잠재 버그가 있다면 (지금 수정하지 말고) 별도로 알려줘

⚠️ 절대 금지사항:
- _onInput 안에서 hiddenInput.value 직접 수정 금지
- _onInput 안에서 setSelectionRange 호출 금지  
- compositionstart/compositionend 리스너 다시 추가 금지
- _composing 같은 IME 상태 플래그 도입 금지
- Step A 외 부분에 영향 주는 변경 금지
```

---

## 🔍 추가 디버깅 팁 (수정 후에도 이상하면)

만약 위 수정 후에도 문제가 남으면 다음을 시도해보세요:

### 디버깅 프롬프트 1: 이벤트 시퀀스 확인

```
_onInput 직전에 다음 디버그 로그를 임시로 추가해줘:

this._onBeforeInput = (e) => {
  console.log('[beforeinput]', e.inputType, 'data:', JSON.stringify(e.data), 'value:', JSON.stringify(this._hiddenInput.value));
  // ... 기존 로직
};

this._onInput = (e) => {
  console.log('[input]', e.inputType, 'value:', JSON.stringify(this._hiddenInput.value));
  // ... 기존 로직
};

이렇게 하고 "안녕" 입력 시 콘솔에 어떤 순서로 이벤트가 찍히는지 알려줘.
```

### 디버깅 프롬프트 2: contenteditable 대체 검토

```
만약 input 엘리먼트로 한글 IME 호환이 끝까지 안 되면, 
hiddenInput을 contenteditable="true"인 div로 교체하는 방법을 검토해줘.

contenteditable의 장점:
- IME 호환성이 input보다 좋은 경우가 많음 (특히 모바일)
- 커스텀 입력 제어가 더 유연

contenteditable의 단점:
- value 대신 textContent 사용 → API 다름
- selection API가 다름 (window.getSelection)
- 길이 제한 구현이 더 복잡

지금 input으로 한 번 더 시도해보고, 그래도 안 되면 contenteditable로 마이그레이션할지 결정하자.
```

---

## 💡 왜 이렇게 까다로운가 — 비개발적 설명

한글 IME 버그는 정말 자주 마주치는데, 원인이 **"우리가 너무 똑똑하게 굴려고 해서"** 일 때가 많아요.

input 엘리먼트는 그 자체로 IME와 잘 협력하도록 만들어져 있어요. 우리가 할 일은 **"hiddenInput.value를 읽어서 화면에 그리는 것"** 그것뿐이에요. 

근데 코드를 짤 때 "더 안전하게 만들어야지" 하면서:
- 길이 제한도 input 안에서 처리해야지
- selection 위치도 끝으로 고정해야지  
- IME 조합 중인지 추적해야지

이런 게 다 쌓이면, 우리가 짜놓은 코드와 브라우저의 IME 구현이 *서로 자기가 옳다고 우기는 상태*가 돼요. 

해결책은 역설적으로 **코드를 단순하게 만드는 것**이에요. hiddenInput에 모든 권한을 주고, 우리는 결과만 받아오는 거. 이게 위 수정 프롬프트의 핵심 원칙이에요.

---

## 📌 마지막 점검 사항

위 프롬프트로 수정 후 검증 시나리오 10개를 다 통과하면 안전해요. 만약 7번 ("한글 자모 조합 중 Backspace") 같은 미묘한 케이스가 여전히 이상하면, 그건 *치명적이지 않은 IME 잔여 동작*일 가능성이 높아요. 그 경우 사용자 경험상 큰 문제가 아니면 넘어가도 괜찮습니다.

추가로 막히면 알려주세요. 디버그 로그 결과 보고 더 좁혀드릴게요.
