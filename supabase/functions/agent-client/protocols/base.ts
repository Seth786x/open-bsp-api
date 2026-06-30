export function contextHeaders(context) {
  return {
    "organization-id": context.organization.id,
    "organization-address": context.conversation.organization_address,
    "conversation-id": context.conversation.id,
    "agent-id": context.agent.id,
    ...context.contact?.id && {
      "contact-id": context.contact.id
    },
    ...context.conversation.contact_address && {
      "contact-address": context.conversation.contact_address
    }
  };
}
