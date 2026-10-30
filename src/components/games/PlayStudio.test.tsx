import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayStudio } from './PlayStudio';

const calls=vi.hoisted(()=>({move:vi.fn(),start:vi.fn()}));
vi.mock('@/lib/stripe',()=>({getStripeEnvironment:()=> 'sandbox'}));
vi.mock('@/lib/play.functions',()=>({getPlayHome:vi.fn(async()=>({stickers:[],badges:[],dex:[],rounds:[],players:[]})),startPlay:calls.start,playMove:calls.move,finishPlay:vi.fn()}));
vi.mock('@/lib/play-extra.functions',()=>({getDashShelf:vi.fn(async()=>({heroes:[],remixes:[]}))}));
vi.mock('@/components/studio/Sidekick',()=>({speak:vi.fn(),useVoiceInput:()=>({supported:false})}));
vi.mock('./ExtraRound',()=>({ExtraRound:()=>null}));
vi.mock('./DoodleCanvas',()=>({DoodleCanvas:({onChange}:{onChange:(s:unknown[])=>void})=><button onClick={()=>onChange([{color:0,points:[[0.2,0.2],[0.4,0.4]]}])}>Draw test line</button>}));

describe('Doodle guessing control',()=>{
 afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks();});
 it('waits for the child to request a guess, then sends their strokes',async()=>{
  const state={turn:0,moves:0,words:[]};
  calls.start.mockResolvedValue({id:'round',endsAt:new Date(Date.now()+240000).toISOString(),state});
  calls.move.mockResolvedValue({expired:false,state:{...state,drawGuesses:1,drawingGuessed:true,feedback:"It's a sun! I got it!",doodle:{guesses:[{name:'sun',pct:80}],noticed:['a circle']}}});
  const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
  const child={id:'child',nickname:'Player',age_band:'explorers',bugley_stage:'scout'};
  render(<QueryClientProvider client={qc}><PlayStudio child={child as any} family={[child as any]} start="doodle_duel"/></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Let’s play!'}));
  await screen.findByRole('button',{name:'Draw test line'});
  expect(screen.getByRole('button',{name:'Guess my doodle!'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Draw test line'}));
  vi.useFakeTimers();
  await act(async()=>{vi.advanceTimersByTime(16000);});
  expect(calls.move).not.toHaveBeenCalled();
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Guess my doodle!'}));});
  expect(calls.move).toHaveBeenCalledTimes(1);
  expect(calls.move.mock.calls[0]?.[0].data.strokes).toEqual([{color:0,points:[[0.2,0.2],[0.4,0.4]]}]);
  expect(screen.getByText('I got it!',{exact:false})).toBeInTheDocument();
 });
});