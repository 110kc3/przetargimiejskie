export const ENGINE_STATUS = {
  'nefeni-bip': 'headline-only',
  'madkom-bip': 'headline-only',
  'bipinfo-bip': 'headline-only',
  'rekordsi-bip': 'headline-only',
  'logonet-bip': 'unverified',
  'biplubelskie-bip': 'unverified',
  'wokiss-bip': 'unverified',
  'systemdobip': 'unverified',
  'biuletynnet-bip': 'unverified',
  'conceptintermedia-bip': 'unverified',
  'smartsite-bip': 'unverified',
};

export const PUBLISHABLE_ENGINE_STATUS = 'priced';

export function isEnginePublishable(engine) {
  return engine === undefined || ENGINE_STATUS[engine] === PUBLISHABLE_ENGINE_STATUS;
}
