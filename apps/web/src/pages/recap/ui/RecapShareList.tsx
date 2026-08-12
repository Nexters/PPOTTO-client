import { Download, Filter, Instagram, Kakaotalk, X } from '@ppotto/assets';

type RecapShareListProps = {
  onOptionsClick: () => void;
};

export function RecapShareList({ onOptionsClick }: RecapShareListProps) {
  const shareItems = [
    { label: '카카오톡', Icon: Kakaotalk, onClick: () => {} },
    { label: '인스타그램', Icon: Instagram, onClick: () => {} },
    { label: 'X', Icon: X, onClick: () => {} },
    { label: '이미지 저장하기', Icon: Download, onClick: () => {} },
  ];

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <span className="text-body-01 text-white">공유하기</span>
        <button type="button" onClick={onOptionsClick}>
          <Filter />
        </button>
      </div>
      <div className="flex w-full flex-col gap-4">
        {shareItems.map(({ label, Icon, onClick }) => (
          <button
            key={label}
            type="button"
            className="flex items-center gap-2 text-white"
            onClick={onClick}
          >
            <Icon />
            <span className="text-body-04 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
