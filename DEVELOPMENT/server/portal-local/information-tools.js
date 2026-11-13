'use strict';
// These tools are local-only. HTTP owner identity comes from the existing
// HttpOnly paired session, never from the request body or a model tool schema.
const questions=Object.freeze({
  get_my_grade:'What is my current grade?',
  get_my_team:'Who is on my current team?',
  get_my_sprint_cards:'Which sprint cards are assigned to me?',
  get_my_cards:'Which sprint cards are assigned to me?',
  get_my_standups:'Did I submit my standup this week?',
  get_my_meetings:'When is my next meeting?',
  get_my_deadlines:'What are my upcoming deadlines?',
  get_my_team_standing:'What is my team standing?'
});
async function informationTool(service,owner,input){
  if(!input||Object.keys(input).some(k=>k!=='tool')||!Object.hasOwn(questions,input.tool))throw new Error('Unsupported information tool.');
  if(input.tool==='get_my_grade')return{personal:true,status:'unavailable',sources:[],answer:'Grade is intentionally excluded from the approved connector. A portal-owner-approved interface is required.'};
  if(!owner||service.owner!==owner||service.status(owner).state!=='connected')return {personal:true,status:'unavailable',sources:[],answer:'Connect and verify your own approved local portal session first.'};
  const result=await service.search(owner,{question:questions[input.tool]});
  if(!result.personal)return{personal:true,status:'unavailable',sources:[],answer:'No verified personal source is available.'};
  return{...result,tool:input.tool,dataState:result.sources?.length?'verified-excerpts':'unavailable',storage:'session-memory-only',provider:'deterministic'};
}
module.exports={questions,informationTool};
