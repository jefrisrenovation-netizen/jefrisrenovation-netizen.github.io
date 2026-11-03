// Keep the review website aligned with the packaged application source.
import fs from 'node:fs';
let html=fs.readFileSync('source.html','utf8');
const runtime=fs.readFileSync('scripts/mobile-runtime.js','utf8');
const auth=runtime.slice(0,runtime.indexOf('async function handleAuthLink'));
const exporter=runtime.slice(runtime.indexOf('async function exportMobileReport'),runtime.indexOf('async function requestAccountDeletion')).replace('const doc=new jsPDF',"const [{jsPDF},{autoTable}]=await Promise.all([import('https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm'),import('https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.8/+esm')]);const doc=new jsPDF");
const filename=fs.readFileSync('src/helpers.mjs','utf8').slice(fs.readFileSync('src/helpers.mjs','utf8').indexOf('export function reportFilename')).replace('export function','function');
const deletion=runtime.slice(runtime.indexOf('async function requestAccountDeletion'));
const team=fs.readFileSync('scripts/team-runtime.js','utf8');
html=html.replace('</style>',fs.readFileSync('scripts/upgrade.css','utf8')+'</style>');
html=html.replace('emailRedirectTo:"suiviheurespro://login"','emailRedirectTo:"https://jefrisrenovation-netizen.github.io/preview/"');
html=html.replace('</script>\n</body>',auth+'\n'+deletion+'\n'+team+'\n'+filename+'\n'+exporter+'\n</script>\n</body>');
fs.writeFileSync('../preview/index.html',html);
