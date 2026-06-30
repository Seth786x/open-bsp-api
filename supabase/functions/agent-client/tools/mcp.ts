import { base64ToBlob, fetchMedia, uploadToStorage } from "../../_shared/media.ts";
// Import map is bad at resolving entry points, so we need to use the full path.
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";
import { contextHeaders } from "../protocols/base.ts";
export async function initMCP(tool, context) {
  const client = new Client({
    name: tool.label,
    version: "1.0"
  });
  const headers = {
    ...context && contextHeaders(context),
    ...tool.config.headers
  };
  // When running locally, the Edge Runtime executes in a containerized environment isolated from the host.
  // 'localhost' refers to the container itself, not the host machine where the Supabase stack is running.
  // We replace it with the internal API gateway URL to access sibling services (like Kong).
  tool.config.url = tool.config.url.replace("http://localhost:54321", "http://api.supabase.internal:8000");
  const transport = new StreamableHTTPClientTransport(new URL(tool.config.url), {
    ...Object.keys(headers).length > 0 && {
      requestInit: {
        headers
      }
    }
  });
  try {
    await client.connect(transport);
    const toolsResult = await client.listTools();
    let tools = toolsResult.tools;
    if (tool.config.allowed_tools && tool.config.allowed_tools.length > 0) {
      tools = tools.filter((t)=>tool.config.allowed_tools.includes(t.name));
    }
    return {
      label: tool.label,
      client,
      tools
    };
  } catch (error) {
    throw new Error(`MCP client ${tool.label} - ${error instanceof Error ? error.message : String(error)}`);
  }
}
export async function fromMCP(part, context, client) {
  const org = context.organization;
  switch(part.type){
    case "text":
      {
        try {
          const data = JSON.parse(part.text);
          if (typeof data === "object" && data !== null) {
            return {
              type: "data",
              kind: "data",
              data
            };
          }
        } catch  {
        // Not JSON, fall through to text
        }
        return {
          type: "text",
          kind: "text",
          text: part.text
        };
      }
    case "image":
      {
        const file = base64ToBlob(part.data, part.mimeType);
        const uri = await uploadToStorage(client, org.id, file);
        return {
          type: "file",
          kind: "image",
          file: {
            uri,
            mime_type: file.type,
            size: file.size
          }
        };
      }
    case "audio":
      {
        const file = base64ToBlob(part.data, part.mimeType);
        const uri = await uploadToStorage(client, org.id, file);
        return {
          type: "file",
          kind: "audio",
          file: {
            uri,
            mime_type: file.type,
            size: file.size
          }
        };
      }
    case "resource":
      {
        if ("text" in part.resource) {
          const file = new Blob([
            part.resource.text
          ], {
            type: part.resource.mimeType || "text/plain"
          });
          const uri = await uploadToStorage(client, org.id, file);
          return {
            type: "file",
            kind: "document",
            file: {
              uri,
              mime_type: file.type,
              size: file.size
            }
          };
        }
        if ("blob" in part.resource) {
          const file = base64ToBlob(part.resource.blob, part.resource.mimeType);
          const uri = await uploadToStorage(client, org.id, file);
          return {
            type: "file",
            kind: "document",
            file: {
              uri,
              mime_type: file.type,
              size: file.size
            }
          };
        }
        throw new Error("Invalid resource type");
      }
    case "resource_link":
      {
        const file = await fetchMedia(part.uri);
        const uri = await uploadToStorage(client, org.id, file);
        return {
          type: "file",
          kind: "document",
          file: {
            uri,
            mime_type: file.type,
            size: file.size
          }
        };
      }
  }
}
export async function callTool(mcp, part, context, client) {
  if (!part.tool || part.tool.provider !== "local" || part.tool.type !== "mcp" || part.type !== "data") {
    throw new Error("Invalid tool info or data");
  }
  const tool = part.tool;
  // Check if the tool is in the list of allowed tools for this server
  // This list is already filtered by initMCP if allowed_tools is set
  // but the LLM can still request a tool that is not in the list
  const toolExists = mcp.tools.some((t)=>t.name === tool.name);
  if (!toolExists) {
    throw new Error(`Tool ${tool.name} is not available or not allowed.`);
  }
  const result = await mcp.client.callTool({
    name: tool.name,
    arguments: part.data
  });
  const parts = result.structuredContent ? [
    {
      type: "data",
      kind: "data",
      data: result.structuredContent
    }
  ] : await Promise.all(result.content.map((part)=>fromMCP(part, context, client)));
  return parts.map((outPart)=>({
      ...outPart,
      tool: {
        ...part.tool,
        event: "result",
        is_error: result.isError
      }
    }));
}
