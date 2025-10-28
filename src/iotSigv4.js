import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';

export async function buildPresignedUrl({ region, endpointWss, credentials }) {
  const host = endpointWss.replace(/^wss:\/\/([^/]+)\/mqtt$/, '$1');

  const signer = new SignatureV4({
    service: 'iotdevicegateway',
    region,
    credentials,
    sha256: Sha256,
  });

  const request = new HttpRequest({
    protocol: 'https:',
    method: 'GET',
    hostname: host,
    path: '/mqtt',
    headers: { host },
    query: {},
  });

  const signed = await signer.presign(request, { expiresIn: 900 });

  if (credentials.sessionToken) {
    signed.query = signed.query || {};
    signed.query['X-Amz-Security-Token'] = credentials.sessionToken;
  }

  const qs = new URLSearchParams(signed.query || {}).toString();
  return `wss://${host}${signed.path}${qs ? `?${qs}` : ''}`;
}
