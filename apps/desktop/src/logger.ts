import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import logger from 'electron-log';

function getLogFilePath() {
  return path.join(app.getPath('userData'), 'logs', 'main.log');
}

logger.transports.file.resolvePathFn = () => getLogFilePath();

logger.transports.file.maxSize = 5 * 1024 * 1024;

logger.transports.file.archiveLogFn = (oldLogFile) => {
  const file = oldLogFile.toString();
  const info = path.parse(file);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    const rotatedFile = path.join(info.dir, `${info.name}.${timestamp}.old${info.ext}`);
    fs.renameSync(file, rotatedFile);

    const dir = info.dir;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(info.name) && f.endsWith(`.old${info.ext}`))
      .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
      .sort((a, b) => a.time - b.time);

    while (files.length > 5) {
      fs.unlinkSync(path.join(dir, files[0].name));
      files.shift();
    }
  } catch (e) {
    logger.warn('Could not rotate log', e);
  }
};

export { logger };
