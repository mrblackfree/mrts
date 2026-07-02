# MyRealTrip Souvenir Assistant

마이리얼트립 해커톤 제출용 Codex 플러그인과 Vercel 데모 웹앱입니다.

## Demo

- Production: https://mrt-souvenir.vercel.app
- Auto recommendation: https://mrt-souvenir.vercel.app/auto-recommend?source=plugin&user=demo&trip=philippines-bohol&country=philippines&city=bohol&stage=return-eve&recipient=coworkers

## Plugin

- Name: `myrealtrip-souvenir-assistant`
- Version: `1.9.0`
- Submission artifact: `submission.zip`
- Source bundle: `submission/src`

## What It Shows

- Booking-context based souvenir recommendation
- Guide, Passport, and Compare deep links from plugin responses
- Product comparison cards and tables
- Korean-safe PDF guide generation
- Souvenir passport sample save flow
- MVP-only sample/mock/estimated data

No real purchase, payment, delivery, inventory, or MyRealTrip account integration is included.

## Folders

- `demo/`: Next.js Vercel web app
- `submission/`: Codex plugin submission structure
- `submission.zip`: Final submit-ready ZIP

## Validation

The latest build passed with:

```bash
cd demo
npm run build
```

The plugin manifest and skill files were validated before generating `submission.zip`.
