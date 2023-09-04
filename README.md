# motion-canvas-pdf

Demo:



https://github.com/nannoda/motion-canvas-pdf/assets/114621472/cbb008b6-3945-41e0-a8a4-894f72ec1033



Usage:

See example.tsx

```typescript jsx
import {makeScene2D} from '@motion-canvas/2d';
import {Color, createRef} from '@motion-canvas/core';

import {PDF} from 'motion-canvas-pdf';
import pdfUrl from './assets/demo.pdf?url';

export default makeScene2D(function* (view) {

  const pdfRef = createRef<PDF>();

  yield view.add(
    <PDF
      ref={pdfRef}
      src={pdfUrl}
    ></PDF>
  );

  yield* pdfRef().scale([2, 2], 1);

  yield* pdfRef().position([0, 500], 1);

  yield* pdfRef().scale([1, 1], 1);

  yield* pdfRef().position([0, 0], 1);

  yield* pdfRef().background(new Color('rgba(255,255,255,0)'), 1);
  yield* pdfRef().background(new Color('rgb(0,0,0)'), 1);

  yield* pdfRef().position([0, 0], 1);
});
```
