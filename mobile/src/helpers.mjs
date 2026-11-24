export function authTokens(raw){
  try{
    const url=new URL(raw);
    const universal=url.protocol==='https:'&&url.hostname==='jefrisrenovation-netizen.github.io'&&url.pathname==='/';
    const custom=url.protocol==='suiviheurespro:'&&url.hostname==='login';
    if(!universal&&!custom)return null;
    const hash=new URLSearchParams(url.hash.slice(1));
    const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
    return access_token&&refresh_token?{access_token,refresh_token}:null;
  }catch{return null}
}
export function reportFilename(mode,month){
  const isMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const [from,to,...extra]=String(month??'').split('_to_');
  const isCompanyPeriod=mode==='print-company'&&(month==='all'||(isMonth(from)&&isMonth(to)&&from<=to&&!extra.length));
  if(!isMonth(month)&&!isCompanyPeriod)throw new Error('Invalid report month');
  return `suivi-${mode==='print-company'?'equipe':'individuel'}-${month}.pdf`;
}
