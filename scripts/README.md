# 뽀또 로컬 실행 가이드

이 문서는 개발 경험이 없어도 뽀또 웹과 모바일 화면을 실행할 수 있도록 설명합니다. macOS에서 사용하며, `PPOTTO-client` 폴더가 이미 컴퓨터에 있어야 합니다. 모바일 안내는 iOS 시뮬레이터 기준이며 Android 환경은 설치하지 않습니다.

## 명령어를 입력할 위치

아래 명령어는 모두 `PPOTTO-client` 폴더에서 실행합니다. Claude Code로 이 폴더를 열었다면 그 안의 Terminal을 사용하면 됩니다.

일반 Terminal을 사용한다면 다음 순서로 폴더를 여세요.

1. Terminal을 실행합니다.
2. `cd `를 입력합니다. `cd` 뒤에 공백이 하나 있어야 합니다.
3. Finder의 `PPOTTO-client` 폴더를 Terminal 창으로 끌어다 놓습니다.
4. Enter를 누릅니다.

## 1. 최초 환경 설정

`setup.command`를 실행하면 다음 항목을 준비합니다.

- **Homebrew**: 필요한 프로그램을 설치하는 도구
- **Node.js 22, pnpm 10.12.2**: 웹과 모바일 프로젝트를 실행하는 도구
- **프로젝트 패키지**: 뽀또 코드가 사용하는 라이브러리
- **CocoaPods**: iOS 앱 빌드에 필요한 라이브러리 관리 도구
- **빈 환경변수 파일 3개**: 전달받은 설정값을 넣을 파일

Xcode와 iOS Simulator는 직접 설치하지 않고, 사용할 준비가 되었는지만 확인합니다. 앱 실행과 환경변수 값 입력도 하지 않습니다.

Finder에서 [`setup.command`](./setup.command)를 더블클릭합니다.

- Terminal 창이 열리고 필요한 프로그램과 프로젝트 패키지를 설치합니다.
- 시스템 암호를 물어볼 수 있습니다. 암호를 입력하는 동안 화면에 글자가 보이지 않는 것은 정상입니다.
- `✅ 설정이 끝났습니다.`가 나올 때까지 창을 닫지 마세요.
- 더블클릭이 차단되면 파일을 우클릭하고 **열기**를 선택하세요.
- 코드가 업데이트된 뒤 실행이 안 될 때 다시 실행해도 안전합니다.

스크립트는 기존 파일이나 환경변수 값을 지우지 않습니다.

## 2. 환경변수 입력

담당자에게 메신저로 전달받은 내용을 아래 세 파일에 넣습니다.

```text
.env
apps/web/.env
apps/mobile/.env
```

파일이 보이지 않으면 `PPOTTO-client` 폴더의 Terminal에서 다음 명령어를 실행하세요.

```bash
open -a TextEdit .env apps/web/.env apps/mobile/.env
```

각 파일에 전달받은 내용을 붙여넣고 저장합니다.

> 환경변수 내용은 외부에 공유하거나 Git에 올리지 마세요. 값을 변경했다면 실행 중인 서버를 종료하고 다시 실행하세요.

## 3. 웹 실행

Terminal에서 다음 명령어를 실행합니다.

