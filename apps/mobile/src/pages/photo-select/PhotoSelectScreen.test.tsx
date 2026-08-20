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
import { groupPhotos } from '@/features/photo-selection/model/photo-group';
import { dragIntentAt, dragRangeDelta } from '@/features/photo-selection/ui/PhotoGrid';

import { PhotoSelectScreen } from './PhotoSelectScreen';

let mockSearchParams: { boardId: string; mode?: string } = { boardId: 'board-1' };
const mockImageResize = jest.fn();
const mockImageSave = jest.fn();
const mockFetchLocalPhotoGroupPage = jest.fn();
const mockFilterLocalAssetIds = jest.fn(async (ids: string[]) => ids);
let mockImageSaveGate: Promise<void> | undefined;

/**
 * 동작 범위 (2026-07-30 인터뷰, 2026-08-15 통일)
 *
 * 첫 업로드·이후 업로드 모두 로컬 사진 100그룹까지 먼저 불러오고 이후 스크롤에서 덧붙인다.
 * 유일한 모드 차이는 초기 상태 — 첫 업로드는 최신 100그룹 자동선택, 이후 업로드는 전부 미선택.
 * 타일 누름은 대상에 따라 다르게 동작한다 — 1장 그룹은 제외, 여러 장 그룹은 다음 사진으로 승계.
 * 선택은 제출 상한(100)까지만 가능하고, 90(추가 업로드는 20) 미만이면 CTA만 비활성화한다.
 *
 * 대역은 expo-media-library·expo-router·expo-image-manipulator 경계뿐이다. groupPhotos·
 * AlbumDropdown·PhotoTile은 실제로 돌린다.
 *
 * 검증 지점 이동 — 아래는 여기서 다시 보지 않는다.
 *   그룹화·대표 선정·승계·소진·복구 규칙       → photo-group.test.ts
 *   드롭다운 열림·닫힘·선택 콜백              → AlbumDropdown.test.tsx
 *   제외된 타일의 체크 해제 표시               → 아래 2번이 간접 검증
 *   카운터 경고 색상, chevron 방향             → 스타일이라 시안 대조 항목
 *
 * 제외: 진입 시 갤러리 전체에 100그룹 미만 → 생성 불가 안내 화면 — 별도 작업, Unable 시안 없음
 * CTA는 업로드 서비스 시작과 로딩 화면 이동만 검증하고 업로드 내부 동작은 feature 테스트가 담당
 * 제외: 로딩 중 타일 표현 — 시안의 회색 타일은 샘플 필러이지 플레이스홀더가 아님
 *
 */

jest.mock('expo-media-library', () => ({
  getAssetsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    accessPrivileges: 'all',
    canAskAgain: true,
    granted: true,
    status: 'granted',
  })),
  presentPermissionsPickerAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  SortBy: { creationTime: 'creationTime' },
}));
jest.mock('../../../modules/local-photo-library', () => ({
  fetchLocalPhotoGroupPage: (options: unknown) => mockFetchLocalPhotoGroupPage(options),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'job-1') }));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useFrameCallback: jest.fn(),
}));
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => mockSearchParams),
}));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn((uri: string) => {
      const context = {
        renderAsync: jest.fn(async () => ({
          saveAsync: jest.fn(async (options) => {
            mockImageSave(options);
            await mockImageSaveGate;
            return {
              uri: uri.replace('file:///', 'file:///compressed/'),
              width: 512,
              height: 341,
            };
          }),
          release: jest.fn(),
        })),
        release: jest.fn(),
      };
      return {
        ...context,
        resize: jest.fn((target) => {
          mockImageResize(target);
          return context;
        }),
      };
    }),
  },
  SaveFormat: { JPEG: 'jpeg', WEBP: 'webp' },
}));
jest.mock('@/features/photo-upload', () => ({
  MAX_MOTION_PHOTOS: 25,
  photoUploadService: { start: jest.fn() },
  sampleMotionPhotos: <T,>(photos: T[]) => photos.slice(0, 25),
}));
jest.mock('@/entities/user/api/user-queries', () => ({
  useMeQuery: () => ({ data: { name: '뽀또' } }),
}));

