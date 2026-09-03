import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { bridge } from '@/shared/lib/bridge';
import { useLongPress } from '@/shared/lib/use-long-press';

import { type CameraState, toWorldPoint } from './board-camera';
import {
  computeDrawingBoxPinchTransform,
  type DrawingCreateInput,
  type DrawingBoxTransform,
  hitTestTextId,
  isPointInTextBounds,
  type ParsedText,
  toTextCreateInput,
} from './board-drawing';
import { computeBringToFrontZIndex } from './board-layout';
import type { PinchSample } from './board-transform';
import { textSelectionGestureReducer, type TextSelectionGesture } from './board-text-selection';
import { angleBetween, centroid, distance, type Point } from './geometry';

type TextOverride = Partial<
  Pick<ParsedText, 'x' | 'y' | 'fontSize' | 'maxWidth' | 'rotation' | 'zIndex'>
>;

type UseTextSelectionParams = {
  isEditMode: boolean;
  cameraRef: RefObject<CameraState>;
  pointersRef: RefObject<Map<number, Point>>;
  textsRef: RefObject<ParsedText[]>;
  trashButtonRef?: RefObject<HTMLButtonElement | null>;
  hitTestSticker: (target: EventTarget | null) => HTMLElement | null;
  combinedZIndexPool: () => { id: string; zIndex: number }[];
  setSelectedStickerId: Dispatch<SetStateAction<string | null>>;
  resetDrawingSelection: () => void;
  applyTextChange: (textId: string, overrides: TextOverride) => void;
  markTextDeleted: (textId: string) => void;
  moveText: (input: DrawingCreateInput) => void;
  deleteText: (id: string) => void;
  onTextDeleteArmedChange?: (isArmed: boolean) => void;
  onTextDragOverTrashChange?: (isOver: boolean) => void;
};

