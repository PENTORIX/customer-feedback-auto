# Customer Feedback — automatic image workflow

This version removes the manual `data.js` process.

## Folder structure

Upload screenshots only:

```text
images/
├── feedback/
│   ├── esim/
│   ├── iwanttfc/
│   └── other/
└── resolved/
    ├── esim/
    ├── iwanttfc/
    └── other/
```

The **folder** determines the product and whether it is normal feedback or a resolved issue.

The GitHub Action runs OCR on each screenshot and creates `feedback-index.json` automatically. Vercel then deploys the updated site.

## Your workflow

1. Upload a screenshot to the correct product folder.
2. Commit the upload.
3. GitHub Actions runs OCR automatically.
4. It updates `feedback-index.json`.
5. Vercel sees the new commit and redeploys.
6. The screenshot appears on the website.

No `data.js` editing and no date required.

### Example

Upload:

`images/feedback/esim/screenshot.jpg`

The site shows:

`👤 [name read from screenshot]`
`🛒 eSIM`

Upload to:

`images/resolved/iwanttfc/screenshot.jpg`

The site shows:

`👤 [name read from screenshot]`
`🛒 iWantTFC`
`🟢 Resolved`

## Important

OCR is automatic, but screenshot layouts can vary. The included OCR is tuned to look at the left/profile area first because that is where the username appears in the forum screenshot you provided. If a particular screenshot layout is different, the OCR may need a small adjustment.