const { getAssetsAsync, getPermissionsAsync } = jest.requireMock('expo-media-library') as {
  getAssetsAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
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
  mockFetchLocalPhotoGroupPage.mockImplementation(async ({ first, after }) => {
    const start = after ? Number(after) : 0;
    const remaining = assets.slice(start);
    const localIds = new Set(await mockFilterLocalAssetIds(remaining.map((photo) => photo.id)));
    const groups = groupPhotos(remaining.filter((photo) => localIds.has(photo.id)));
    const pageGroups = groups.slice(0, first);
    const nextAnchor = groups[first]?.photos.at(-1);
    const nextOffset = nextAnchor
      ? start + remaining.findIndex((photo) => photo.id === nextAnchor.id)
      : assets.length;

    return {
      assets: pageGroups.flatMap((group) => group.photos),
      endCursor: String(nextOffset),
      hasNextPage: nextAnchor !== undefined,
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
  await waitFor(() =>
    expect(screen.getByTestId('photo-grid').props.accessibilityState).toEqual({ busy: false }),
  );

  return { user };
}

const counter = (text: string) => screen.getByText(text);
const cta = () => screen.getByRole('button', { name: /보드 만들기|선택해 주세요/ });
const gridData = () => screen.getByTestId('photo-grid').props.data as { skeleton?: boolean }[];
const gridPhotoCount = () => gridData().filter((item) => !item.skeleton).length;
const gridSkeletonCount = () => gridData().filter((item) => item.skeleton).length;

beforeEach(() => {
  mockSearchParams = { boardId: 'board-1' };
  mockImageSaveGate = undefined;
  jest.clearAllMocks();
  mockFilterLocalAssetIds.mockImplementation(async (ids) => ids);
  mockFetchLocalPhotoGroupPage.mockResolvedValue({
    assets: [],
    endCursor: '0',
    hasNextPage: false,
  });
});

it('드래그가 원점으로 돌아오면 범위에서 빠진 타일을 복원한다', () => {
  expect(dragRangeDelta(10, 20, 10)).toEqual({ entered: [], exited: [[11, 20]] });
});

it('8pt를 넘긴 최초 우세 방향으로 드래그 동작을 고정한다', () => {
  expect(dragIntentAt(7, 0)).toBe('pending');
  expect(dragIntentAt(9, 4)).toBe('select');
  expect(dragIntentAt(4, 9)).toBe('scroll');
  expect(dragIntentAt(9, 9)).toBe('scroll');
});

it('진입 시 불러온 그룹을 전체 선택 상태로 표시하고 카운터를 보여준다', async () => {
  setGallery(spacedAssets(100));

  await renderLoadedScreen();

  expect(screen.getByText('뽀또님의 최근 사진 100장을 골랐어요')).toBeOnTheScreen();
  expect(counter('100 / 100')).toBeOnTheScreen();
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
});

it('iCloud에만 있는 사진은 그리드에서 제외한다', async () => {
  setGallery([asset('local', BASE_TIME), asset('cloud', BASE_TIME - minutes(10))]);
  mockFilterLocalAssetIds.mockImplementation(async (ids: string[]) =>
    ids.filter((id) => id !== 'cloud'),
  );

  await renderLoadedScreen();

  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect(mockFilterLocalAssetIds).toHaveBeenCalledWith(['local', 'cloud']);
});

it('사용할 수 있는 로컬 사진이 없으면 빈 상태를 안내한다', async () => {
  setGallery([]);

  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <PhotoSelectScreen />
    </SafeAreaProvider>,
  );

  expect(await screen.findByText('사용할 수 있는 사진이 없어요')).toBeOnTheScreen();
  expect(screen.getByText(/사진 앱에서 사진을 기기에 저장한 후/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '자동 선택' })).not.toBeOnTheScreen();
});

it('24그룹 전에는 전체 스켈레톤을, 이후 로딩 중에는 하단 스켈레톤을 유지한다', async () => {
  let releaseFirstPage!: () => void;
  let releaseSecondPage!: () => void;
  const firstPageGate = new Promise<void>((resolve) => {
    releaseFirstPage = resolve;
  });
  const secondPageGate = new Promise<void>((resolve) => {
    releaseSecondPage = resolve;
  });
  setGallery(spacedAssets(100));
  const fetchPage = mockFetchLocalPhotoGroupPage.getMockImplementation()!;
  let pageCount = 0;
  mockFetchLocalPhotoGroupPage.mockImplementation(async (options) => {
    pageCount += 1;
    if (pageCount === 1) await firstPageGate;
    if (pageCount === 2) await secondPageGate;
    return fetchPage(options);
  });

  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <PhotoSelectScreen />
    </SafeAreaProvider>,
  );

  expect(screen.getByTestId('photo-grid-skeleton')).toBeOnTheScreen();
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(mockImageSave).not.toHaveBeenCalled();
  releaseFirstPage();
  await waitFor(() => expect(gridPhotoCount()).toBe(24));
  expect(gridSkeletonCount()).toBe(40);
  releaseSecondPage();
  await waitFor(() => expect(gridPhotoCount()).toBe(100));
});

it('첫 페이지의 로컬 사진이 부족하면 100그룹이 될 때까지 다음 페이지를 조회한다', async () => {
  setGallery(spacedAssets(180));
  mockFilterLocalAssetIds.mockImplementation(async (ids: string[]) =>
    ids.filter((id) => {
      const index = Number(id.slice(1));
      return index >= 120 || index % 2 === 0;
    }),
  );

  await renderLoadedScreen();

  expect(await screen.findByText('100 / 100')).toBeOnTheScreen();
  expect(mockFetchLocalPhotoGroupPage).toHaveBeenCalledTimes(3);
});

