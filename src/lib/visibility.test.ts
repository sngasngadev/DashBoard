import {describe,it,expect} from 'vitest';
import {createCard, normalizeState} from './state';
import {mainCards, mergeMainCards, setCardMainVisibility} from './visibility';

describe('tab-only cards and main dashboard layout',()=>{
  it('does not reserve space for cards hidden from main',()=>{
    const first=createCard('todo',[]);
    const hidden={...createCard('memo',[first]),showOnMain:false};
    const newcomer=createCard('schedule',mainCards([first,hidden]));
    expect(newcomer.layout.x).toBe(first.layout.w);
    expect(mainCards([first,hidden,newcomer])).toHaveLength(2);
  });
  it('does not move any existing visible cards when a card is re-shown',()=>{
    const first=createCard('todo',[]);
    const hidden={...createCard('memo',[first]),showOnMain:false,layout:{...first.layout}};
    const existing=createCard('schedule',[first]);
    const result=setCardMainVisibility([first,hidden,existing],hidden.id,true);
    expect(result.find(x=>x.id===first.id)?.layout).toEqual(first.layout);
    expect(result.find(x=>x.id===existing.id)?.layout).toEqual(existing.layout);
    expect(result.find(x=>x.id===hidden.id)?.layout).not.toEqual(first.layout);
  });
  it('preserves tabs and hidden layout through normalization',()=>{
    const first=createCard('todo',[]);
    const hidden={...createCard('memo',[first]),showOnMain:false,layout:{...first.layout}};
    const raw={version:1,meta:{title:'테스트'},settings:{autoCompact:false},cards:[first,hidden],tabOrder:[hidden.id,first.id]};
    const state=normalizeState(raw);
    expect(state.cards).toHaveLength(2);
    expect(state.cards.find(x=>x.id===hidden.id)?.showOnMain).toBe(false);
    expect(state.tabOrder).toEqual([hidden.id,first.id]);
    expect(state.cards.find(x=>x.id===hidden.id)?.layout).toEqual(hidden.layout);
  });
  it('merges only visible card positions back into persistent card array',()=>{
    const first=createCard('todo',[]);
    const hidden={...createCard('memo',[first]),showOnMain:false};
    const updated={...first,layout:{...first.layout,y:12}};
    const result=mergeMainCards([first,hidden],[updated]);
    expect(result[0].layout.y).toBe(12);
    expect(result[1]).toEqual(hidden);
  });
});
