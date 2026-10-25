/** Aqar GraphQL client (server only). Uses the AQAR_API_KEY secret; data is shown only in a separate "Aqar" layer with source + fetched-at tags. */
const ENDPOINT = "https://sa.aqar.fm/graphql";

export async function aqarQuery<T = unknown>(query: string, variables: Record<string, unknown> = {}): Promise<{ data: T; fetchedAt: string }> {
  const key = process.env["AQAR_API_KEY"];
  if (!key) throw new Error("AQAR_API_KEY not configured");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Aqar request failed [${res.status}]: ${text.slice(0, 300)}`);
  let body: { data?: T; errors?: { message: string }[] };
  try { body = JSON.parse(text); } catch { throw new Error(`Aqar returned non-JSON: ${text.slice(0, 200)}`); }
  if (body.errors?.length) throw new Error(`Aqar GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`);
  return { data: body.data as T, fetchedAt: new Date().toISOString() };
}

/** Lists root query fields and their types, to find asking price, listing count, district id and listing date fields. */
export async function aqarSchemaSummary() {
  const { data } = await aqarQuery<{ __schema: { queryType: { fields: { name: string; type: { name: string | null; ofType: { name: string | null } | null } }[] } } }>(
    `{ __schema { queryType { fields { name type { name ofType { name } } } } } }`,
  );
  return data.__schema.queryType.fields.map((f) => ({ name: f.name, type: f.type.name ?? f.type.ofType?.name ?? null }));
}
