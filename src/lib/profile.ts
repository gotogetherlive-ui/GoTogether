export type ProfileGateUser = {
  full_name?: string | null;
  phone_number?: string | null;
  age?: number | string | null;
  gender?: string | null;
  profession?: string | null;
  fooding_habit?: string | null;
};

export function hasCompleteProfile(user: ProfileGateUser | null | undefined): boolean {
  return !!(
    user?.full_name?.trim() &&
    user?.phone_number?.trim() &&
    user?.age &&
    user?.gender &&
    user?.profession &&
    user?.fooding_habit
  );
}
