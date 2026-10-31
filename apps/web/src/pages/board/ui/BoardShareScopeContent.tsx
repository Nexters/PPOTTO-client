import { Check, ChevronLeft } from '@ppotto/assets';

import {
  BOARD_SHARE_SCOPES,
  boardShareScopeLabels,
  type BoardShareScope,
} from '../model/board-share-scope';

type BoardShareScopeContentProps = {
  scope: BoardShareScope;
  onBack: () => void;
  onSelect: (scope: BoardShareScope) => void;
};

export function BoardShareScopeContent({ scope, onBack, onSelect }: BoardShareScopeContentProps) {
  return (
    <>
      <div className="flex w-full items-center gap-2">
        <button type="button" aria-label="뒤로가기" onClick={onBack}>
          <ChevronLeft color="white" />
        </button>
        <span className="text-body-01 text-white">공유 설정</span>
      </div>
      {BOARD_SHARE_SCOPES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === scope}
          className="flex w-full items-center justify-between"
          onClick={() => onSelect(option)}
        >
          <span className="text-body-04 font-medium text-white">
            {boardShareScopeLabels[option]}
          </span>
          <Check color={option === scope ? 'white' : '#484848'} />
        </button>
      ))}
    </>
  );
}
