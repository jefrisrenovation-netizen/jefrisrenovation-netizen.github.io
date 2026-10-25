export function subscriptionController({store,invoke,owner,onStatus}) {
 let busy=false;
 async function submit(jws){
  const account=owner();if(!account)throw new Error('Sign in first');
  const result=await invoke({jws});
  if(owner()!==account)throw new Error('Account changed');
  if(!result.transaction_id)throw new Error('Purchase verification incomplete');
  onStatus(result);await store.finish({transactionId:result.transaction_id});
  return result;
 }
 async function refresh(){
  const account=owner();if(!account)return;
  const result=await invoke({});
  if(owner()===account)onStatus(result);
  return result;
 }
 async function receipts(values){
  for(const jws of values)await submit(jws);
  return refresh();
 }
 async function action(kind){
  if(busy)return {status:'busy'};
  const account=owner();if(!account)throw new Error('Sign in first');
  busy=true;
  try{
   if(kind==='restore'){
    const result=await store.restore();
    if(owner()!==account)throw new Error('Account changed');
    await receipts(result.receipts||[]);return {status:'restored'};
   }
   const result=await store.purchase({accountToken:account});
   if(owner()!==account)throw new Error('Account changed');
   if(result.status==='purchased')await submit(result.jws);
   return result;
  }finally{busy=false;}
 }
 return {refresh,submit,receipts,purchase:()=>action('purchase'),restore:()=>action('restore')};
}
