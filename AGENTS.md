# Capstone AI Chat project guidance

## Project boundary

This is the standalone Capstone AI Chat project. Do not place its files inside HelpDesk INC or change that project's files for Capstone work.

## Keep teammate documentation current

The user explicitly requested an ongoing guide for teammates to download, run, and test this project in VS Code.

- Treat `TEAM_SETUP_GUIDE.md` as the canonical teammate onboarding/testing document.
- For changes affecting requirements, installation, scripts, ports, environment variables, authentication, ticket storage, UI labels used by the guide, or test expectations, update the guide in the same change.
- Keep README startup instructions and links consistent with the guide. Avoid personal machine paths in teammate instructions.
- Recheck the documented commands and relevant sample flows. Update the last-verified date and tested versions only for checks actually completed; report untested platforms honestly.
- Document Windows PowerShell commands with `npm.cmd` and preserve the missing-`package.json` troubleshooting guidance.
- Preserve the distinction between the local sample account and real FIU authentication, local tickets and professor email, and a recorded privacy preference and actual authorization.
- Keep test tickets, real student data, cookies, credentials, and `.env` files out of Git. Use fictional data for verification.
- When a source backup is requested, include the matching guide and application changes together; otherwise do not infer permission to push or deploy.

Do not claim the document updates automatically in the background. Maintain it as part of future project work.
