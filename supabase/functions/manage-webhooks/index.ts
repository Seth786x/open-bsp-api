import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  // 1. Instantly resolve browser preflight checks safely
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;

    // --- GET METHOD: FETCH WEBHOOKS ---
    if (method === 'GET') {
      const urlObj = new URL(req.url);
      const organization_id = urlObj.searchParams.get("organization_id");

      if (!organization_id) {
        return new Response(JSON.stringify({ error: "Missing organization_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("webhooks")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;
      return new Response(JSON.stringify(data), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // --- POST METHOD: ADD WEBHOOK ---
    if (method === 'POST') {
      const body = await req.json();
      const organization_id = body.organization_id || body.orgId;
      const url = body.url;
      const token = body.token;

      if (!organization_id || !url) {
        return new Response(JSON.stringify({ error: "Validation Failed: Missing url or org ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("webhooks")
        .insert({
          organization_id,
          url: url.trim(),
          token: token?.trim() || null,
          table_name: "messages",
          operations: ["insert"],
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // --- DELETE METHOD: REMOVE WEBHOOK ---
    if (method === 'DELETE') {
      const urlObj = new URL(req.url);
      const webhook_id = urlObj.searchParams.get("id");

      if (!webhook_id) {
        return new Response(JSON.stringify({ error: "Missing webhook id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient
        .from("webhooks")
        .delete()
        .eq("id", webhook_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  } catch (err) {
    // Global catch-all block that ALWAYS guarantees CORS headers are returned to the browser console
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});