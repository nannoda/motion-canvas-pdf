import {Img} from '@motion-canvas/2d';
import * as pdfLib from 'pdfjs-dist';
import {ImgProps} from '@motion-canvas/2d/lib/components';
import {DependencyContext, SignalValue, SimpleSignal} from '@motion-canvas/core/lib/signals';
import {computed, initial, signal} from '@motion-canvas/2d/src/decorators';
import {viaProxy} from '@motion-canvas/core/lib/utils';
import {PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist/types/src/display/api';

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {Color, ColorSignal, PossibleColor} from '@motion-canvas/core';

// set the worker url
pdfLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfViewProps extends ImgProps {
  pageNumber?: SignalValue<number>;
  background?: SignalValue<PossibleColor>;
}

type PageNumber = number
type ZoomLevel = number


type PdfPool = Record<string, PDFDocumentProxy>
type PagePool = Record<string, Record<PageNumber, PDFPageProxy>>
type ImagePool = Record<string, Record<PageNumber, Record<ZoomLevel, Record<string, HTMLImageElement>>>>

/**
 * A node for displaying PDF.
 */
export class PDF extends Img {
  /**
   * The current page number of the PDF.
   */
  @initial(1)
  @signal()
  public declare currentPageNumber: SimpleSignal<number, this>;

  /**
   * The background color of the PDF.
   */
  @initial(new Color('white'))
  @signal()
  public declare background:SimpleSignal<Color, this>;

  protected static pdfPool: PdfPool = {};
  protected static pagePool: PagePool = {};
  protected static imagePool: ImagePool = {};

  static {
    if (import.meta.hot) {
      import.meta.hot.on('motion-canvas:assets', ({urls}) => {
        for (const url of urls) {
          if (this.pdfPool[url]) {
            delete this.pdfPool[url];
          }
          if (this.pagePool[url]) {
            delete this.pagePool[url];
          }
          if (this.imagePool[url]) {
            delete this.imagePool[url];
          }
        }
      });
    }
  }

  constructor(props: PdfViewProps) {
    super(props);
  }

  get pageNumInt(): number {
    return Math.floor(this.currentPageNumber());
  }

  get pdfScale(): number {
    return Math.max(this.scale.x(), this.scale.y());
  }

  @computed()
  protected image(): HTMLImageElement {
    const src = viaProxy(this.src());
    const url = new URL(src, window.location.origin);
    if (url.origin === window.location.origin) {
      const hash = this.view().assetHash();
      url.searchParams.set('asset-hash', hash);
    }
    let image: HTMLImageElement = null;
    try {
      image = PDF.imagePool[src][this.pageNumInt][this.pdfScale][this.backgroundHex()];
    } catch (e) {
      // console.log(e);
    }

    if (image) {
      return image;
    }

    image = document.createElement('img');
    const getImage = async (): Promise<void> => {
      const page = this.page();
      if (!page) {
        return;
      }
      const viewport = page.getViewport({scale: this.pdfScale});
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      await page.render({
        canvasContext: ctx,
        viewport,
        background: this.backgroundHex(

        ),
      }).promise;
      image.src = canvas.toDataURL();
      await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve);
        image.addEventListener('error', reject);
      });
      if (!PDF.imagePool[src]) {
        PDF.imagePool[src] = {};
      }
      if (!PDF.imagePool[src][this.pageNumInt]) {
        PDF.imagePool[src][this.pageNumInt] = {};
      }
      if (!PDF.imagePool[src][this.pageNumInt][this.pdfScale]) {
        PDF.imagePool[src][this.pageNumInt][this.pdfScale] = {};
      }
      PDF.imagePool[src][this.pageNumInt][this.pdfScale][this.backgroundHex()] = image;
    };
    DependencyContext.collectPromise(
      getImage()
    );
    return image;
  }

  protected backgroundHex(): string {
    try {
      return new Color(this.background()).hex();
    } catch (e) {
      return 'white';
    }
  }


  @computed()
  doc(): PDFDocumentProxy | null {
    const src = viaProxy(this.src());
    const url = new URL(src, window.location.origin);
    if (url.origin === window.location.origin) {
      const hash = this.view().assetHash();
      url.searchParams.set('asset-hash', hash);
    }
    let doc = PDF.pdfPool[src];
    if (!doc) {
      const getDoc = async (): Promise<void> => {
        const request = await fetch(url);
        const buffer = await request.arrayBuffer();
        doc = await pdfLib.getDocument(buffer).promise;
        PDF.pdfPool[src] = doc;
      };
      DependencyContext.collectPromise(
        getDoc()
      );
    }
    return doc;
  }

  /**
   * The total number of pages in the PDF.
   */
  @computed()
  public pageCount(): number {
    const doc = this.doc();
    if (!doc) {
      return 1;
    }
    return doc.numPages;
  }

  @computed()
  page(): PDFPageProxy | null {
    const src = viaProxy(this.src());
    const url = new URL(src, window.location.origin);
    if (url.origin === window.location.origin) {
      const hash = this.view().assetHash();
      url.searchParams.set('asset-hash', hash);
    }
    let page = null;
    try {
      page = PDF.pagePool[src][this.pageNumInt];
    } catch (e) {

    }
    if (page) {
      return page;
    }
    const doc = this.doc();
    if (!doc) {
      return null;
    }
    const getPage = async (): Promise<void> => {
      if (!PDF.pagePool[src]) {
        PDF.pagePool[src] = {};
      }
      PDF.pagePool[src][this.pageNumInt] = await doc.getPage(this.pageNumInt);
    };
    DependencyContext.collectPromise(
      getPage()
    );
  }

}

export default PDF;
export declare type ImageType = 'image/png' | 'image/jpeg' | 'image/webp';