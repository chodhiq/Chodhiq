import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(new URL('../chodhiq/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');

const required=['STAGING_SUPABASE_URL','STAGING_SERVICE_ROLE_KEY','CONFIRM_STAGING_PROJECT_REF'];
const missing=required.filter(key=>!process.env[key]);
if(missing.length) throw new Error(`Refusing reset. Missing: ${missing.join(', ')}`);
const ref=new URL(process.env.STAGING_SUPABASE_URL).hostname.split('.')[0];
assert.equal(ref,process.env.CONFIRM_STAGING_PROJECT_REF,'Confirmed project ref does not match the Supabase URL');
assert.equal(ref,'ljhncdzhzoatonhhofbv','Staging reset cannot run against another project');
if(!/^[a-z]{20}$/.test(ref)) throw new Error('Refusing reset: invalid project ref');
if(process.env.CONFIRM_RESET !== 'RESET DEMO DATA') throw new Error('Refusing reset. Set CONFIRM_RESET exactly to RESET DEMO DATA');

const db=createClient(process.env.STAGING_SUPABASE_URL,process.env.STAGING_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const providerResult=await db.from('providers').select('id').ilike('business_name','Demo —%');
if(providerResult.error) throw providerResult.error;
const ids=(providerResult.data||[]).map(row=>row.id);
if(!ids.length){console.log('No scoped Demo — providers found; nothing changed.');process.exit(0)}
if(ids.length>100) throw new Error(`Refusing reset: unexpectedly found ${ids.length} demo providers`);
for(const table of ['bookings','quote_requests','reviews','community_posts','provider_reports','verification_requests']){
  const {error}=await db.from(table).delete().in('provider_id',ids);
  if(error) throw new Error(`${table}: ${error.message}`);
}
const removed=await db.from('providers').delete().in('id',ids).ilike('business_name','Demo —%');
if(removed.error) throw removed.error;
console.log(`Reset ${ids.length} scoped Demo — provider fixture(s) in confirmed staging project ${ref}.`);
