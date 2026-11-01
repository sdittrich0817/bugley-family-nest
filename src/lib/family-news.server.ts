import { XMLParser } from 'fast-xml-parser';
import { relevantFamilyNews } from './family-news';
export async function fetchFamilyHeadlines() {
  const response=await fetch('https://news.google.com/rss/search?q=AI+children+parents+education+privacy+when:14d&hl=en-US&gl=US&ceid=US:en',{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('News discovery is unavailable. Try again later.');
  const xml=await response.text();
  if(xml.length>2000000)throw new Error('News feed was too large. Try again later.');
  const parsed=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(xml);
  const items=parsed?.rss?.channel?.item;
  const candidates=[];
  for(const item of (Array.isArray(items)?items:items?[items]:[])) {
    const title=String(item.title??'').replace(/<[^>]*>/g,'').slice(0,250);
    const url=String(item.link??'');const date=Date.parse(String(item.pubDate??''));
    if(!relevantFamilyNews(title)||!Number.isFinite(date)||date>Date.now()||date<Date.now()-14*86400000)continue;
    try {if(new URL(url).origin!=='https://news.google.com')continue;}catch{continue;}
    const publisher=typeof item.source==='string'?item.source:item.source?.['#text'];
    candidates.push({source_url:url,title,publisher:String(publisher??'News source').slice(0,120),source_date:new Date(date).toISOString(),status:'draft'});
    if(candidates.length===10)break;
  }
  return candidates;
}