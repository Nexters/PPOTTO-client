import { toPathData } from '../model/board-drawing';
import type { Point } from '../model/geometry';

type DrawingStrokeProps = {
  points: Point[];
  color: string;
  strokeWidth: number;
};

// 점이 하나뿐인 stroke는 <path>가 moveto만 갖게 되어 브라우저에 따라 렌더가 안 될 수 있어 원으로 그린다
export function DrawingStroke({ points, color, strokeWidth }: DrawingStrokeProps) {
  if (points.length === 0) return null;

  if (points.length === 1) {
    return <circle cx={points[0]!.x} cy={points[0]!.y} r={strokeWidth / 2} fill={color} />;
  }

  return (
    <path
      d={toPathData(points)}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
