declare module "sharp" {
  type SharpMetadata = { format?: string };
  type ResizeOptions = { fit?: "cover"; position?: "centre" };
  type WebpOptions = { quality?: number };
  type SharpInstance = {
    metadata(): Promise<SharpMetadata>;
    rotate(): SharpInstance;
    resize(width: number, height: number, options?: ResizeOptions): SharpInstance;
    webp(options?: WebpOptions): SharpInstance;
    toBuffer(): Promise<Buffer>;
  };
  type SharpOptions = { failOn?: "none" | "truncated" | "error" | "warning"; limitInputPixels?: number };
  function sharp(input: Buffer, options?: SharpOptions): SharpInstance;
  export default sharp;
}
