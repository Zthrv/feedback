import { lazyPipeline } from "./modelRuntime.js";

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

const embedder = lazyPipeline("feature-extraction", EMBEDDING_MODEL);

class EmbeddingService {

  /**
   * Start loading the model in the background
   */
  static warmUp() {
    return embedder.load();
  }

  static isReady() {
    return embedder.isReady();
  }

  /**
   * Turn each text into a vector (a list of numbers describing its meaning).
   * Vectors are length-normalised, so a dot product between two of them is their cosine similarity.
   */
  static async embed(texts) {

    if (texts.length === 0) {
      return [];
    }

    const model = await embedder.load();

    const output = await model(texts, {
      pooling: "mean",
      normalize: true,
    });

    return output.tolist();

  }

}

export default EmbeddingService;
