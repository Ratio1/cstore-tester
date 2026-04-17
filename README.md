# cstore-tester

`cstore-tester` is a tiny WAR payload for live CStore `hsync` verification on the thorn nodes. It keeps the surface area deliberately small so pair-level checks are easy to reason about and easy to reproduce.

## Endpoints

- `GET /health` is open and returns `ready`, `hostAlias`, `hostAddr`, and `version`.
- `POST /seed` is protected with a bearer token.
- `GET /snapshot` is protected with a bearer token.
- `POST /hsync` is protected with a bearer token.

## Environment

- `PORT` sets the listen port.
- `LISTEN_HOST` sets the bind host.
- `CSTORE_TESTER_BEARER_TOKEN` provides the shared bearer token for protected routes.
- `R1EN_HOST_ID` or `EE_HOST_ID` provides the host alias.
- `R1EN_HOST_ADDR` or `EE_HOST_ADDR` provides the host address.
- Live CStore env is injected by the WAR runtime, including variables such as `EE_CHAINSTORE_API_URL`.

## Local Verification

```bash
npm install
npm test
```

## Live Deployment Contract

- Image: `node:22`
- Command: `npm install`
- Start command: `npm start`
- Open route: `GET /health`
- Protected routes: `POST /seed`, `GET /snapshot`, `POST /hsync`
