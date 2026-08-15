import { act, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { AppLaunchScreen } from './AppLaunchScreen';

it('앱 진입 화면을 한 번 재생한 뒤 제거한다', async () => {
  const start = jest.fn();
  const animation = {
    start,
    stop: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof Animated.sequence>;
  jest.spyOn(Animated, 'sequence').mockReturnValue(animation);

  await render(<AppLaunchScreen />);

  expect(screen.getByLabelText('앱 시작 화면')).toBeOnTheScreen();
  expect(screen.getByLabelText('PPOTTO')).toHaveProp('width', 260.571);
  expect(screen.getByLabelText('PPOTTO')).toHaveProp('height', 80);
  await act(async () => start.mock.calls[0]?.[0]?.({ finished: true }));
  expect(screen.queryByLabelText('앱 시작 화면')).not.toBeOnTheScreen();
});
