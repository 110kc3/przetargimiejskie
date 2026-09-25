# Municipal TLS intermediate certificates

Retrieved 24 September 2026 from the issuing CA locations advertised in the
source certificates' Authority Information Access extension. DER certificates
were converted to PEM. Each live source chain was verified against Node 20.20.2's
bundled public roots with hostname verification; all 13 hosts passed again on
25 September. No municipal response or private key is stored here.

`../source-tls.js` maps each audited host to only its required intermediates.
They supplement Node's public roots with `rejectUnauthorized: true` and
`allowPartialTrustChain: false`: hostname, expiry and a complete chain to a public
root are required. No self-signed CA or leaf certificate is added. The ISRG Root
YR file is the **ISRG Root X1 cross-sign**, not a new trust anchor. There is no
runtime AIA download or acceptance of certificates supplied by a response.

When an issuer rotates, fetch its new intermediate from the CA, verify the
complete chain with Node's roots and the source hostname, then update the host
mapping, PEM and provenance here. Keep verification enabled when a source's leaf
expires or fails validation; normal refresh handling preserves last-good data.
The security-policy tests verify the bundled signatures reach existing public
roots and exercise rejection of untrusted, expired and wrong-host certificates.
See [Node TLS options](https://nodejs.org/docs/latest-v20.x/api/tls.html#tlscreatesecurecontextoptions).

| PEM file | Issuer distribution URL | SHA-256 of committed PEM |
|---|---|---|
| [certum-dv-tls-g2-r39-ca.pem](certum-dv-tls-g2-r39-ca.pem) | [CA download](http://certumdvtlsg2r39ca.repository.certum.pl/certumdvtlsg2r39ca.cer) | `15dad12a7b5c7d3a5716f9323cb038420074d0a376520bfa826deb383cb9c61a` |
| [certum-ev-tls-g2-r39-ca.pem](certum-ev-tls-g2-r39-ca.pem) | [CA download](http://certumevtlsg2r39ca.repository.certum.pl/certumevtlsg2r39ca.cer) | `1c60528381c14f39b5836a669ec536cdcbaaeb46c143a8d48b4265acd7c70951` |
| [certum-global-services-ca-sha2.pem](certum-global-services-ca-sha2.pem) | [CA download](http://repository.certum.pl/gscasha2.cer) | `9e3cc68df555b15ee29df4a062d0b82323366465fa4019827727b579afffd263` |
| [certum-ov-tls-g2-r39-ca.pem](certum-ov-tls-g2-r39-ca.pem) | [CA download](http://certumovtlsg2r39ca.repository.certum.pl/certumovtlsg2r39ca.cer) | `d296a2e439cbc9ccc9ef16d5570f62e80c47c3e9fd7f6f644f2fcb56e9ea3554` |
| [cyber-folks.pem](cyber-folks.pem) | [CA download](http://repository.certum.pl/cyberfolks2.cer) | `f82f9b94730fcd04e0ec9f395905c0190103f956c6ca18036734c2f4290a372d` |
| [gogetssl-rsa-dv-ca.pem](gogetssl-rsa-dv-ca.pem) | [CA download](http://crt.usertrust.com/GoGetSSLRSADVCA.crt) | `220386e620928a646a2650eff5df5bc59dd3e3d3e878b6fb4a9ec822e056a14e` |
| [home-pl-ov-tls-g2-r35-ca.pem](home-pl-ov-tls-g2-r35-ca.pem) | [CA download](http://homeplovtlsg2r35ca.repository.certum.pl/homeplovtlsg2r35ca.cer) | `7229d10ea37030224191eb67fb3e44a3590edc2a04dedc98614cc96945de865c` |
| [isrg-root-yr-cross-signed.pem](isrg-root-yr-cross-signed.pem) | [CA download](http://yr.i.lencr.org/) | `b3858d7a4d598b4ab6ed2892a1b8c0ee035154876dd40a082a3b05387eea11a4` |
| [sectigo-public-server-authentication-ca-dv-r36.pem](sectigo-public-server-authentication-ca-dv-r36.pem) | [CA download](http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt) | `b40358316fd9e1caaaab92c382927d2c13ef51b481eec9371a82e16c86f2a687` |
| [yr1.pem](yr1.pem) | [CA download](http://yr1.i.lencr.org/) | `d5efc243446ef865c0e165eb1958a2f068c9514aa17238701bd6f7ad90253ce7` |
