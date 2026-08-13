import { isQaReportInputComplete } from './qa-report';

it('제목·현재 동작·기대 동작이 모두 있어야 작성 완료할 수 있다', () => {
  expect(
    isQaReportInputComplete({
      title: '스티커 위치가 튐',
      category: '기능',
      currentBehavior: '핀치 후 위치가 바뀐다',
      expectedBehavior: '손을 놓은 위치에 유지된다',
    }),
  ).toBe(true);

  expect(
    isQaReportInputComplete({
      title: '스티커 위치가 튐',
      category: '기능',
      currentBehavior: '   ',
      expectedBehavior: '손을 놓은 위치에 유지된다',
    }),
  ).toBe(false);
});
