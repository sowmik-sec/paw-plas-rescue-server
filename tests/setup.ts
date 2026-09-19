try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeBuffer = require("node:buffer");
  if (!nodeBuffer.SlowBuffer) {
    nodeBuffer.SlowBuffer = nodeBuffer.Buffer;
  }
} catch {
  // Ignore if already set
}
