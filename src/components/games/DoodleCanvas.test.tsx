import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoodleCanvas } from './DoodleCanvas';

describe('DoodleCanvas interrupted drawing', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({clearRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn()} as unknown as CanvasRenderingContext2D);
    window.PointerEvent = MouseEvent as typeof PointerEvent;
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it.each(['pointerCancel','lostPointerCapture'] as const)('sends visible strokes when %s interrupts a gesture', event => {
    const onChange=vi.fn();
    render(<DoodleCanvas disabled={false} onChange={onChange}/>);
    const canvas=screen.getByLabelText('Doodle drawing canvas');
    vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:512,height:512} as DOMRect);
    fireEvent.pointerDown(canvas,{clientX:100,clientY:100});
    fireEvent.pointerMove(canvas,{clientX:200,clientY:200});
    fireEvent[event](canvas);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0][0].points).toEqual([[100/512,100/512],[200/512,200/512]]);
    fireEvent.pointerUp(canvas);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});