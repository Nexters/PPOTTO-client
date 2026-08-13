import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePhotoSelection } from '@/features/photo-selection';

import { PhotoSelectScreen } from './PhotoSelectScreen';

let mockSearchParams: { boardId: string; mode?: string } = { boardId: 'board-1' };

/**
 * 동작 범위 (2026-07-30 인터뷰, 2026-07-30 축소)
 *
 * 진입하면 선택된 앨범에서 100그룹을 불러와 전체 선택 상태로 시작한다. 타일 누름은 대상에 따라
 * 다르게 동작한다 — 1장 그룹은 제외, 여러 장 그룹은 다음 사진으로 승계.
 * 제외 개수에 상한은 없고 90 미만이면 CTA만 비활성화한다(PRD의 "최대 10개"는 제출 범위 90~100).
 *
 * 대역은 expo-media-library·expo-router·expo-image-manipulator 경계뿐이다. loadPhotoGroups·groupPhotos·
 * AlbumDropdown·PhotoTile은 실제로 돌린다.
 *
 * 검증 지점 이동 — 아래는 여기서 다시 보지 않는다.
 *   그룹화·대표 선정·승계·소진·복구 규칙       → photo-group.test.ts
 *   페이지 로딩 루프, 앨범에 100개 미만일 때 → load-photo-groups.test.ts
 *   드롭다운 열림·닫힘·선택 콜백              → AlbumDropdown.test.tsx
 *   제외된 타일의 체크 해제 표시               → 아래 2번이 간접 검증
 *   카운터 경고 색상, 타일 dim, chevron 방향   → 스타일이라 시안 대조 항목
 *
 * 제외: 진입 시 갤러리 전체에 100그룹 미만 → 생성 불가 안내 화면 — 별도 작업, Unable 시안 없음
 * 제외: 권한 거부 안내·설정 이동 — 별도 시안 필요
 * 제외: 백그라운드 중 설정에서 권한 회수 후 복귀 — 드묾, 실제 문제 시 추가
 * CTA는 업로드 서비스 시작과 BoardScreen 이동만 검증하고 업로드 내부 동작은 feature 테스트가 담당
 * 제외: 로딩 중 타일 표현 — 시안의 회색 타일은 샘플 필러이지 플레이스홀더가 아님
 *
 * [팀확인] 700:7641 시안의 dim 누락 — 디자이너 확인, 구현은 dim 적용
 */

jest.mock('expo-media-library', () => ({
  getAssetsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  SortBy: { creationTime: 'creationTime' },
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'job-1') }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => mockSearchParams),
}));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn((uri: string) => {
      const context = {
        renderAsync: jest.fn(async () => ({
          saveAsync: jest.fn(async () => ({
            uri: uri.replace('file:///', 'file:///compressed/'),
            width: 1280,
            height: 1280,
          })),
          release: jest.fn(),
        })),
        release: jest.fn(),
      };
      return { ...context, resize: jest.fn(() => context) };
    }),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('@/features/photo-upload', () => ({
  photoUploadService: { start: jest.fn() },
}));
jest.mock('@/entities/user/api/user-queries', () => ({
  useMeQuery: () => ({ data: { name: '뽀또' } }),
}));

const { getAssetsAsync, requestPermissionsAsync } = jest.requireMock('expo-media-library') as {
  getAssetsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};
const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } };
const { photoUploadService } = jest.requireMock('@/features/photo-upload') as {
  photoUploadService: { start: jest.Mock };
};

const BASE_TIME = Date.parse('2026-07-30T10:00:00.000Z');

const minutes = (n: number) => n * 60_000;

function asset(id: string, creationTime: number) {
  return { id, uri: `file:///${id}.jpg`, creationTime, width: 100, height: 100 };
}

/** 서로 10분 떨어져 각각 1그룹이 되는 사진. 배열 앞쪽이 최신이다. */
function spacedAssets(count: number, startMinutesAgo = 0) {
  return Array.from({ length: count }, (_, index) =>
    asset(`s${index}`, BASE_TIME - minutes(startMinutesAgo + index * 10)),
  );
}

