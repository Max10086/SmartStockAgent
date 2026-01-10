/**
 * Tools Module - External integrations and utilities
 */

export * from "./search";
export { searchTavily } from "./search";

// Vertex AI Grounding (Google Search)
export { 
  researchWithGoogle, 
  searchWithVertexGrounding,
  type GroundedResponse,
  type GroundingMetadata,
  type GroundingSource,
} from "../ai/vertex-grounding";