it('사진 권한을 거부하면 설정 이동 안내를 표시하고 갤러리를 조회하지 않는다', async () => {
  getPermissionsAsync.mockResolvedValueOnce({
    accessPrivileges: 'none',
    canAskAgain: false,
    granted: false,
    status: 'denied',
  });

  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <PhotoSelectScreen />
    </SafeAreaProvider>,
  );

  expect(await screen.findByText('사진 접근 권한이 필요해요')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '설정으로 이동' })).toBeOnTheScreen();
  expect(mockFetchLocalPhotoGroupPage).not.toHaveBeenCalled();
});

it('첫 사진 권한 요청은 계속 버튼으로 안내한다', async () => {
  getPermissionsAsync.mockResolvedValueOnce({
    accessPrivileges: 'none',
    canAskAgain: true,
    granted: false,
    status: 'undetermined',
  });

  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <PhotoSelectScreen />
    </SafeAreaProvider>,
  );

  expect(await screen.findByRole('button', { name: '계속' })).toBeOnTheScreen();
  expect(screen.queryByText('사진 접근 허용하기')).not.toBeOnTheScreen();
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
  setGallery(spacedAssets(100).map((photo) => ({ ...photo, width: 1200, height: 800 })));
  const { user } = await renderLoadedScreen();

  await waitFor(() => expect(mockImageSave).toHaveBeenCalledTimes(25));
  expect(mockImageResize).toHaveBeenCalledWith({ width: 768, height: 512 });
  expect(mockImageSave.mock.calls.every(([options]) => options.format === 'jpeg')).toBe(true);

  await user.press(cta());

  await waitFor(() => expect(photoUploadService.start).toHaveBeenCalledTimes(1));
  const startOptions = photoUploadService.start.mock.calls[0]![0];
  expect(startOptions.photoCount).toBe(100);
  await expect(startOptions.motionPhotos).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ contentType: 'image/jpeg', uri: expect.stringMatching(/^data:/) }),
    ]),
  );

  const uploadJob = await startOptions.prepareJob();
  expect(uploadJob.groups).toHaveLength(100);
  expect(mockImageSave.mock.calls.slice(25).every(([options]) => options.format === 'jpeg')).toBe(
    true,
  );
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/analysis-loading',
    params: { boardId: 'board-1' },
  });
});

it('캐시된 대표사진을 해제하면 선택된 미캐시 대표사진 하나만 준비한다', async () => {
  setGallery(spacedAssets(100).map((photo) => ({ ...photo, width: 1200, height: 800 })));
  const { user } = await renderLoadedScreen();
  await waitFor(() => expect(mockImageSave).toHaveBeenCalledTimes(25));

  await user.press(screen.getAllByRole('checkbox')[0]!);

  await waitFor(() => expect(mockImageSave).toHaveBeenCalledTimes(26));
});

it('선처리가 진행 중이어도 CTA는 즉시 로딩 화면으로 이동한다', async () => {
  let releaseImageSaves!: () => void;
  mockImageSaveGate = new Promise((resolve) => {
    releaseImageSaves = resolve;
  });
  setGallery(spacedAssets(100).map((photo) => ({ ...photo, width: 1200, height: 800 })));
  const { user } = await renderLoadedScreen();
  await waitFor(() => expect(mockImageSave).toHaveBeenCalledTimes(2));

  await user.press(cta());

  expect(photoUploadService.start).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/analysis-loading',
    params: { boardId: 'board-1' },
  });

  releaseImageSaves();
  await expect(photoUploadService.start.mock.calls[0]![0].motionPhotos).resolves.toHaveLength(25);
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

