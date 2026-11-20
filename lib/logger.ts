type Details = unknown[];

const enabled = process.env.NODE_ENV !== 'production';

export const logger = {
  debug(message: string, ...details: Details) {
    if (enabled) console.debug(message, ...details);
  },
  warn(message: string, ...details: Details) {
    if (enabled) console.warn(message, ...details);
  },
  error(message: string, ...details: Details) {
    console.error(message, ...details);
  },
};
