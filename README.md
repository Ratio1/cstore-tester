# cstore-tester

`cstore-tester` is a tiny WAR payload for live CStore `hsync` verification on the thorn nodes. It keeps the surface area deliberately small so pair-level checks are easy to reason about and easy to reproduce.

The app does not orchestrate the experiment by itself. The root `apps-wrapper` repo owns deployment, stop/start of `dr1-thorn-02`, artifact capture, and teardown. This repo provides the HTTP surface that the root orchestrator uses during the experiment.

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

## Live Experiment Ownership

Use this repo when you need the WAR payload that gets deployed to:

- `dr1-thorn-01`
- `dr1-thorn-02`

Use the root `apps-wrapper` repo when you need to run the full end-to-end experiment:

- it deploys this app to both thorn nodes
- it seeds baseline and delta data
- it stops and restarts `dr1-thorn-02`
- it reruns deployment on `dr1-thorn-02` after restart
- it triggers `hsync`
- it writes the JSON artifact under `artifacts/cstore-tester/`

## Live Deployment Contract

- Image: `node:22`
- Command: `npm install`
- Start command: `npm start`
- Open route: `GET /health`
- Protected routes: `POST /seed`, `GET /snapshot`, `POST /hsync`

## End-To-End Execution Steps

Run the full thorn-node experiment from the root `apps-wrapper` checkout, not from inside this app repo:

```bash
cd /home/andrei/work/Ratio1/apps-wrapper
python scripts/cstore_tester/run_live_hsync_verification.py \
  --inventory scripts/cstore_tester/inventory.json \
  --artifact-dir artifacts/cstore-tester
```

The orchestrator uses `scripts/cstore_tester/inventory.json` for:

- thorn node SSH launchers
- `systemctl` stop and restart commands
- `systemctl is-active` status checks
- the `devnet` SDK network

If the run fails, inspect the artifact first and then inspect thorn logs:

```bash
.logins/dr1-thorn-01.sh
.logins/dr1-thorn-02.sh
~/show.sh
```

## Operator Checklist

Use this checklist when you run the live verifier:

1. Confirm `apps/cstore-tester` is on the commit you want and that commit is on `origin/main`.
2. Run `npm test` in this repo.
3. Run the root orchestrator command from `apps-wrapper`.
4. Wait for both deployed WAR apps to answer `GET /health`.
5. Confirm baseline seed succeeds on `dr1-thorn-01`.
6. Confirm baseline `hsync` succeeds on `dr1-thorn-02`.
7. Confirm `dr1-thorn-02` reaches `inactive`.
8. Confirm delta seed succeeds on `dr1-thorn-01` while `dr1-thorn-02` is down.
9. Confirm `dr1-thorn-02` returns to `active`.
10. Confirm the root orchestrator opens a fresh SDK session and redeploys this app on `dr1-thorn-02`.
11. Confirm the pre-`hsync` digest on restarted `dr1-thorn-02` is still stale.
12. Confirm the post-`hsync` digest on `dr1-thorn-02` matches the expected final digest from `dr1-thorn-01`.
13. Confirm the artifact verdict is `verified`.

## Today Experiment Timeline

Verified run on `2026-04-17`, session `8ec94ef56fe3`.

Artifact:
- `/home/andrei/work/Ratio1/apps-wrapper/.worktrees/apps-wrapper/cstore-tester-live-hsync/artifacts/cstore-tester/8ec94ef56fe3.json`

Timeline:
- `23:23:54` first SDK session started on `devnet`
- `23:23:57` first network-monitor snapshot arrived and thorn nodes were rediscovered
- `23:24:01` deploy command sent to `dr1-thorn-01`
- `23:24:04` deploy command sent to `dr1-thorn-02`
- `23:25:20` fresh SDK session started after the `dr1-thorn-02` restart
- `23:25:38` post-restart session reacquired node B and waited for node configs
- `23:26:08` node B config re-request fired before the redeploy
- `23:26:25` redeploy command for `cstore_tester_dr1_thorn_02` was accepted
- `23:26:31` both sessions closed and the artifact was written

Execution checkpoints from that run:
- initial node A URL: `http://2.tcp.eu.ngrok.io:11025`
- initial node B URL: `http://7.tcp.eu.ngrok.io:12839`
- restarted node B URL: `http://6.tcp.eu.ngrok.io:15676`
- baseline digest: `7a324481519aea9d65f898b7273a634e06fb2b4a861c277400d3bc371684fdf5`
- baseline `hsync` digest: `7a324481519aea9d65f898b7273a634e06fb2b4a861c277400d3bc371684fdf5`
- pre-`hsync` stale digest on restarted node B: `7a324481519aea9d65f898b7273a634e06fb2b4a861c277400d3bc371684fdf5`
- expected final digest: `4789fd2b03e12fdbf72ea767fd8537ba8d52b1cae5ab7559cd6af66b7f454bd0`
- post-`hsync` digest: `4789fd2b03e12fdbf72ea767fd8537ba8d52b1cae5ab7559cd6af66b7f454bd0`
- baseline merged fields: `4`
- post-`hsync` merged fields: `4`
- source peer reported by both `hsync` calls: `0xai_AgnygSlY8BwnmaCj6mItg36JHlG_Lh3UqqFaTPbuNzy0`
- final verdict: `verified`

## Publish Check

Before you run the thorn experiment, confirm this repo head matches `origin/main`:

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/main
```
