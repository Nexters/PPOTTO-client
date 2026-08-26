#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
SHELL_PROFILE="$HOME/.zshrc"
MIN_NODE_VERSION="$(tr -d '[:space:]' < "$REPO_ROOT/.nvmrc")"
BREW_BIN=""

finish() {
  local exit_code=$?
  trap - EXIT
  print
  if (( exit_code == 0 )); then
    print "✅ 설정이 끝났습니다."
  else
    print "❌ 설정 중 오류가 발생했습니다. 위쪽의 마지막 오류 내용을 개발자에게 전달해 주세요."
  fi
  if [[ -t 0 ]]; then
    print -n "이 창을 닫으려면 Enter를 누르세요. "
    read -r _ || true
  fi
  exit "$exit_code"
}

trap finish EXIT

section() {
  print
  print "▶ $1"
}

add_to_path() {
  local directory="$1"
  local line="export PATH=\"$directory:\$PATH\""

  export PATH="$directory:$PATH"
  touch "$SHELL_PROFILE"
  if ! grep -Fqx "$line" "$SHELL_PROFILE"; then
    print "" >> "$SHELL_PROFILE"
    print "# Added by PPOTTO setup" >> "$SHELL_PROFILE"
    print -r -- "$line" >> "$SHELL_PROFILE"
  fi
  rehash
}

find_brew() {
  if command -v brew >/dev/null 2>&1; then
    BREW_BIN="$(command -v brew)"
  elif [[ -x /opt/homebrew/bin/brew ]]; then
    BREW_BIN="/opt/homebrew/bin/brew"
  elif [[ -x /usr/local/bin/brew ]]; then
    BREW_BIN="/usr/local/bin/brew"
  else
    return 1
  fi
}

ensure_brew() {
  if ! find_brew; then
    print "필요한 프로그램을 설치하기 위해 Homebrew를 먼저 설치합니다."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || return 1
    find_brew || return 1
  fi
  add_to_path "${BREW_BIN:h}"
}

node_is_compatible() {
  command -v node >/dev/null 2>&1 || return 1
  node -e '
    const current = process.versions.node.split(".").map(Number);
    const minimum = process.argv[1].split(".").map(Number);
    const sameMajor = current[0] === minimum[0];
    let newEnough = true;
    for (let index = 0; index < 3; index += 1) {
      if (current[index] === minimum[index]) continue;
      newEnough = current[index] > minimum[index];
      break;
    }
    process.exit(sameMajor && newEnough ? 0 : 1);
  ' "$MIN_NODE_VERSION"
}

ensure_node() {
  if node_is_compatible; then
    print "✅ Node.js $(node --version)"
    return
  fi

  local node_major="${MIN_NODE_VERSION%%.*}"
  local formula="node@$node_major"

  print "Node.js $node_major 버전을 설치합니다."
  ensure_brew
  if "$BREW_BIN" list --versions "$formula" >/dev/null 2>&1; then
    "$BREW_BIN" upgrade "$formula"
  else
    "$BREW_BIN" install "$formula"
  fi
  add_to_path "$("$BREW_BIN" --prefix "$formula")/bin"

  if ! node_is_compatible; then
    print "Node.js $MIN_NODE_VERSION 이상, $((node_major + 1)) 미만 버전이 필요합니다."
    return 1
  fi
  print "✅ Node.js $(node --version)"
}

ensure_pnpm() {
  local required_version
  required_version="$(node -p "require('./package.json').packageManager.replace(/^pnpm@/, '')")"

  if command -v pnpm >/dev/null 2>&1 && [[ "$(pnpm --version)" == "$required_version" ]]; then
    print "✅ pnpm $required_version"
    return
  fi

  print "pnpm $required_version 버전을 설치합니다."
  mkdir -p "$HOME/.local"
  npm install --global --prefix "$HOME/.local" "pnpm@$required_version"
  add_to_path "$HOME/.local/bin"

  [[ "$(pnpm --version)" == "$required_version" ]]
  print "✅ pnpm $required_version"
}

