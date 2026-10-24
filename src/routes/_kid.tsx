import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { kidDeviceStatus } from '@/lib/kid-device.functions';
import { supabase } from '@/integrations/supabase/client';
export const Route=createFileRoute('/_kid')({ssr:false,beforeLoad:async()=>{
  const device=await kidDeviceStatus();if(device.trusted)return;
  if(device.invalid)throw redirect({to:'/kids-entry'});
  const {data}=await supabase.auth.getUser();if(!data.user)throw redirect({to:'/kids-entry'});
},component:Outlet});