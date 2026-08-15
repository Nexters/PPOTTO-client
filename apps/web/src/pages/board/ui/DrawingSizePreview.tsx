type DrawingSizePreviewProps = {
  strokeWidth: number;
};

export function DrawingSizePreview({ strokeWidth }: DrawingSizePreviewProps) {
  return (
    <div
      className="rounded-full bg-white shadow-[0px_0px_16px_0px_rgba(0,0,0,0.5)]"
      style={{ width: strokeWidth, height: strokeWidth }}
    />
  );
}
