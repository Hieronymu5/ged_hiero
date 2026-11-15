// Builds the app with when it was built, as GED_HIERO_BUILT (an ISO 8601 timestamp), for the
// file load screen. SOURCE_DATE_EPOCH, in seconds, sets it instead, for reproducible builds.
// Anything after `npm run build --` goes on to `ng build`.
import { spawnSync } from 'node:child_process';

const epoch = process.env.SOURCE_DATE_EPOCH?.trim();
const seconds = epoch ? Number(epoch) : NaN;
const built = (Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date()).toISOString();

const result = spawnSync(
  'ng',
  ['build', '--define', `GED_HIERO_BUILT=${JSON.stringify(built)}`, ...process.argv.slice(2)],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