/** getAssetsAsync가 커서 기반으로 돌려줄 가짜 갤러리를 설정한다. */
function setGallery(assets: ReturnType<typeof asset>[]) {
  getAssetsAsync.mockImplementation(async ({ first, after }) => {
    const start = after ? Number(after) : 0;
    const page = assets.slice(start, start + first);
    const end = start + page.length;

    return {
      assets: page,
      endCursor: String(end),
      hasNextPage: end < assets.length,
      totalCount: assets.length,
    };
  });
}

/** 앱에서는 expo-router가 제공하는 값. 화면이 하단 인셋을 쓰므로 테스트에서도 채워준다. */
const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** 로딩이 끝나 타일이 나타날 때까지 기다린다. */
async function renderLoadedScreen() {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <PhotoSelectScreen />
    </SafeAreaProvider>,
  );
  await screen.findAllByRole('checkbox');

  return { user };
}

const counter = (text: string) => screen.getByText(text);
const cta = () => screen.getByRole('button', { name: /보드 만들기/ });

beforeEach(() => {
  mockSearchParams = { boardId: 'board-1' };
  jest.clearAllMocks();
});

it('진입 시 불러온 그룹을 전체 선택 상태로 표시하고 카운터를 보여준다', async () => {
  setGallery(spacedAssets(100));

  await renderLoadedScreen();

  expect(screen.getByText('뽀또님의 최근 사진 100장을 골랐어요')).toBeOnTheScreen();
  expect(counter('100 / 100')).toBeOnTheScreen();
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
});

it('사진 권한을 거부하면 갤러리를 조회하지 않는다', async () => {
  requestPermissionsAsync.mockResolvedValueOnce({ granted: false });

  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <PhotoSelectScreen />
    </SafeAreaProvider>,
  );

  await waitFor(() => expect(requestPermissionsAsync).toHaveBeenCalledTimes(1));
  expect(getAssetsAsync).not.toHaveBeenCalled();
});

it('단일 사진을 누르면 제외되고 다시 누르면 복구된다', async () => {
  setGallery(spacedAssets(100));
  const { user } = await renderLoadedScreen();
  const firstTile = screen.getAllByRole('checkbox')[0]!;

  await user.press(firstTile);

  expect(counter('99 / 100')).toBeOnTheScreen();
  expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();

  await user.press(screen.getAllByRole('checkbox')[0]!);

  expect(counter('100 / 100')).toBeOnTheScreen();
});

it('그룹 대표를 누르면 카운터가 유지되고 타일이 선택 상태로 남는다', async () => {
  // 가장 최신 3장이 한 그룹(5분 이내)이고, 그 뒤는 각각 1그룹이라 총 100그룹이다.
  const burst = [
    asset('b0', BASE_TIME),
    asset('b1', BASE_TIME - minutes(1)),
    asset('b2', BASE_TIME - minutes(2)),
  ];
  setGallery([...burst, ...spacedAssets(99, 10)]);
  const { user } = await renderLoadedScreen();

  await user.press(screen.getAllByRole('checkbox')[0]!);

  // 승계는 분석 단위를 없애지 않는다. 제외였다면 99가 되고 체크가 풀렸을 것이다.
  expect(counter('100 / 100')).toBeOnTheScreen();
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
});

it('그룹에서 사진을 제외하면 배지에 남은 사진 수를 보여준다', async () => {
  // 가장 최신 3장이 한 그룹, 나머지는 1장씩이라 배지는 하나만 나온다.
  const burst = [
    asset('b0', BASE_TIME),
    asset('b1', BASE_TIME - minutes(1)),
    asset('b2', BASE_TIME - minutes(2)),
  ];
  setGallery([...burst, ...spacedAssets(99, 10)]);

  const { user } = await renderLoadedScreen();

  expect(screen.getByText('3')).toBeOnTheScreen();

  await user.press(screen.getAllByRole('checkbox')[0]!);

  expect(screen.queryByText('3')).not.toBeOnTheScreen();
  expect(screen.getByText('2')).toBeOnTheScreen();
});

it('89개로 내려가면 CTA가 비활성화되고 90개로 회복하면 다시 활성화된다', async () => {
  setGallery(spacedAssets(100));
  const { user } = await renderLoadedScreen();

  for (let index = 0; index < 11; index += 1) {
    await user.press(screen.getAllByRole('checkbox')[index]!);
  }

  expect(counter('89 / 100')).toBeOnTheScreen();
  expect(cta()).toBeDisabled();

  await user.press(screen.getAllByRole('checkbox')[10]!);

  expect(counter('90 / 100')).toBeOnTheScreen();
  expect(cta()).toBeEnabled();
});

