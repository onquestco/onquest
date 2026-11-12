import { z } from 'zod';
import { VisibilitySchema } from '@/lib/trip/schema';

/** A person's settings (screen 17). Missing fields on old rows take these defaults. */
export const ProfileSettingsSchema = z.object({
  emailOnLike: z.boolean().default(true),
  emailOnComment: z.boolean().default(true),
  emailOnFollow: z.boolean().default(true),
  defaultVisibility: VisibilitySchema.default('public'),
  showPlaces: z.boolean().default(true),
});

export type ProfileSettings = z.infer<typeof ProfileSettingsSchema>;
