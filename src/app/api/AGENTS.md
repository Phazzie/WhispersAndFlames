# Route Handler Ownership

Own `src/app/api/**`. Keep handlers thin: parse Zod input, extract the bearer token, call `GameRepository`, and map stable errors.

- Never log bodies, authorization headers, room tokens, answers, or provider content.
- Return `Cache-Control: no-store` for every response.
- Do not keep game state in route modules; obtain the lazy repository singleton.
- Revalidate room membership inside the repository for every operation.
