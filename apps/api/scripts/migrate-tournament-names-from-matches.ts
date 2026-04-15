/**
 * One-off migration: for each distinct trimmed `tournamentName` on matches that
 * are not yet linked to a `Tournament` document, ensure a `Tournament` exists
 * and set `match.tournament` to that id. Keeps `tournamentName` unchanged.
 *
 * Idempotent: skips matches that already have `tournament` set; reuses an
 * existing tournament row if `name` exactly matches (after trim on the match side).
 *
 * Usage (from apps/api):
 *   npm run migrate:tournament-names
 *   npm run migrate:tournament-names -- --dry-run
 *
 * Env: MONGODB_URI (optional; defaults match Nest `constants`).
 */
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { DEFAULT_DB_NAME, DEFAULT_MONGODB_URI } from '../src/constants';

const dryRun = process.argv.includes('--dry-run');

/** Mongoose default collection names for `Match` and `Tournament` models. */
const MATCHES = 'matches';
const TOURNAMENTS = 'tournaments';

async function main(): Promise<void> {
  const uri ="";
  console.log(`Connecting to MongoDB (${dryRun ? 'dry-run' : 'write'})…`);
  await mongoose.connect(uri, {
    dbName: DEFAULT_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
  });

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No database handle after connect');
  }

  const matchesColl = db.collection(MATCHES);
  const tournamentsColl = db.collection(TOURNAMENTS);

  const groups = await matchesColl
    .aggregate<{
      _id: string;
      matchIds: Types.ObjectId[];
      minPlayedAt: Date | null;
      count: number;
    }>([
      {
        $match: {
          $or: [{ tournament: { $exists: false } }, { tournament: null }],
          tournamentName: { $type: 'string' },
        },
      },
      {
        $addFields: {
          tn: { $trim: { input: { $ifNull: ['$tournamentName', ''] } } },
        },
      },
      { $match: { tn: { $ne: '' } } },
      {
        $group: {
          _id: '$tn',
          matchIds: { $push: '$_id' },
          minPlayedAt: { $min: '$playedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  if (groups.length === 0) {
    console.log('No matches need migration (empty tournamentName or already linked).');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${groups.length} unique tournament name(s) to link.\n`);

  let createdTournaments = 0;
  let reusedTournaments = 0;
  let updatedMatches = 0;

  for (const g of groups) {
    const name = g._id;
    const fallbackDate = new Date();
    const date =
      g.minPlayedAt instanceof Date && !Number.isNaN(g.minPlayedAt.getTime())
        ? g.minPlayedAt
        : fallbackDate;

    const existing = await tournamentsColl.findOne<{ _id: Types.ObjectId }>({ name });

    let tournamentId: Types.ObjectId | undefined;
    if (existing) {
      tournamentId = existing._id;
      reusedTournaments += 1;
      console.log(
        `Reuse tournament "${name}" (${tournamentId.toHexString()}) → ${g.count} match(es)`,
      );
    } else if (dryRun) {
      console.log(
        `[dry-run] Would create tournament "${name}" (date ${date.toISOString()}) → ${g.count} match(es)`,
      );
      console.log(`[dry-run] Would link ${g.count} match document(s).\n`);
      updatedMatches += g.count;
      continue;
    } else {
      const now = new Date();
      const ins = await tournamentsColl.insertOne({
        name,
        date,
        location: '',
        url: '',
        meta: 'Set 11',
        createdAt: now,
        updatedAt: now,
        __v: 0,
      });
      tournamentId = ins.insertedId as Types.ObjectId;
      createdTournaments += 1;
      console.log(
        `Created tournament "${name}" (${tournamentId.toHexString()}) → ${g.count} match(es)`,
      );
    }

    if (dryRun) {
      console.log(`[dry-run] Would link ${g.count} match document(s).\n`);
      updatedMatches += g.count;
      continue;
    }

    const res = await matchesColl.updateMany(
      { _id: { $in: g.matchIds } },
      { $set: { tournament: tournamentId } },
    );
    updatedMatches += res.modifiedCount;
    console.log(`  Linked ${res.modifiedCount} document(s).\n`);
  }

  console.log('— Summary —');
  console.log(`  Unique names processed: ${groups.length}`);
  if (!dryRun) {
    console.log(`  Tournaments created:    ${createdTournaments}`);
    console.log(`  Tournaments reused:    ${reusedTournaments}`);
    console.log(`  Matches updated:        ${updatedMatches}`);
  } else {
    console.log(`  [dry-run] Would touch ~${updatedMatches} match row(s).`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
