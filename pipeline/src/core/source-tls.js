// Reviewed intermediate chains for municipal sources that omit them on the wire.
// These supplement Node's public roots; certificate/hostname/expiry verification
// remains enabled. Never add a self-signed root, a leaf, or caller-supplied CA here.
import https from 'node:https';
import { rootCertificates } from 'node:tls';
import { readFileSync } from 'node:fs';

const SOURCE_CHAINS = new Map([
  ['bip.elblag.eu', ['certum-dv-tls-g2-r39-ca.pem']],
  ['bip.gmina-naklo.pl', ['sectigo-public-server-authentication-ca-dv-r36.pem']],
  ['bip.gmina-sepolno.pl', ['gogetssl-rsa-dv-ca.pem']],
  ['bip.gniezno.eu', ['home-pl-ov-tls-g2-r35-ca.pem']],
  ['bip.miastozabrze.pl', ['certum-ov-tls-g2-r39-ca.pem']],
  ['bip.um.lubin.pl', ['certum-ov-tls-g2-r39-ca.pem']],
  ['bip.wegorzewo.pl', ['certum-dv-tls-g2-r39-ca.pem']],
  ['bip.zlotoryja.pl', ['certum-dv-tls-g2-r39-ca.pem']],
  ['glogow.bip.info.pl', ['cyber-folks.pem', 'certum-global-services-ca-sha2.pem']],
  ['www.glogow.pl', ['yr1.pem', 'isrg-root-yr-cross-signed.pem']],
  ['www.gniezno.eu', ['home-pl-ov-tls-g2-r35-ca.pem']],
  ['www.um.boleslawiec.bip-gov.pl', ['certum-ev-tls-g2-r39-ca.pem']],
  ['xn--bolesawiec-e0b.pl', ['certum-ev-tls-g2-r39-ca.pem']],
]);
const agents = new Map();

export function isApprovedSourceTlsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && (!url.port || url.port === '443') && SOURCE_CHAINS.has(url.hostname);
  } catch {
    return false;
  }
}

export function getSourceTlsAgent(value) {
  if (!isApprovedSourceTlsUrl(value)) {
    throw new Error(`source TLS compatibility denied for non-allowlisted URL: ${value}`);
  }
  const host = new URL(value).hostname;
  if (!agents.has(host)) {
    const intermediates = SOURCE_CHAINS.get(host).map((name) =>
      readFileSync(new URL(`./certificates/${name}`, import.meta.url), 'utf8'));
    agents.set(host, new https.Agent({
      ca: [...rootCertificates, ...intermediates],
      rejectUnauthorized: true,
      allowPartialTrustChain: false,
      keepAlive: false,
    }));
  }
  return agents.get(host);
}
