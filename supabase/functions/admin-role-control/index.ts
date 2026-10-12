import { createClient, type User } from "npm:@supabase/supabase-js@2.112.2";
import { checkRateLimit, RATE_LIMITS } from "../rate-limit-helper.ts";

const allowedOrigins=(Deno.env.get("ADMIN_ALLOWED_ORIGINS")??"http://localhost:3000,http://localhost:3012").split(",").map(value=>value.trim()).filter(Boolean);
const cors=(origin:string|null)=>({"Access-Control-Allow-Origin":origin&&allowedOrigins.includes(origin)?origin:allowedOrigins[0],"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST, OPTIONS",Vary:"Origin"});
const json=(origin:string|null,body:unknown,status=200,extraHeaders:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),...extraHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async request=>{
  const origin=request.headers.get("Origin"),correlationId=crypto.randomUUID();
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=="POST")return json(origin,{error:"method_not_allowed",message:"POST is required.",correlationId},405);
  if(origin&&!allowedOrigins.includes(origin))return json(origin,{error:"origin_not_allowed",message:"This origin is not allowed.",correlationId},403);
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,authorization=request.headers.get("Authorization")||"";
  const callerClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user:caller},error:callerError}=await callerClient.auth.getUser();
  if(callerError||!caller)return json(origin,{error:"session_expired",message:"Your session expired. Sign in and retry.",correlationId},401);
  if(caller.app_metadata?.role!=="admin")return json(origin,{error:"unauthorized",message:"Administrator access is required.",correlationId},403);
  const admin=createClient(url,service);
  const limit=await checkRateLimit(admin,caller.id,"admin-role-control",RATE_LIMITS.mutation);
  if(!limit.allowed)return json(origin,{error:limit.error?"rate_limiter_unavailable":"rate_limited",message:limit.error?"The rate limiter is unavailable.":"Too many administrative actions.",correlationId},limit.error?503:429,limit.headers);
  let body:{action?:string;email?:string};
  try{body=await request.json()}catch{return json(origin,{error:"invalid_json",message:"A valid JSON body is required.",correlationId},400)}
  if(!["list","grant","revoke"].includes(body.action??""))return json(origin,{error:"invalid_action",message:"A valid role action is required.",correlationId},400);
  const users:User[]=[];let page=1;
  for(;;){const result=await admin.auth.admin.listUsers({page,perPage:1000});if(result.error)return json(origin,{error:"directory_unavailable",message:"The user directory is unavailable.",correlationId},502);users.push(...result.data.users);if(result.data.users.length<1000)break;page++}
  const admins=users.filter(user=>user.app_metadata?.role==="admin");
  if(body.action==="list")return json(origin,{users:admins.map(user=>({id:user.id,email:user.email}))});
  const email=body.email?.trim().toLowerCase()??"";
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json(origin,{error:"invalid_email",message:"A valid user email is required.",correlationId},400);
  const target=users.find(user=>user.email?.toLowerCase()===email);
  if(!target)return json(origin,{error:"not_found",message:"The user was not found.",correlationId},404);
  if(body.action==="revoke"&&(target.id===caller.id||admins.length<=1||target.app_metadata?.role==="super_admin"))return json(origin,{error:"protected_account",message:"This administrator role cannot be revoked here.",correlationId},409);
  const previousMetadata={...target.app_metadata},metadata={...target.app_metadata};
  if(body.action==="grant")metadata.role="admin";else delete metadata.role;
  const updated=await admin.auth.admin.updateUserById(target.id,{app_metadata:metadata});
  if(updated.error)return json(origin,{error:"auth_update_failed",message:"The administrator role could not be updated.",correlationId},502);
  const audit=await admin.from("admin_audit_log").insert({admin_id:caller.id,action:`admin_role_${body.action}`,entity_type:"user",entity_id:target.id,details:{source:"admin_role_control",correlation_id:correlationId,outcome:"succeeded",previous_values:{role:previousMetadata.role??null},new_values:{role:metadata.role??null}}});
  if(audit.error){const compensation=await admin.auth.admin.updateUserById(target.id,{app_metadata:previousMetadata});return json(origin,{error:"partial_failure",message:compensation.error?"Role and audit state diverged. Stop retries and contact support.":"Audit failed and the role change was rolled back. Refresh before retrying.",correlationId},500)}
  return json(origin,{ok:true,correlationId});
});
