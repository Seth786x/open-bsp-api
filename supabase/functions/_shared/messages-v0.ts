const MediaTypes = [
  "audio",
  "image",
  "video",
  "document",
  "sticker"
];
// end of types section
export function toV1(row) {
  // Tool use (function call) - detected by row.content.tool
  if (row.direction === "internal" && //row.content.tool?.event === "use" &&
  "function" in row.content) {
    if (row.content.v1_type === "data") {
      return {
        ...row,
        content: {
          version: "1",
          // @ts-expect-error type
          task: row.content.task,
          tool: row.content.tool || {
            use_id: row.content.id,
            provider: "local",
            event: "use",
            type: "function",
            name: row.content.function.name
          },
          type: "data",
          kind: "data",
          data: JSON.parse(row.content.function.arguments),
          artifacts: row.content.artifacts
        }
      };
    }
    if (row.content.v1_type === "text") {
      return {
        ...row,
        content: {
          version: "1",
          // @ts-expect-error type
          task: row.content.task,
          tool: row.content.tool || {
            use_id: row.content.id,
            provider: "local",
            event: "use",
            type: "function",
            name: row.content.function.name
          },
          type: "text",
          kind: "text",
          text: row.content.function.arguments,
          artifacts: row.content.artifacts
        }
      };
    }
  } else if (row.direction === "internal" && "tool" in row.content && row.content.tool?.event === "result" && "tool_call_id" in row.content) {
    if (row.content.v1_type === "data") {
      return {
        ...row,
        content: {
          version: "1",
          // @ts-expect-error type
          task: row.content.task,
          tool: row.content.tool || {
            use_id: row.content.tool_call_id,
            provider: "local",
            event: "result",
            type: "function",
            name: row.content.tool_name
          },
          type: "data",
          kind: "data",
          data: JSON.parse(row.content.content),
          artifacts: row.content.artifacts
        }
      };
    }
    if (row.content.v1_type === "text") {
      return {
        ...row,
        content: {
          version: "1",
          // @ts-expect-error type
          task: row.content.task,
          tool: row.content.tool || {
            use_id: row.content.tool_call_id,
            provider: "local",
            event: "result",
            type: "function",
            name: row.content.tool_name
          },
          type: "text",
          kind: "text",
          text: row.content.content,
          artifacts: row.content.artifacts
        }
      };
    }
  } else if ("media" in row.content && row.content.media) {
    // @ts-expect-error type
    return {
      ...row,
      content: {
        version: "1",
        type: "file",
        kind: row.content.type,
        file: {
          mime_type: row.content.media.mime_type,
          size: row.content.media.file_size || 0,
          name: row.content.media.filename,
          uri: row.content.media.id
        },
        text: row.content.type === "audio" ? "" : row.content.content,
        artifacts: row.content.artifacts
      }
    };
  } else if ("content" in row.content && row.content.content) {
    // @ts-expect-error type
    return {
      ...row,
      content: {
        version: "1",
        type: "text",
        kind: row.content.type,
        text: row.content.content,
        artifacts: row.content.artifacts
      }
    };
  } else if (row.content.type in row.content && row.content[row.content.type]) {
    return {
      ...row,
      content: {
        version: "1",
        type: "data",
        // @ts-expect-error type
        kind: row.content.type,
        // @ts-expect-error type
        data: row.content[row.content.type],
        artifacts: row.content.artifacts
      }
    };
  }
  console.warn("Could not convert message to v1", row);
  return undefined;
}
export function fromV1(row) {
  // v0 redefines content/Part shapes locally (this file is legacy and slated
  // for removal). The shared v1 union has since grown new kinds (Instagram-
  // native attachment kinds, the "media"/"file" media types) that the local
  // v0 types don't enumerate. There are no v0 IG rows in prod, so we coerce
  // shared types into v0's narrower shapes via the helpers below.
  // deno-lint-ignore no-explicit-any
  const vArtifacts = (a)=>a;
  // deno-lint-ignore no-explicit-any
  const vKind = (k)=>k;
  if (row.direction === "internal" && row.content.tool?.event === "use" && row.content.tool?.provider === "local" && row.content.type !== "file") {
    if (row.content.type === "data") {
      return {
        ...row,
        content: {
          version: "0",
          task: row.content.task,
          type: "function",
          v1_type: "data",
          id: row.content.tool.use_id,
          function: {
            name: row.content.tool.name,
            arguments: JSON.stringify(row.content.data)
          },
          tool: row.content.tool,
          artifacts: vArtifacts(row.content.artifacts)
        }
      };
    }
    if (row.content.type === "text") {
      return {
        ...row,
        content: {
          version: "0",
          task: row.content.task,
          type: "function",
          v1_type: "text",
          id: row.content.tool.use_id,
          function: {
            name: row.content.tool.name,
            arguments: row.content.text
          },
          tool: row.content.tool,
          artifacts: vArtifacts(row.content.artifacts)
        }
      };
    }
  } else if (row.direction === "internal" && row.content.tool?.event === "result" && row.content.tool?.provider === "local" && row.content.type !== "file") {
    if (row.content.type === "data") {
      return {
        ...row,
        content: {
          version: "0",
          task: row.content.task,
          v1_type: "data",
          type: "text",
          tool_call_id: row.content.tool.use_id,
          tool_name: row.content.tool.name,
          content: JSON.stringify(row.content.data),
          tool: row.content.tool,
          artifacts: vArtifacts(row.content.artifacts)
        }
      };
    }
    if (row.content.type === "text") {
      return {
        ...row,
        content: {
          version: "0",
          task: row.content.task,
          v1_type: "text",
          type: "text",
          tool_call_id: row.content.tool.use_id,
          tool_name: row.content.tool.name,
          content: row.content.text,
          tool: row.content.tool,
          artifacts: vArtifacts(row.content.artifacts)
        }
      };
    }
  } else if (row.content.type === "text") {
    return {
      ...row,
      content: {
        version: "0",
        // @ts-expect-error type
        type: row.content.kind,
        content: row.content.text,
        artifacts: vArtifacts(row.content.artifacts)
      }
    };
  } else if (row.content.type === "file") {
    const transcription = row.content.artifacts?.find((a)=>a.type === "text" && a.kind === "transcription")?.text;
    const description = row.content.artifacts?.find((a)=>a.type === "text" && a.kind === "description")?.text;
    return {
      ...row,
      content: {
        version: "0",
        type: vKind(row.content.kind),
        content: row.content.kind === "audio" ? transcription : row.content.text,
        media: {
          mime_type: row.content.file.mime_type,
          file_size: row.content.file.size,
          filename: row.content.file.name,
          id: row.content.file.uri,
          description,
          ...row.content.kind === "audio" ? {} : {
            annotation: transcription
          }
        },
        artifacts: vArtifacts(row.content.artifacts)
      }
    };
  } else if (row.content.type === "data") {
    return {
      ...row,
      content: {
        version: "0",
        // @ts-expect-error type
        type: row.content.kind,
        [row.content.kind]: row.content.data,
        artifacts: vArtifacts(row.content.artifacts)
      }
    };
  }
  console.warn("Could not convert message to v0", row);
  return undefined;
}
