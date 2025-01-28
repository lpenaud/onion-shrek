import * as img from "./magick-image.ts";

export interface MagickGeometry {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface MagickOptions {
  flags: string[];
  outputType: img.MagickImageType;
  input: img.MagickImage;
}

export async function magick(
  command: string,
  { input, flags, outputType }: MagickOptions,
): Promise<img.MagickImage> {
  const args = flags.concat(`${input.type}:-`, `${outputType}:-`);
  const builder = new Deno.Command(command, {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
  });
  const child = builder.spawn();
  console.log(command, ...args);
  const [, { code, stdout, success }] = await Promise.all([
    input.readable.pipeTo(child.stdin),
    child.output(),
  ]);
  if (!success) {
    throw new Error(`Process terminate with the code: ${code}`);
  }
  return img.fromBuffer(outputType, stdout);
}

export interface MagickCompositeOptions {
  geometry: MagickGeometry;
  infiles: string[];
  input: img.MagickImage;
  outputType: img.MagickImageType;
}

export function composite(
  { geometry: { x, y, width, height }, infiles, input, outputType }:
    MagickCompositeOptions,
): Promise<img.MagickImage> {
  return magick("composite", {
    outputType,
    flags: [
      "-geometry",
      `${width}x${height}+${x}+${y}`,
      ...infiles,
    ],
    input,
  });
}

export interface MagickConvertOptions {
  input: img.MagickImage;
  outputType: img.MagickImageType;
}

export function convert(
  { input, outputType }: MagickConvertOptions,
): Promise<img.MagickImage> {
  return magick("convert", {
    outputType,
    input,
    flags: [],
  });
}