it('CTA를 누르면 업로드를 시작하고 다음 화면으로 이동한다', async () => {
  setGallery(spacedAssets(100));
  const { user } = await renderLoadedScreen();

  await user.press(cta());

  expect(photoUploadService.start).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/board',
    params: { boardId: 'board-1' },
  });
});

it('전체 취소를 누르면 0이 되고 자동 선택을 누르면 다시 전부 선택된다', async () => {
  setGallery(spacedAssets(100));
  const { user } = await renderLoadedScreen();

  await user.press(screen.getByRole('button', { name: '전체 취소' }));

  expect(counter('0 / 100')).toBeOnTheScreen();
  expect(cta()).toBeDisabled();

  await user.press(screen.getByRole('button', { name: '자동 선택' }));

  expect(counter('100 / 100')).toBeOnTheScreen();
  expect(cta()).toBeEnabled();
});

it('앨범을 바꾸면 새로 조회하고 선택이 초기화된다', async () => {
  setGallery(spacedAssets(100));
  const { user } = await renderLoadedScreen();
  await user.press(screen.getAllByRole('checkbox')[0]!);
  expect(counter('99 / 100')).toBeOnTheScreen();
  const callsBeforeSwitch = getAssetsAsync.mock.calls.length;

  await user.press(screen.getByRole('button', { name: '앨범 선택' }));
  await user.press(screen.getByRole('button', { name: '즐겨찾기' }));

  expect(getAssetsAsync.mock.calls.length).toBeGreaterThan(callsBeforeSwitch);
  expect(await screen.findByText('100 / 100')).toBeOnTheScreen();
});

it('앨범에 100개가 안 되면 CTA가 비활성화된다', async () => {
  setGallery(spacedAssets(50));

  await renderLoadedScreen();

  expect(counter('50 / 100')).toBeOnTheScreen();
  expect(cta()).toBeDisabled();
});

describe('추가 업로드', () => {
  beforeEach(() => {
    mockSearchParams = { boardId: 'board-1', mode: 'additional' };
  });

  it('사진을 개별 표시하고 한 장부터 제출할 수 있다', async () => {
    setGallery(spacedAssets(150));
    const { user } = await renderLoadedScreen();

    expect(counter('0 / 100')).toBeOnTheScreen();
    expect(cta()).toBeDisabled();

    await user.press(screen.getAllByRole('checkbox')[0]!);

    expect(counter('1 / 100')).toBeOnTheScreen();
    expect(cta()).toBeEnabled();
  });

  it('자동 선택은 최신 사진 100장을 선택한다', async () => {
    setGallery(spacedAssets(150));
    const { user } = await renderLoadedScreen();

    await user.press(screen.getByRole('button', { name: '자동 선택' }));

    expect(counter('100 / 100')).toBeOnTheScreen();
    expect(cta()).toBeEnabled();
  });

  it('스크롤 끝에 도달하면 다음 사진 페이지를 불러온다', async () => {
    setGallery(spacedAssets(250));
    await renderLoadedScreen();

    await act(async () => {
      fireEvent(screen.getByTestId('photo-grid'), 'onEndReached');
    });

    await waitFor(() =>
      expect(getAssetsAsync).toHaveBeenCalledWith({
        first: 100,
        after: '100',
        sortBy: 'creationTime',
      }),
    );
  });

  it('100장이 선택된 상태에서는 사진을 더 선택하지 않는다', async () => {
    setGallery(spacedAssets(150));
    const { result } = await renderHook(() =>
      usePhotoSelection({
        album: 'RECENT',
        minSubmitUnits: 1,
        mode: 'additional',
        targetUnits: 100,
      }),
    );
    await waitFor(() => expect(result.current.photoUnits).toHaveLength(100));

    await act(() => result.current.toggleEverything());
    await act(async () => {
      await result.current.loadMore();
    });
    await waitFor(() => expect(result.current.photoUnits).toHaveLength(150));

    await act(() => result.current.toggleUnit(result.current.photoUnits[100]!));

    expect(result.current.selectedCount).toBe(100);
    expect(result.current.photoUnits[100]).toMatchObject({ excluded: true });
  });
});
