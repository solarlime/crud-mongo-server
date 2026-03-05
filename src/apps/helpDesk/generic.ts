import type { Collection, WithId } from 'mongodb';
import type { HelpDeskLegacyNew } from '../../types/helpDeskLegacy';

/**
 * Fetches all documents from the Help-Desk
 * @param col - The collection to fetch documents from
 * @return An object containing the status and data of the fetch operation
 */
const fetchHandler = async (col: Collection) => {
  const data = (await col.find().toArray()) as Array<WithId<HelpDeskLegacyNew>>;
  return {
    status: 'Fetched',
    data: data.map((item) => {
      const { _id, ...rest } = item;
      // DB stores boolean values as strings. It is needed to get them back
      // Upd. 12.12.24: MongoDB now stores boolean values as boolean.
      // Fallback is left for backwards compatibility
      return {
        ...rest,
        done: typeof rest.done === 'boolean' ? rest.done : rest.done === 'true',
      };
    }),
  };
};

export { fetchHandler };
