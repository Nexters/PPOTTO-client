import type { GalleryPhoto } from './gallery-photo';

export const INITIAL_GROUP_PAGE_SIZE = 24;
export const PHOTO_GROUP_PAGE_SIZE = 40;

export interface PhotoPage {
  assets: GalleryPhoto[];
  endCursor: string;
  hasNextPage: boolean;
}

export type FetchPhotoPage = (options: {
  album: string;
  first: number;
  after?: string;
}) => Promise<PhotoPage>;
