declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: {
      size?: string | [number, number];
      layout?: 'portrait' | 'landscape';
      margins?: { top: number; bottom: number; left: number; right: number };
      info?: Record<string, string>;
      autoFirstPage?: boolean;
      bufferPages?: boolean;
    });
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
    end(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, callback: (...args: any[]) => void): this;

    // Text
    text(text: string, options?: Record<string, unknown>): this;
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this;
    font(src: string, size?: number): this;
    fontSize(size: number): this;
    fill(color: string): this;
    fillColor(color: string): this;

    // Drawing
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    lineWidth(width: number): this;
    stroke(color?: string): this;
    rect(x: number, y: number, w: number, h: number): this;
    roundedRect(x: number, y: number, w: number, h: number, r: number): this;
    opacity(opacity: number): this;
    fillAndStroke(fillColor: string, strokeColor?: string): this;
    fillOpacity(opacity: number): this;

    // Image
    image(src: string | Buffer, options?: Record<string, unknown>): this;
    image(src: string | Buffer, x?: number, y?: number, options?: Record<string, unknown>): this;

    // Page
    addPage(options?: Record<string, unknown>): this;
    page: {
      width: number;
      height: number;
      margins: { top: number; bottom: number; left: number; right: number };
    };
    y: number;
    x: number;

    // Misc
    widthOfString(text: string): number;
    heightOfString(text: string, options?: Record<string, unknown>): number;
    currentLineHeight(includeGap?: boolean): number;
    moveDown(lines?: number): this;
    moveUp(lines?: number): this;
    save(): this;
    restore(): this;
  }

  export = PDFDocument;
}