// 앨범 드롭다운 임시 숨김(기능 미구현) — UI 복구 시 skip 해제
it.skip('앨범을 바꾸면 새로 조회하고 선택이 초기화된다', async () => {
  setGallery(spacedAssets(100));
  const { user } = await renderLoadedScreen();
  await user.press(screen.getAllByRole('checkbox')[0]!);
  expect(counter('99 / 100')).toBeOnTheScreen();
  const callsBeforeSwitch = mockFetchLocalPhotoGroupPage.mock.calls.length;

  await user.press(screen.getByRole('button', { name: '앨범 선택' }));
  await user.press(screen.getByRole('button', { name: '즐겨찾기' }));

  expect(mockFetchLocalPhotoGroupPage.mock.calls.length).toBeGreaterThan(callsBeforeSwitch);
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

  it('사진을 개별 표시하고 20장부터 제출할 수 있다', async () => {
    // 20번의 순차 press가 있는 테스트라 타일 수가 곧 실행 시간 — 계약(최소 20장)에 필요한 만큼만 깐다
    setGallery(spacedAssets(30));
    const { user } = await renderLoadedScreen();

    expect(screen.getByText('추억할 사진을 최소 20장 선택해주세요')).toBeOnTheScreen();
    expect(screen.getByText('비슷한 시간대의 사진은 한 묶음으로 인식돼요')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '이 사진으로 보드 만들기 0/100' })).toBeOnTheScreen();
    expect(counter('0/100')).toBeOnTheScreen();
    expect(cta()).toBeDisabled();

    await user.press(screen.getAllByRole('checkbox')[0]!);

    expect(counter('1/100')).toBeOnTheScreen();
    expect(cta()).toBeDisabled();

    for (let index = 1; index < 20; index += 1) {
      await user.press(screen.getAllByRole('checkbox')[index]!);
    }

    expect(counter('20/100')).toBeOnTheScreen();
    expect(cta()).toBeEnabled();
    // userEvent.press는 press당 ~130ms를 소모해 20번 누르면 기본 5초를 넘길 수 있다
  }, 15_000);

  it('자동 선택은 최신 사진 20장을 선택한다', async () => {
    setGallery(spacedAssets(150));
    const { user } = await renderLoadedScreen();

    await user.press(screen.getByRole('button', { name: '자동 선택' }));

    expect(counter('20/100')).toBeOnTheScreen();
    expect(cta()).toBeEnabled();
  });

  it('다음 페이지가 있으면 스켈레톤 40칸을 유지하며 사진 40그룹을 덧붙인다', async () => {
    setGallery(spacedAssets(350));
    await renderLoadedScreen();
    expect(gridSkeletonCount()).toBe(40);
    let releaseNextPage!: () => void;
    const nextPageGate = new Promise<void>((resolve) => {
      releaseNextPage = resolve;
    });
    const fetchPage = mockFetchLocalPhotoGroupPage.getMockImplementation()!;
    mockFetchLocalPhotoGroupPage.mockImplementationOnce(async (options) => {
      await nextPageGate;
      return fetchPage(options);
    });

    await act(async () => {
      fireEvent(screen.getByTestId('photo-grid'), 'onEndReached');
    });

    expect(gridSkeletonCount()).toBe(40);
    expect(gridPhotoCount()).toBe(100);
    expect(mockFetchLocalPhotoGroupPage).toHaveBeenCalledWith({
      first: 40,
      after: '100',
      album: 'RECENT',
    });

    releaseNextPage();
    await waitFor(() => {
      expect(gridSkeletonCount()).toBe(40);
      expect(gridPhotoCount()).toBe(140);
    });
  });

  it('연속 사진은 추가 업로드에서도 그룹으로 묶인다', async () => {
    const burst = [
      asset('b0', BASE_TIME),
      asset('b1', BASE_TIME - minutes(1)),
      asset('b2', BASE_TIME - minutes(2)),
    ];
    setGallery([...burst, ...spacedAssets(29, 10)]);

    const { user } = await renderLoadedScreen();

    // 분석 단위는 30개(그룹 1 + 단일 29)다. 배지는 남은 장수라 선택해야 보인다
    expect(screen.getAllByRole('checkbox')).toHaveLength(30);
    await user.press(screen.getAllByRole('checkbox')[0]!);
    expect(screen.getByText('3')).toBeOnTheScreen();
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
    await act(async () => result.current.loadMore());
    expect(result.current.photoUnits).toHaveLength(140);

    await act(() => result.current.toggleEverything());
    expect(result.current.selectedCount).toBe(100);

    await act(() => result.current.toggleUnit(result.current.photoUnits[100]!));

    expect(result.current.selectedCount).toBe(100);
    expect(result.current.photoUnits[100]).toMatchObject({ excluded: true });
  });

  it('드래그 선택 변경을 묶어서 적용하고 선택 상한을 지킨다', async () => {
    setGallery(spacedAssets(5));
    const { result } = await renderHook(() =>
      usePhotoSelection({
        album: 'RECENT',
        minSubmitUnits: 1,
        mode: 'additional',
        targetUnits: 2,
      }),
    );
    await waitFor(() => expect(result.current.photoUnits).toHaveLength(2));
    await act(async () => result.current.loadMore());
    expect(result.current.photoUnits).toHaveLength(5);
    const groupIds = result.current.photoUnits.slice(0, 3).map((unit) => unit.groupId);

    await act(() =>
      result.current.setGroupExcludedCounts(
        groupIds.map((groupId) => ({ groupId, excludedCount: 0 })),
      ),
    );
    expect(result.current.selectedCount).toBe(2);

    await act(() =>
      result.current.setGroupExcludedCounts(
        groupIds.map((groupId) => ({ groupId, excludedCount: 1 })),
      ),
    );
    expect(result.current.selectedCount).toBe(0);
  });
});
