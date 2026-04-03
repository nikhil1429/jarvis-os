# JARVIS OS — Smoke Test Checklist

Run before every deploy. Takes 5 minutes.

## Automated (run first)
```bash
npm run test        # 51 unit tests
npm run test:e2e    # 10 integration tests
```

## Manual (only if automated passes)

| # | Test | How | Expected |
|---|------|-----|----------|
| 1 | Boot | Refresh page | Reactor + boot text + ENTER button |
| 2 | CMD | After boot | Tasks visible, week pills work |
| 3 | TRAIN | Tap Chat | Input bar + can type + send |
| 4 | Voice | Tap mic in Chat | "Listening..." shows, JARVIS hears |
| 5 | LOG | Tap LOG tab | Check-in form loads (no crash) |
| 6 | DNA | Tap DNA tab | 35 concepts listed |
| 7 | STATS | Tap STATS tab | Scores + cards show |
| 8 | WINS | Tap WINS tab | Achievement list shows |
| 9 | Settings | Tap gear icon | Settings panel opens |
| 10 | API | Send message | JARVIS responds (not 401) |

## After Deploy
- Open Vercel URL on phone
- Boot loads on HTTPS
- Mic works (requires HTTPS)
- Check Sentry for any errors
