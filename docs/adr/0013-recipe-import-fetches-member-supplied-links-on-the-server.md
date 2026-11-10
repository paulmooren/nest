# Recipe import fetches Member-supplied links on the server, public addresses only

When a Member pastes a link on a new Recipe and chooses "Import from link", the Nest server downloads that page and reads the schema.org recipe data in it into a draft. The browser cannot do this itself: most recipe sites do not allow other sites to read their pages. So the server makes a request to an address a Member typed, which is the first time Nest does that.

A server that fetches any address it is given can be pointed at things only it can reach: the database host, the cloud provider's metadata address, a service on the same machine. So the fetch is limited to http and https, and refuses any address that is not on the public internet (loopback, private ranges, link-local, unique-local). The check runs when the connection is made, not only on the text of the link, so a name that resolves differently a second later does not get through, and it runs again on every redirect (at most four). A fetch gets 5 seconds and 2 MB, sends no cookies, and the result is only ever shown in the editor: nothing is saved until the Member saves.

We chose this over importing in the browser (blocked by the sites), over a third-party scraping service (sends every link the Household uses to a company, and adds a dependency and a cost), and over leaving import out (typing ingredients by hand is the main reason people give up on a recipe app). Pages that publish no recipe data are not parsed from their visible text; the Member is told and types it in, with the link kept.

## Consequences

- The server holds a small, strict fetch helper (`src/server/fetch-public-url.ts`). Anything else that later needs to fetch a Member-supplied address should reuse it rather than calling `fetch` directly.
- Import is as good as the page's structured data. Most large recipe sites publish it; some small blogs and paywalled pages do not.
- A Member can make the server request any public address. The 5-second and 2 MB limits and the sign-in requirement bound that, and each Member gets 30 attempts an hour (every attempt counts, also the ones that find no recipe).
