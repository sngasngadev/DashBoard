import type { CardRecord } from '../types/dashboard';
import { nearestFreePosition, repairOverlaps } from './layout';

export function mainCards(cards:CardRecord[]):CardRecord[]{
  return cards.filter(card=>card.showOnMain!==false);
}
export function mergeMainCards(all:CardRecord[],updated:CardRecord[]):CardRecord[]{
  const byId=new Map(updated.map(card=>[card.id,card]));
  return all.map(card=>byId.get(card.id)||card);
}
export function repairMainCards(all:CardRecord[]):CardRecord[]{
  return mergeMainCards(all,repairOverlaps(mainCards(all)));
}
export function setCardMainVisibility(cards:CardRecord[],id:string,show:boolean):CardRecord[]{
  const target=cards.find(card=>card.id===id);
  if(!target)return cards;
  if(!show)return cards.map(card=>card.id===id?{...card,showOnMain:false}:card);
  const others=mainCards(cards).filter(card=>card.id!==id);
  const layout=nearestFreePosition(others.map(card=>card.layout),target.layout);
  return cards.map(card=>card.id===id?{...card,showOnMain:true,layout}:card);
}
