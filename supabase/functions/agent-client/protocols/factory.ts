import { ChatCompletionsHandler } from "./chat-completions.ts";
import { A2AHandler } from "./a2a.ts";
export class ProtocolFactory {
  static getHandler(tools, context, client) {
    const protocol = context.agent.extra.protocol || "chat_completions";
    switch(protocol){
      case "chat_completions":
        return new ChatCompletionsHandler(tools, context, client);
      case "a2a":
        return new A2AHandler(context, client);
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }
}
