import { randint, range, type RangeOptions } from "./utils.ts";
import { type MagickImage } from "./magick-image.ts";
import { composite } from "./magick.ts";

export interface PlantOptions {
  background: MagickImage;
  onion: string;
  rangeX: RangeOptions;
  rangeY: RangeOptions;
}

export async function* plant(
  { background, onion, rangeX, rangeY }: PlantOptions,
): AsyncGenerator<MagickImage> {
  let result = background;
  for (const y of range(rangeY)) {
    for (const x of range(rangeX)) {
      result = await composite({
        geometry: {
          height: randint(25, 45),
          width: randint(25, 45),
          x: randint(x, 7),
          y: randint(y, 13),
        },
        infiles: [onion],
        input: result,
        outputType: "miff",
      });
      yield result;
    }
  }
}