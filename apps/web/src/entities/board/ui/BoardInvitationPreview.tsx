import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

type BoardInvitationPreviewProps = {
  boardName: string;
  previewImageUrl?: string | null;
  priority?: boolean;
};

export function BoardInvitationPreview({
  boardName,
  previewImageUrl,
  priority = false,
}: BoardInvitationPreviewProps) {
  return (
    <div
      className={cn(
        'relative aspect-39/34 w-full overflow-hidden rounded-16',
        'border border-gray-900',
      )}
    >
      <Image
        src={previewImageUrl ?? '/invitations/default-preview.png'}
        alt={previewImageUrl ? `${boardName} 보드 미리보기` : 'PPOTTO 기본 미리보기'}
        fill
        priority={priority}
        sizes="(max-width: 360px) calc(100vw - 48px), 312px"
        className="object-cover"
      />
    </div>
  );
}