version_at_least() {
  node -e '
    const parse = value => value.replace(/^v/, "").split(".").map(Number);
    const current = parse(process.argv[1]);
    const minimum = parse(process.argv[2]);
    for (let index = 0; index < 3; index += 1) {
      if ((current[index] || 0) > (minimum[index] || 0)) process.exit(0);
      if ((current[index] || 0) < (minimum[index] || 0)) process.exit(1);
    }
    process.exit(0);
  ' "$1" "$2"
}

ensure_cocoapods() {
  local minimum_version="1.15.2"
  local current_version=""

  if command -v pod >/dev/null 2>&1; then
    current_version="$(pod --version 2>/dev/null)"
    if version_at_least "$current_version" "$minimum_version"; then
      print "✅ CocoaPods $current_version"
      return
    fi
  fi

  print "모바일 빌드에 필요한 CocoaPods를 설치합니다."
  ensure_brew || return 1
  if "$BREW_BIN" list --versions cocoapods >/dev/null 2>&1; then
    "$BREW_BIN" upgrade cocoapods || return 1
  else
    "$BREW_BIN" install cocoapods || return 1
  fi
  add_to_path "${BREW_BIN:h}"

  current_version="$(pod --version 2>/dev/null)"
  version_at_least "$current_version" "$minimum_version" || return 1
  print "✅ CocoaPods $current_version"
}

create_env_files() {
  local relative_path
  for relative_path in .env apps/web/.env apps/mobile/.env; do
    if [[ -e "$REPO_ROOT/$relative_path" || -L "$REPO_ROOT/$relative_path" ]]; then
      print "↪ 기존 파일 유지: $relative_path"
    else
      touch "$REPO_ROOT/$relative_path"
      print "✅ 빈 파일 생성: $relative_path"
    fi
  done
}

check_xcode() {
  local developer_dir=""
  local xcode_version=""
  developer_dir="$(xcode-select -p 2>/dev/null || true)"

  if [[ "$developer_dir" != *".app/Contents/Developer"* ]]; then
    print "⚠️ 모바일 작업 전 App Store에서 Xcode를 설치하고 한 번 실행해 주세요."
    return
  fi

  xcode_version="$(xcodebuild -version 2>/dev/null || true)"
  if [[ -z "$xcode_version" ]]; then
    print "⚠️ Xcode를 한 번 실행해 약관과 초기 설정을 완료해 주세요."
    return
  fi
  print "✅ ${xcode_version%%$'\n'*}"
  local runtimes="$(xcrun simctl list runtimes available 2>/dev/null || true)"
  if [[ "$runtimes" == *"iOS"* ]]; then
    print "✅ iOS Simulator"
  else
    print "⚠️ Xcode에서 iOS Simulator 런타임 하나를 설치해 주세요."
  fi
  print "ℹ️ 최초 모바일 빌드 전 Xcode > Settings > Accounts에서 개인 Apple ID로 로그인해 주세요."
}

cd "$REPO_ROOT"

print "뽀또 개발 환경을 설정합니다."

if [[ "$(uname -s)" != "Darwin" ]]; then
  print "이 스크립트는 macOS에서만 사용할 수 있습니다."
  exit 1
fi

if ! git --version >/dev/null 2>&1; then
  print "Git(Apple 개발자 도구)이 필요합니다. 방금 뜬 설치 창에서 설치를 완료한 뒤 다시 실행해 주세요."
  exit 1
fi

section "Node.js와 pnpm 확인"
ensure_node
ensure_pnpm

section "프로젝트 패키지 설치"
pnpm install --frozen-lockfile
print "✅ 프로젝트 패키지"

section "환경변수 파일 준비"
create_env_files
print "ℹ️ 파일 내용은 전달받은 값을 직접 넣어야 합니다."

section "모바일 도구 확인"
if ! ensure_cocoapods; then
  print "⚠️ CocoaPods 자동 설치에 실패했습니다. 웹 작업은 가능하지만 모바일 빌드 전 개발자에게 문의해 주세요."
fi
check_xcode

print
print "웹 실행: pnpm web"
print "자세한 사용법: scripts/README.md"
