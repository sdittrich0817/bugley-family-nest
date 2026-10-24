import {describe,expect,it} from 'vitest';
import {PAIR_SECONDS,PIN_ATTEMPTS,childAuthorized,deviceAvailable,pairingAvailable} from '@/lib/kid-device-rules';
import {refusesKidsWorker} from '@/lib/kids-pwa';
describe('Trusted kid device rules',()=>{
 it('expires pairing at exactly ten minutes',()=>{expect(PAIR_SECONDS).toBe(600);const pair={expires_at:new Date(600000).toISOString(),consumed_at:null};expect(pairingAvailable(pair,599999)).toBe(true);expect(pairingAvailable(pair,600000)).toBe(false);});
 it('does not replay consumed pairing',()=>expect(pairingAvailable({expires_at:new Date(900000).toISOString(),consumed_at:new Date(1).toISOString()},2)).toBe(false));
 it('revokes a device immediately',()=>expect(deviceAvailable({expires_at:new Date(900000).toISOString(),revoked_at:new Date(1).toISOString()},2)).toBe(false));
 it('requires selected child and denies another child',()=>{expect(childAuthorized(null,'a')).toBe(false);expect(childAuthorized('a','a')).toBe(true);expect(childAuthorized('a','b')).toBe(false);});
 it('limits PIN attempts to five',()=>expect(PIN_ATTEMPTS).toBe(5));
 it('does not register offline workers in previews',()=>{expect(refusesKidsWorker('id-preview--example.lovable.app',true,false,false)).toBe(true);expect(refusesKidsWorker('preview-2--example.gpt-eng.com',true,false,false)).toBe(true);expect(refusesKidsWorker('bugley.app',true,false,false)).toBe(false);expect(refusesKidsWorker('bugley.app',true,true,false)).toBe(true);expect(refusesKidsWorker('bugley.app',true,false,true)).toBe(true);});
});