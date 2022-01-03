import { mkdir, rm } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { EggContextHttpClient } from 'egg';
import dayjs from './dayjs';

export async function createTempfile(dataDir: string, filename: string) {
  // will auto clean on CleanTempDir Schedule
  const tmpdir = path.join(dataDir, 'downloads', dayjs().format('YYYY/MM/DD'));
  await mkdir(tmpdir, { recursive: true });
  const tmpfile = path.join(tmpdir, `${randomBytes(10).toString('hex')}-${path.basename(filename)}`);
  return tmpfile;
}

export async function downloadToTempfile(httpclient: EggContextHttpClient, dataDir: string, url: string) {
  const tmpfile = await createTempfile(dataDir, url);
  const writeStream = createWriteStream(tmpfile);
  try {
    // max 10 mins to download
    // FIXME: should show download progress
    const { status, headers, res } = await httpclient.request(url, {
      timeout: 60000 * 10,
      writeStream,
      timing: true,
      followRedirect: true,
    });
    if (status !== 200) {
      const err = new Error(`Download ${url} status(${status}) invalid`);
      err.name = 'DownloadStatusInvalidError';
      throw err;
    }
    return {
      tmpfile,
      headers,
      timing: res.timing,
    };
  } catch (err) {
    await rm(tmpfile, { force: true });
    throw err;
  }
}
