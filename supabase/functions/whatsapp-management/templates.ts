import { createUnsecureClient } from "../_shared/supabase.ts";
import * as log from "../_shared/logger.ts";
import { HTTPException } from "jsr:@hono/hono/http-exception";
const API_VERSION = "v24.0";
async function getBusinessCredentials(client, organization_id, organization_address) {
  const { data, error } = await client.from("organizations_addresses").select("extra->>waba_id, extra->>access_token").eq("organization_id", organization_id).eq("address", organization_address).single();
  if (error || !data) {
    log.error("Could not fetch business access token", error);
    throw new HTTPException(403, {
      message: "Could not fetch business access token",
      cause: error
    });
  }
  return data;
}
export async function listTemplates(client, organization_id, organization_address) {
  const { waba_id, access_token } = await getBusinessCredentials(client, organization_id, organization_address);
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${waba_id}/message_templates`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
  if (!response.ok) {
    throw new HTTPException(response.status, {
      message: "Could not fetch templates",
      cause: await response.json().catch(()=>({}))
    });
  }
  const metaResponse = await response.json();
  const templates = metaResponse.data ?? [];
  const synced = templates.map((t)=>{
    const bodyComponent = t.components?.find((c)=>c.type === "BODY");
    const headerComponent = t.components?.find((c)=>c.type === "HEADER");
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
      body: bodyComponent?.text ?? "",
      headerExample: headerComponent?.example?.header_text ?? []
    };
  });
  const unsecureClient = createUnsecureClient();
  const { data: current } = await unsecureClient.from("organizations_addresses").select("extra").eq("organization_id", organization_id).eq("address", organization_address).single();
  const mergedExtra = {
    ...current?.extra ?? {},
    templates: synced
  };
  const { error: upsertError } = await unsecureClient.from("organizations_addresses").update({
    extra: mergedExtra
  }).eq("organization_id", organization_id).eq("address", organization_address);
  if (upsertError) {
    log.error("Could not persist synced templates to extra", upsertError);
  }
  return templates;
}
export async function fetchTemplate(client, organization_id, organization_address, template) {
  const { access_token } = await getBusinessCredentials(client, organization_id, organization_address);
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${template.id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
  if (!response.ok) {
    throw new HTTPException(response.status, {
      message: "Could not fetch template",
      cause: await response.json().catch(()=>({}))
    });
  }
  return await response.json();
}
export async function createTemplate(client, organization_id, organization_address, template) {
  const { waba_id, access_token } = await getBusinessCredentials(client, organization_id, organization_address);
  const { name, category, language, components } = template;
  const filteredTemplate = {
    name,
    category,
    allow_category_change: true,
    language,
    components
  };
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${waba_id}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(filteredTemplate)
  });
  if (!response.ok) {
    throw new HTTPException(response.status, {
      message: "Could not create template",
      cause: await response.json().catch(()=>({}))
    });
  }
  return await response.json();
}
export async function editTemplate(client, organization_id, organization_address, template) {
  const { access_token } = await getBusinessCredentials(client, organization_id, organization_address);
  const { category, components } = template;
  const filteredTemplate = {
    category,
    components
  };
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${template.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(filteredTemplate)
  });
  if (!response.ok) {
    throw new HTTPException(response.status, {
      message: "Could not update template",
      cause: await response.json().catch(()=>({}))
    });
  }
  return await response.json();
}
export async function deleteTemplate(client, organization_id, organization_address, template) {
  const { waba_id, access_token } = await getBusinessCredentials(client, organization_id, organization_address);
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${waba_id}/message_templates?name=${template.name}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
  if (!response.ok) {
    throw new HTTPException(response.status, {
      message: "Could not delete template",
      cause: await response.json().catch(()=>({}))
    });
  }
  return await response.json();
}
/**
 * Provisioning helper for background triggers.
 * Bypasses the need for organization_id and organization_address lookups
 * because the webhook payload already provides the WABA ID and token.
 */ export async function directCreateTemplate(waba_id, access_token, template) {
  const { name, category, language, components } = template;
  const filteredTemplate = {
    name,
    category,
    allow_category_change: true,
    language,
    components
  };
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${waba_id}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(filteredTemplate)
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(()=>({}));
    log.error("Failed to provision template directly", errorBody);
    throw new HTTPException(response.status, {
      message: "Could not provision template via background trigger",
      cause: errorBody
    });
  }
  return await response.json();
}