// 텍스트 선택, 드래그, 핀치 변환 상태
// 텍스트는 선택 박스 자체가 실제 데이터라 내용물과 박스를 따로 변형하지 않음
export function useTextSelection({
  isEditMode,
  cameraRef,
  pointersRef,
  textsRef,
  trashButtonRef,
  hitTestSticker,
  combinedZIndexPool,
  setSelectedStickerId,
  resetDrawingSelection,
  applyTextChange,
  markTextDeleted,
  moveText,
  deleteText,
  onTextDeleteArmedChange,
  onTextDragOverTrashChange,
}: UseTextSelectionParams) {
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isTextDeleteArmed, setIsTextDeleteArmed] = useState(false);
  const [isTextOverTrash, setIsTextOverTrash] = useState(false);
  // 선택 시점의 텍스트 크기 기준
  const [selectedTextBaseSize, setSelectedTextBaseSize] = useState<{
    fontSize: number;
    maxWidth: number;
  } | null>(null);
  // 선택 박스의 확정 변환값
  const [selectedTextBoxTransform, setSelectedTextBoxTransform] =
    useState<DrawingBoxTransform | null>(null);
  // 드래그, 핀치 중 실시간 미리보기
  const [textBoxPinchPreview, setTextBoxPinchPreview] = useState<DrawingBoxTransform | null>(null);

  const textSelectionGestureRef = useRef<TextSelectionGesture | null>(null);
  const wasOverTrashRef = useRef(false);
  const selectedTextIdRef = useRef<string | null>(null);
  const selectedTextBaseSizeRef = useRef<{
    fontSize: number;
    maxWidth: number;
  } | null>(null);
  const selectedTextBoxTransformRef = useRef<DrawingBoxTransform | null>(null);
  const textBoxPinchPreviewRef = useRef<DrawingBoxTransform | null>(null);

  useEffect(() => {
    selectedTextIdRef.current = selectedTextId;
    selectedTextBaseSizeRef.current = selectedTextBaseSize;
    selectedTextBoxTransformRef.current = selectedTextBoxTransform;
  });

  useEffect(() => {
    onTextDeleteArmedChange?.(isTextDeleteArmed);
  }, [isTextDeleteArmed, onTextDeleteArmedChange]);

  useEffect(() => {
    onTextDragOverTrashChange?.(isTextOverTrash);
  }, [isTextOverTrash, onTextDragOverTrashChange]);

  useEffect(() => {
    if (isEditMode) return;
    textSelectionGestureRef.current = null;
    selectedTextBoxTransformRef.current = null;
    textBoxPinchPreviewRef.current = null;
  }, [isEditMode]);

  const resetSelection = () => {
    setSelectedTextId(null);
    setIsTextOverTrash(false);
    setIsTextDeleteArmed(false);
    setSelectedTextBaseSize(null);
    setSelectedTextBoxTransform(null);
    setTextBoxPinchPreview(null);
    selectedTextIdRef.current = null;
    selectedTextBaseSizeRef.current = null;
    selectedTextBoxTransformRef.current = null;
    textBoxPinchPreviewRef.current = null;
  };

  const setLiveTextBoxPinchPreview = (next: DrawingBoxTransform | null) => {
    textBoxPinchPreviewRef.current = next;
    setTextBoxPinchPreview(next);
  };

  const isOverTrash = (e: PointerEvent): boolean => {
    const rect = trashButtonRef?.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  };

  const textLongPress = useLongPress({
    onLongPress: (textId) => {
      bridge.send('HAPTIC', { type: 'heavy' });
      if (!isEditMode) selectText(textId);
      setIsTextDeleteArmed(true);
    },
  });

  const selectText = (textId: string) => {
    setSelectedStickerId(null);
    resetDrawingSelection();
    setSelectedTextId(textId);
    selectedTextIdRef.current = textId;
    const text = textsRef.current.find((t) => t.id === textId);
    if (text) {
      const nextTransform = { x: text.x, y: text.y, rotation: text.rotation, scale: 1 };
      const nextBaseSize = { fontSize: text.fontSize, maxWidth: text.maxWidth };
      selectedTextBaseSizeRef.current = nextBaseSize;
      setSelectedTextBaseSize(nextBaseSize);
      selectedTextBoxTransformRef.current = nextTransform;
      setSelectedTextBoxTransform(nextTransform);

      const newZIndex = computeBringToFrontZIndex(combinedZIndexPool(), textId);
      if (newZIndex !== null) {
        if (isEditMode) {
          applyTextChange(textId, { zIndex: newZIndex });
        } else {
          moveText(
            toTextCreateInput(text.id, {
              text: text.text,
              x: text.x,
              y: text.y,
              fontSize: text.fontSize,
              maxWidth: text.maxWidth,
              rotation: text.rotation,
              zIndex: newZIndex,
            }),
          );
        }
      }
    }
  };

  const onPointerDown = (e: PointerEvent, point: Point): boolean => {
    if (pointersRef.current.size === 1) {
      const worldPoint = toWorldPoint(cameraRef.current, point);

      const currentSelectedTextId = selectedTextIdRef.current;

      if (isEditMode && currentSelectedTextId) {
        const selected = textsRef.current.find((t) => t.id === currentSelectedTextId);

        if (selected && isPointInTextBounds(worldPoint, selected)) {
          textSelectionGestureRef.current = textSelectionGestureReducer(
            textSelectionGestureRef.current,
            { type: 'POINTER_DOWN', pointerId: e.pointerId, worldPoint },
          );
          wasOverTrashRef.current = false;
          textLongPress.start(point, currentSelectedTextId);
        } else {
          setSelectedTextId(null);
          setSelectedTextBaseSize(null);
          setSelectedTextBoxTransform(null);
          selectedTextIdRef.current = null;
          selectedTextBaseSizeRef.current = null;
          selectedTextBoxTransformRef.current = null;
        }
        return true;
      }

      if (!hitTestSticker(e.target)) {
        const hitTextId = hitTestTextId(worldPoint, textsRef.current);
        if (hitTextId) {
          if (isEditMode) selectText(hitTextId);
          textSelectionGestureRef.current = textSelectionGestureReducer(
            textSelectionGestureRef.current,
            { type: 'POINTER_DOWN', pointerId: e.pointerId, worldPoint },
          );
          wasOverTrashRef.current = false;
          textLongPress.start(point, hitTextId);
          return true;
        }
      }
      return false;
    }

    if (pointersRef.current.size === 2 && selectedTextIdRef.current) {
      textLongPress.cancel();
      const points = [...pointersRef.current.values()];
      setIsTextOverTrash(false);
      wasOverTrashRef.current = false;

      const baseBoxTransform = selectedTextBoxTransformRef.current;
      textSelectionGestureRef.current = baseBoxTransform
        ? textSelectionGestureReducer(textSelectionGestureRef.current, {
            type: 'MULTI_TOUCH',
            points: [points[0]!, points[1]!],
            camera: cameraRef.current,
            baseBoxTransform,
          })
        : null;
      return true;
    }

    return false;
  };

  const onPointerMove = (e: PointerEvent, point: Point): boolean => {
    if (pointersRef.current.size >= 2) {
      textLongPress.cancel();
      const gesture = textSelectionGestureRef.current;

      if (gesture?.kind === 'dragging') {
        textSelectionGestureRef.current = null;
        setIsTextOverTrash(false);
        wasOverTrashRef.current = false;
        return false;
      }

      if (gesture?.kind === 'pinching') {
        const points = [...pointersRef.current.values()];
        const { baseBoxTransform, startSample } = gesture;
        const current: PinchSample = {
          centroid: toWorldPoint(cameraRef.current, centroid(points)),
          distance: distance(points[0]!, points[1]!),
          angle: angleBetween(points[0]!, points[1]!),
        };
        setLiveTextBoxPinchPreview(
          computeDrawingBoxPinchTransform(baseBoxTransform, startSample, current),
        );
        return true;
      }
      return false;
    }

    if (selectedTextIdRef.current) {
      const gesture = textSelectionGestureRef.current;
      if (gesture?.kind !== 'dragging' || gesture.pointerId !== e.pointerId) return true;
      textLongPress.move(point);
      const worldPoint = toWorldPoint(cameraRef.current, point);
      const base = selectedTextBoxTransformRef.current;
      if (base) {
        setLiveTextBoxPinchPreview({
          ...base,
          x: base.x + (worldPoint.x - gesture.startWorldPoint.x),
          y: base.y + (worldPoint.y - gesture.startWorldPoint.y),
        });
      }
      const overTrash = isOverTrash(e);
      if (overTrash && !wasOverTrashRef.current) {
        bridge.send('HAPTIC', { type: 'medium' });
      }
      wasOverTrashRef.current = overTrash;
      setIsTextOverTrash(overTrash);
      return true;
    }

    textLongPress.move(point);
    return false;
  };

  const onPointerUp = (e: PointerEvent): boolean => {
    textLongPress.cancel();

    const currentSelectedTextId = selectedTextIdRef.current;
    if (!currentSelectedTextId) return false;

    const gesture = textSelectionGestureRef.current;

    if (gesture?.kind === 'pinching' && pointersRef.current.size === 1) {
      const [remainingPointerId, remainingPoint] = [...pointersRef.current][0]!;
      const boxPinchPreview = textBoxPinchPreviewRef.current;
      if (boxPinchPreview) {
        selectedTextBoxTransformRef.current = boxPinchPreview;
        setSelectedTextBoxTransform(boxPinchPreview);
        setLiveTextBoxPinchPreview(null);
      }
      textSelectionGestureRef.current = textSelectionGestureReducer(gesture, {
        type: 'POINTER_UP_TO_ONE',
        remainingPointerId,
        remainingWorldPoint: toWorldPoint(cameraRef.current, remainingPoint),
      });
      return true;
    }

    const dragStart = gesture?.kind === 'dragging' ? gesture : null;
    const boxPinchPreview = textBoxPinchPreviewRef.current;
    textSelectionGestureRef.current = textSelectionGestureReducer(gesture, {
      type: 'POINTER_UP_TO_ZERO',
    });
    setIsTextOverTrash(false);
    wasOverTrashRef.current = false;
    setIsTextDeleteArmed(false);
    setLiveTextBoxPinchPreview(null);

    if (dragStart && dragStart.pointerId === e.pointerId && isOverTrash(e)) {
      if (isEditMode) {
        markTextDeleted(currentSelectedTextId);
      } else {
        deleteText(currentSelectedTextId);
      }
      setSelectedTextId(null);
      setSelectedTextBaseSize(null);
      setSelectedTextBoxTransform(null);
      selectedTextIdRef.current = null;
      selectedTextBaseSizeRef.current = null;
      selectedTextBoxTransformRef.current = null;
      return true;
    }

    const finalBoxTransform = boxPinchPreview ?? selectedTextBoxTransformRef.current;
    const currentBaseSize = selectedTextBaseSizeRef.current;
    if (finalBoxTransform && currentBaseSize) {
      const nextText = textsRef.current.find((text) => text.id === currentSelectedTextId);
      const nextValues = {
        x: finalBoxTransform.x,
        y: finalBoxTransform.y,
        rotation: finalBoxTransform.rotation,
        fontSize: currentBaseSize.fontSize * finalBoxTransform.scale,
        maxWidth: currentBaseSize.maxWidth * finalBoxTransform.scale,
      };
      if (isEditMode || !nextText) {
        applyTextChange(currentSelectedTextId, nextValues);
      } else {
        moveText(
          toTextCreateInput(nextText.id, {
            text: nextText.text,
            ...nextValues,
            zIndex: nextText.zIndex,
          }),
        );
      }
      const normalizedBaseSize = {
        fontSize: nextValues.fontSize,
        maxWidth: nextValues.maxWidth,
      };
      const normalizedTransform = {
        x: nextValues.x,
        y: nextValues.y,
        rotation: nextValues.rotation,
        scale: 1,
      };
      selectedTextBaseSizeRef.current = normalizedBaseSize;
      selectedTextBoxTransformRef.current = normalizedTransform;
      setSelectedTextBaseSize(normalizedBaseSize);
      setSelectedTextBoxTransform(normalizedTransform);
    }

    if (!isEditMode) {
      setSelectedTextId(null);
      setSelectedTextBaseSize(null);
      setSelectedTextBoxTransform(null);
      selectedTextIdRef.current = null;
      selectedTextBaseSizeRef.current = null;
      selectedTextBoxTransformRef.current = null;
    }
    return true;
  };

  return {
    selectedTextId,
    selectedTextBaseSize,
    selectedTextBoxTransform,
    textBoxPinchPreview,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetSelection,
    cancelLongPress: textLongPress.cancel,
  };
}
