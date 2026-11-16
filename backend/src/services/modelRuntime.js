import path from "path";
import { fileURLToPath } from "url";
import { pipeline, env } from "@huggingface/transformers";

const here = path.dirname(fileURLToPath(import.meta.url));

// Downloaded models are kept here so they are fetched from the internet only once
env.cacheDir = path.join(here, "..", "..", ".model-cache");

/**
 * Lazily loads one BERT-family model and remembers it.
 * A failed load is not cached, so the next call tries again.
 */
function lazyPipeline(task, model, options = {}) {

  let loading = null;

  let ready = false;

  return {

    load() {

      if (!loading) {

        loading = pipeline(task, model, options)
          .then((loaded) => {
            ready = true;
            return loaded;
          })
          .catch((error) => {
            loading = null;
            throw error;
          });

      }

      return loading;

    },

    isReady() {
      return ready;
    },

  };

}

export { lazyPipeline };
