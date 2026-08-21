/**
 * iCloud 사진 다운로드가 실제로 진행 중인지 화면(로딩 페이지 배너)에 알린다.
 * 압축이 돌고 있고(inFlight > 0) 그중 iCloud 다운로드가 관측됐을 때만 활성이다.
 */
const HIDE_DELAY_MS = 500;

let inFlight = 0;
let cloudSeen = false;
let downloading = false;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

function update() {
  const active = inFlight > 0 && cloudSeen;

  if (active) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
    if (!downloading) {
      downloading = true;
      emit();
    }
    return;
  }

  if (!downloading || hideTimer) return;
  // ponytail: 워커 교대로 inFlight가 순간 0이 되는 깜빡임을 지연 숨김으로 흡수
  hideTimer = setTimeout(() => {
    hideTimer = undefined;
    downloading = false;
    cloudSeen = false;
    emit();
  }, HIDE_DELAY_MS);
}

export const icloudDownloadStatus = {
  begin() {
    inFlight += 1;
    update();
  },
  end() {
    inFlight = Math.max(0, inFlight - 1);
    update();
  },
  reportCloudDownload() {
    cloudSeen = true;
    update();
  },
  isDownloading: () => downloading,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
