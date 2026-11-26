export interface Manifest { completed: boolean; count: number; paths: string[] }
export interface DeleteServices {
  prepare(ids: string[]): Promise<string>;
  manifest(batch: string): Promise<Manifest>;
  remove(paths: string[]): Promise<void>;
  finalize(batch: string): Promise<number>;
}

/** Files first; a failed cleanup leaves the durable batch available for retry. */
export async function deleteEvaluations(services: DeleteServices, input: { ids?: string[]; batch_id?: string }) {
  const batch = input.batch_id ?? await services.prepare(input.ids ?? []);
  for (let attempt = 0; attempt < 3; attempt++) {
    const manifest = await services.manifest(batch);
    if (manifest.completed) return { batch_id: batch, count: manifest.count };
    if (!manifest.paths.length) return { batch_id: batch, count: await services.finalize(batch) };
    for (let start = 0; start < manifest.paths.length; start += 100) {
      await services.remove(manifest.paths.slice(start, start + 100));
    }
  }
  const remaining = await services.manifest(batch);
  if (remaining.paths.length) throw new Error("Pembersihan foto belum selesai. Lanjutkan penghapusan tertunda.");
  return { batch_id: batch, count: await services.finalize(batch) };
}