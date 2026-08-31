# AHProfit

Project structure

- api-hono/ — API built with Hono + SQLite (kysely)
- web-react/ — frontend built with React + Vite + Tailwind
- desktop-webview/ — web view used for packaging the desktop app

Running

You need Bun (https://bun.sh).

    bun install
    bun run dev

This starts the API and the frontend together. The frontend runs at
http://localhost:5173 and the API at http://localhost:3000.

Desktop build

    cd desktop-webview
    bun run build:win-x64

Replace win-x64 with linux-x64, linux-arm64, darwin-x64 or darwin-arm64
depending on your system. The executable is written to desktop-webview/build/.

License

This project is licensed under the GNU Affero General Public License v3.0.
You are free to use, modify and share it, but any derivative work must also
be released as open source under the AGPL-3.0, keeping the original
authorship notices. This also applies when the software is run as a network
service: users interacting with it over a network must be able to get the
corresponding source. See the LICENSE file for the full text.