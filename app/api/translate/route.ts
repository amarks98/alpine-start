/** AI translation is deliberately unavailable in the submission build. */
export async function POST() {
  return Response.json({ error: 'AI translation is planned for a future release. Use the example-format parser in the route editor.' },
    { status: 501, headers: { 'Cache-Control': 'no-store' } })
}
