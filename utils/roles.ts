import { UserRole } from '../types';

/**
 * Checks if a user role is either PHARMACIEN or ADMIN_WEBINAR.
 * This is used to grant ADMIN_WEBINAR the same permissions as a PHARMACIEN on the frontend.
 * @param role The user role to check.
 * @returns True if the role is PHARMACIEN or ADMIN_WEBINAR, false otherwise.
 */
export const isPharmacienOrAdminWebinar = (
  role: UserRole | undefined,
): boolean => {
  if (!role) {
    return false;
  }
  return [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR].includes(role);
};
