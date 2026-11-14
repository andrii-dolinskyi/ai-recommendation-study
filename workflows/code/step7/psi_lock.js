// one PageSpeed run at a time: two runs side by side slow each other down and get refused by the API.
// each run writes 'start:<execution>' and, when done, 'end:<execution>'; skip this run while another run
// has started in the last 45 minutes and not ended (a crashed run's lock expires).
const rows = $('Get Lock').all().map(i => i.json).filter(r => r.name === 'psi');
const ended = new Set(rows.filter(r => /^end:/.test(String(r.state))).map(r => String(r.state).slice(4)));
const active = rows.filter(r => /^start:/.test(String(r.state)) && !ended.has(String(r.state).slice(6)) && Date.now() - Date.parse(r.at) < 45 * 60000);
if (active.length) return [];
return [{ json: { name: 'psi', state: 'start:' + $execution.id, at: new Date().toISOString() } }];
