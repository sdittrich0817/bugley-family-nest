import { describe, expect, it } from 'vitest';
import { imageFileType, MAX_IMAGE_BYTES, allowedImageContentType } from './image-file';
describe('generated image files',()=>{
  it('rejects text or an empty file masquerading as an image',()=>{expect(imageFileType(new TextEncoder().encode('<html>not an image</html>'))).toBeNull();expect(imageFileType(new Uint8Array())).toBeNull();});
  it('identifies a PNG signature',()=>{expect(imageFileType(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]))).toBe('image/png');});
  it('limits buffered image output to 20 MiB',()=>{expect(MAX_IMAGE_BYTES).toBe(20971520);});
  it('allows binary transport headers but rejects HTML and SVG',()=>{expect(allowedImageContentType('application/octet-stream')).toBe(true);expect(allowedImageContentType('text/html')).toBe(false);expect(allowedImageContentType('image/svg+xml')).toBe(false);});
});