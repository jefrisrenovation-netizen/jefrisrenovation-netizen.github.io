export const PRODUCT_ID = 'io.github.jefrisrenovationnetizen.suividesheures.monthly';
export const BUNDLE_ID = 'io.github.jefrisrenovation-netizen.suividesheures';
export const APP_ID = 6821356454;
// All dates supplied by the server. No client clock or user metadata is trusted.
export function billingStatus(account, config, entitlement, now = Date.now()) {
  if (!config.launch_at) return {can_write:true, phase:'prelaunch', access_until:null};
  const launch = Date.parse(config.launch_at);
  const end = new Date(launch);
  const day = end.getUTCDate();
  end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth()+3);
  const last = new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();
  end.setUTCDate(Math.min(day,last));
  const promoEnd = end.getTime();
  if (now < promoEnd) return {can_write:true, phase:'promotion', access_until:end.toISOString()};
  const trialEnd = Math.max(Date.parse(account.enrolled_at),promoEnd) + 20*86400000;
  if (entitlement && !entitlement.revoked_at && Date.parse(entitlement.expires_at)>now) {
    return {can_write:true,phase:'subscribed',access_until:entitlement.expires_at};
  }
  if (now < trialEnd) return {can_write:true,phase:'trial',access_until:new Date(trialEnd).toISOString()};
  return {can_write:false,phase:'expired',access_until:new Date(trialEnd).toISOString()};
}
export function transactionRecord(tx, ownerId) {
  if (tx.productId !== PRODUCT_ID || tx.bundleId !== BUNDLE_ID ||
      !tx.appAccountToken || tx.appAccountToken.toLowerCase() !== ownerId.toLowerCase() ||
      !tx.originalTransactionId || !tx.transactionId || !tx.expiresDate || !tx.signedDate ||
      !['Production','Sandbox'].includes(tx.environment)) throw new Error('Transaction does not belong to this account');
  return {owner_id:ownerId, original_transaction_id:tx.originalTransactionId,
    transaction_id:tx.transactionId,environment:tx.environment,
    expires_at:new Date(tx.expiresDate).toISOString(),
    revoked_at:tx.revocationDate?new Date(tx.revocationDate).toISOString():null,
    signed_at:new Date(tx.signedDate).toISOString()};
}
