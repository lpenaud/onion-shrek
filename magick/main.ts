#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run=convert,composite
import { main } from "./cli.ts";

if (import.meta.main) {
  main(Deno.args.slice())
    .then(Deno.exit)
    .catch((e) => {
      console.error(e);
      Deno.exit(2);
    });
}
