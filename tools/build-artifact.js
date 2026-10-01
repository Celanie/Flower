/* Build the Artifact-hosted copy of the game.
 *
 * claude.ai wraps a published page in its own document skeleton — doctype,
 * <html>, <head> with a charset/viewport meta and a small reset, <body> — so a
 * page must NOT bring its own. The game is a complete standalone document,
 * because it also has to work on a plain static host, from a file:// URL, and
 * inside a Telegram WebView. Rather than keep two copies in step by hand, this
 * unwraps the one real file.
 *
 *   node tools/build-artifact.js        -> dist/parcel-and-petal.html
 *
 * Nothing about the game changes: same markup, same style, same script, in the
 * same order. Only the outer document furniture is removed, and one rule is
 * added to stop the skeleton's safe-area padding from being applied twice.
 */
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const head = src.slice(src.indexOf('<head>') + 6, src.indexOf('</head>'));
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));
if (!head || !body) throw new Error('index.html is not the document this expects');

// Everything from <head> except the parts the skeleton already provides.
// The viewport meta is kept: the skeleton's own does not suppress pinch-zoom,
// which fights the drag gestures. If the host ignores it, touch-action on the
// canvas still carries the important half of the job.
const keep = head
  .split('\n')
  .filter(l => !/<meta\s+charset/i.test(l))
  .join('\n')
  .trim();

const shim = `<style>
/* The artifact skeleton pads :root by the phone's safe-area insets. This game
   already seats its HUD and tab bar inside those insets itself, with env(), so
   without this the inset is paid for twice and the chrome drifts inward.
   !important because the skeleton's reset is not ours to reorder. */
:root{padding:0!important}
</style>
`;

const out = shim + keep + '\n' + body.trim() + '\n';

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const dest = path.join(ROOT, 'dist', 'parcel-and-petal.html');
fs.writeFileSync(dest, out);

const kb = n => (n / 1024).toFixed(1) + 'KB';
console.log(`${path.relative(ROOT, dest)}  ${kb(out.length)}`);
for (const tag of ['<!doctype', '<html', '<head', '<body', '</html>'])
  if (out.toLowerCase().includes(tag)) throw new Error('document furniture survived: ' + tag);
console.log('no document furniture; title:', (out.match(/<title>(.*?)<\/title>/) || [])[1]);
