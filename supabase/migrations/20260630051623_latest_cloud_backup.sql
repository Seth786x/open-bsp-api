create sequence "public"."n8n_chat_histories_id_seq";

drop trigger if exists "notify_webhook_messages" on "public"."messages";


  create table "public"."n8n_chat_histories" (
    "id" integer not null default nextval('public.n8n_chat_histories_id_seq'::regclass),
    "session_id" character varying(255) not null,
    "message" jsonb not null
      );


alter sequence "public"."n8n_chat_histories_id_seq" owned by "public"."n8n_chat_histories"."id";

CREATE UNIQUE INDEX n8n_chat_histories_pkey ON public.n8n_chat_histories USING btree (id);

alter table "public"."n8n_chat_histories" add constraint "n8n_chat_histories_pkey" PRIMARY KEY using index "n8n_chat_histories_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user_agent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- Paste your exact master organization ID string here
  master_org_id CONSTANT uuid := '14d5c3a7-45fa-43cc-a5fb-ee9744400979';
BEGIN
  INSERT INTO public.agents (id, user_id, organization_id, name, ai, extra)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    master_org_id, -- Forces EVERY user under the exact same workspace anchor
    COALESCE(NEW.raw_user_meta_data->>'name', 'New Client'),
    false,
    '{"role": "owner"}'::jsonb
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_provision_templates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://wlnquwjdbrlnxfwonvnd.supabase.co/functions/v1/whatsapp-management/webhook/provision-templates',
    body := jsonb_build_object('record', row_to_json(NEW), 'type', 'INSERT', 'table', 'organizations_addresses')
  );
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."n8n_chat_histories" to "anon";

grant insert on table "public"."n8n_chat_histories" to "anon";

grant references on table "public"."n8n_chat_histories" to "anon";

grant select on table "public"."n8n_chat_histories" to "anon";

grant trigger on table "public"."n8n_chat_histories" to "anon";

grant truncate on table "public"."n8n_chat_histories" to "anon";

grant update on table "public"."n8n_chat_histories" to "anon";

grant delete on table "public"."n8n_chat_histories" to "authenticated";

grant insert on table "public"."n8n_chat_histories" to "authenticated";

grant references on table "public"."n8n_chat_histories" to "authenticated";

grant select on table "public"."n8n_chat_histories" to "authenticated";

grant trigger on table "public"."n8n_chat_histories" to "authenticated";

grant truncate on table "public"."n8n_chat_histories" to "authenticated";

grant update on table "public"."n8n_chat_histories" to "authenticated";

grant delete on table "public"."n8n_chat_histories" to "service_role";

grant insert on table "public"."n8n_chat_histories" to "service_role";

grant references on table "public"."n8n_chat_histories" to "service_role";

grant select on table "public"."n8n_chat_histories" to "service_role";

grant trigger on table "public"."n8n_chat_histories" to "service_role";

grant truncate on table "public"."n8n_chat_histories" to "service_role";

grant update on table "public"."n8n_chat_histories" to "service_role";

CREATE TRIGGER on_new_organization_address AFTER INSERT ON public.organizations_addresses FOR EACH ROW EXECUTE FUNCTION public.trigger_provision_templates();

CREATE TRIGGER notify_webhook_messages AFTER INSERT OR UPDATE ON public.messages FOR EACH ROW WHEN ((new.direction = 'incoming'::public.direction)) EXECUTE FUNCTION public.notify_webhook();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_agent();


