export function username(value:unknown){const v=String(value||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(v))throw Error('invalid_username');return v;}
export function monthRange(value:unknown){const v=String(value||'');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v))throw Error('invalid_month');const [y,m]=v.split('-').map(Number);return {start:v+'-01',end:v+'-'+String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')};}
export function dayInput(body:Record<string,unknown>){
 const date=String(body.work_date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('invalid_date');
 const time=(v:unknown)=>{const t=String(v||'');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))throw Error('invalid_time');return t;};
 const pause=Number(body.break_minutes);if(!Number.isInteger(pause)||pause<0||pause>1440)throw Error('invalid_break');
 return {work_date:date,entry_time:time(body.entry_time),exit_time:time(body.exit_time),break_minutes:pause,workplace:String(body.workplace||'').trim().slice(0,300),notes:String(body.notes||'').slice(0,1000)};
}
