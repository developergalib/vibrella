/**
 * Generate a bcrypt hash for the Vibrella admin password — WITHOUT storing the password.
 * Usage: npm run hash
 * It prompts for the password (input is hidden), prints ONLY the bcrypt hash.
 * Copy that hash into ADMIN_PASSWORD_HASH in .env.local / Vercel env vars.
 * Never paste the plain password into any file, chat, or commit.
 */
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const q = (msg) => new Promise((res) => rl.question(msg, res));

// Hide typed input by muting stdout while typing.
function hiddenQuestion(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const onData = (ch) => {
      const s = ch.toString();
      if (s === '\r' || s === '\n') { stdin.removeListener('data', onData); process.stdout.write('\n'); resolve(buf); }
      else if (ch[0] === 3) process.exit(1);
      else if (ch[0] === 127) { buf = buf.slice(0, -1); }
      else buf += s;
    };
    let buf = '';
    process.stdout.write(prompt);
    stdin.on('data', onData);
  });
}

const password = await hiddenQuestion('Enter new admin password (hidden): ');
const confirm = await hiddenQuestion('Confirm admin password (hidden): ');
rl.close();
if (!password || password !== confirm) { console.error('Passwords do not match. Try again.'); process.exit(1); }
if (password.length < 10) { console.error('Use at least 10 characters.'); process.exit(1); }
const hash = await bcrypt.hash(password, 12);
console.log('\nCopy this hash into ADMIN_PASSWORD_HASH (do NOT copy the password):\n');
console.log(hash);
