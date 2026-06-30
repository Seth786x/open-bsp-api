export const Constants = {
  billing: {
    Enums: {}
  },
  public: {
    Enums: {
      direction: [
        "incoming",
        "outgoing",
        "internal"
      ],
      log_level: [
        "info",
        "warning",
        "error"
      ],
      role: [
        "owner",
        "admin",
        "member"
      ],
      service: [
        "whatsapp",
        "instagram",
        "local"
      ],
      webhook_operation: [
        "insert",
        "update"
      ],
      webhook_table: [
        "messages",
        "conversations"
      ]
    }
  },
  storage: {
    Enums: {
      buckettype: [
        "STANDARD",
        "ANALYTICS",
        "VECTOR"
      ]
    }
  }
};
