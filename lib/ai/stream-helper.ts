
/**
 * Custom implementation of streamable values since ai/rsc is unavailable
 */

export interface StreamableValue<T> {
  stream: ReadableStream<Uint8Array>;
}

export function createStreamableValue<T>(initialValue: T) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial value immediately
  writer.write(encoder.encode(JSON.stringify(initialValue) + "\n"));

  return {
    value: { stream: readable }, // Match Expected { output: ... } shape which expects a serializable object containing the stream
    update: (value: T) => {
      writer.write(encoder.encode(JSON.stringify(value) + "\n"));
    },
    done: (value: T) => {
      writer.write(encoder.encode(JSON.stringify(value) + "\n"));
      writer.close();
    },
  };
}

export async function* readStreamableValue<T>(
  streamable: StreamableValue<T> | ReadableStream<Uint8Array>
): AsyncGenerator<T> {
  const stream = 'stream' in streamable ? streamable.stream : streamable;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      
      // Process all complete lines
      buffer = lines.pop() || ""; // Keep the last partial line
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line);
          } catch (e) {
            console.warn("Failed to parse stream line:", line);
          }
        }
      }
    }
    
    // Process remaining buffer
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer);
      } catch (e) {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}
