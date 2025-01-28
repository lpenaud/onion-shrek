import * as path from "jsr:@std/path@1.0.8";
import { TextLineStream } from "jsr:@std/streams@1.0.8";
import * as img from "./magick-image.ts";
import { composite, convert, type MagickGeometry } from "./magick.ts";
import { defaultRecord, range, RangeOptions } from "./utils.ts";
import { plant } from "./bliss.ts";
import * as SetNumber from "./set-number.ts";

interface OtherImage {
  index: number;
  filename: string;
  geometry: MagickGeometry;
}

interface ScriptResult {
  variables: Record<string, string>;
  others: Map<number, OtherImage[]>;
}

async function readScript(filename: string): Promise<ScriptResult> {
  const varRe = /^\s*([A-Z][A-Z_]+)\s*=\s*/;
  const otherRe = /^\s*(\d+)\.\s*/;
  const variables = defaultRecord<string, string>("");
  const others: Map<number, OtherImage[]> = new Map();
  const infile = await Deno.open(filename);
  const readable = infile.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());
  for await (const line of readable) {
    let match = varRe.exec(line);
    if (match !== null) {
      const [all, name] = match;
      variables[name] = line.substring(all.length);
      continue;
    }
    match = otherRe.exec(line);
    if (match !== null) {
      const [all, index] = match;
      const key = parseInt(index);
      const [filename, ...geometry] = line.substring(all.length)
        .split(":", 5);
      const [width, height, x, y] = geometry.map((v) => parseInt(v));
      let array = others.get(parseInt(index));
      if (array === undefined) {
        array = [];
        others.set(key, array);
      }
      array.push({
        filename,
        geometry: { width, height, x, y },
        index: key,
      });
    }
  }
  return { variables, others };
}

function readRange(str: string): RangeOptions {
  const values = str.split(":")
    .map((v) => parseInt(v));
  if (values.some((v) => isNaN(v) || v < 0)) {
    throw new Error(`Invalid range: '${str}'`);
  }
  const [start, end, step] = values;
  return { start, end, step };
}

function readOutputs(str: string): SetNumber.SetNumber {
  if (str.length === 0) {
    return SetNumber.allNumbers();
  }
  const outputs = str.split(",")
    .map((v) => parseInt(v))
    .filter((v) => !isNaN(v));
  return SetNumber.fromNumberArray(outputs);
}

export async function main([filename]: string[]): Promise<number> {
  if (filename === undefined) {
    console.error("Usage: %s INFILE", import.meta.filename ?? import.meta.url);
    return 1;
  }
  const { others, variables } = await readScript(filename);
  const onion = variables["ONION"];
  if (onion.length === 0) {
    console.error("Need onion image");
    return 1;
  }
  const rangeX = readRange(variables["RANGE_X"]);
  const rangeY = readRange(variables["RANGE_Y"]);
  const outdir = variables["OUTDIR"];
  const outputs = readOutputs(variables["OUTPUTS"]);
  const background = await img.fromScriptString(variables["BACKGROUND"]);
  const it = plant({ background, onion, rangeX, rangeY });
  const indexes = range({ start: 1 });
  await Deno.mkdir(outdir, {
    recursive: true,
  });
  for await (let r of it) {
    const index = indexes.next().value as number;
    const plus = others.get(index);
    if (plus !== undefined) {
      for (const { filename, geometry } of plus) {
        r = await composite({
          geometry: geometry,
          infiles: [filename],
          outputType: "miff",
          input: r,
        });
      }
    }
    if (outputs.delete(index)) {
      r = await convert({
        input: r,
        outputType: "jpg",
      });
      const outfile = await Deno.open(path.join(outdir, `${index}.jpg`), {
        create: true,
        write: true
      });
      await r.readable.pipeTo(outfile.writable);
    }
    if (outputs.empty) {
      break;
    }
  }
  return 0;
}
