import { plant } from "./bliss.ts";
import * as img from "./magick-image.ts";
import { composite, convert } from "./magick.ts";
import { type RangeOptions } from "./utils.ts";
import * as cli from "jsr:@std/cli@1.0.11";
import * as path from "jsr:@std/path@1.0.8";

function parseImage(input: string | undefined): Promise<img.MagickImage> {
  if (input === undefined) {
    throw new Error("Undefined input");
  }
  const argRe = /^([a-z]+):/;
  const match = argRe.exec(input);
  if (match === null) {
    throw new Error(`Invalid image: ${input}`);
  }
  const [all, imgType] = match;
  if (!img.isValidType(imgType)) {
    throw new Error(`Invalid format: ${input}`);
  }
  return img.fromFile(imgType, input.substring(all.length));
}

interface MainOptions {
  background: img.MagickImage;
  onion: string;
  others: string[];
  rangeX: RangeOptions;
  rangeY: RangeOptions;
  output: WritableStream<Uint8Array>;
  outdir?: string;
}

async function parseArgs(args: string[]): Promise<MainOptions> {
  const {
    startx,
    starty,
    endx,
    endy,
    stepx,
    stepy,
    background: backgroundArg,
    onion,
    outfile,
    outdir,
    _: others,
  } = cli
    .parseArgs(args, {
      string: [
        "starty",
        "endx",
        "endy",
        "stepx",
        "stepy",
        "background",
        "onion",
        "outfile",
        "outdir",
      ],
    });
  return {
    background: await parseImage(
      backgroundArg ?? "png:imgs/windows-xp-shrek.png",
    ),
    onion: onion ?? "imgs/onion-shrek-64x64.png",
    others: others as string[],
    rangeX: {
      start: parseInt(startx as string) || 0,
      end: parseInt(endx as string) || 1400,
      step: parseInt(stepx as string) || 40,
    },
    rangeY: {
      start: parseInt(starty as string) || 520,
      end: parseInt(endy as string) || 740,
      step: parseInt(stepy as string) || 40,
    },
    output: outfile === undefined
      ? Deno.stdout.writable
      : (await Deno.open(outfile, { create: true, write: true })).writable,
    outdir,
  };
}

interface TeeingPlantOptions {
  it: AsyncGenerator<img.MagickImage>;
  outdir: string;
}

async function writeImg(
  input: img.MagickImage,
  outpath: string,
): Promise<void> {
  const [jpg, outfile] = await Promise.all([
    convert({ input, outputType: "jpg" }),
    Deno.open(outpath, {
      create: true,
      write: true,
    }),
  ]);
  await jpg.readable.pipeTo(outfile.writable);
}

async function* teeingPlant(
  { outdir, it }: TeeingPlantOptions,
): AsyncGenerator<img.MagickImage> {
  await Deno.mkdir(outdir, { recursive: true });
  let result: IteratorResult<img.MagickImage, img.MagickImage>;
  let i = 0;
  let writeTask: Promise<void>;
  while (!(result = await it.next()).done) {
    const miff = result.value;
    writeTask = writeImg(miff, path.join(outdir, `${i++}.jpg`));
    yield miff;
    await writeTask;
  }
}

export async function main(args: string[]): Promise<number> {
  const { background, onion, others, rangeX, rangeY, output, outdir } =
    await parseArgs(
      args,
    );
  let it = plant({ background, onion, rangeX, rangeY });
  if (outdir !== undefined) {
    it = teeingPlant({ outdir, it });
  }
  let result = background;
  for await (const p of it) {
    result = p;
  }
  for (const guess of others) {
    result = await composite({
      geometry: {
        height: 360,
        width: 360,
        x: 890,
        y: 0,
      },
      infiles: [guess],
      input: result,
      outputType: result.type,
    });
  }
  result = await convert({
    input: result,
    outputType: "jpg",
  });
  await result.readable.pipeTo(output);
  return 0;
}
