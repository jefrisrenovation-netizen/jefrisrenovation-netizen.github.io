// Keep the review website aligned with the packaged application source.
import fs from 'node:fs';
let html=fs.readFileSync('source.html','utf8');
const runtime=fs.readFileSync('scripts/mobile-runtime.js','utf8');
const auth=runtime.slice(0,runtime.indexOf('async function handleAuthLink'));
const deletion=runtime.slice(runtime.indexOf('async function requestAccountDeletion'));
const team=fs.readFileSync('scripts/team-runtime.js','utf8');
html=html.replace('</style>',fs.readFileSync('scripts/upgrade.css','utf8')+'</style>');
html=html.replace('emailRedirectTo:"suiviheurespro://login"','emailRedirectTo:"https://jefrisrenovation-netizen.github.io/preview/"');
html=html.replace('</script>\n</body>',auth+'\n'+deletion+'\n'+team+'\n</script>\n</body>');
fs.writeFileSync('../preview/index.html',html);
