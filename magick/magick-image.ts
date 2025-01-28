export type MagickImageType = "miff" | "jpg" | "webp" | "png";

const IMAGES_TYPES: readonly MagickImageType[] = Object.freeze([
  "miff",
  "jpg",
  "webp",
  "png"
]);

export interface MagickImage {
  type: MagickImageType;
  readable: ReadableStream<Uint8Array>;
}

class BufferMagickImage implements MagickImage {

  #type: MagickImageType;

  #data: Uint8Array;

  get type(): MagickImageType {
    return this.#type;
  }

  get readable(): ReadableStream<Uint8Array> {
    return ReadableStream.from([this.#data]);
  }

  constructor(type: MagickImageType, data: Uint8Array) {
    this.#type = type;
    this.#data = data;
  }
}

export function fromBuffer(type: MagickImageType, data: Uint8Array): MagickImage {
  return new BufferMagickImage(type, data);
}

export async function fromFile(type: MagickImageType, filename: string | URL): Promise<MagickImage> {
  const data = await Deno.readFile(filename);
  return new BufferMagickImage(type, data);
}

export function isValidType(imgType: string): imgType is MagickImageType {
  return IMAGES_TYPES.includes(imgType as MagickImageType);
}

export function fromScriptString(str: string): Promise<MagickImage> {
  const [type,filename] = str.split(":", 2);
  if (!isValidType(type)) {
    throw new Error(`Invalid type: '${type}'`);
  }
  return fromFile(type, filename);
}
