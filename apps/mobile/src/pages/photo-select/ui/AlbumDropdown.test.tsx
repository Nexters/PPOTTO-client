import { render, screen, userEvent } from '@testing-library/react-native';

import { AlbumDropdown, type AlbumKey } from './AlbumDropdown';

/**
 * 동작 범위 (2026-07-30 인터뷰)
 *
 * 앨범은 최근 항목·즐겨찾기·스크린샷 3개 고정이다. 동적 앨범 목록이 아니다.
 * 이 컴포넌트는 열림/닫힘만 자기 상태로 갖고, 앨범 선택은 콜백으로 위임한다.
 * 전환에 따른 재조회·초기화는 PhotoSelectScreen 책임이다.
 *
 * [팀확인] 즐겨찾기·스크린샷 스마트 앨범의 expo-media-library 플랫폼별 지원 — 구현 단계 실기기 확인
 */

/** 열린 상태가 전제인 테스트가 많다. 트리거를 누르는 준비만 담고 selected는 호출부에 남긴다. */
async function renderOpened(selected: AlbumKey = 'RECENT') {
  const user = userEvent.setup();
  const onSelect = jest.fn();

  await render(<AlbumDropdown selected={selected} onSelect={onSelect} />);
  await user.press(screen.getByRole('button', { name: '앨범 선택' }));

  return { user, onSelect };
}

it('닫힌 상태에서는 현재 선택된 앨범 이름만 보인다', async () => {
  await render(<AlbumDropdown selected="RECENT" onSelect={jest.fn()} />);

  expect(screen.getByText('최근 항목')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '즐겨찾기' })).toBeNull();
  expect(screen.queryByRole('button', { name: '스크린샷' })).toBeNull();
});

it('누르면 최근 항목·즐겨찾기·스크린샷 3개 항목이 열린다', async () => {
  await renderOpened();

  expect(screen.getByRole('button', { name: '최근 항목' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '즐겨찾기' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '스크린샷' })).toBeOnTheScreen();
});

it('열리면 트리거가 열림 상태로 표시된다', async () => {
  await render(<AlbumDropdown selected="RECENT" onSelect={jest.fn()} />);
  const trigger = screen.getByRole('button', { name: '앨범 선택' });
  expect(trigger).not.toBeExpanded();

  await userEvent.setup().press(trigger);

  expect(trigger).toBeExpanded();
});

it('현재 선택된 앨범 항목만 선택 상태로 표시한다', async () => {
  await renderOpened('FAVORITES');

  expect(screen.getByRole('button', { name: '즐겨찾기' })).toBeSelected();
  expect(screen.getByRole('button', { name: '최근 항목' })).not.toBeSelected();
  expect(screen.getByRole('button', { name: '스크린샷' })).not.toBeSelected();
});

it('항목을 고르면 선택된 앨범을 콜백으로 전달한다', async () => {
  const { user, onSelect } = await renderOpened('RECENT');

  await user.press(screen.getByRole('button', { name: '스크린샷' }));

  expect(onSelect).toHaveBeenCalledWith('SCREENSHOTS');
});

it('항목을 고르면 목록이 닫힌다', async () => {
  const { user } = await renderOpened('RECENT');

  await user.press(screen.getByRole('button', { name: '즐겨찾기' }));

  expect(screen.queryByRole('button', { name: '즐겨찾기' })).toBeNull();
});

it('열린 상태에서 트리거를 다시 누르면 닫힌다', async () => {
  const { user } = await renderOpened();

  await user.press(screen.getByRole('button', { name: '앨범 선택' }));

  expect(screen.queryByRole('button', { name: '즐겨찾기' })).toBeNull();
});

it('목록 바깥을 누르면 닫힌다', async () => {
  const { user } = await renderOpened();

  await user.press(screen.getByRole('button', { name: '목록 닫기' }));

  expect(screen.queryByRole('button', { name: '즐겨찾기' })).toBeNull();
});