```bash
pnpm web
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. Terminal에 다른 주소가 표시되면 그 주소를 사용하세요.

Terminal이 멈춘 것처럼 보여도 정상입니다. 웹을 사용하는 동안 해당 창을 닫지 마세요. 종료할 때는 Terminal에서 `Control + C`를 누릅니다.

## 4. 모바일 최초 설정

모바일 작업을 시작하기 전에 아래 과정이 한 번 필요합니다.

1. App Store에서 Xcode를 설치합니다.
2. Xcode를 한 번 실행하고 안내되는 약관과 초기 설정을 완료합니다.
3. Xcode에서 iOS Simulator 런타임 하나를 설치합니다. 용량 절약을 위해 여러 버전을 설치할 필요는 없습니다.
4. Xcode 메뉴의 **Xcode → Settings → Accounts → +**에서 개인 Apple ID로 로그인합니다.
5. Xcode를 종료합니다. 평소 작업할 때는 Xcode를 켜둘 필요가 없습니다.
6. `setup.command`를 다시 실행해 모바일 도구까지 준비됐는지 확인합니다.

환경변수 입력을 마친 다음 Terminal 창을 두 개 엽니다.

첫 번째 Terminal에서 웹 서버를 실행합니다.

```bash
pnpm web
```

두 번째 Terminal에서 모바일 앱을 처음 빌드합니다.

```bash
pnpm --filter mobile ios
```

첫 빌드는 시간이 오래 걸리고 Mac이 뜨거워질 수 있습니다. 앱 생성, 컴파일, 시뮬레이터 설치가 끝나면 뽀또 앱이 자동으로 열립니다. 서명할 팀을 묻는 경우 본인의 **Personal Team**을 선택하세요.

## 5. 평소 모바일 작업

최초 빌드를 마쳤다면 이후에는 Terminal 창을 두 개 사용합니다.

첫 번째 Terminal:

```bash
pnpm web
```

두 번째 Terminal:

```bash
pnpm mobile
```

시뮬레이터가 닫혀 있다면 새 Terminal에서 다음 명령어를 실행합니다.

```bash
open -a Simulator
```

시뮬레이터에서 설치된 **뽀또** 앱 아이콘을 누릅니다.

> `pnpm mobile` 화면에서 `i`를 누르면 Expo Go가 열릴 수 있습니다. `i`를 누르지 말고 시뮬레이터에서 뽀또 앱을 직접 실행하세요.

모바일 화면 일부는 웹으로 만들어져 있으므로 모바일 작업 중에도 `pnpm web`과 `pnpm mobile`을 모두 켜두세요.

## 6. 다시 빌드해야 하는 경우

대부분의 화면, 문구, 색상, 간격 수정은 다시 빌드하지 않아도 됩니다. `pnpm web`과 `pnpm mobile`만 실행하면 변경사항이 반영됩니다.

아래 상황에서는 다시 빌드합니다.

- 시뮬레이터에서 뽀또 앱을 삭제한 경우
- 시뮬레이터를 초기화한 경우
- 개발자가 재빌드를 요청한 경우

```bash
pnpm --filter mobile ios
```

## 명령어 한눈에 보기

| 하고 싶은 일                 | 명령어                           |
| ---------------------------- | -------------------------------- |
| 최초 환경 설정               | `scripts/setup.command` 더블클릭 |
| 웹 실행                      | `pnpm web`                       |
| 모바일 최초 빌드 또는 재설치 | `pnpm --filter mobile ios`       |
| 평소 모바일 개발 서버 실행   | `pnpm mobile`                    |
| 시뮬레이터 실행              | `open -a Simulator`              |
| 실행 중인 서버 종료          | `Control + C`                    |

## 문제가 생겼을 때

### `pnpm: command not found`가 표시됨

Terminal을 완전히 닫았다가 다시 열고 `setup.command`를 다시 실행합니다.

### 웹 페이지가 열리지 않음

`pnpm web`을 실행한 Terminal이 열려 있는지 확인합니다. 기본 주소는 [http://localhost:3000](http://localhost:3000)입니다.

### 모바일에 흰 화면이나 연결 오류가 표시됨

환경변수를 입력했는지, `pnpm web`과 `pnpm mobile`이 모두 실행 중인지 확인합니다. 두 명령어를 종료한 뒤 다시 실행해 보세요.

### 시뮬레이터에 뽀또 앱이 없음

다음 명령어로 앱을 다시 설치합니다.

```bash
pnpm --filter mobile ios
```

### 서명 관련 오류가 표시됨

Xcode의 **Settings → Accounts**에 개인 Apple ID가 로그인되어 있는지 확인합니다. 팀 선택을 요청하면 본인의 **Personal Team**을 선택합니다.

### Simulator를 찾을 수 없다고 표시됨

Xcode를 열어 iOS Simulator 런타임 하나를 설치합니다.

그래도 해결되지 않으면 파일을 임의로 삭제하지 말고 Terminal의 마지막 오류 화면을 캡처해 개발자에게 전달하세요.
