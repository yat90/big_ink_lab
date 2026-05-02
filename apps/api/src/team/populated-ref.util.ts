import { Types } from 'mongoose';

interface PopulatedRefShape {
  _id: Types.ObjectId | string;
  name?: string;
}

/**
 * Normalises a Mongoose populated reference (or a bare ObjectId) into a small
 * `{ _id, name }` payload safe to send over the wire.
 */
export function toPopulatedRef(
  value: Types.ObjectId | PopulatedRefShape | string | null | undefined,
): { _id: string; name: string } | null {
  if (value == null) return null;
  if (typeof value === 'string') return { _id: value, name: '' };
  if (value instanceof Types.ObjectId) return { _id: String(value), name: '' };
  const ref = value as PopulatedRefShape;
  if (ref._id == null) return null;
  return { _id: String(ref._id), name: ref.name ?? '' };
}
